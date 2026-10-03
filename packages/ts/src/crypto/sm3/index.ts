/**
 * SM3 密码杂凑算法实现
 *
 * 参考标准：
 * - GM/T 0004-2012: SM3 密码杂凑算法
 * - 官方网站：http://www.oscca.gov.cn/
 *
 * SM3 是中国国家密码管理局发布的密码杂凑算法，用于数字签名和验证、
 * 消息认证码生成及验证以及随机数生成等应用。
 *
 * 算法特点：
 * - 输出长度：256 位（32 字节）
 * - 分组长度：512 位（64 字节）
 * - 迭代次数：64 轮
 */

import {
  normalizeInput,
  bytesToHex,
  bytesToBase64,
  hexToBytes,
  rotl,
} from '../../core/utils';
import { OutputFormat, type OutputFormatType } from '../../types/constants';

/**
 * SM3 初始向量 IV
 * 
 * 这些是 SM3 算法规定的固定初始值，
 * 用于压缩函数的初始状态。
 */
const IV: number[] = [
  0x7380166f, 0x4914b2b9, 0x172442d7, 0xda8a0600,
  0xa96f30bc, 0x163138aa, 0xe38dee4d, 0xb0fb0e4e,
];

/**
 * SM3 轮常量 T
 * 
 * T 值根据轮数分为两种：
 * - T_0_15: 用于第 0-15 轮（0x79cc4519）
 * - T_16_63: 用于第 16-63 轮（0x7a879d8a）
 */
const T_0_15 = 0x79cc4519;
const T_16_63 = 0x7a879d8a;

// 模块级复用：JavaScript 单线程下 cf 不会并发执行，
// 把 w / wPrime 提升为常驻 Uint32Array 可以省去每个 512 位块的两次堆分配。
const W_BUF = new Uint32Array(68);
const W_PRIME_BUF = new Uint32Array(64);

/**
 * SM3 压缩函数 CF。
 *
 * 处理一个 512 位（64 字节）消息块，更新链接变量。前 16 轮与后 48 轮分别使用
 * 不同的布尔函数与常量 T，按 GM/T 0004-2012 第 5.3.4 节实现。
 *
 * @param v 当前链接变量（8 个 32 位字）
 * @param b 512 位消息块
 * @returns 更新后的链接变量
 */
function cf(v: number[], b: Uint8Array): number[] {
  const w = W_BUF;
  const wPrime = W_PRIME_BUF;

  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (let i = 0; i < 16; i++) {
    w[i] = view.getUint32(i * 4, false);
  }

  for (let i = 16; i < 68; i++) {
    const temp = w[i - 16] ^ w[i - 9] ^ rotl(w[i - 3], 15);
    // 内联 P1：x ^ rotl(x, 15) ^ rotl(x, 23)
    w[i] = (temp ^ rotl(temp, 15) ^ rotl(temp, 23) ^ rotl(w[i - 13], 7) ^ w[i - 6]) >>> 0;
  }

  for (let i = 0; i < 64; i++) {
    wPrime[i] = (w[i] ^ w[i + 4]) >>> 0;
  }

  // 初始化工作变量
  let a = v[0], b2 = v[1], c = v[2], d = v[3];
  let e = v[4], f = v[5], g = v[6], h = v[7];

  // 主循环 - 分成两部分以减少条件判断
  // 前 16 轮 (j = 0-15)
  for (let j = 0; j < 16; j++) {
    const rotA12 = rotl(a, 12);
    const ss1 = rotl((rotA12 + e + rotl(T_0_15, j % 32)) >>> 0, 7);
    const ss2 = (ss1 ^ rotA12) >>> 0;
    // 内联 ff: x ^ y ^ z (前16轮)
    const tt1 = ((a ^ b2 ^ c) + d + ss2 + wPrime[j]) >>> 0;
    // 内联 gg: x ^ y ^ z (前16轮)
    const tt2 = ((e ^ f ^ g) + h + ss1 + w[j]) >>> 0;

    d = c;
    c = rotl(b2, 9);
    b2 = a;
    a = tt1;
    h = g;
    g = rotl(f, 19);
    f = e;
    // 内联 p0: x ^ rotl(x, 9) ^ rotl(x, 17)
    e = (tt2 ^ rotl(tt2, 9) ^ rotl(tt2, 17)) >>> 0;
  }

  // 后 48 轮 (j = 16-63)
  for (let j = 16; j < 64; j++) {
    const rotA12 = rotl(a, 12);
    const ss1 = rotl((rotA12 + e + rotl(T_16_63, j % 32)) >>> 0, 7);
    const ss2 = (ss1 ^ rotA12) >>> 0;
    // 内联 ff: (x & y) | (x & z) | (y & z) (后48轮)
    const tt1 = (((a & b2) | (a & c) | (b2 & c)) + d + ss2 + wPrime[j]) >>> 0;
    // 内联 gg: (x & y) | (~x & z) (后48轮)
    const tt2 = (((e & f) | (~e & g)) + h + ss1 + w[j]) >>> 0;

    d = c;
    c = rotl(b2, 9);
    b2 = a;
    a = tt1;
    h = g;
    g = rotl(f, 19);
    f = e;
    // 内联 p0: x ^ rotl(x, 9) ^ rotl(x, 17)
    e = (tt2 ^ rotl(tt2, 9) ^ rotl(tt2, 17)) >>> 0;
  }

  return [
    (a ^ v[0]) >>> 0,
    (b2 ^ v[1]) >>> 0,
    (c ^ v[2]) >>> 0,
    (d ^ v[3]) >>> 0,
    (e ^ v[4]) >>> 0,
    (f ^ v[5]) >>> 0,
    (g ^ v[6]) >>> 0,
    (h ^ v[7]) >>> 0,
  ];
}

/**
 * SM3 增量状态机。每次更新立即压缩完整的 64 字节分组，只保留最后一个不足分组，
 * 因而内存占用与总输入长度无关。
 */
export class SM3HashState {
  private state = [...IV];
  private buffer = new Uint8Array(64);
  private buffered = 0;
  private byteLength = 0n;
  private finished = false;

  /** 创建未累计消息的 SM3 状态；完成摘要后需调用 reset 才能再次更新。 */
  constructor() {}

  /**
   * 追加一段消息。字符串按 UTF-8 编码，可多次调用。
   *
   * @param data - 本次追加的文本或原始字节
   * @returns 当前状态实例
   * @throws 已调用 {@link digestBytes} 且尚未 {@link reset} 时抛出错误
   */
  update(data: string | Uint8Array): this {
    if (this.finished) throw new Error('SM3 hash state is finalized; call reset() before update()');
    const input = normalizeInput(data);
    this.byteLength += BigInt(input.length);
    let offset = 0;

    if (this.buffered > 0) {
      const take = Math.min(64 - this.buffered, input.length);
      this.buffer.set(input.subarray(0, take), this.buffered);
      this.buffered += take;
      offset += take;
      if (this.buffered === 64) {
        this.state = cf(this.state, this.buffer);
        this.buffered = 0;
      }
    }
    while (offset + 64 <= input.length) {
      this.state = cf(this.state, input.subarray(offset, offset + 64));
      offset += 64;
    }
    if (offset < input.length) {
      this.buffered = input.length - offset;
      this.buffer.set(input.subarray(offset), 0);
    }
    return this;
  }

  /**
   * 完成填充并返回 32 字节摘要。该方法只能在每次 reset 周期调用一次。
   *
   * @returns 32 字节 SM3 摘要
   * @throws 当前状态已经完成摘要时抛出错误
   */
  digestBytes(): Uint8Array {
    if (this.finished) throw new Error('SM3 hash state is already finalized');
    this.finished = true;
    const finalLength = this.buffered < 56 ? 64 : 128;
    const finalBlocks = new Uint8Array(finalLength);
    finalBlocks.set(this.buffer.subarray(0, this.buffered));
    finalBlocks[this.buffered] = 0x80;
    const bitLength = this.byteLength * 8n;
    for (let i = 0; i < 8; i++) {
      finalBlocks[finalLength - 1 - i] = Number((bitLength >> BigInt(i * 8)) & 0xffn);
    }
    for (let offset = 0; offset < finalBlocks.length; offset += 64) {
      this.state = cf(this.state, finalBlocks.subarray(offset, offset + 64));
    }
    const output = new Uint8Array(32);
    const view = new DataView(output.buffer);
    for (let i = 0; i < 8; i++) view.setUint32(i * 4, this.state[i], false);
    return output;
  }

  /**
   * 清除累计消息和完成状态，恢复到新建实例状态。
   *
   * @returns 当前状态实例
   */
  reset(): this {
    this.state = [...IV];
    this.buffer.fill(0);
    this.buffered = 0;
    this.byteLength = 0n;
    this.finished = false;
    return this;
  }
}

/**
 * SM3 哈希选项
 */
export interface SM3Options {
  /**
   * 输出格式
   * - hex: 十六进制字符串（默认，保持向后兼容）
   * - base64: Base64 编码字符串
   */
  outputFormat?: OutputFormatType;
}

/**
 * 验证输出格式的有效性
 * @param format - 输出格式（hex 或 base64）
 * @throws 如果格式无效则抛出错误
 */
function assertOutputFormat(format?: OutputFormatType) {
  if (format === undefined) return;
  if (format !== OutputFormat.HEX && format !== OutputFormat.BASE64) {
    throw new Error('Invalid output format: must be hex or base64');
  }
}

/**
 * 计算 SM3 哈希摘要（优化实现，减少内存分配并直接操作缓冲区）
 * @param data - 输入数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns 哈希摘要（默认为小写十六进制字符串，64 个字符）
 * @throws 输出格式无效或宿主文本编码器失败时抛出错误
 *
 * @example
 * ```typescript
 * // 十六进制格式（默认）
 * const hash = digest('abc');
 *
 * // Base64 格式
 * const hash64 = digest('abc', { outputFormat: OutputFormat.BASE64 });
 * ```
 */
export function digest(data: string | Uint8Array, options?: SM3Options): string {
  assertOutputFormat(options?.outputFormat);
  // 复用增量状态，避免为一次性摘要再复制一份“消息 + padding”大缓冲区。
  const result = new SM3HashState().update(data).digestBytes();

  // 根据输出格式返回结果
  return options?.outputFormat === OutputFormat.BASE64 ? bytesToBase64(result) : bytesToHex(result);
}

/**
 * 兼容命名：与文档示例和旧版本 API 保持一致
 * @deprecated 请使用 digest 函数
 */
export const sm3Digest = digest;

/**
 * 计算 SM3-HMAC
 * @param key - 密钥（字符串或 Uint8Array）
 * @param data - 要认证的数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns HMAC 值（默认为小写十六进制字符串，64 个字符）
 * @throws 输出格式无效或宿主文本编码器失败时抛出错误
 *
 * @example
 * ```typescript
 * // 十六进制格式（默认）
 * const mac = hmac('secret-key', 'data to authenticate');
 *
 * // Base64 格式
 * const mac64 = hmac('secret-key', 'data to authenticate', { outputFormat: OutputFormat.BASE64 });
 * ```
 */
export function hmac(key: string | Uint8Array, data: string | Uint8Array, options?: SM3Options): string {
  assertOutputFormat(options?.outputFormat);
  let keyBytes = normalizeInput(key);
  const dataBytes = normalizeInput(data);

  const blockSize = 64; // SM3 块大小（字节）

  // 如果密钥长度超过块大小，先进行哈希
  if (keyBytes.length > blockSize) {
    keyBytes = new Uint8Array(hexToBytes(digest(keyBytes)));
  }

  // 将密钥填充到块大小
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  // 创建 ipad 和 opad
  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);

  for (let i = 0; i < blockSize; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  // 分段送入状态机，避免 HMAC 对大消息执行 ipad || data 的整段复制。
  const innerHash = new SM3HashState().update(ipad).update(dataBytes).digestBytes();
  const mac = new SM3HashState().update(opad).update(innerHash).digestBytes();
  return options?.outputFormat === OutputFormat.BASE64 ? bytesToBase64(mac) : bytesToHex(mac);
}
