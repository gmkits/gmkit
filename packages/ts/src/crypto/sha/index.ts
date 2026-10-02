/**
 * SHA 哈希算法实现
 *
 * 基于 @noble/hashes 的纯 TypeScript 实现。依赖项目公开的审计材料不等于
 * GMKit 组合实现已完成独立安全审计，JavaScript/JIT 运行时也不保证严格恒时。
 *
 * 支持的算法：
 * - SHA-256: 256 位哈希输出，推荐作为默认选择
 * - SHA-384: 384 位哈希输出，基于 SHA-512 的截断版本
 * - SHA-512: 512 位哈希输出，适合 192 bit 以上安全等级或更宽摘要空间
 * - SHA-1: 160 位哈希输出（已弃用，仅用于与历史系统对接，请勿用于安全敏感场景）
 *
 * @see https://csrc.nist.gov/publications/detail/fips/180/4/final FIPS 180-4 标准
 */

import { sha256 as nobleSha256, sha384 as nobleSha384, sha512 as nobleSha512 } from '@noble/hashes/sha2.js';
import { sha1 as nobleSha1 } from '@noble/hashes/legacy.js';
import { hmac as nobleHmac } from '@noble/hashes/hmac.js';
import { normalizeInput, bytesToHex, bytesToBase64 } from '../../core/utils';
import { OutputFormat, type OutputFormatType } from '../../types/constants';

/**
 * SHA 哈希选项
 * 
 * 配置 SHA 哈希函数的输出格式
 */
export interface SHAOptions {
  /**
   * 输出格式
   * - hex: 十六进制字符串（默认）
   * - base64: Base64 编码字符串
   */
  outputFormat?: OutputFormatType;
}

/**
 * 格式化输出结果
 * @param bytes - 字节数组
 * @param format - 输出格式
 * @returns 格式化后的字符串
 */
function formatOutput(bytes: Uint8Array, format: OutputFormatType = OutputFormat.HEX): string {
  if (format !== OutputFormat.HEX && format !== OutputFormat.BASE64) {
    throw new Error('Invalid output format: must be hex or base64');
  }
  return format === OutputFormat.BASE64 ? bytesToBase64(bytes) : bytesToHex(bytes);
}

/**
 * 计算 SHA-256 哈希摘要
 * @param data - 输入数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns 哈希摘要（默认十六进制字符串，64 个字符）
 * @throws 输出格式无效、输入类型不受支持或宿主文本编码器失败时抛出错误
 *
 * @example
 * ```typescript
 * const hash = sha256('abc');
 * console.log(hash); // 十六进制格式
 *
 * const hash64 = sha256('abc', { outputFormat: OutputFormat.BASE64 });
 * console.log(hash64); // Base64 格式
 * ```
 */
export function sha256(data: string | Uint8Array, options?: SHAOptions): string {
  const bytes = normalizeInput(data);
  const hash = nobleSha256(bytes);
  return formatOutput(hash, options?.outputFormat);
}

/**
 * 计算 SHA-384 哈希摘要
 * @param data - 输入数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns 哈希摘要（默认十六进制字符串，96 个字符）
 * @throws 输出格式无效、输入类型不受支持或宿主文本编码器失败时抛出错误
 *
 * @example
 * ```typescript
 * const hash = sha384('abc');
 * console.log(hash); // 十六进制格式
 * ```
 */
export function sha384(data: string | Uint8Array, options?: SHAOptions): string {
  const bytes = normalizeInput(data);
  const hash = nobleSha384(bytes);
  return formatOutput(hash, options?.outputFormat);
}

/**
 * 计算 SHA-512 哈希摘要
 * @param data - 输入数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns 哈希摘要（默认十六进制字符串，128 个字符）
 * @throws 输出格式无效、输入类型不受支持或宿主文本编码器失败时抛出错误
 *
 * @example
 * ```typescript
 * const hash = sha512('abc');
 * console.log(hash); // 十六进制格式
 * ```
 */
export function sha512(data: string | Uint8Array, options?: SHAOptions): string {
  const bytes = normalizeInput(data);
  const hash = nobleSha512(bytes);
  return formatOutput(hash, options?.outputFormat);
}

/**
 * 计算 SHA-1 哈希摘要
 * 
 * ⚠️ 安全警告：
 * SHA-1 已于 2017 年被 Google 证明存在实际碰撞攻击（SHAttered）。
 * 请勿用于密码签名、数字证书等安全敏感场景。
 * 仅建议用于兼容旧系统或非安全敏感的校验和。
 * 
 * @param data - 输入数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns 哈希摘要（默认十六进制字符串，40 个字符）
 * @throws 输出格式无效、输入类型不受支持或宿主文本编码器失败时抛出错误
 *
 * @example
 * ```typescript
 * const hash = sha1('abc');
 * console.log(hash); // 十六进制格式
 * ```
 * 
 * @deprecated 不推荐用于新项目，请使用 SHA-256 或更高版本
 */
export function sha1(data: string | Uint8Array, options?: SHAOptions): string {
  const bytes = normalizeInput(data);
  const hash = nobleSha1(bytes);
  return formatOutput(hash, options?.outputFormat);
}

/**
 * 计算 HMAC-SHA256
 * @param key - 密钥（字符串或 Uint8Array）
 * @param data - 要认证的数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns HMAC 值（默认十六进制字符串，64 个字符）
 * @throws 输出格式无效、key/data 类型不受支持或宿主文本编码器失败时抛出错误
 *
 * @example
 * ```typescript
 * const mac = hmacSha256('secret-key', 'data to authenticate');
 * console.log(mac); // 十六进制格式
 * ```
 */
export function hmacSha256(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SHAOptions
): string {
  const keyBytes = normalizeInput(key);
  const dataBytes = normalizeInput(data);
  const mac = nobleHmac(nobleSha256, keyBytes, dataBytes);
  return formatOutput(mac, options?.outputFormat);
}

/**
 * 计算 HMAC-SHA384
 * @param key - 密钥（字符串或 Uint8Array）
 * @param data - 要认证的数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns HMAC 值（默认十六进制字符串，96 个字符）
 * @throws 输出格式无效、key/data 类型不受支持或宿主文本编码器失败时抛出错误
 */
export function hmacSha384(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SHAOptions
): string {
  const keyBytes = normalizeInput(key);
  const dataBytes = normalizeInput(data);
  const mac = nobleHmac(nobleSha384, keyBytes, dataBytes);
  return formatOutput(mac, options?.outputFormat);
}

/**
 * 计算 HMAC-SHA512
 * @param key - 密钥（字符串或 Uint8Array）
 * @param data - 要认证的数据（字符串或 Uint8Array）
 * @param options - 哈希选项
 * @returns HMAC 值（默认十六进制字符串，128 个字符）
 * @throws 输出格式无效、key/data 类型不受支持或宿主文本编码器失败时抛出错误
 */
export function hmacSha512(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SHAOptions
): string {
  const keyBytes = normalizeInput(key);
  const dataBytes = normalizeInput(data);
  const mac = nobleHmac(nobleSha512, keyBytes, dataBytes);
  return formatOutput(mac, options?.outputFormat);
}
