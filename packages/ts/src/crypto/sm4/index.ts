/**
 * SM4 分组密码算法实现
 *
 * 参考标准：
 * - GM/T 0002-2012: SM4 分组密码算法
 * - 官方网站：http://www.oscca.gov.cn/
 *
 * SM4 是中国国家密码管理局发布的分组密码算法，用于对称加密，
 * 主要用于商用密码应用中的数据加密。
 *
 * 算法特点：
 * - 分组长度：128 位（16 字节）
 * - 密钥长度：128 位（16 字节）
 * - 轮数：32 轮
 * - 支持多种工作模式：ECB、CBC、CTR、CFB、OFB、GCM、CCM
 */

import {
  normalizeInput,
  hexToBytes,
  base64ToBytes,
  encodeOutput,
  bytesToString,
  xor,
  bytes4ToUint32BE,
  uint32ToBytes4BE,
  isHexString,
  isBase64String,
  type BytesLike
} from '../../core/utils';
import {
  InputFormat,
  PaddingMode,
  CipherMode,
  OutputFormat,
  type PaddingModeType,
  type CipherModeType,
  type OutputFormatType,
  type InputFormatType
} from '../../types/constants';

// SM4 S盒（置换盒）- 用于非线性变换
const SBOX: number[] = [
  0xd6, 0x90, 0xe9, 0xfe, 0xcc, 0xe1, 0x3d, 0xb7, 0x16, 0xb6, 0x14, 0xc2, 0x28, 0xfb, 0x2c, 0x05,
  0x2b, 0x67, 0x9a, 0x76, 0x2a, 0xbe, 0x04, 0xc3, 0xaa, 0x44, 0x13, 0x26, 0x49, 0x86, 0x06, 0x99,
  0x9c, 0x42, 0x50, 0xf4, 0x91, 0xef, 0x98, 0x7a, 0x33, 0x54, 0x0b, 0x43, 0xed, 0xcf, 0xac, 0x62,
  0xe4, 0xb3, 0x1c, 0xa9, 0xc9, 0x08, 0xe8, 0x95, 0x80, 0xdf, 0x94, 0xfa, 0x75, 0x8f, 0x3f, 0xa6,
  0x47, 0x07, 0xa7, 0xfc, 0xf3, 0x73, 0x17, 0xba, 0x83, 0x59, 0x3c, 0x19, 0xe6, 0x85, 0x4f, 0xa8,
  0x68, 0x6b, 0x81, 0xb2, 0x71, 0x64, 0xda, 0x8b, 0xf8, 0xeb, 0x0f, 0x4b, 0x70, 0x56, 0x9d, 0x35,
  0x1e, 0x24, 0x0e, 0x5e, 0x63, 0x58, 0xd1, 0xa2, 0x25, 0x22, 0x7c, 0x3b, 0x01, 0x21, 0x78, 0x87,
  0xd4, 0x00, 0x46, 0x57, 0x9f, 0xd3, 0x27, 0x52, 0x4c, 0x36, 0x02, 0xe7, 0xa0, 0xc4, 0xc8, 0x9e,
  0xea, 0xbf, 0x8a, 0xd2, 0x40, 0xc7, 0x38, 0xb5, 0xa3, 0xf7, 0xf2, 0xce, 0xf9, 0x61, 0x15, 0xa1,
  0xe0, 0xae, 0x5d, 0xa4, 0x9b, 0x34, 0x1a, 0x55, 0xad, 0x93, 0x32, 0x30, 0xf5, 0x8c, 0xb1, 0xe3,
  0x1d, 0xf6, 0xe2, 0x2e, 0x82, 0x66, 0xca, 0x60, 0xc0, 0x29, 0x23, 0xab, 0x0d, 0x53, 0x4e, 0x6f,
  0xd5, 0xdb, 0x37, 0x45, 0xde, 0xfd, 0x8e, 0x2f, 0x03, 0xff, 0x6a, 0x72, 0x6d, 0x6c, 0x5b, 0x51,
  0x8d, 0x1b, 0xaf, 0x92, 0xbb, 0xdd, 0xbc, 0x7f, 0x11, 0xd9, 0x5c, 0x41, 0x1f, 0x10, 0x5a, 0xd8,
  0x0a, 0xc1, 0x31, 0x88, 0xa5, 0xcd, 0x7b, 0xbd, 0x2d, 0x74, 0xd0, 0x12, 0xb8, 0xe5, 0xb4, 0xb0,
  0x89, 0x69, 0x97, 0x4a, 0x0c, 0x96, 0x77, 0x7e, 0x65, 0xb9, 0xf1, 0x09, 0xc5, 0x6e, 0xc6, 0x84,
  0x18, 0xf0, 0x7d, 0xec, 0x3a, 0xdc, 0x4d, 0x20, 0x79, 0xee, 0x5f, 0x3e, 0xd7, 0xcb, 0x39, 0x48,
];

// 系统参数 FK
const FK: number[] = [0xa3b1bac6, 0x56aa3350, 0x677d9197, 0xb27022dc];

// 固定参数 CK - 用于密钥扩展
// ck_{i,j} = (4i+j) * 7 (mod 256), per GB/T 32907-2016 §7.3.2.
// 每个字节都必须乘以 7；该因子属于标准密钥扩展常量的一部分。
const CK: number[] = [];
for (let i = 0; i < 32; i++) {
  CK[i] =
    ((((4 * i + 0) * 7) & 0xff) << 24) |
    ((((4 * i + 1) * 7) & 0xff) << 16) |
    ((((4 * i + 2) * 7) & 0xff) << 8) |
    (((4 * i + 3) * 7) & 0xff);
  CK[i] = CK[i] >>> 0;
}

/**
 * 循环左移
 */
function rotl(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

/**
 * GCM 模式下的伽罗瓦域乘法（GF(2^128)）
 */
function ghash(h: Uint8Array, data: Uint8Array): Uint8Array {
  const result = new Uint8Array(16);

  // 逐块处理每 16 字节的数据
  for (let i = 0; i < data.length; i += 16) {
    const block = data.slice(i, i + 16);

    // 与上一轮结果按位异或
    for (let j = 0; j < 16 && j < block.length; j++) {
      result[j] ^= block[j];
    }

    // 伽罗瓦域乘法
    result.set(gfMul(result, h));
  }

  return result;
}

/**
 * 伽罗瓦域乘法（用于 GCM 模式）
 */
function gfMul(x: Uint8Array, y: Uint8Array): Uint8Array {
  const result = new Uint8Array(16);
  const v = new Uint8Array(y);

  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 8; j++) {
      if (x[i] & (1 << (7 - j))) {
        for (let k = 0; k < 16; k++) {
          result[k] ^= v[k];
        }
      }

      // 判断最低位是否为 1
      const lsb = v[15] & 1;

      // v 向右移 1 位
      for (let k = 15; k > 0; k--) {
        v[k] = (v[k] >> 1) | ((v[k - 1] & 1) << 7);
      }
      v[0] >>= 1;

      // 若最低位为 1，则与常量 R 异或
      if (lsb) {
        v[0] ^= 0xe1;
      }
    }
  }

  return result;
}

/**
 * GCM 模式的计数器递增（最右侧 32 位计数器）
 */
function incrementGCMCounter(counter: Uint8Array): void {
  // 按大端方式递增最右侧的 32 位计数器
  for (let i = 15; i >= 12; i--) {
    if (++counter[i] !== 0) break;
  }
}

/**
 * 避免按内容提前退出的比较；JavaScript/JIT 下不承诺严格恒时。
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * 以大端方式写入固定字节长度的整数
 */
function writeBigEndianLength(value: number, out: Uint8Array, offset: number, length: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('Length must be a non-negative safe integer');
  }
  let x = BigInt(value);
  for (let i = length - 1; i >= 0; i--) {
    out[offset + i] = Number(x & 0xffn);
    x >>= 8n;
  }
  if (x > 0n) {
    throw new Error('Length does not fit in requested field size');
  }
}

/**
 * 将任意长度数据补齐为 16 字节块边界（零填充）
 */
function padToBlock16(data: Uint8Array): Uint8Array {
  if (data.length === 0) {
    return data;
  }
  const padded = new Uint8Array(Math.ceil(data.length / 16) * 16);
  padded.set(data);
  return padded;
}

/**
 * CCM: 编码 AAD 长度前缀并拼接 AAD
 * 参考 NIST SP 800-38C
 */
function encodeCCMAad(aad: Uint8Array): Uint8Array {
  if (aad.length === 0) {
    return new Uint8Array(0);
  }

  let prefix: Uint8Array;
  if (aad.length < 0xff00) {
    prefix = new Uint8Array(2);
    writeBigEndianLength(aad.length, prefix, 0, 2);
  } else if (aad.length <= 0xffffffff) {
    prefix = new Uint8Array(6);
    prefix[0] = 0xff;
    prefix[1] = 0xfe;
    writeBigEndianLength(aad.length, prefix, 2, 4);
  } else {
    prefix = new Uint8Array(10);
    prefix[0] = 0xff;
    prefix[1] = 0xff;
    writeBigEndianLength(aad.length, prefix, 2, 8);
  }

  const out = new Uint8Array(prefix.length + aad.length);
  out.set(prefix, 0);
  out.set(aad, prefix.length);
  return out;
}

/**
 * CCM: 生成计数器块 Ai
 */
function buildCCMCounterBlock(nonce: Uint8Array, qLength: number, counter: number): Uint8Array {
  const block = new Uint8Array(16);
  block[0] = qLength - 1;
  block.set(nonce, 1);
  writeBigEndianLength(counter, block, 16 - qLength, qLength);
  return block;
}

/**
 * CCM: 计算 CBC-MAC
 */
function computeCCMMac(
  roundKeys: number[],
  nonce: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
  tagLength: number,
  qLength: number
): Uint8Array {
  const flags =
    (aad.length > 0 ? 0x40 : 0) |
    (((tagLength - 2) / 2) << 3) |
    (qLength - 1);

  const b0 = new Uint8Array(16);
  b0[0] = flags;
  b0.set(nonce, 1);
  writeBigEndianLength(plaintext.length, b0, 16 - qLength, qLength);

  let mac = encryptBlock(b0, roundKeys);

  const processBlocks = (input: Uint8Array): void => {
    if (input.length === 0) return;
    const padded = padToBlock16(input);
    for (let i = 0; i < padded.length; i += 16) {
      const mixed = new Uint8Array(16);
      for (let j = 0; j < 16; j++) {
        mixed[j] = mac[j] ^ padded[i + j];
      }
      mac = encryptBlock(mixed, roundKeys);
    }
  };

  processBlocks(encodeCCMAad(aad));
  processBlocks(plaintext);

  return mac;
}

/**
 * CCM: CTR 加解密（同一逻辑）
 */
function ccmCtrCrypt(roundKeys: number[], nonce: Uint8Array, qLength: number, input: Uint8Array): Uint8Array {
  const out = new Uint8Array(input.length);
  let counter = 1;

  for (let i = 0; i < input.length; i += 16) {
    const stream = encryptBlock(buildCCMCounterBlock(nonce, qLength, counter), roundKeys);
    const blockSize = Math.min(16, input.length - i);
    for (let j = 0; j < blockSize; j++) {
      out[i + j] = input[i + j] ^ stream[j];
    }
    counter++;
  }

  return out;
}

/**
 * 非线性变换 τ - 使用 S盒进行字节替换
 */
function tau(a: number): number {
  return (
    (SBOX[(a >>> 24) & 0xff] << 24) |
    (SBOX[(a >>> 16) & 0xff] << 16) |
    (SBOX[(a >>> 8) & 0xff] << 8) |
    SBOX[a & 0xff]
  ) >>> 0;
}

/**
 * 线性变换 L - 用于加密变换
 */
function l(b: number): number {
  return (b ^ rotl(b, 2) ^ rotl(b, 10) ^ rotl(b, 18) ^ rotl(b, 24)) >>> 0;
}

/**
 * 线性变换 L' - 用于密钥扩展
 */
function lPrime(b: number): number {
  return (b ^ rotl(b, 13) ^ rotl(b, 23)) >>> 0;
}

// 注：原 t(a) = L(τ(a)) 函数已由上面的 T 表替代，密钥扩展用的 T'(a) = L'(τ(a))
// 见下面的 tPrime；此处不再保留独立的 t()。

// T 表：将 SBOX + L 变换合成预计算表，让加密轮函数减少为 4 次表查 + 3 次 XOR。
// T_i[b] = L( SBOX[b] << (24 - 8*i) )，由 L 的线性性可知 T(a) = T0 ^ T1 ^ T2 ^ T3。
const T0 = new Uint32Array(256);
const T1 = new Uint32Array(256);
const T2 = new Uint32Array(256);
const T3 = new Uint32Array(256);
(function buildTTables() {
  for (let i = 0; i < 256; i++) {
    const s = SBOX[i];
    T0[i] = l((s << 24) >>> 0);
    T1[i] = l((s << 16) >>> 0);
    T2[i] = l((s << 8) >>> 0);
    T3[i] = l(s >>> 0);
  }
})();

// 加密块的轮中间状态缓冲（JS 单线程，模块级复用避免每次分配）
const BLOCK_BUF = new Uint32Array(36);

/**
 * 合成置换 T' - 密钥扩展函数
 */
function tPrime(a: number): number {
  return lPrime(tau(a));
}

/**
 * 密钥扩展 - 从主密钥生成轮密钥
 */
function expandKey(key: Uint8Array): number[] {
  const mk: number[] = [];
  for (let i = 0; i < 4; i++) {
    mk[i] = bytes4ToUint32BE(key, i * 4);
  }

  const k: number[] = new Array(36);
  k[0] = (mk[0] ^ FK[0]) >>> 0;
  k[1] = (mk[1] ^ FK[1]) >>> 0;
  k[2] = (mk[2] ^ FK[2]) >>> 0;
  k[3] = (mk[3] ^ FK[3]) >>> 0;

  const rk: number[] = new Array(32);
  for (let i = 0; i < 32; i++) {
    k[i + 4] = (k[i] ^ tPrime(k[i + 1] ^ k[i + 2] ^ k[i + 3] ^ CK[i])) >>> 0;
    rk[i] = k[i + 4];
  }

  return rk;
}

/**
 * 加密单个数据块（128 位）
 *
 * 使用预计算的 T 表（T0/T1/T2/T3）将每轮的 SBOX + L 变换合成 4 次表查 + 3 次 XOR；
 * 中间状态使用模块级 {@link BLOCK_BUF} 避免每块分配。
 */
function encryptBlock(input: Uint8Array, roundKeys: number[]): Uint8Array {
  const x = BLOCK_BUF;
  x[0] = bytes4ToUint32BE(input, 0);
  x[1] = bytes4ToUint32BE(input, 4);
  x[2] = bytes4ToUint32BE(input, 8);
  x[3] = bytes4ToUint32BE(input, 12);

  for (let i = 0; i < 32; i++) {
    const a = (x[i + 1] ^ x[i + 2] ^ x[i + 3] ^ roundKeys[i]) >>> 0;
    x[i + 4] = (x[i]
      ^ T0[(a >>> 24) & 0xff]
      ^ T1[(a >>> 16) & 0xff]
      ^ T2[(a >>> 8) & 0xff]
      ^ T3[a & 0xff]) >>> 0;
  }

  const output = new Uint8Array(16);
  output.set(uint32ToBytes4BE(x[35]), 0);
  output.set(uint32ToBytes4BE(x[34]), 4);
  output.set(uint32ToBytes4BE(x[33]), 8);
  output.set(uint32ToBytes4BE(x[32]), 12);
  return output;
}

/**
 * 解密单个数据块（128 位）
 */
function decryptBlock(input: Uint8Array, roundKeys: number[]): Uint8Array {
  const reversedKeys = roundKeys.slice().reverse();
  return encryptBlock(input, reversedKeys);
}

/**
 * PKCS7 填充
 * PKCS#7 padding - 填充值等于填充字节数
 * Padding value equals the number of padding bytes added
 *
 * @param data - 要填充的数据 (Data to pad)
 * @param blockSize - 块大小，通常为16字节 (Block size, typically 16 bytes)
 * @returns 填充后的数据 (Padded data)
 */
function pkcs7Pad(data: Uint8Array, blockSize: number): Uint8Array {
  const padding = blockSize - (data.length % blockSize);
  const padded = new Uint8Array(data.length + padding);
  padded.set(data);
  for (let i = data.length; i < padded.length; i++) {
    padded[i] = padding;
  }
  return padded;
}

/**
 * 去除 PKCS7 填充
 * Remove PKCS#7 padding
 *
 * @param data - 要去除填充的数据 (Data to unpad)
 * @returns 去除填充后的数据 (Unpadded data)
 */
function pkcs7Unpad(data: Uint8Array): Uint8Array {
  if (data.length === 0 || data.length % 16 !== 0) {
    throw new Error('Invalid padding');
  }
  const padding = data[data.length - 1];
  if (padding < 1 || padding > 16) {
    throw new Error('Invalid padding');
  }
  for (let i = data.length - padding; i < data.length; i++) {
    if (data[i] !== padding) {
      throw new Error('Invalid padding');
    }
  }
  return data.slice(0, data.length - padding);
}

/**
 * 零填充
 * Zero padding - 用零字节填充到块大小的倍数
 * Pad with zero bytes to multiple of block size
 *
 * @param data - 要填充的数据 (Data to pad)
 * @param blockSize - 块大小，通常为16字节 (Block size, typically 16 bytes)
 * @returns 填充后的数据 (Padded data)
 */
function zeroPad(data: Uint8Array, blockSize: number): Uint8Array {
  const padding = blockSize - (data.length % blockSize);
  if (padding === blockSize) {
    // 已经满足块大小，无需填充
    return data;
  }
  const padded = new Uint8Array(data.length + padding);
  padded.set(data);
  // 剩余字节默认为 0，无需额外赋值
  return padded;
}

/**
 * 去除零填充
 * Remove zero padding - 移除尾部的零字节
 * Remove trailing zero bytes
 *
 * @param data - 要去除填充的数据 (Data to unpad)
 * @returns 去除填充后的数据 (Unpadded data)
 */
function zeroUnpad(data: Uint8Array): Uint8Array {
  let length = data.length;
  // 从尾部寻找第一个非零字节
  while (length > 0 && data[length - 1] === 0) {
    length--;
  }
  return data.slice(0, length);
}

/**
 * SM4 加密选项
 */
export interface SM4Options {
  /**
   * 加密模式 (Cipher mode)
   * - ECB: 电码本模式，不需要IV (Electronic Codebook, no IV required)
   * - CBC: 分组链接模式，需要IV (Cipher Block Chaining, IV required)
   * - CTR: 计数器模式，需要IV，无需填充 (Counter mode, IV required, no padding)
   * - CFB: 密文反馈模式，需要IV，无需填充 (Cipher Feedback, IV required, no padding)
   * - OFB: 输出反馈模式，需要IV，无需填充 (Output Feedback, IV required, no padding)
   * - GCM: 伽罗瓦/计数器模式，需要IV，无需填充，提供认证 (Galois/Counter Mode, IV required, no padding, provides authentication)
   * - CCM: 计数器与 CBC-MAC 模式，需要 nonce，无需填充，提供认证 (Counter with CBC-MAC, nonce required, no padding, provides authentication)
   *
   * 默认: ECB (Default: ECB)
   */
  mode?: CipherModeType;

  /**
   * 填充模式 (Padding mode)
   * - PKCS7: PKCS#7 填充，填充值为填充字节数 (PKCS#7 padding, padding value equals padding length)
   *   注意：JavaScript 中的 PKCS7 等同于 Java 中的 PKCS5（PKCS5 是 PKCS7 针对 8 字节块的特例）
   *   Note: PKCS7 in JavaScript is equivalent to PKCS5 in Java (PKCS5 is PKCS7 for 8-byte blocks)
   * - NONE: 无填充，数据长度必须是块大小倍数 (No padding, data length must be multiple of block size)
   * - ZERO: 零填充，用零字节填充 (Zero padding, pad with zero bytes)
   *
   * 注意：流密码模式（CTR/CFB/OFB/GCM）不使用填充
   * Note: Stream cipher modes (CTR/CFB/OFB/GCM) don't use padding
   *
   * 默认: PKCS7 (Default: PKCS7)
   */
  padding?: PaddingModeType;

  /**
   * 初始化向量
   * - CBC/CTR/CFB/OFB：16 字节（32 个十六进制字符）
   * - GCM：12 字节（24 个十六进制字符）
   * - CCM：7-13 字节（14-26 个十六进制字符，建议 12 字节）
   * - ECB：不需要 IV
   */
  iv?: BytesLike;

  /**
   * GCM/CCM 模式的附加认证数据，可使用字符串或 Uint8Array
   */
  aad?: string | Uint8Array;

  /**
   * 认证标签长度
   * - GCM: 12-16 字节，默认 16
   * - CCM: 4-16 字节（必须为偶数），默认 16
   */
  tagLength?: number;

  /**
   * 输出格式 (Output format)
   * - hex: 十六进制字符串（默认，保持向后兼容）(Hex string, default for backward compatibility)
   * - base64: Base64 编码字符串 (Base64 encoded string)
   *
   * 默认: hex (Default: hex)
   */
  outputFormat?: OutputFormatType;
}

/**
 * SM4 GCM 模式的加密结果
 */
export interface SM4CipherResult {
  /**
   * 密文（十六进制字符串）
   */
  ciphertext: string;

  /**
   * 认证标签（十六进制字符串）
   */
  tag?: string;

  /**
   * 输出格式（hex 或 base64）
   */
  format: OutputFormatType;
}

/** GCM 加密结果的兼容类型别名；认证标签保存在 `tag`。 */
export type SM4GCMResult = SM4CipherResult;

/** CCM 加密结果的兼容类型别名；认证标签保存在 `tag`。 */
export type SM4CCMResult = SM4CipherResult;

/** SM4 认证加密结果的通用兼容类型别名。 */
export type SM4AEADResult = SM4CipherResult;

export interface SM4DecryptOptions extends SM4Options {
  /**
   * 输入格式（用于密文与标签为字符串时）
   * - hex
   * - base64
   *
   * 不传时会自动识别 hex/base64（优先按 hex 识别）
   */
  inputFormat?: InputFormatType;

  /**
   * GCM/CCM 模式下的认证标签（可单独传入）
   */
  tag?: BytesLike;

  /**
   * 认证标签格式（默认自动识别；传入则按指定格式解码）
   */
  tagFormat?: InputFormatType;
}

let implicitEcbWarningShown = false;

function normalizeCipherMode(mode?: CipherModeType): CipherModeType {
  if (mode === undefined) {
    if (!implicitEcbWarningShown) {
      console.warn(
        '[gmkit][SM4] mode was omitted; using legacy ECB compatibility mode. Pass CipherMode.ECB explicitly, or prefer an IV-based mode for new code.'
      );
      implicitEcbWarningShown = true;
    }
    return CipherMode.ECB;
  }
  if (!Object.values(CipherMode).includes(mode)) {
    throw new Error(`Unsupported cipher mode: ${String(mode)}`);
  }
  return mode;
}

function normalizePaddingMode(padding?: PaddingModeType): PaddingModeType {
  if (padding === undefined) {
    return PaddingMode.PKCS7;
  }
  if (!Object.values(PaddingMode).includes(padding)) {
    throw new Error(`Unsupported padding mode: ${String(padding)}`);
  }
  return padding;
}

function normalizeOutputFormat(outputFormat?: OutputFormatType): OutputFormatType {
  if (outputFormat === undefined) {
    return OutputFormat.HEX;
  }
  if (!Object.values(OutputFormat).includes(outputFormat)) {
    throw new Error(`Unsupported output format: ${String(outputFormat)}`);
  }
  return outputFormat;
}

function normalizeInputFormat(inputFormat?: InputFormatType, fieldName: string = 'input format'): InputFormatType | undefined {
  if (inputFormat === undefined) {
    return undefined;
  }
  if (!Object.values(InputFormat).includes(inputFormat)) {
    throw new Error(`Unsupported ${fieldName}: ${String(inputFormat)}`);
  }
  return inputFormat;
}

function decodeStrictHex(input: string, label: string): Uint8Array {
  let normalized = input.trim();
  if (normalized.startsWith('0x') || normalized.startsWith('0X')) {
    normalized = normalized.slice(2);
  }
  if (normalized.length % 2 !== 0) {
    throw new Error(`Invalid ${label}: hexadecimal strings must have an even length`);
  }
  if (normalized.length > 0 && !isHexString(normalized)) {
    throw new Error(`Invalid ${label}: must be a hexadecimal string`);
  }
  return hexToBytes(normalized);
}

function decodeStrictHexLike(input: BytesLike, label: string): Uint8Array {
  return input instanceof Uint8Array ? input : decodeStrictHex(input, label);
}

function decodeCipherString(input: string, format: InputFormatType | undefined, label: string): Uint8Array {
  const normalized = format === undefined ? undefined : normalizeInputFormat(format, label);
  if (normalized === InputFormat.HEX) {
    return decodeStrictHex(input, label);
  }
  if (normalized === InputFormat.BASE64) {
    return base64ToBytes(input);
  }

  const trimmed = input.trim();
  if (isHexString(trimmed)) {
    return decodeStrictHex(trimmed, label);
  }
  if (isBase64String(trimmed)) {
    return base64ToBytes(trimmed);
  }
  return decodeStrictHex(trimmed, label);
}

function resolveGcmTagLength(tagLength?: number): number {
  const resolved = tagLength ?? 16;
  if (!Number.isInteger(resolved) || resolved < 12 || resolved > 16) {
    throw new Error('Tag length must be between 12 and 16 bytes');
  }
  return resolved;
}

function resolveCcmTagLength(tagLength?: number): number {
  const resolved = tagLength ?? 16;
  if (!Number.isInteger(resolved) || resolved < 4 || resolved > 16 || resolved % 2 !== 0) {
    throw new Error('CCM tag length must be an even value between 4 and 16 bytes');
  }
  return resolved;
}

/**
 * 使用 SM4 加密数据
 * Encrypt data using SM4 block cipher
 *
 * 支持的模式 (Supported modes):
 * - ECB: 电码本模式 (Electronic Codebook) - 不推荐用于生产环境 (Not recommended for production)
 * - CBC: 分组链接模式 (Cipher Block Chaining) - 需要IV (Requires IV)
 * - CTR: 计数器模式 (Counter mode) - 流密码模式，需要IV (Stream mode, requires IV)
 * - CFB: 密文反馈模式 (Cipher Feedback) - 流密码模式，需要IV (Stream mode, requires IV)
 * - OFB: 输出反馈模式 (Output Feedback) - 流密码模式，需要IV (Stream mode, requires IV)
 * - GCM: 伽罗瓦/计数器模式 (Galois/Counter Mode) - 认证加密，需要IV (AEAD mode, requires IV)
 * - CCM: 计数器与 CBC-MAC 模式 (Counter with CBC-MAC) - 认证加密，需要 nonce (AEAD mode, requires nonce)
 *
 * 支持的填充模式 (Supported padding modes):
 * - PKCS7: PKCS#7 填充 (PKCS#7 padding) - 默认 (Default)
 * - NONE: 无填充 (No padding) - 数据长度必须是16字节的倍数 (Data length must be multiple of 16 bytes)
 * - ZERO: 零填充 (Zero padding) - 用零字节填充 (Pad with zero bytes)
 *
 * @param key - 加密密钥（十六进制字符串，32 个字符 = 16 字节）
 *              Encryption key (hex string, 32 chars = 16 bytes)
 * @param data - 要加密的数据（字符串或 Uint8Array）
 *               Data to encrypt (string or Uint8Array)
 * @param options - 加密选项（模式、填充、IV）
 *                  Encryption options (mode, padding, IV)
 * @returns 总是返回包含 ciphertext 的对象，编码默认 Hex；GCM/CCM 额外包含 tag
 * @throws key、IV/nonce、模式、填充、编码或 AEAD 长度参数无效时抛出错误
 *
 * @example
 * // ECB 模式
 * const encrypted = encrypt(key, 'order=GMKIT-DEMO-0001&amount=88.00', { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
 *
 * @example
 * // GCM 模式（包含认证标签）
 * const result = encrypt(key, 'order=GMKIT-DEMO-0001&amount=88.00', { mode: CipherMode.GCM, iv: '000000000000000000000000', aad: 'tenant=demo;schema=1' });
 * console.log(result.ciphertext, result.tag);
 */
export function encrypt(
  key: BytesLike,
  data: string | Uint8Array,
  options?: SM4Options
): SM4CipherResult {
  const mode = normalizeCipherMode(options?.mode);
  const padding = normalizePaddingMode(options?.padding);
  const outputFormat = normalizeOutputFormat(options?.outputFormat);

  const keyBytes = decodeStrictHexLike(key, 'SM4 key');
  if (keyBytes.length !== 16) {
    throw new Error('SM4 key must be 16 bytes (32 hex characters)');
  }

  let dataBytes = normalizeInput(data);

  // Stream/AEAD modes (CTR, CFB, OFB, GCM, CCM) don't use block padding
  // 流密码/AEAD 模式（CTR、CFB、OFB、GCM、CCM）不使用分组填充
  const isStreamMode = mode === 'ctr' || mode === 'cfb' || mode === 'ofb' || mode === 'gcm' || mode === 'ccm';

  // 应用填充 (Apply padding)
  if (!isStreamMode) {
    if (padding === 'pkcs7') {
      // PKCS#7 填充
      dataBytes = pkcs7Pad(dataBytes, 16);
    } else if (padding === 'zero') {
      // 零填充
      dataBytes = zeroPad(dataBytes, 16);
    } else if (padding === 'none') {
      // 无填充，数据长度必须是16字节的倍数
      if (dataBytes.length % 16 !== 0) {
        throw new Error('Data length must be multiple of 16 bytes when padding is None');
      }
    } else {
      throw new Error(`Unsupported padding mode: ${padding}`);
    }
  }

  const roundKeys = expandKey(keyBytes);
  const result = new Uint8Array(dataBytes.length);

  if (mode === 'ecb') {
    for (let i = 0; i < dataBytes.length; i += 16) {
      const block = dataBytes.slice(i, i + 16);
      const encrypted = encryptBlock(block, roundKeys);
      result.set(encrypted, i);
    }
  } else if (mode === 'cbc') {
    if (!options?.iv) {
      throw new Error('IV is required for CBC mode');
    }
    let ivBytes = decodeStrictHexLike(options.iv, 'IV');
    if (ivBytes.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    for (let i = 0; i < dataBytes.length; i += 16) {
      const block = dataBytes.slice(i, i + 16);
      const xored = xor(block, ivBytes);
      const encrypted = encryptBlock(xored, roundKeys);
      result.set(encrypted, i);
      ivBytes = encrypted;
    }
  } else if (mode === 'ctr') {
    if (!options?.iv) {
      throw new Error('IV (nonce/counter) is required for CTR mode');
    }
    const counter = decodeStrictHexLike(options.iv, 'IV');
    if (counter.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    const counterBlock = new Uint8Array(counter);
    for (let i = 0; i < dataBytes.length; i += 16) {
      const keystream = encryptBlock(counterBlock, roundKeys);
      const blockSize = Math.min(16, dataBytes.length - i);
      for (let j = 0; j < blockSize; j++) {
        result[i + j] = dataBytes[i + j] ^ keystream[j];
      }
      // 按大端序递增计数器
      for (let j = 15; j >= 0; j--) {
        if (++counterBlock[j] !== 0) break;
      }
    }
  } else if (mode === 'cfb') {
    if (!options?.iv) {
      throw new Error('IV is required for CFB mode');
    }
    let shift = decodeStrictHexLike(options.iv, 'IV');
    if (shift.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    for (let i = 0; i < dataBytes.length; i += 16) {
      const keystream = encryptBlock(shift, roundKeys);
      const blockSize = Math.min(16, dataBytes.length - i);
      const cipherBlock = new Uint8Array(16);
      for (let j = 0; j < blockSize; j++) {
        cipherBlock[j] = dataBytes[i + j] ^ keystream[j];
        result[i + j] = cipherBlock[j];
      }
      shift = cipherBlock;
    }
  } else if (mode === 'ofb') {
    if (!options?.iv) {
      throw new Error('IV is required for OFB mode');
    }
    let shift = decodeStrictHexLike(options.iv, 'IV');
    if (shift.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    for (let i = 0; i < dataBytes.length; i += 16) {
      shift = encryptBlock(shift, roundKeys);
      const blockSize = Math.min(16, dataBytes.length - i);
      for (let j = 0; j < blockSize; j++) {
        result[i + j] = dataBytes[i + j] ^ shift[j];
      }
    }
  } else if (mode === 'gcm') {
    // GCM 模式：带认证的伽罗瓦/计数器加密
    if (!options?.iv) {
      throw new Error('IV is required for GCM mode');
    }
    const ivBytes = decodeStrictHexLike(options.iv, 'IV');
    if (ivBytes.length !== 12) {
      throw new Error('IV must be 12 bytes (24 hex characters) for GCM mode');
    }

    const tagLength = resolveGcmTagLength(options.tagLength);

    // 计算 H = E(K, 0^128)
    const h = encryptBlock(new Uint8Array(16), roundKeys);

    // 构造初始计数器块：IV || 0^31 || 1
    const j0 = new Uint8Array(16);
    j0.set(ivBytes, 0);
    j0[15] = 1;

    // 对初始计数器加密得到预计数块
    const preCounterBlock = encryptBlock(j0, roundKeys);

    // 为 CTR 加密准备计数器
    const counterBlock = new Uint8Array(j0);
    incrementGCMCounter(counterBlock);

    // 使用 CTR 模式加密明文
    for (let i = 0; i < dataBytes.length; i += 16) {
      const keystream = encryptBlock(counterBlock, roundKeys);
      const blockSize = Math.min(16, dataBytes.length - i);
      for (let j = 0; j < blockSize; j++) {
        result[i + j] = dataBytes[i + j] ^ keystream[j];
      }
      incrementGCMCounter(counterBlock);
    }

    // 处理附加认证数据（AAD）
    let aadBytes: Uint8Array = new Uint8Array(0);
    if (options.aad) {
      aadBytes = typeof options.aad === 'string' ? normalizeInput(options.aad) : new Uint8Array(options.aad);
    }

    // 将 AAD 和密文补齐到 16 字节供 GHASH 使用
    const aadLen = aadBytes.length;
    const cLen = result.length;
    const aadPadded = new Uint8Array(Math.ceil(aadLen / 16) * 16);
    aadPadded.set(aadBytes);
    const cPadded = new Uint8Array(Math.ceil(cLen / 16) * 16);
    cPadded.set(result);

    // 构造 GHASH 输入：AAD || C || len(AAD) || len(C)
    const ghashData = new Uint8Array(aadPadded.length + cPadded.length + 16);
    ghashData.set(aadPadded, 0);
    ghashData.set(cPadded, aadPadded.length);

    // 追加比特长度（64 位大端）
    const view = new DataView(ghashData.buffer, ghashData.byteOffset, ghashData.byteLength);
    view.setUint32(ghashData.length - 16, Math.floor((aadLen * 8) / 0x100000000), false);
    view.setUint32(ghashData.length - 12, (aadLen * 8) >>> 0, false);
    view.setUint32(ghashData.length - 8, Math.floor((cLen * 8) / 0x100000000), false);
    view.setUint32(ghashData.length - 4, (cLen * 8) >>> 0, false);

    // 计算 GHASH
    const ghashResult = ghash(h, ghashData);

    // 计算认证标签：GHASH(H, A, C) ⊕ E(K, J0)
    const tag = new Uint8Array(tagLength);
    for (let i = 0; i < tagLength; i++) {
      tag[i] = ghashResult[i] ^ preCounterBlock[i];
    }

    return {
      ciphertext: encodeOutput(result, outputFormat),
      tag: encodeOutput(tag, outputFormat),
      format: outputFormat,
    };
  } else if (mode === 'ccm') {
    // CCM 模式：CTR + CBC-MAC 认证加密
    if (!options?.iv) {
      throw new Error('Nonce is required for CCM mode');
    }

    const nonceBytes = decodeStrictHexLike(options.iv, 'nonce');
    if (nonceBytes.length < 7 || nonceBytes.length > 13) {
      throw new Error('Nonce must be 7-13 bytes (14-26 hex characters) for CCM mode');
    }

    const qLength = 15 - nonceBytes.length;
    const maxMessageLength = (1n << BigInt(8 * qLength)) - 1n;
    if (BigInt(dataBytes.length) > maxMessageLength) {
      throw new Error(`Plaintext too long for CCM nonce size (max ${maxMessageLength.toString()} bytes)`);
    }

    const tagLength = resolveCcmTagLength(options.tagLength);

    let aadBytes: Uint8Array = new Uint8Array(0);
    if (options.aad) {
      aadBytes = typeof options.aad === 'string' ? normalizeInput(options.aad) : new Uint8Array(options.aad);
    }

    const mac = computeCCMMac(roundKeys, nonceBytes, dataBytes, aadBytes, tagLength, qLength);
    const s0 = encryptBlock(buildCCMCounterBlock(nonceBytes, qLength, 0), roundKeys);
    const ciphertext = ccmCtrCrypt(roundKeys, nonceBytes, qLength, dataBytes);

    const tag = new Uint8Array(tagLength);
    for (let i = 0; i < tagLength; i++) {
      tag[i] = mac[i] ^ s0[i];
    }

    return {
      ciphertext: encodeOutput(ciphertext, outputFormat),
      tag: encodeOutput(tag, outputFormat),
      format: outputFormat,
    };
  } else {
    throw new Error(`Unsupported cipher mode: ${mode}`);
  }

  return {
    ciphertext: encodeOutput(result, outputFormat),
    format: outputFormat,
  };
}

/**
 * 使用 SM4 解密数据
 * Decrypt data using SM4 block cipher
 *
 * 支持的模式 (Supported modes):
 * - ECB: 电码本模式 (Electronic Codebook)
 * - CBC: 分组链接模式 (Cipher Block Chaining) - 需要IV (Requires IV)
 * - CTR: 计数器模式 (Counter mode) - 流密码模式，需要IV (Stream mode, requires IV)
 * - CFB: 密文反馈模式 (Cipher Feedback) - 流密码模式，需要IV (Stream mode, requires IV)
 * - OFB: 输出反馈模式 (Output Feedback) - 流密码模式，需要IV (Stream mode, requires IV)
 * - GCM: 伽罗瓦/计数器模式 (Galois/Counter Mode) - 认证加密，需要IV和tag (AEAD mode, requires IV and tag)
 * - CCM: 计数器与 CBC-MAC 模式 (Counter with CBC-MAC) - 认证加密，需要 nonce 和 tag (AEAD mode, requires nonce and tag)
 *
 * 支持的填充模式 (Supported padding modes):
 * - PKCS7: PKCS#7 填充 (PKCS#7 padding) - 默认 (Default)
 * - NONE: 无填充 (No padding)
 * - ZERO: 零填充 (Zero padding)
 *
 * @param key - 解密密钥（十六进制字符串，32 个字符 = 16 字节）
 *              Decryption key (hex string, 32 chars = 16 bytes)
 * @param encryptedData - 加密的数据（十六进制字符串或 AEAD 结果对象）
 *                        Encrypted data (hex string or AEAD result object)
 * @param options - 解密选项（模式、填充、IV、tag用于 GCM/CCM）
 *                  Decryption options (mode, padding, IV, tag for GCM/CCM)
 * @returns 解密后的数据（UTF-8 字符串）
 *          Decrypted data (UTF-8 string)
 * @throws 参数或密文编码无效、填充错误、AEAD 认证失败，或宿主文本解码器失败时抛出错误
 *
 * @example
 * // ECB 模式
 * const decrypted = decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
 *
 * @example
 * // GCM 模式（校验认证标签）
 * const decrypted = decrypt(key, result, { mode: CipherMode.GCM, iv: '000000000000000000000000', aad: 'metadata' });
 */
export function decrypt(
  key: BytesLike,
  encryptedData: BytesLike | SM4CipherResult,
  options?: SM4DecryptOptions
): string {
  return bytesToString(decryptBytes(key, encryptedData, options));
}

/**
 * 使用 SM4 解密为原始字节；文本入口会额外执行 UTF-8 解码。
 * @param key - 固定 16 字节的密钥或 32 个 Hex 字符
 * @param encryptedData - 字符串、原始密文字节或带 tag 的结构化结果
 * @param options - mode、padding、IV/nonce、AAD、tag 与输入编码
 * @returns 解密并完成填充/AEAD 校验后的原始字节
 * @throws 参数长度、编码、padding 或 AEAD 认证无效时抛出错误
 */
export function decryptBytes(
  key: BytesLike,
  encryptedData: BytesLike | SM4CipherResult,
  options?: SM4DecryptOptions
): Uint8Array {
  const mode = normalizeCipherMode(options?.mode);
  const padding = normalizePaddingMode(options?.padding);
  const inputFormat = normalizeInputFormat(options?.inputFormat, 'input format');
  const tagFormat = normalizeInputFormat(options?.tagFormat, 'tag format');

  const keyBytes = decodeStrictHexLike(key, 'SM4 key');
  if (keyBytes.length !== 16) {
    throw new Error('SM4 key must be 16 bytes (32 hex characters)');
  }

  const decodeWithOptionalFormat = (input: BytesLike, format?: InputFormatType): Uint8Array => {
    if (input instanceof Uint8Array) return input;
    return decodeCipherString(input, format, 'ciphertext');
  };

  // 处理带有认证标签的 AEAD 密文（GCM / CCM）
  let ciphertextInput: BytesLike;
  let authTag: Uint8Array | undefined;

  if (mode === 'gcm' || mode === 'ccm') {
    if (typeof encryptedData === 'object' && 'ciphertext' in encryptedData) {
      ciphertextInput = encryptedData.ciphertext;
      if (!encryptedData.tag) {
        throw new Error(`${mode.toUpperCase()} mode requires authentication tag`);
      }
      authTag = decodeCipherString(encryptedData.tag, encryptedData.format, 'authentication tag');
    } else if ((typeof encryptedData === 'string' || encryptedData instanceof Uint8Array) && options?.tag) {
      ciphertextInput = encryptedData;
      authTag = options.tag instanceof Uint8Array
        ? options.tag
        : decodeCipherString(options.tag, tagFormat || inputFormat, 'authentication tag');
    } else {
      throw new Error(`${mode.toUpperCase()} mode requires authentication tag`);
    }
  } else {
    ciphertextInput = typeof encryptedData === 'object' && 'ciphertext' in encryptedData
      ? encryptedData.ciphertext
      : encryptedData;
  }

  const dataBytes = typeof encryptedData === 'object' && 'ciphertext' in encryptedData
    ? decodeWithOptionalFormat(ciphertextInput, encryptedData.format)
    : decodeWithOptionalFormat(ciphertextInput, inputFormat);

  // 流模式下的数据长度不必是块大小的整数倍
  const isStreamMode = mode === 'ctr' || mode === 'cfb' || mode === 'ofb' || mode === 'gcm' || mode === 'ccm';
  if (!isStreamMode && dataBytes.length % 16 !== 0) {
    throw new Error('Encrypted data length must be multiple of 16 bytes');
  }

  const roundKeys = expandKey(keyBytes);
  const result = new Uint8Array(dataBytes.length);

  if (mode === 'ecb') {
    for (let i = 0; i < dataBytes.length; i += 16) {
      const block = dataBytes.slice(i, i + 16);
      const decrypted = decryptBlock(block, roundKeys);
      result.set(decrypted, i);
    }
  } else if (mode === 'cbc') {
    if (!options?.iv) {
      throw new Error('IV is required for CBC mode');
    }
    let ivBytes = decodeStrictHexLike(options.iv, 'IV');
    if (ivBytes.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    for (let i = 0; i < dataBytes.length; i += 16) {
      const block = dataBytes.slice(i, i + 16);
      const decrypted = decryptBlock(block, roundKeys);
      const xored = xor(decrypted, ivBytes);
      result.set(xored, i);
      ivBytes = block;
    }
  } else if (mode === 'ctr') {
    // CTR 解密与加密相同，均为与密钥流异或
    if (!options?.iv) {
      throw new Error('IV (nonce/counter) is required for CTR mode');
    }
    const counter = decodeStrictHexLike(options.iv, 'IV');
    if (counter.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    const counterBlock = new Uint8Array(counter);
    for (let i = 0; i < dataBytes.length; i += 16) {
      const keystream = encryptBlock(counterBlock, roundKeys);
      const blockSize = Math.min(16, dataBytes.length - i);
      for (let j = 0; j < blockSize; j++) {
        result[i + j] = dataBytes[i + j] ^ keystream[j];
      }
      // 按大端序递增计数器
      for (let j = 15; j >= 0; j--) {
        if (++counterBlock[j] !== 0) break;
      }
    }
  } else if (mode === 'cfb') {
    if (!options?.iv) {
      throw new Error('IV is required for CFB mode');
    }
    let shift = decodeStrictHexLike(options.iv, 'IV');
    if (shift.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    for (let i = 0; i < dataBytes.length; i += 16) {
      const keystream = encryptBlock(shift, roundKeys);
      const blockSize = Math.min(16, dataBytes.length - i);
      const cipherBlock = new Uint8Array(16);
      for (let j = 0; j < blockSize; j++) {
        cipherBlock[j] = dataBytes[i + j];
        result[i + j] = dataBytes[i + j] ^ keystream[j];
      }
      shift = cipherBlock;
    }
  } else if (mode === 'ofb') {
    // OFB 解密与加密相同，均为与密钥流异或
    if (!options?.iv) {
      throw new Error('IV is required for OFB mode');
    }
    let shift = decodeStrictHexLike(options.iv, 'IV');
    if (shift.length !== 16) {
      throw new Error('IV must be 16 bytes (32 hex characters)');
    }

    for (let i = 0; i < dataBytes.length; i += 16) {
      shift = encryptBlock(shift, roundKeys);
      const blockSize = Math.min(16, dataBytes.length - i);
      for (let j = 0; j < blockSize; j++) {
        result[i + j] = dataBytes[i + j] ^ shift[j];
      }
    }
  } else if (mode === 'gcm') {
    // GCM 模式：带认证的伽罗瓦/计数器解密
    if (!options?.iv) {
      throw new Error('IV is required for GCM mode');
    }
    if (!authTag) {
      throw new Error('Authentication tag is required for GCM mode');
    }

    const ivBytes = decodeStrictHexLike(options.iv, 'IV');
    if (ivBytes.length !== 12) {
      throw new Error('IV must be 12 bytes (24 hex characters) for GCM mode');
    }
    const expectedTagLength = options?.tagLength === undefined
      ? resolveGcmTagLength(authTag.length)
      : resolveGcmTagLength(options.tagLength);
    if (authTag.length !== expectedTagLength) {
      throw new Error(`Authentication tag length must be ${expectedTagLength} bytes for GCM mode`);
    }

    // 计算 H = E(K, 0^128)
    const h = encryptBlock(new Uint8Array(16), roundKeys);

    // 构造初始计数器块：IV || 0^31 || 1
    const j0 = new Uint8Array(16);
    j0.set(ivBytes, 0);
    j0[15] = 1;

    // 对初始计数器加密得到预计数块
    const preCounterBlock = encryptBlock(j0, roundKeys);

    // 处理附加认证数据（AAD）
    let aadBytes: Uint8Array = new Uint8Array(0);
    if (options.aad) {
      aadBytes = typeof options.aad === 'string' ? normalizeInput(options.aad) : new Uint8Array(options.aad);
    }

    // 将 AAD 和密文补齐到 16 字节供 GHASH 使用
    const aadLen = aadBytes.length;
    const cLen = dataBytes.length;
    const aadPadded = new Uint8Array(Math.ceil(aadLen / 16) * 16);
    aadPadded.set(aadBytes);
    const cPadded = new Uint8Array(Math.ceil(cLen / 16) * 16);
    cPadded.set(dataBytes);

    // 构造 GHASH 输入：AAD || C || len(AAD) || len(C)
    const ghashData = new Uint8Array(aadPadded.length + cPadded.length + 16);
    ghashData.set(aadPadded, 0);
    ghashData.set(cPadded, aadPadded.length);

    // 追加比特长度（64 位大端）
    const view = new DataView(ghashData.buffer, ghashData.byteOffset, ghashData.byteLength);
    view.setUint32(ghashData.length - 16, Math.floor((aadLen * 8) / 0x100000000), false);
    view.setUint32(ghashData.length - 12, (aadLen * 8) >>> 0, false);
    view.setUint32(ghashData.length - 8, Math.floor((cLen * 8) / 0x100000000), false);
    view.setUint32(ghashData.length - 4, (cLen * 8) >>> 0, false);

    // 计算 GHASH
    const ghashResult = ghash(h, ghashData);

    // 计算期望的认证标签：GHASH(H, A, C) ⊕ E(K, J0)
    const expectedTag = new Uint8Array(authTag.length);
    for (let i = 0; i < authTag.length; i++) {
      expectedTag[i] = ghashResult[i] ^ preCounterBlock[i];
    }

    // 校验认证标签时避免显式按内容早退；JavaScript/JIT 下不承诺严格恒时。
    if (!constantTimeEqual(authTag, expectedTag)) {
      throw new Error('Authentication tag verification failed');
    }

    // 使用 CTR 模式解密密文
    const counterBlock = new Uint8Array(j0);
    incrementGCMCounter(counterBlock);

    for (let i = 0; i < dataBytes.length; i += 16) {
      const keystream = encryptBlock(counterBlock, roundKeys);
      const blockSize = Math.min(16, dataBytes.length - i);
      for (let j = 0; j < blockSize; j++) {
        result[i + j] = dataBytes[i + j] ^ keystream[j];
      }
      incrementGCMCounter(counterBlock);
    }
  } else if (mode === 'ccm') {
    // CCM 模式：CTR + CBC-MAC 认证解密
    if (!options?.iv) {
      throw new Error('Nonce is required for CCM mode');
    }
    if (!authTag) {
      throw new Error('Authentication tag is required for CCM mode');
    }

    const nonceBytes = decodeStrictHexLike(options.iv, 'nonce');
    if (nonceBytes.length < 7 || nonceBytes.length > 13) {
      throw new Error('Nonce must be 7-13 bytes (14-26 hex characters) for CCM mode');
    }

    const expectedTagLength = options?.tagLength === undefined
      ? resolveCcmTagLength(authTag.length)
      : resolveCcmTagLength(options.tagLength);
    if (authTag.length !== expectedTagLength) {
      throw new Error(`Authentication tag length must be ${expectedTagLength} bytes for CCM mode`);
    }

    const qLength = 15 - nonceBytes.length;
    const maxMessageLength = (1n << BigInt(8 * qLength)) - 1n;
    if (BigInt(dataBytes.length) > maxMessageLength) {
      throw new Error(`Ciphertext too long for CCM nonce size (max ${maxMessageLength.toString()} bytes)`);
    }

    // 先 CTR 解密得到明文
    const plaintext = ccmCtrCrypt(roundKeys, nonceBytes, qLength, dataBytes);
    result.set(plaintext);

    let aadBytes: Uint8Array = new Uint8Array(0);
    if (options.aad) {
      aadBytes = typeof options.aad === 'string' ? normalizeInput(options.aad) : new Uint8Array(options.aad);
    }

    // 重算并校验标签
    const mac = computeCCMMac(roundKeys, nonceBytes, plaintext, aadBytes, authTag.length, qLength);
    const s0 = encryptBlock(buildCCMCounterBlock(nonceBytes, qLength, 0), roundKeys);
    const expectedTag = new Uint8Array(authTag.length);
    for (let i = 0; i < authTag.length; i++) {
      expectedTag[i] = mac[i] ^ s0[i];
    }

    if (!constantTimeEqual(authTag, expectedTag)) {
      throw new Error('Authentication tag verification failed');
    }
  } else {
    throw new Error(`Unsupported cipher mode: ${mode}`);
  }

    // 去除填充
    // 流密码模式不使用填充
  let unpadded: Uint8Array = result;
  if (!isStreamMode) {
     if (padding === PaddingMode.PKCS7) {
      // 去除 PKCS#7 填充
      // 为兼容不同的 ArrayBuffer 类型进行类型断言
      unpadded = pkcs7Unpad(result) as Uint8Array;
    } else if (padding === PaddingMode.ZERO) {
      // 去除零填充
      // 为兼容不同的 ArrayBuffer 类型进行类型断言
      unpadded = zeroUnpad(result) as Uint8Array;
    }
    // 当 padding 设为 'none' 时无需去除填充
  }

  return unpadded;
}
