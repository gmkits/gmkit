import { InputFormat, OutputFormat, type InputFormatType, type OutputFormatType } from '../types/constants';

/**
 * 预计算的 hex 字符 → 半字节查找表（非 hex 字符标记为 -1）。
 *
 * 用于 hexToBytes 的热路径，替代 parseInt 调用与切片字符串。
 */
const HEX_NIBBLES: Int8Array = (() => {
  const table = new Int8Array(256).fill(-1);
  for (let i = 0; i < 10; i++) table[48 + i] = i;          // '0'-'9'
  for (let i = 0; i < 6; i++) table[97 + i] = 10 + i;      // 'a'-'f'
  for (let i = 0; i < 6; i++) table[65 + i] = 10 + i;      // 'A'-'F'
  return table;
})();

/**
 * 将十六进制字符串转换为 Uint8Array
 * @param hex - 十六进制字符串（可带或不带 0x 前缀）
 * @returns 十六进制字符串的 Uint8Array 表示
 */
export function hexToBytes(hex: string): Uint8Array {
  let start = 0;
  let len = hex.length;
  if (len >= 2 && hex.charCodeAt(0) === 48 /* '0' */) {
    const c1 = hex.charCodeAt(1);
    if (c1 === 120 /* 'x' */ || c1 === 88 /* 'X' */) {
      start = 2;
      len -= 2;
    }
  }

  let oddPad = 0;
  if ((len & 1) !== 0) {
    oddPad = 1;
    len += 1;
  }

  const bytes = new Uint8Array(len >>> 1);
  let bi = 0;
  let i = start;
  if (oddPad) {
    const lo = HEX_NIBBLES[hex.charCodeAt(i)];
    if (lo < 0) throw new Error(`Invalid hex string: ${hex}`);
    bytes[bi++] = lo;
    i += 1;
  }
  for (; bi < bytes.length; bi++) {
    const hi = HEX_NIBBLES[hex.charCodeAt(i)];
    const lo = HEX_NIBBLES[hex.charCodeAt(i + 1)];
    if (hi < 0 || lo < 0) throw new Error(`Invalid hex string: ${hex}`);
    bytes[bi] = (hi << 4) | lo;
    i += 2;
  }
  return bytes;
}

/**
 * 预计算的 Hex 字符串表 (00-ff)
 */
const HEX_STRINGS = Array.from({ length: 256 }, (_, i) =>
  i.toString(16).padStart(2, '0')
);

/**
 * 将 Uint8Array 转换为小写十六进制字符串。
 *
 * 实现细节：使用模块级预计算的 `00`-`ff` 字符串表替代每字节的
 * `toString(16) + padStart`，避免热路径上的临时字符串与函数调用。
 *
 * @param bytes - 要转换的 Uint8Array
 * @returns 小写十六进制字符串
 */
export function bytesToHex(bytes: Uint8Array): string {
  const len = bytes.length;
  const parts = new Array(len);
  for (let i = 0; i < len; i++) {
    parts[i] = HEX_STRINGS[bytes[i]];
  }
  return parts.join('');
}

/** 可由 API 接收的编码字符串或原始字节数组。字符串的具体编码由对应参数决定。 */
export type BytesLike = string | Uint8Array;

/** 受限运行环境注入的 UTF-8 文本编解码器。 */
export type TextCodec = {
  /** 将 JavaScript 字符串编码为 UTF-8 字节。 */
  encode: (input: string) => Uint8Array;
  /** 将 UTF-8 字节解码为 JavaScript 字符串；无效序列的处理由实现决定。 */
  decode: (bytes: Uint8Array) => string;
};

let customTextCodec: TextCodec | null = null;

/**
 * 注入宿主提供的 UTF-8 编解码器，并清除内部缓存。
 *
 * @param codec - 同时提供 encode/decode 的编解码器
 * @remarks 这是模块级配置；设置后新发生的字符串转换使用该编解码器，调用方应在启动阶段完成配置，不要在并发请求中切换。
 * @throws 后续调用中，编解码器返回类型不符合约定时由调用点抛出错误
 */
export function setTextCodec(codec: TextCodec) {
  customTextCodec = codec;
  cachedTextEncoder = null;
  cachedTextDecoder = null;
}

function tryNodeTextEncoder(): TextEncoder | null {
  try {
    if (typeof require !== 'undefined') {
      const { TextEncoder } = require('node:util');
      if (typeof TextEncoder === 'function') {
        return new TextEncoder();
      }
    }
  } catch (_) {}
  return null;
}

function tryNodeTextDecoder(): TextDecoder | null {
  try {
    if (typeof require !== 'undefined') {
      const { TextDecoder } = require('node:util');
      if (typeof TextDecoder === 'function') {
        return new TextDecoder();
      }
    }
  } catch (_) {}
  return null;
}

/**
 * 无原生 TextEncoder 时的 UTF-8 编码实现。
 *
 * 孤立 UTF-16 surrogate 按 WHATWG Encoding 约定替换为 U+FFFD，不能使用
 * encodeURIComponent：后者会直接抛 URIError，导致旧小程序与现代浏览器产生不同摘要。
 * 该函数仅从源码模块导出用于回归测试，不属于包根公开 API。
 */
export function fallbackEncodeUtf8(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const first = str.charCodeAt(i);
    let codePoint = first;

    if (first >= 0xd800 && first <= 0xdbff) {
      const second = i + 1 < str.length ? str.charCodeAt(i + 1) : -1;
      if (second >= 0xdc00 && second <= 0xdfff) {
        codePoint = 0x10000 + ((first - 0xd800) << 10) + (second - 0xdc00);
        i++;
      } else {
        codePoint = 0xfffd;
      }
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      codePoint = 0xfffd;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >>> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >>> 12),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >>> 18),
        0x80 | ((codePoint >>> 12) & 0x3f),
        0x80 | ((codePoint >>> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * 无原生 TextDecoder 时的宽松 UTF-8 解码实现。
 *
 * 与 TextDecoder 默认 fatal=false 一致：非法序列写入 U+FFFD，并在非法续字节处
 * 重新开始解析，避免 decodeURIComponent 对任意二进制明文直接抛异常。
 */
export function fallbackDecodeUtf8(bytes: Uint8Array): string {
  let output = '';
  let index = 0;

  while (index < bytes.length) {
    const first = bytes[index];
    if (first <= 0x7f) {
      output += String.fromCharCode(first);
      index++;
      continue;
    }

    let continuationCount: number;
    let codePoint: number;
    let secondMin = 0x80;
    let secondMax = 0xbf;
    if (first >= 0xc2 && first <= 0xdf) {
      continuationCount = 1;
      codePoint = first & 0x1f;
    } else if (first >= 0xe0 && first <= 0xef) {
      continuationCount = 2;
      codePoint = first & 0x0f;
      if (first === 0xe0) secondMin = 0xa0;
      if (first === 0xed) secondMax = 0x9f;
    } else if (first >= 0xf0 && first <= 0xf4) {
      continuationCount = 3;
      codePoint = first & 0x07;
      if (first === 0xf0) secondMin = 0x90;
      if (first === 0xf4) secondMax = 0x8f;
    } else {
      output += '\ufffd';
      index++;
      continue;
    }

    let consumed = 1;
    let complete = true;
    for (let i = 0; i < continuationCount; i++) {
      const position = index + 1 + i;
      if (position >= bytes.length) {
        consumed = bytes.length - index;
        complete = false;
        break;
      }
      const next = bytes[position];
      const min = i === 0 ? secondMin : 0x80;
      const max = i === 0 ? secondMax : 0xbf;
      if (next < min || next > max) {
        complete = false;
        break;
      }
      codePoint = (codePoint << 6) | (next & 0x3f);
      consumed++;
    }

    if (!complete) {
      output += '\ufffd';
      index += consumed;
      continue;
    }

    if (codePoint <= 0xffff) {
      output += String.fromCharCode(codePoint);
    } else {
      const value = codePoint - 0x10000;
      output += String.fromCharCode(0xd800 + (value >>> 10), 0xdc00 + (value & 0x3ff));
    }
    index += consumed;
  }

  return output;
}

// TextEncoder/TextDecoder 在所有现代 JS runtime 中都是无状态可复用的，
// 缓存到模块级以避免每次 stringToBytes/bytesToString 都触发分配。
let cachedTextEncoder: TextEncoder | null = null;
let cachedTextDecoder: TextDecoder | null = null;

function resolveTextEncoder(): TextEncoder | null {
  if (cachedTextEncoder) return cachedTextEncoder;
  if (typeof TextEncoder !== 'undefined') {
    cachedTextEncoder = new TextEncoder();
    return cachedTextEncoder;
  }
  const nodeEncoder = tryNodeTextEncoder();
  if (nodeEncoder) {
    cachedTextEncoder = nodeEncoder;
    return cachedTextEncoder;
  }
  return null;
}

function resolveTextDecoder(): TextDecoder | null {
  if (cachedTextDecoder) return cachedTextDecoder;
  if (typeof TextDecoder !== 'undefined') {
    cachedTextDecoder = new TextDecoder();
    return cachedTextDecoder;
  }
  const nodeDecoder = tryNodeTextDecoder();
  if (nodeDecoder) {
    cachedTextDecoder = nodeDecoder;
    return cachedTextDecoder;
  }
  return null;
}

/**
 * 将 UTF-8 字符串转换为 Uint8Array
 * @param str - 要转换的字符串
 * @returns 字符串的 Uint8Array 表示
 */
export function stringToBytes(str: string): Uint8Array {
  if (customTextCodec) {
    return customTextCodec.encode(str);
  }
  const encoder = resolveTextEncoder();
  if (encoder) {
    return encoder.encode(str);
  }
  return fallbackEncodeUtf8(str);
}

/**
 * 将 Uint8Array 转换为 UTF-8 字符串
 * @param bytes - 要转换的 Uint8Array
 * @returns UTF-8 字符串
 */
export function bytesToString(bytes: Uint8Array): string {
  if (customTextCodec) {
    return customTextCodec.decode(bytes);
  }
  const decoder = resolveTextDecoder();
  if (decoder) {
    return decoder.decode(bytes);
  }
  return fallbackDecodeUtf8(bytes);
}

/**
 * 将输入规范化为 Uint8Array
 * @param data - 字符串或 Uint8Array 输入
 * @returns Uint8Array
 */
export function normalizeInput(data: string | Uint8Array): Uint8Array {
  return typeof data === 'string' ? stringToBytes(data) : data;
}

/**
 * 将 BytesLike 统一解码为 Uint8Array
 * @param data - Hex/Base64 字符串或 Uint8Array
 * @param inputFormat - 输入格式（默认 hex）
 * @returns 解码后的原始字节；传入 Uint8Array 时原样返回
 * @throws 字符串不符合指定编码，或 inputFormat 不受支持时抛出错误
 */
export function decodeInput(data: BytesLike, inputFormat: InputFormatType = InputFormat.HEX): Uint8Array {
  if (data instanceof Uint8Array) return data;
  if (inputFormat === InputFormat.BASE64) return base64ToBytes(data);
  if (inputFormat === InputFormat.HEX) return hexToBytes(data);
  throw new Error(`Unsupported input format: ${inputFormat}`);
}

/**
 * 将 Uint8Array 编码为字符串输出
 * @param bytes - 要编码的数据
 * @param outputFormat - 输出格式（默认 hex）
 * @returns 小写 Hex 或标准 Base64 字符串
 */
export function encodeOutput(bytes: Uint8Array, outputFormat: OutputFormatType = OutputFormat.HEX): string {
  return outputFormat === OutputFormat.BASE64 ? bytesToBase64(bytes) : bytesToHex(bytes);
}

/**
 * 对两个 Uint8Array 进行异或运算
 * @param a - 第一个数组
 * @param b - 第二个数组
 * @returns 异或结果
 */
export function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (a.length !== b.length) {
    throw new Error('Arrays must have the same length');
  }
  const result = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

/**
 * 对 32 位值进行循环左移
 * @param value - 32 位值
 * @param shift - 要移动的位数
 * @returns 移位后的值
 */
export function rotl(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

/**
 * 将 4 个字节转换为 32 位大端整数
 * @param bytes - 包含待读取字节的数组
 * @param offset - 起始偏移，默认 0；调用方必须保证从此处至少还有 4 字节
 * @returns 0 到 0xffffffff 范围内的无符号整数
 */
export function bytes4ToUint32BE(bytes: Uint8Array, offset: number = 0): number {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  ) >>> 0;
}

/**
 * 将 32 位大端整数转换为 4 个字节
 * @param value - 按 32 位无符号位模式写出的数值
 * @returns 固定 4 字节的大端数组
 */
export function uint32ToBytes4BE(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

/**
 * Base64 编码表（标准 Base64 字符集）
 */
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_LOOKUP = new Int16Array(128).fill(-1);
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_LOOKUP[BASE64_CHARS.charCodeAt(i)] = i;
}

/**
 * 校验标准 Base64，并返回去除空白后的文本和有效字符数。
 * 允许省略末尾填充，但拒绝非法填充和非零 pad bits，避免不同文本被静默解码成相同字节。
 */
function validateBase64(base64: string): { cleaned: string; dataLength: number } {
  let cleaned = '';
  for (let i = 0; i < base64.length; i++) {
    const code = base64.charCodeAt(i);
    if (code === 32 || code === 9 || code === 10 || code === 13) continue;
    cleaned += base64[i];
  }

  if (cleaned.length === 0) return { cleaned, dataLength: 0 };

  const firstPadding = cleaned.indexOf('=');
  const dataLength = firstPadding === -1 ? cleaned.length : firstPadding;
  const paddingLength = cleaned.length - dataLength;

  if (paddingLength > 2 || (paddingLength > 0 && cleaned.length % 4 !== 0)) {
    throw new Error('Invalid Base64 string: malformed padding');
  }
  for (let i = dataLength; i < cleaned.length; i++) {
    if (cleaned.charCodeAt(i) !== 61) {
      throw new Error('Invalid Base64 string: padding must appear only at the end');
    }
  }
  if (dataLength % 4 === 1) {
    throw new Error('Invalid Base64 string: invalid length');
  }
  if (paddingLength === 1 && dataLength % 4 !== 3) {
    throw new Error('Invalid Base64 string: malformed padding');
  }
  if (paddingLength === 2 && dataLength % 4 !== 2) {
    throw new Error('Invalid Base64 string: malformed padding');
  }

  for (let i = 0; i < dataLength; i++) {
    const code = cleaned.charCodeAt(i);
    if (code >= BASE64_LOOKUP.length || BASE64_LOOKUP[code] < 0) {
      throw new Error(`Invalid Base64 string: unexpected character at index ${i}`);
    }
  }

  // RFC 4648 要求末尾未使用的补位为 0；否则编码不是规范表示。
  const remainder = dataLength % 4;
  if (remainder === 2 && (BASE64_LOOKUP[cleaned.charCodeAt(dataLength - 1)] & 0x0f) !== 0) {
    throw new Error('Invalid Base64 string: non-zero padding bits');
  }
  if (remainder === 3 && (BASE64_LOOKUP[cleaned.charCodeAt(dataLength - 1)] & 0x03) !== 0) {
    throw new Error('Invalid Base64 string: non-zero padding bits');
  }

  return { cleaned, dataLength };
}

/**
 * 将 Uint8Array 转换为 Base64 字符串
 * @param bytes - 要转换的 Uint8Array
 * @returns Base64 编码的字符串
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  let i = 0;
  const len = bytes.length;

  // 每次处理 3 个字节（24 位）转换为 4 个 Base64 字符
  while (i < len) {
    const byte1 = bytes[i++];
    const byte2 = i < len ? bytes[i++] : 0;
    const byte3 = i < len ? bytes[i++] : 0;

    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;

    result += BASE64_CHARS[(chunk >> 18) & 0x3f];
    result += BASE64_CHARS[(chunk >> 12) & 0x3f];
    result += BASE64_CHARS[(chunk >> 6) & 0x3f];
    result += BASE64_CHARS[chunk & 0x3f];
  }

  // 处理填充
  const padding = (3 - (len % 3)) % 3;
  if (padding > 0) {
    result = result.slice(0, -padding) + '='.repeat(padding);
  }

  return result;
}

/**
 * 将 Base64 字符串转换为 Uint8Array
 * @param base64 - Base64 编码的字符串
 * @returns Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  const { cleaned, dataLength } = validateBase64(base64);
  if (dataLength === 0) return new Uint8Array(0);

  const outputLen = Math.floor((dataLength * 6) / 8);

  const bytes = new Uint8Array(outputLen);
  let byteIndex = 0;

  // 每次处理 4 个 Base64 字符（24 位）转换为 3 个字节
  for (let i = 0; i < dataLength; i += 4) {
    const char1 = BASE64_LOOKUP[cleaned.charCodeAt(i)];
    const char2 = i + 1 < dataLength ? BASE64_LOOKUP[cleaned.charCodeAt(i + 1)] : 0;
    const char3 = i + 2 < dataLength ? BASE64_LOOKUP[cleaned.charCodeAt(i + 2)] : 0;
    const char4 = i + 3 < dataLength ? BASE64_LOOKUP[cleaned.charCodeAt(i + 3)] : 0;

    const chunk = (char1 << 18) | (char2 << 12) | (char3 << 6) | char4;

    if (byteIndex < outputLen) bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (byteIndex < outputLen) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (byteIndex < outputLen) bytes[byteIndex++] = chunk & 0xff;
  }

  return bytes;
}

/**
 * 检测字符串是否为十六进制格式
 * 优化：使用位运算和字符码判断，避免正则表达式开销
 * 性能考虑：在早期退出场景（无效输入）下性能更好
 * @param str - 要检测的字符串
 * @returns 如果是十六进制格式返回 true
 */
export function isHexString(str: string): boolean {
  if (str.length === 0) return false;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // 使用位运算优化判断逻辑
    // 0-9: 48-57 (0x30-0x39)
    // A-F: 65-70 (0x41-0x46)
    // a-f: 97-102 (0x61-0x66)

    // 快速路径：检查是否为数字 (48-57)
    if ((code - 48) >>> 0 < 10) continue;

    // 转换为小写后检查 (使用位运算 | 0x20 转小写)
    const lowerCode = code | 0x20;
    // 检查是否为 a-f (97-102)
    if ((lowerCode - 97) >>> 0 < 6) continue;

    return false;
  }

  return true;
}

/**
 * 检测字符串是否为 Base64 格式
 * 优化：使用位运算和字符码判断，避免正则表达式开销
 * @param str - 要检测的字符串
 * @returns 如果是 Base64 格式返回 true
 */
export function isBase64String(str: string): boolean {
  if (str.length === 0) return false;
  try {
    return validateBase64(str).dataLength > 0;
  } catch {
    return false;
  }
}

/**
 * 自动检测并解码字符串（十六进制或 Base64）
 * @param str - 十六进制或 Base64 格式的字符串
 * @returns 解码后的 Uint8Array
 * @throws 输入既不是规范 Hex 也不是规范 Base64 时抛出错误
 */
export function autoDecodeString(str: string): Uint8Array {
  if (isHexString(str)) {
    return hexToBytes(str);
  } else if (isBase64String(str)) {
    return base64ToBytes(str);
  }
  // 默认尝试十六进制解码
  return hexToBytes(str);
}


/**
 * 缺少系统 CSPRNG 时的处理策略。
 *
 * `strict` 直接抛错；`warn` 使用兼容随机源并只警告一次；`allow` 静默兼容。
 * `warn` 和 `allow` 的降级输出都不具备密码学安全性。
 */
export type RNGPolicy = 'strict' | 'warn' | 'allow';
// 默认保持旧版兼容：缺少 CSPRNG 时明确警告，但不让小程序等受限运行时直接崩溃。
let rngPolicy: RNGPolicy = 'warn';
let customRNG: ((len: number) => Uint8Array) | null = null;
let unsafeFallbackWarningShown = false;

/**
 * 配置缺少系统 CSPRNG 时的处理策略。默认值是 `warn`。
 *
 * @param policy - `strict`、`warn` 或 `allow`
 * @remarks 这是模块级策略。`warn` 保留受限小程序的兼容降级并发出警告，`strict` 在没有 CSPRNG 时拒绝生成随机材料。
 * @throws 传入其他字符串时抛出错误
 */
export function configureRNG(policy: RNGPolicy): void {
  if (policy !== 'strict' && policy !== 'warn' && policy !== 'allow') {
    throw new Error("Invalid RNG policy: expected 'strict', 'warn', or 'allow'");
  }
  rngPolicy = policy;
}

/**
 * 配置缺少系统 CSPRNG 时的处理策略，行为与 {@link configureRNG} 相同。
 *
 * @param policy - `strict`、`warn` 或 `allow`
 * @deprecated 请使用名称更明确的 {@link configureRNG}
 */
export function setRNGPolicy(policy: RNGPolicy) {
  configureRNG(policy);
}

/**
 * 注入宿主平台的随机字节函数，优先级高于 Web Crypto 和 Node crypto。
 *
 * 调用方负责保证实现来自 CSPRNG。每次调用必须返回精确长度的 `Uint8Array`；
 * 测试中的确定性实现必须在结束后通过 {@link clearCustomRNG} 清除。
 *
 * @param fn - 接收正整数长度并返回相同长度字节数组的函数
 * @remarks 这是模块级配置；函数必须由宿主提供密码学安全随机源，库不会验证其熵质量。配置后会影响密钥生成、签名和加密中的随机数来源。
 * @throws 参数不是函数时立即抛错；返回类型或长度错误时由 {@link getRandomBytes} 抛错
 */
export function setCustomRNG(fn: (len: number) => Uint8Array): void {
  if (typeof fn !== 'function') {
    throw new Error('Custom RNG must be a function');
  }
  customRNG = fn;
}

/**
 * 清除已注入的自定义 RNG，恢复使用系统 RNG（WebCrypto / Node crypto）。
 *
 * 测试 fixture 与跨用例隔离的标准 teardown 接口。生产代码不应调用。
 */
export function clearCustomRNG(): void {
  customRNG = null;
}

/**
 * 是否已注入自定义 RNG。生产启动代码可断言 `!hasCustomRNG()`
 * 以防 deterministic 测试 RNG 误入产物。
 *
 * @returns 已通过 {@link setCustomRNG} 注入函数时返回 true
 */
export function hasCustomRNG(): boolean {
  return customRNG !== null;
}


function tryWebCrypto(len: number): Uint8Array | null {
  try {
    const cryptoObj = (globalThis as any).crypto;
    if (cryptoObj?.getRandomValues) {
      const buf = new Uint8Array(len);
      // Web Crypto 规定单次 getRandomValues 最多填充 65536 字节。
      // 分块调用避免大请求触发 QuotaExceededError 后错误进入兼容随机源。
      for (let offset = 0; offset < len; offset += 65536) {
        cryptoObj.getRandomValues(buf.subarray(offset, Math.min(offset + 65536, len)));
      }
      return buf;
    }
  } catch (_) {}
  return null;
}

/**
 * 兼容旧版 Node.js/CJS 环境。ESM 和浏览器中没有 require 时会直接跳过。
 */
function tryNodeCrypto(len: number): Uint8Array | null {
  try {
    const processObj = (globalThis as any).process;
    if (processObj?.versions?.node && typeof require !== 'undefined') {
      const { randomBytes } = require('node:crypto');
      if (typeof randomBytes === 'function') {
        return new Uint8Array(randomBytes(len));
      }
    }
  } catch (_) {}
  return null;
}

function unsafeFallbackRandom(len: number, warn: boolean): Uint8Array {
  if (warn && !unsafeFallbackWarningShown) {
    console.warn(
      '[gmkit][RNG] WARNING: no CSPRNG is available; using a compatibility fallback that is NOT cryptographically secure. Inject one with setCustomRNG(), or use configureRNG(\'strict\') to reject this environment.'
    );
    unsafeFallbackWarningShown = true;
  }
  const out = new Uint8Array(len);
  let seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  let i = 0;
  while (i < len) {
    // 状态推进 (Weyl Sequence)
    seed = (seed + 0x9e3779b9) | 0;
    let z = seed;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    z = z ^ (z >>> 16);
    if (i < len) out[i++] = z & 0xff;
    if (i < len) out[i++] = (z >>> 8) & 0xff;
    if (i < len) out[i++] = (z >>> 16) & 0xff;
    if (i < len) out[i++] = (z >>> 24) & 0xff;
  }
  return out;
}
/**
 * 生成随机字节的跨平台函数。
 *
 * 优先级（从高到低）:
 * 1. setCustomRNG 显式注入 - 供小程序宿主接入平台 CSPRNG，也可用于测试 fixture
 * 2. Web Crypto API (crypto.getRandomValues) - 密码学安全的随机数生成器
 *    - 浏览器环境：window.crypto.getRandomValues
 *    - Node.js 15+：globalThis.crypto.getRandomValues
 *    - 这是最安全的方式，使用操作系统提供的 CSPRNG
 *
 * 3. Node.js crypto.randomBytes - 兼容没有 globalThis.crypto 的旧版 Node.js/CJS
 * 4. 非安全 fallback - warn（默认）会提示一次，allow 静默兼容，strict 直接拒绝
 *
 * @param len - 需要的字节数，默认 32；必须是正安全整数
 * @returns 精确包含 len 个随机字节的 Uint8Array
 * @throws 长度非法、自定义 RNG 返回类型/长度错误，或 strict 模式下没有 CSPRNG 时抛出错误
 */
export function getRandomBytes(len: number = 32): Uint8Array {
  if (!Number.isSafeInteger(len) || len <= 0) {
    throw new Error('Invalid length for random bytes: expected a positive safe integer');
  }

  // 自定义随机源属于宿主信任边界，必须验证返回类型和精确长度。
  if (customRNG) {
    const result = customRNG(len);
    if (!(result instanceof Uint8Array)) {
      throw new Error('Custom RNG must return a Uint8Array');
    }
    if (result.length !== len) {
      throw new Error(`Custom RNG returned ${result.length} bytes; expected ${len}`);
    }
    return result;
  }
  // WebCrypto
  const webCryptoRes = tryWebCrypto(len);
  if (webCryptoRes) return webCryptoRes;
  // Node.js CJS fallback
  const nodeCryptoRes = tryNodeCrypto(len);
  if (nodeCryptoRes) return nodeCryptoRes;
  if (rngPolicy === 'strict') {
    throw new Error('[gmkit][RNG] No cryptographically secure random generator available.');
  }
  return unsafeFallbackRandom(len, rngPolicy === 'warn');
}

/** 当前 JavaScript 运行环境中与 GMKit 相关的基础能力探测结果。 */
export type EnvReport = {
  /** 是否提供原生 `BigInt`。 */
  hasBigInt: boolean;
  /** 是否提供全局或 Node.js `TextEncoder`。 */
  hasTextEncoder: boolean;
  /** 是否提供全局或 Node.js `TextDecoder`。 */
  hasTextDecoder: boolean;
  /** 是否提供 `crypto.getRandomValues`。 */
  hasWebCrypto: boolean;
  /** 当前 CommonJS 环境是否可加载 `node:crypto.randomBytes`。 */
  hasNodeCrypto: boolean;
};

/**
 * 探测当前环境的文本、BigInt 与随机源能力，不修改全局配置。
 *
 * @returns 每项能力的布尔结果；结果只反映调用当时环境
 */
export function getEnvReport(): EnvReport {
  const hasBigInt = typeof BigInt !== 'undefined';
  const hasTextEncoder = typeof TextEncoder !== 'undefined' || tryNodeTextEncoder() !== null;
  const hasTextDecoder = typeof TextDecoder !== 'undefined' || tryNodeTextDecoder() !== null;
  const hasWebCrypto = typeof (globalThis as any).crypto?.getRandomValues === 'function';
  let hasNodeCrypto = false;
  try {
    if (typeof require !== 'undefined') {
      const { randomBytes } = require('node:crypto');
      hasNodeCrypto = typeof randomBytes === 'function';
    }
  } catch (_) {
    hasNodeCrypto = false;
  }
  return {
    hasBigInt,
    hasTextEncoder,
    hasTextDecoder,
    hasWebCrypto,
    hasNodeCrypto,
  };
}

/**
 * 尽量避免按内容提前返回的字节数组比较。
 *
 * 用途：MAC / AEAD tag / HMAC / SM2 C3 哈希等敏感值比较。普通 `===`
 * 或循环早返回会随首个不匹配位置变化执行时间。JavaScript/JIT 运行时不提供
 * 严格恒时保证，本函数只避免显式按内容提前退出。
 *
 * 语义（与 Java `cn.gmkit.core.Bytes.constantTimeEquals` 对齐）：
 * - 任一侧为 null/undefined 返回 false。
 * - 长度不同返回 false（长度通常由消息格式公开，非机密）。
 * - 两侧均为空数组返回 true。
 * - 长度相同时全字节扫描，不因首字节匹配就早返回。
 *
 * @param a 第一个字节数组
 * @param b 第二个字节数组
 * @returns 内容相同返回 true
 */
export function constantTimeEqual(a: Uint8Array | null | undefined, b: Uint8Array | null | undefined): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
