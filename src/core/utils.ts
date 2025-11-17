/**
 * 将十六进制字符串转换为 Uint8Array
 * @param hex - 十六进制字符串（可带或不带 0x 前缀）
 * @returns 十六进制字符串的 Uint8Array 表示
 */
export function hexToBytes(hex: string): Uint8Array {
  // 如果存在 0x 前缀则移除
  if (hex.startsWith('0x') || hex.startsWith('0X')) {
    hex = hex.slice(2);
  }

  // 确保长度为偶数
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (isNaN(byte)) {
      throw new Error(`Invalid hex string: ${hex}`);
    }
    bytes[i] = byte;
  }

  return bytes;
}

/**
 * 将 Uint8Array 转换为小写十六进制字符串
 * @param bytes - 要转换的 Uint8Array
 * @returns 小写十六进制字符串
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将 UTF-8 字符串转换为 Uint8Array
 * @param str - 要转换的字符串
 * @returns 字符串的 Uint8Array 表示
 */
export function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * 将 Uint8Array 转换为 UTF-8 字符串
 * @param bytes - 要转换的 Uint8Array
 * @returns UTF-8 字符串
 */
export function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
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
  // 移除空白字符 - 优化：使用字符码判断避免正则
  let cleaned = '';
  for (let i = 0; i < base64.length; i++) {
    const code = base64.charCodeAt(i);
    // 跳过空白字符：空格(32), \t(9), \n(10), \r(13)
    if (code !== 32 && code !== 9 && code !== 10 && code !== 13) {
      cleaned += base64[i];
    }
  }
  base64 = cleaned;

  // 创建反向查找表
  const lookup: { [key: string]: number } = {};
  for (let i = 0; i < BASE64_CHARS.length; i++) {
    lookup[BASE64_CHARS[i]] = i;
  }

  // 计算输出长度
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const len = base64.length;
  const outputLen = (len * 3) / 4 - padding;

  const bytes = new Uint8Array(outputLen);
  let byteIndex = 0;

  // 每次处理 4 个 Base64 字符（24 位）转换为 3 个字节
  for (let i = 0; i < len; i += 4) {
    const char1 = lookup[base64[i]] || 0;
    const char2 = lookup[base64[i + 1]] || 0;
    const char3 = lookup[base64[i + 2]] || 0;
    const char4 = lookup[base64[i + 3]] || 0;

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

  const len = str.length;

  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);

    // 填充字符 '=' (61) 只能出现在最后两个位置
    if (code === 61) {
      if (i >= len - 2) continue;
      return false;
    }

    // 使用位运算优化判断
    // A-Z: 65-90, a-z: 97-122, 0-9: 48-57, +: 43, /: 47

    // 快速路径：数字 0-9 (48-57)
    if ((code - 48) >>> 0 < 10) continue;

    // 大写字母 A-Z (65-90)
    if ((code - 65) >>> 0 < 26) continue;

    // 小写字母 a-z (97-122)
    if ((code - 97) >>> 0 < 26) continue;

    // + (43) 或 / (47)
    if (code === 43 || code === 47) continue;

    return false;
  }

  return true;
}

/**
 * 自动检测并解码字符串（十六进制或 Base64）
 * @param str - 十六进制或 Base64 格式的字符串
 * @returns 解码后的 Uint8Array
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


export type RNGPolicy = 'strict' | 'warn' | 'allow';
let rngPolicy: RNGPolicy = 'warn';
let customRNG: ((len: number) => Uint8Array) | null = null;
// 配置函数
export function configureRNG(policy: RNGPolicy) {
  rngPolicy = policy;
}

export function setCustomRNG(fn: (len: number) => Uint8Array) {
  customRNG = fn;
}


function tryWebCrypto(len: number): Uint8Array | null {
  try {
    const cryptoObj = (globalThis as any).crypto;
    if (cryptoObj?.getRandomValues) {
      const buf = new Uint8Array(len);
      cryptoObj.getRandomValues(buf);
      return buf;
    }
  } catch (_) {}
  return null;
}

/**
 * Node.js RNG（动态 require，避免 bundler 报错）
 */
function tryNodeCrypto(len: number): Uint8Array | null {
  try {
    if (typeof require !== 'undefined') {
      const { randomBytes } = require('node:crypto');
      if (typeof randomBytes === 'function') {
        return new Uint8Array(randomBytes(len));
      }
    }
  } catch (_) {}
  return null;
}

function unsafeFallbackRandom(len: number): Uint8Array {
  console.warn(
    '[gmkit][RNG] WARNING: using unsafe fallback RNG. This is NOT cryptographically secure!'
  );
  const out = new Uint8Array(len);
  let seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;

  // splitmix32
  const next = () => {
    seed = (seed + 0x9e3779b9) >>> 0;
    let z = seed;
    z = (z ^ (z >>> 16)) * 0x85ebca6b;
    z = (z ^ (z >>> 13)) * 0xc2b2ae35;
    z = (z ^ (z >>> 16)) >>> 0;
    return z & 0xff;
  };

  for (let i = 0; i < len; i++) {
    out[i] = next();
  }
  return out;
}
/**
 * 生成随机字节的跨平台函数
 * 优雅地处理 Node.js 和浏览器环境，提供三重回退机制
 *
 * 优先级（从高到低）:
 * 1. Web Crypto API (crypto.getRandomValues) - 密码学安全的随机数生成器
 *    - 浏览器环境：window.crypto.getRandomValues
 *    - Node.js 15+：globalThis.crypto.getRandomValues
 *    - 这是最安全的方式，使用操作系统提供的 CSPRNG
 *
 * 2. Node.js Crypto Module (crypto.randomBytes) - 密码学安全的随机数生成器
 *    - 同样使用操作系统提供的 CSPRNG
 *    - 为旧版本 Node.js 提供安全的随机数
 *
 * 3. 时间戳 + Math.random() - 应急回退方案
 *    -  警告：这不是密码学安全的！
 *    - 不应在生产环境中使用,我提醒了你！
 *    - 会在控制台输出警告信息！
 *
 * 设计理念：
 * - 优先使用最安全的随机数源
 * - 在不可用时自动降级到次优方案
 * - 确保在各种环境（浏览器、Node.js、小程序）中都能正常工作
 * - 通过警告信息提醒开发者当前使用的随机数源质量
 *
 * 在 Node.js 环境中，通过 test/setup.ts 中的 polyfill 提供 crypto.getRandomValues
 * 在浏览器环境中，直接使用 Web Crypto API
 * 在微信小程序等环境中，可能需要自行实现回退方案
 */
export function getRandomBytes(len: number = 32): Uint8Array {
  if (len <= 0) throw new Error('Invalid length for random bytes');

  // WebCrypto
  const webCryptoRes = tryWebCrypto(len);
  if (webCryptoRes) return webCryptoRes;
  // NodeCrypto
  const nodeCryptoRes = tryNodeCrypto(len);
  if (nodeCryptoRes) return nodeCryptoRes;
  // Custom RNG
  if (customRNG) return customRNG(len);
  // Unsafe fallback
  if (rngPolicy === 'strict') {
    throw new Error('[gmkit][RNG] No cryptographically secure random generator available.');
  }
  return unsafeFallbackRandom(len);
}
