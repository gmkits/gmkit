/**
 * ZUC 流密码算法实现
 *
 * 参考标准：
 * - GM/T 0001-2012: ZUC-128 流密码算法
 * - 3GPP TS 35.221: EEA3 和 EIA3 规范（基于 ZUC 的 LTE 加密与完整性算法）
 * - 官方网站：http://www.oscca.gov.cn/
 *
 * ZUC（祖冲之算法）是中国国家密码管理局发布的流密码算法，
 * 用于 4G LTE 移动通信网络的加密和完整性保护。
 *
 * 算法特点：
 * - ZUC-128: 128 位密钥和 128 位初始向量
 * - 当前实现仅支持 ZUC-128，不支持 ZUC-256
 * - 输出：32 位字流
 * - 应用：EEA3（加密）和 EIA3（完整性）算法
 */

import { ZUCState, generateKeystream, processBytes } from './core';
import { bytesToHex, stringToBytes, decodeInput, autoDecodeString, encodeOutput, bytesToString, type BytesLike } from '../../core/utils';
import { OutputFormat, type OutputFormatType, type InputFormatType } from '../../types/constants';

/**
 * ZUC 加密选项
 * 
 * 配置 ZUC 流密码加密的输出格式
 */
export interface ZUCOptions {
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
 * ZUC 解密选项
 * 
 * 配置 ZUC 流密码解密的输入格式
 */
export interface ZUCDecryptOptions {
  /**
   * 输入格式
   * - hex: 十六进制字符串
   * - base64: Base64 编码字符串
   *
   * 不传时会自动识别 hex/base64（优先按 hex 识别）
   */
  inputFormat?: InputFormatType;
}

/**
 * 使用 ZUC-128 流密码加密数据
 * @param key 128-bit key (16 bytes or 32 hex chars) / 128 位密钥
 * @param iv 128-bit IV (16 bytes or 32 hex chars) / 128 位初始向量
 * @param plaintext Data to encrypt (string or Uint8Array) / 要加密的数据
 * @param options Encryption options / 加密选项
 * @returns Encrypted data (default hex string) / 加密后的数据（默认十六进制字符串）
 * @throws key/IV 长度或编码无效、输出格式无效，或宿主文本编码器失败时抛出错误
 *
 * @example
 * // 默认 hex 格式（向后兼容）
 * const encrypted = encrypt(key, iv, 'data');
 *
 * @example
 * // Base64 格式
 * const encrypted = encrypt(key, iv, 'data', { outputFormat: OutputFormat.BASE64 });
 */
export function encrypt(
  key: BytesLike,
  iv: BytesLike,
  plaintext: string | Uint8Array,
  options?: ZUCOptions
): string {
  const resultBytes = processBytes(key, iv, plaintext);
  const outputFormat = options?.outputFormat || OutputFormat.HEX;
  return encodeOutput(resultBytes, outputFormat);
}

/**
 * 使用 ZUC-128 流密码解密数据
 * @param key 128-bit key (16 bytes or 32 hex chars) / 128 位密钥
 * @param iv 128-bit IV (16 bytes or 32 hex chars) / 128 位初始向量
 * @param ciphertext Encrypted data (hex or base64 string, auto-detected) / 加密的数据（十六进制或 base64，自动检测）
 * @param options 字符串输入编码；省略时优先识别 Hex，再识别 Base64
 * @returns Decrypted data as string / 解密后的数据
 * @throws key、IV、密文编码无效或宿主文本解码器失败时抛出错误；ZUC 本身不校验消息完整性
 *
 * @example
 * // 自动检测输入格式
 * const decrypted = decrypt(key, iv, encrypted);
 */
export function decrypt(
  key: BytesLike,
  iv: BytesLike,
  ciphertext: BytesLike,
  options?: ZUCDecryptOptions
): string {
  return bytesToString(decryptBytes(key, iv, ciphertext, options));
}

/**
 * 使用 ZUC-128 解密为原始字节；文本 API 无法无损表示任意二进制数据。
 * @param key - 16 字节密钥或 32 个 Hex 字符
 * @param iv - 16 字节 IV 或 32 个 Hex 字符
 * @param ciphertext - Hex/Base64 字符串或原始密文字节
 * @param options - 字符串输入编码；省略时自动识别
 * @returns 与密文等长的原始明文字节
 * @throws key、IV、编码或长度无效时抛出错误
 */
export function decryptBytes(
  key: BytesLike,
  iv: BytesLike,
  ciphertext: BytesLike,
  options?: ZUCDecryptOptions
): Uint8Array {
  const ciphertextBytes = ciphertext instanceof Uint8Array
    ? ciphertext
    : options?.inputFormat
      ? decodeInput(ciphertext, options.inputFormat)
      : autoDecodeString(ciphertext);
  return processBytes(key, iv, ciphertextBytes);
}

/**
 * 生成 ZUC-128 密钥流
 * @param key - 128 位密钥（16 字节或 32 个十六进制字符）
 * @param iv - 128 位初始向量（16 字节或 32 个十六进制字符）
 * @param length - 需要生成的 32 位字数量
 * @returns 十六进制字符串形式的密钥流
 * @throws key/IV 无效、length 不是非负安全整数或超出宿主数组容量时抛出错误
 */
export function getKeystreamWords(
  key: BytesLike,
  iv: BytesLike,
  length: number
): string {
  const keystream = generateKeystream(key, iv, length);
  const bytes = new Uint8Array(length * 4);

  for (let i = 0; i < length; i++) {
    const word = keystream[i];
    const offset = i * 4;
    bytes[offset] = (word >>> 24) & 0xff;
    bytes[offset + 1] = (word >>> 16) & 0xff;
    bytes[offset + 2] = (word >>> 8) & 0xff;
    bytes[offset + 3] = word & 0xff;
  }

  return bytesToHex(bytes);
}

/**
 * 生成 ZUC-128 密钥流（按字节长度）
 * @param key - 16 字节密钥或 32 个 Hex 字符
 * @param iv - 16 字节 IV 或 32 个 Hex 字符
 * @param length - 需要生成的字节长度
 * @returns 固定返回小写 Hex，字符数为 length 的两倍
 * @throws key、IV 或 length 无效时抛出错误
 */
export function getKeystream(
  key: BytesLike,
  iv: BytesLike,
  length: number
): string {
  requireLength(length, 'ZUC keystream byte length');
  const words = Math.ceil(length / 4);
  const hex = getKeystreamWords(key, iv, words);
  return hex.slice(0, length * 2);
}

/**
 * 生成 EEA3 密钥流（用于 LTE 加密）
 * 优化：单次分配 IV 缓冲区
 * @param key - 128 位保密密钥
 * @param count - 32 位计数值
 * @param bearer - 5 位承载标识
 * @param direction - 1 位方向标志（0 表示上行，1 表示下行）
 * @param length - 需要生成的密钥流比特长度
 * @returns EEA3 密钥流
 * @throws key、COUNT、BEARER、DIRECTION 或 bit 长度无效时抛出错误
 */
export function eea3(
  key: BytesLike,
  count: number,
  bearer: number,
  direction: number,
  length: number
): string {
  requireLength(length, 'EEA3 bit length');
  const iv = makeEea3Iv(count, bearer, direction);

  // 生成密钥流
  const numWords = Math.ceil(length / 32);
  return getKeystreamWords(key, iv, numWords);
}

/**
 * 按 3GPP EEA3 规范加密消息。旧 {@link eea3} 继续返回字对齐密钥流以保持兼容。
 * @param key - 16 字节保密密钥
 * @param count - 32 位计数值
 * @param bearer - 0 到 31 的承载标识
 * @param direction - 方向标志，只能为 0 或 1
 * @param message - 待加密消息；字符串按 UTF-8
 * @param bitLength - 参与加密的消息 bit 数；省略时使用全部字节
 * @returns 小写 Hex 密文；末字节未使用 bit 清零
 * @throws 参数范围或 bitLength 无效时抛出错误
 */
export function eea3Encrypt(
  key: BytesLike,
  count: number,
  bearer: number,
  direction: number,
  message: string | Uint8Array,
  bitLength?: number
): string {
  const messageBytes = typeof message === 'string' ? stringToBytes(message) : message;
  const messageBitLength = bitLength ?? messageBytes.length * 8;
  requireMessageBitLength(messageBitLength, messageBytes.length, 'EEA3');

  const outputLength = Math.ceil(messageBitLength / 8);
  const output = processBytes(key, makeEea3Iv(count, bearer, direction), messageBytes.subarray(0, outputLength));
  const unusedBits = outputLength * 8 - messageBitLength;
  if (unusedBits > 0 && outputLength > 0) {
    output[outputLength - 1] &= (0xff << unusedBits) & 0xff;
  }
  return bytesToHex(output);
}

/**
 * 生成 EIA3 完整性标签（用于 LTE 认证）
 * @param key - 128 位完整性密钥
 * @param count - 32 位计数值
 * @param bearer - 5 位承载标识
 * @param direction - 1 位方向标志（0 表示上行，1 表示下行）
 * @param message - 待认证的消息
 * @param bitLength - 参与认证的消息 bit 数；省略时使用全部字节
 * @returns 32 位 MAC-I（十六进制字符串）
 * @throws key、COUNT、BEARER、DIRECTION 无效，或 bitLength 超过消息长度时抛出错误
 */
export function eia3(
  key: BytesLike,
  count: number,
  bearer: number,
  direction: number,
  message: string | Uint8Array,
  bitLength?: number
): string {
  const messageBytes = typeof message === 'string' ? stringToBytes(message) : message;
  const messageBitLength = bitLength ?? messageBytes.length * 8;
  requireMessageBitLength(messageBitLength, messageBytes.length, 'EIA3');

  const iv = makeEia3Iv(count, bearer, direction);

  // 标准算法需要消息末尾字和最后一个 MAC 密钥字，共追加 64 比特。
  const numWords = Math.ceil((messageBitLength + 64) / 32);
  const keystream = generateKeystream(key, iv, numWords);

  let t = 0 >>> 0;
  for (let i = 0; i < messageBitLength; i++) {
    if (getMessageBit(messageBytes, i) === 1) {
      t = (t ^ getWord(keystream, i)) >>> 0;
    }
  }

  t = (t ^ getWord(keystream, messageBitLength)) >>> 0;
  const mac = (t ^ keystream[numWords - 1]) >>> 0;

  // 以 8 个十六进制字符（32 位）返回结果
  return (mac >>> 0).toString(16).padStart(8, '0');
}

function validateEeaEiaParameters(count: number, bearer: number, direction: number): void {
  if (!Number.isInteger(count) || count < 0 || count > 0xffffffff) {
    throw new Error('Invalid count: must be an unsigned 32-bit integer');
  }
  if (!Number.isInteger(bearer) || bearer < 0 || bearer > 0x1f) {
    throw new Error('Invalid bearer: must be a 5-bit integer');
  }
  if (direction !== 0 && direction !== 1) {
    throw new Error('Invalid direction: must be 0 or 1');
  }

}

function makeEea3Iv(count: number, bearer: number, direction: number): Uint8Array {
  validateEeaEiaParameters(count, bearer, direction);
  const iv = new Uint8Array(16);
  iv[0] = (count >>> 24) & 0xFF;
  iv[1] = (count >>> 16) & 0xFF;
  iv[2] = (count >>> 8) & 0xFF;
  iv[3] = count & 0xFF;
  iv[4] = (((bearer & 0x1F) << 3) | ((direction & 0x1) << 2)) & 0xFF;
  iv[8] = iv[0];
  iv[9] = iv[1];
  iv[10] = iv[2];
  iv[11] = iv[3];
  iv[12] = iv[4];
  return iv;
}

function makeEia3Iv(count: number, bearer: number, direction: number): Uint8Array {
  validateEeaEiaParameters(count, bearer, direction);
  const iv = new Uint8Array(16);
  iv[0] = (count >>> 24) & 0xff;
  iv[1] = (count >>> 16) & 0xff;
  iv[2] = (count >>> 8) & 0xff;
  iv[3] = count & 0xff;
  iv[4] = (bearer & 0x1f) << 3;
  // EIA3 的方向位位于后半段两个字节的最高位，不能复用 EEA3 IV。
  iv[8] = iv[0] ^ (direction << 7);
  iv[9] = iv[1];
  iv[10] = iv[2];
  iv[11] = iv[3];
  iv[12] = iv[4];
  iv[13] = iv[5];
  iv[14] = iv[6] ^ (direction << 7);
  iv[15] = iv[7];
  return iv;
}

function requireLength(length: number, label: string): void {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }
}

function requireMessageBitLength(bitLength: number, byteLength: number, algorithm: string): void {
  requireLength(bitLength, `${algorithm} bit length`);
  if (bitLength > byteLength * 8) {
    throw new Error(`${algorithm} bit length must not exceed message length`);
  }
}

function getMessageBit(message: Uint8Array, bitPosition: number): number {
  return (message[Math.floor(bitPosition / 8)] >>> (7 - (bitPosition % 8))) & 1;
}

function getWord(keystream: Uint32Array, bitPosition: number): number {
  const wordIndex = Math.floor(bitPosition / 32);
  const bitOffset = bitPosition % 32;
  if (bitOffset === 0) {
    return keystream[wordIndex] >>> 0;
  }
  return ((keystream[wordIndex] << bitOffset) | (keystream[wordIndex + 1] >>> (32 - bitOffset))) >>> 0;
}

// 导出底层组件以供高级场景使用
// 注意：直接使用底层组件需要理解 ZUC 算法的内部工作原理
export { ZUCState, generateKeystream };

// 导出面向对象封装的 ZUC 类
export { ZUC } from './class';
