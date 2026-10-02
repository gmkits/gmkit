/**
 * ZUC 流密码算法 - 核心实现
 *
 * 参考标准：
 * - GM/T 0001-2012: ZUC-128 流密码算法
 * - 官方网站：http://www.oscca.gov.cn/
 *
 * ZUC 是一个面向字的流密码算法，专为 3GPP LTE 加密和完整性保护设计。
 * 本实现基于官方标准文档。
 */

import { hexToBytes, bytesToHex, normalizeInput } from '../../core/utils';

// F 函数使用的 S 盒（S0 和 S1）
// 这些是 ZUC 算法定义的固定置换表，用于非线性变换
const S0: Uint8Array = new Uint8Array([
  0x3e, 0x72, 0x5b, 0x47, 0xca, 0xe0, 0x00, 0x33, 0x04, 0xd1, 0x54, 0x98, 0x09, 0xb9, 0x6d, 0xcb,
  0x7b, 0x1b, 0xf9, 0x32, 0xaf, 0x9d, 0x6a, 0xa5, 0xb8, 0x2d, 0xfc, 0x1d, 0x08, 0x53, 0x03, 0x90,
  0x4d, 0x4e, 0x84, 0x99, 0xe4, 0xce, 0xd9, 0x91, 0xdd, 0xb6, 0x85, 0x48, 0x8b, 0x29, 0x6e, 0xac,
  0xcd, 0xc1, 0xf8, 0x1e, 0x73, 0x43, 0x69, 0xc6, 0xb5, 0xbd, 0xfd, 0x39, 0x63, 0x20, 0xd4, 0x38,
  0x76, 0x7d, 0xb2, 0xa7, 0xcf, 0xed, 0x57, 0xc5, 0xf3, 0x2c, 0xbb, 0x14, 0x21, 0x06, 0x55, 0x9b,
  0xe3, 0xef, 0x5e, 0x31, 0x4f, 0x7f, 0x5a, 0xa4, 0x0d, 0x82, 0x51, 0x49, 0x5f, 0xba, 0x58, 0x1c,
  0x4a, 0x16, 0xd5, 0x17, 0xa8, 0x92, 0x24, 0x1f, 0x8c, 0xff, 0xd8, 0xae, 0x2e, 0x01, 0xd3, 0xad,
  0x3b, 0x4b, 0xda, 0x46, 0xeb, 0xc9, 0xde, 0x9a, 0x8f, 0x87, 0xd7, 0x3a, 0x80, 0x6f, 0x2f, 0xc8,
  0xb1, 0xb4, 0x37, 0xf7, 0x0a, 0x22, 0x13, 0x28, 0x7c, 0xcc, 0x3c, 0x89, 0xc7, 0xc3, 0x96, 0x56,
  0x07, 0xbf, 0x7e, 0xf0, 0x0b, 0x2b, 0x97, 0x52, 0x35, 0x41, 0x79, 0x61, 0xa6, 0x4c, 0x10, 0xfe,
  0xbc, 0x26, 0x95, 0x88, 0x8a, 0xb0, 0xa3, 0xfb, 0xc0, 0x18, 0x94, 0xf2, 0xe1, 0xe5, 0xe9, 0x5d,
  0xd0, 0xdc, 0x11, 0x66, 0x64, 0x5c, 0xec, 0x59, 0x42, 0x75, 0x12, 0xf5, 0x74, 0x9c, 0xaa, 0x23,
  0x0e, 0x86, 0xab, 0xbe, 0x2a, 0x02, 0xe7, 0x67, 0xe6, 0x44, 0xa2, 0x6c, 0xc2, 0x93, 0x9f, 0xf1,
  0xf6, 0xfa, 0x36, 0xd2, 0x50, 0x68, 0x9e, 0x62, 0x71, 0x15, 0x3d, 0xd6, 0x40, 0xc4, 0xe2, 0x0f,
  0x8e, 0x83, 0x77, 0x6b, 0x25, 0x05, 0x3f, 0x0c, 0x30, 0xea, 0x70, 0xb7, 0xa1, 0xe8, 0xa9, 0x65,
  0x8d, 0x27, 0x1a, 0xdb, 0x81, 0xb3, 0xa0, 0xf4, 0x45, 0x7a, 0x19, 0xdf, 0xee, 0x78, 0x34, 0x60,
]);

const S1: Uint8Array = new Uint8Array([
  0x55, 0xc2, 0x63, 0x71, 0x3b, 0xc8, 0x47, 0x86, 0x9f, 0x3c, 0xda, 0x5b, 0x29, 0xaa, 0xfd, 0x77,
  0x8c, 0xc5, 0x94, 0x0c, 0xa6, 0x1a, 0x13, 0x00, 0xe3, 0xa8, 0x16, 0x72, 0x40, 0xf9, 0xf8, 0x42,
  0x44, 0x26, 0x68, 0x96, 0x81, 0xd9, 0x45, 0x3e, 0x10, 0x76, 0xc6, 0xa7, 0x8b, 0x39, 0x43, 0xe1,
  0x3a, 0xb5, 0x56, 0x2a, 0xc0, 0x6d, 0xb3, 0x05, 0x22, 0x66, 0xbf, 0xdc, 0x0b, 0xfa, 0x62, 0x48,
  0xdd, 0x20, 0x11, 0x06, 0x36, 0xc9, 0xc1, 0xcf, 0xf6, 0x27, 0x52, 0xbb, 0x69, 0xf5, 0xd4, 0x87,
  0x7f, 0x84, 0x4c, 0xd2, 0x9c, 0x57, 0xa4, 0xbc, 0x4f, 0x9a, 0xdf, 0xfe, 0xd6, 0x8d, 0x7a, 0xeb,
  0x2b, 0x53, 0xd8, 0x5c, 0xa1, 0x14, 0x17, 0xfb, 0x23, 0xd5, 0x7d, 0x30, 0x67, 0x73, 0x08, 0x09,
  0xee, 0xb7, 0x70, 0x3f, 0x61, 0xb2, 0x19, 0x8e, 0x4e, 0xe5, 0x4b, 0x93, 0x8f, 0x5d, 0xdb, 0xa9,
  0xad, 0xf1, 0xae, 0x2e, 0xcb, 0x0d, 0xfc, 0xf4, 0x2d, 0x46, 0x6e, 0x1d, 0x97, 0xe8, 0xd1, 0xe9,
  0x4d, 0x37, 0xa5, 0x75, 0x5e, 0x83, 0x9e, 0xab, 0x82, 0x9d, 0xb9, 0x1c, 0xe0, 0xcd, 0x49, 0x89,
  0x01, 0xb6, 0xbd, 0x58, 0x24, 0xa2, 0x5f, 0x38, 0x78, 0x99, 0x15, 0x90, 0x50, 0xb8, 0x95, 0xe4,
  0xd0, 0x91, 0xc7, 0xce, 0xed, 0x0f, 0xb4, 0x6f, 0xa0, 0xcc, 0xf0, 0x02, 0x4a, 0x79, 0xc3, 0xde,
  0xa3, 0xef, 0xea, 0x51, 0xe6, 0x6b, 0x18, 0xec, 0x1b, 0x2c, 0x80, 0xf7, 0x74, 0xe7, 0xff, 0x21,
  0x5a, 0x6a, 0x54, 0x1e, 0x41, 0x31, 0x92, 0x35, 0xc4, 0x33, 0x07, 0x0a, 0xba, 0x7e, 0x0e, 0x34,
  0x88, 0xb1, 0x98, 0x7c, 0xf3, 0x3d, 0x60, 0x6c, 0x7b, 0xca, 0xd3, 0x1f, 0x32, 0x65, 0x04, 0x28,
  0x64, 0xbe, 0x85, 0x9b, 0x2f, 0x59, 0x8a, 0xd7, 0xb0, 0x25, 0xac, 0xaf, 0x12, 0x03, 0xe2, 0xf2,
]);

// ZUC-128 LFSR 初始化常量 D（GM/T 0001-2012 / 3GPP TS 35.222 标准值，每个 15 位）
const D_128: Uint16Array = new Uint16Array([
  0x44D7, 0x26BC, 0x626B, 0x135E, 0x5789, 0x35E2, 0x7135, 0x09AF,
  0x4D78, 0x2F13, 0x6BC4, 0x1AF1, 0x5E26, 0x3C4D, 0x789A, 0x47AC,
]);

/**
 * ZUC 状态类
 * 
 * 维护 LFSR（线性反馈移位寄存器）和 FSM（有限状态机）的内部状态。
 * LFSR 包含 16 个 31 位寄存器，FSM 包含 2 个 32 位寄存器。
 * 
 * @example
 * ```typescript
 * const state = new ZUCState();
 * state.initialize(keyBytes, ivBytes);
 * const keyword = state.generateKeyword();
 * ```
 */
export class ZUCState {
  /** LFSR: 16 个 31 位寄存器 */
  private lfsr: Uint32Array;
  /** FSM 寄存器 R1 */
  private r1: number;
  /** FSM 寄存器 R2 */
  private r2: number;

  /** 创建尚未初始化的底层状态；调用 generateKeyword 前必须先调用 initialize。 */
  constructor() {
    this.lfsr = new Uint32Array(16);
    this.r1 = 0;
    this.r2 = 0;
  }

  /**
   * 使用密钥与 IV 初始化状态
   * @param key - 128 位密钥（16 字节）
   * @param iv - 128 位初始向量（16 字节）
   */
  initialize(key: Uint8Array, iv: Uint8Array): void {
    if (key.length !== 16) {
      throw new Error('Key must be 16 bytes for ZUC-128');
    }
    if (iv.length !== 16) {
      throw new Error('IV must be 16 bytes for ZUC-128');
    }

    // 按照标准将密钥与 IV 写入 LFSR
    for (let i = 0; i < 16; i++) {
      this.lfsr[i] = ((key[i] << 23) | (D_128[i] << 8) | iv[i]) >>> 0;
      this.lfsr[i] &= 0x7FFFFFFF; // 仅保留 31 位
    }

    // 初始化 FSM 寄存器
    this.r1 = 0;
    this.r2 = 0;

    // 执行 32 轮初始化过程（不产生输出）
    for (let i = 0; i < 32; i++) {
      this.bitReorganization();
      const w = this.fFunction();
      this.lfsrWithInitMode(w >>> 1);
    }

    // 工作阶段前的丢弃轮（GM/T 0001 / 3GPP TS 35.222 标准要求）
    this.bitReorganization();
    this.fFunction();
    this.lfsrWithWorkMode();
  }

  /**
   * 比特重组：从 LFSR 中抽取特定位构成 32 位字
   * 优化：预分配数组重复使用，避免每次调用都分配新内存
   */
  private x: Uint32Array = new Uint32Array(4);

  /**
   * 执行比特重组操作，将结果保存在 {@link ZUCState#x} 中。
   */
  private bitReorganization(): void {
    this.x[0] = (((this.lfsr[15] & 0x7FFF8000) << 1) | (this.lfsr[14] & 0xFFFF)) >>> 0;
    this.x[1] = (((this.lfsr[11] & 0xFFFF) << 16) | (this.lfsr[9] >>> 15)) >>> 0;
    this.x[2] = (((this.lfsr[7] & 0xFFFF) << 16) | (this.lfsr[5] >>> 15)) >>> 0;
    this.x[3] = (((this.lfsr[2] & 0xFFFF) << 16) | (this.lfsr[0] >>> 15)) >>> 0;
  }

  /**
   * F 函数：使用双 S 盒的非线性变换，并按 GM/T 0001-2012 / 3GPP TS 35.222
   * 第 5.3 节更新 R1/R2。返回内部 W = (X0 ^ R1) + R2；调用方按需 XOR X3
   * 得到密钥流字。
   */
  private fFunction(): number {
    const w = ((this.x[0] ^ this.r1) + this.r2) >>> 0;
    const w1 = (this.r1 + this.x[1]) >>> 0;
    const w2 = (this.r2 ^ this.x[2]) >>> 0;
    this.r1 = this.s(this.l1((((w1 & 0xFFFF) << 16) | (w2 >>> 16)) >>> 0));
    this.r2 = this.s(this.l2((((w2 & 0xFFFF) << 16) | (w1 >>> 16)) >>> 0));
    return w;
  }

  /**
   * S 盒代换：对 32 位字的每个字节进行 S 盒置换
   * 交替使用 S0 和 S1 两个 S 盒
   * @param x - 输入的 32 位字
   * @returns 置换后的 32 位字
   */
  private s(x: number): number {
    return (
      (S0[(x >>> 24) & 0xFF] << 24) |
      (S1[(x >>> 16) & 0xFF] << 16) |
      (S0[(x >>> 8) & 0xFF] << 8) |
      (S1[x & 0xFF])
    ) >>> 0;
  }

  /**
   * 线性变换 L1
   * 用于 FSM 的寄存器更新
   * @param x - 输入值
   * @returns 变换后的值
   */
  private l1(x: number): number {
    return (x ^ this.rotl(x, 2) ^ this.rotl(x, 10) ^ this.rotl(x, 18) ^ this.rotl(x, 24)) >>> 0;
  }

  /**
   * 线性变换 L2
   * 用于 FSM 的寄存器更新
   * @param x - 输入值
   * @returns 变换后的值
   */
  private l2(x: number): number {
    return (x ^ this.rotl(x, 8) ^ this.rotl(x, 14) ^ this.rotl(x, 22) ^ this.rotl(x, 30)) >>> 0;
  }

  /**
   * 循环左移
   * @param x - 要移位的值
   * @param n - 移位位数
   * @returns 移位后的值
   */
  private rotl(x: number, n: number): number {
    return ((x << n) | (x >>> (32 - n))) >>> 0;
  }

  /**
   * 计算 LFSR 反馈值 v：
   * v = (2^15·s_15 + 2^17·s_13 + 2^21·s_10 + 2^20·s_4 + 2^8·s_0 + s_0) mod (2^31 - 1)
   */
  private lfsrFeedback(): number {
    let v = this.mulByPow2(this.lfsr[15], 15);
    v = this.addMod(v, this.mulByPow2(this.lfsr[13], 17));
    v = this.addMod(v, this.mulByPow2(this.lfsr[10], 21));
    v = this.addMod(v, this.mulByPow2(this.lfsr[4], 20));
    v = this.addMod(v, this.mulByPow2(this.lfsr[0], 8));
    v = this.addMod(v, this.lfsr[0]);
    return v;
  }

  /**
   * 初始化模式下的 LFSR（带反馈值 u）
   * 在初始化阶段，F 函数的输出会反馈到 LFSR
   * @param u - 反馈值（F 函数输出的右移 1 位）
   */
  private lfsrWithInitMode(u: number): void {
    let s16 = this.addMod(this.lfsrFeedback(), u);
    if (s16 === 0) {
      s16 = 0x7FFFFFFF;
    }
    for (let i = 0; i < 15; i++) {
      this.lfsr[i] = this.lfsr[i + 1];
    }
    this.lfsr[15] = s16;
  }

  /**
   * 工作模式下的 LFSR（无附加反馈）
   * 在工作模式下，LFSR 独立运行不接受外部反馈
   */
  private lfsrWithWorkMode(): void {
    let s16 = this.lfsrFeedback();
    if (s16 === 0) {
      s16 = 0x7FFFFFFF;
    }
    for (let i = 0; i < 15; i++) {
      this.lfsr[i] = this.lfsr[i + 1];
    }
    this.lfsr[15] = s16;
  }

  /**
   * 模 2^31 - 1 加法
   * ZUC 使用的有限域运算
   * @param a - 加数 a
   * @param b - 加数 b
   * @returns (a + b) mod (2^31 - 1)
   */
  private addMod(a: number, b: number): number {
    const c = (a + b) >>> 0;
    return ((c & 0x7FFFFFFF) + (c >>> 31)) >>> 0;
  }

  /**
   * 模 2^31 - 1 的 2^k 倍乘法
   * @param x - 被乘数
   * @param k - 2 的指数
   * @returns (x * 2^k) mod (2^31 - 1)
   */
  private mulByPow2(x: number, k: number): number {
    return (((x << k) | (x >>> (31 - k))) & 0x7FFFFFFF) >>> 0;
  }

  /**
   * 生成一个 32 位密钥字
   * 每次调用会更新内部状态并返回一个新的密钥字
   * @returns 32 位密钥字
   */
  generateKeyword(): number {
    this.bitReorganization();
    const w = this.fFunction();
    const z = (w ^ this.x[3]) >>> 0;
    this.lfsrWithWorkMode();
    return z;
  }
}

/**
 * 生成 ZUC-128 密钥流
 * @param key - 128 位密钥（16 字节或 32 个十六进制字符）
 * @param iv - 128 位初始向量（16 字节或 32 个十六进制字符）
 * @param length - 需要输出的 32 位密钥字数量
 * @returns 32 位密钥字数组
 * @throws key/IV 无效、length 不是非负安全整数或超出宿主数组容量时抛出错误
 */
export function generateKeystream(
  key: string | Uint8Array,
  iv: string | Uint8Array,
  length: number
): Uint32Array {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new Error('ZUC keystream length must be a non-negative safe integer');
  }
  const keyBytes = decodeZucParameter(key, 'key');
  const ivBytes = decodeZucParameter(iv, 'IV');

  const state = new ZUCState();
  state.initialize(keyBytes, ivBytes);

  const keystream = new Uint32Array(length);
  for (let i = 0; i < length; i++) {
    keystream[i] = state.generateKeyword();
  }

  return keystream;
}

/**
 * 使用 ZUC-128 加密或解密数据，返回字节数组（性能 fast path）。
 *
 * 与 {@link process} 等价但跳过中间的 hex 编码 / 解码，供
 * {@link encrypt} / {@link decrypt} 等高层 API 内部使用。
 */
export function processBytes(
  key: string | Uint8Array,
  iv: string | Uint8Array,
  data: string | Uint8Array,
): Uint8Array {
  const keyBytes = decodeZucParameter(key, 'key');
  const ivBytes = decodeZucParameter(iv, 'IV');
  // 所有文本入口统一走可注入的 UTF-8 codec，保证旧小程序与现代浏览器语义一致。
  const dataBytes = normalizeInput(data);

  const state = new ZUCState();
  state.initialize(keyBytes, ivBytes);

  const output = new Uint8Array(dataBytes.length);
  const numFullWords = Math.floor(dataBytes.length / 4);
  const remainder = dataBytes.length % 4;

  for (let i = 0; i < numFullWords; i++) {
    const keyword = state.generateKeyword();
    const offset = i * 4;
    output[offset] = dataBytes[offset] ^ ((keyword >>> 24) & 0xFF);
    output[offset + 1] = dataBytes[offset + 1] ^ ((keyword >>> 16) & 0xFF);
    output[offset + 2] = dataBytes[offset + 2] ^ ((keyword >>> 8) & 0xFF);
    output[offset + 3] = dataBytes[offset + 3] ^ (keyword & 0xFF);
  }

  if (remainder > 0) {
    const keyword = state.generateKeyword();
    const offset = numFullWords * 4;
    for (let i = 0; i < remainder; i++) {
      const keyByte = (keyword >>> (24 - i * 8)) & 0xFF;
      output[offset + i] = dataBytes[offset + i] ^ keyByte;
    }
  }

  return output;
}

/** 字符串密钥和 IV 必须是完整的 128 位十六进制，避免奇数长度被隐式补齐。 */
function decodeZucParameter(value: string | Uint8Array, label: 'key' | 'IV'): Uint8Array {
  if (value instanceof Uint8Array) {
    if (value.length !== 16) {
      throw new Error(`${label === 'key' ? 'Key' : 'IV'} must be 16 bytes for ZUC-128`);
    }
    return value;
  }

  const normalized = value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]{32}$/.test(normalized)) {
    const displayLabel = label === 'key' ? 'Key' : 'IV';
    throw new Error(`${displayLabel} must be 16 bytes for ZUC-128 (exactly 32 hexadecimal characters)`);
  }
  return hexToBytes(normalized);
}

/**
 * 使用 ZUC-128 加密或解密数据
 * 
 * ZUC 是流密码，加密和解密操作相同（与密钥流异或）
 * 优化：利用按字处理减少内存分配
 * 
 * @param key - 128 位密钥（16 字节或 32 个十六进制字符）
 * @param iv - 128 位初始向量（16 字节或 32 个十六进制字符）
 * @param data - 待加密或解密的数据
 * @returns 十六进制字符串形式的密文或明文
 */
export function process(
  key: string | Uint8Array,
  iv: string | Uint8Array,
  data: string | Uint8Array
): string {
  return bytesToHex(processBytes(key, iv, data));
}
