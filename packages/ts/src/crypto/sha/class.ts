/**
 * SHA 哈希算法的面向对象 API
 */

import { sha256 as nobleSha256, sha384 as nobleSha384, sha512 as nobleSha512 } from '@noble/hashes/sha2.js';
import { sha1 as nobleSha1 } from '@noble/hashes/legacy.js';
import { normalizeInput, bytesToHex, bytesToBase64 } from '../../core/utils';
import { OutputFormat, type OutputFormatType } from '../../types/constants';

/**
 * SHA 哈希算法的抽象基类
 * 
 * 提供增量哈希的通用实现，子类通过指定不同的哈希算法来实现
 * SHA-256、SHA-384、SHA-512 和 SHA-1。
 */
abstract class SHABase {
  /** 底层哈希器实例 */
  protected hasher: any;
  /** 输出格式（hex 或 base64） */
  protected outputFormat: OutputFormatType;

  protected constructor(hasher: any, outputFormat: OutputFormatType = OutputFormat.HEX) {
    assertOutputFormat(outputFormat);
    this.hasher = hasher.create();
    this.outputFormat = outputFormat;
  }

  /**
   * 更新哈希状态（增量哈希）
   * @param data - 要添加的数据（字符串或 Uint8Array）
   * @returns 当前实例（支持链式调用）
   */
  update(data: string | Uint8Array): this {
    const bytes = normalizeInput(data);
    this.hasher.update(bytes);
    return this;
  }

  /**
   * 完成哈希计算并返回结果
   * 注意：调用此方法后哈希器状态会被重置
   * @returns 哈希摘要
   * @throws 底层输入状态无效或输出编码配置无效时抛出错误
   */
  digest(): string {
    const hash = this.hasher.digest();
    // noble 的 digest() 会销毁当前实例；立即重建以兑现本类可复用的 API 约定。
    this.hasher = this.getHasherConstructor().create();
    return this.outputFormat === OutputFormat.BASE64 ? bytesToBase64(hash) : bytesToHex(hash);
  }

  /**
   * 重置哈希状态
   * @returns 当前实例（支持链式调用）
   */
  reset(): this {
    this.hasher = this.getHasherConstructor().create();
    return this;
  }

  /**
   * 设置输出格式
   * @param format - 输出格式
   */
  setOutputFormat(format: OutputFormatType): void {
    assertOutputFormat(format);
    this.outputFormat = format;
  }

  /**
   * 获取输出格式
   * @returns 当前输出格式（hex 或 base64）
   */
  getOutputFormat(): OutputFormatType {
    return this.outputFormat;
  }

  /**
   * 获取哈希器构造函数（子类实现）
   * 用于 reset() 方法中创建新的哈希器实例
   */
  protected abstract getHasherConstructor(): any;
}

function assertOutputFormat(format: OutputFormatType): void {
  if (format !== OutputFormat.HEX && format !== OutputFormat.BASE64) {
    throw new Error('Invalid output format: must be hex or base64');
  }
}

/**
 * SHA-256 哈希类
 * 
 * 输出长度：256 位（32 字节）64 个十六进制字符）
 * 
 * @example
 * ```typescript
 * // 静态方法
 * const hash = SHA256.digest('abc');
 *
 * // 增量哈希
 * const sha = new SHA256();
 * sha.update('a').update('bc');
 * const result = sha.digest();
 * ```
 */
export class SHA256 extends SHABase {
  /**
   * 创建 SHA256 实例
   * @param outputFormat - 输出格式（默认 hex）
   */
  constructor(outputFormat?: OutputFormatType) {
    super(nobleSha256, outputFormat);
  }

  protected getHasherConstructor(): any {
    return nobleSha256;
  }

  /**
   * 静态方法：计算 SHA-256 哈希
   * @param data - 输入数据
   * @param outputFormat - 输出格式（默认 hex）
   * @returns 哈希摘要
   * @throws 输入类型或输出格式无效时抛出错误
   */
  static digest(data: string | Uint8Array, outputFormat: OutputFormatType = OutputFormat.HEX): string {
    assertOutputFormat(outputFormat);
    const bytes = normalizeInput(data);
    const hash = nobleSha256(bytes);
    return outputFormat === OutputFormat.BASE64 ? bytesToBase64(hash) : bytesToHex(hash);
  }
}

/**
 * SHA-384 哈希类
 * 
 * 输出长度：384 位（48 字节）96 个十六进制字符）
 */
export class SHA384 extends SHABase {
  /**
   * 创建 SHA384 实例
   * @param outputFormat - 输出格式（默认 hex）
   */
  constructor(outputFormat?: OutputFormatType) {
    super(nobleSha384, outputFormat);
  }

  protected getHasherConstructor(): any {
    return nobleSha384;
  }

  /**
   * 静态方法：计算 SHA-384 哈希
   * @param data - 输入数据
   * @param outputFormat - 输出格式（默认 hex）
   * @returns 哈希摘要
   * @throws 输入类型或输出格式无效时抛出错误
   */
  static digest(data: string | Uint8Array, outputFormat: OutputFormatType = OutputFormat.HEX): string {
    assertOutputFormat(outputFormat);
    const bytes = normalizeInput(data);
    const hash = nobleSha384(bytes);
    return outputFormat === OutputFormat.BASE64 ? bytesToBase64(hash) : bytesToHex(hash);
  }
}

/**
 * SHA-512 哈希类
 * 
 * 输出长度：512 位（64 字节），128 个十六进制字符
 */
export class SHA512 extends SHABase {
  /**
   * 创建 SHA512 实例
   * @param outputFormat - 输出格式（默认 hex）
   */
  constructor(outputFormat?: OutputFormatType) {
    super(nobleSha512, outputFormat);
  }

  protected getHasherConstructor(): any {
    return nobleSha512;
  }

  /**
   * 静态方法：计算 SHA-512 哈希
   * @param data - 输入数据
   * @param outputFormat - 输出格式（默认 hex）
   * @returns 哈希摘要
   * @throws 输入类型或输出格式无效时抛出错误
   */
  static digest(data: string | Uint8Array, outputFormat: OutputFormatType = OutputFormat.HEX): string {
    assertOutputFormat(outputFormat);
    const bytes = normalizeInput(data);
    const hash = nobleSha512(bytes);
    return outputFormat === OutputFormat.BASE64 ? bytesToBase64(hash) : bytesToHex(hash);
  }
}

/**
 * SHA-1 哈希类
 * 
 * 输出长度：160 位（20 字节）40 个十六进制字符）
 * 
 * ⚠️ 警告：SHA-1 已被证明存在安全漏洞，不推荐用于安全敏感场景
 *
 * @deprecated 只用于读取或核对无法立即迁移的旧协议；新协议使用 {@link SHA256} 或更高版本
 */
export class SHA1 extends SHABase {
  /**
   * 创建 SHA1 实例
   * @param outputFormat - 输出格式（默认 hex）
   */
  constructor(outputFormat?: OutputFormatType) {
    super(nobleSha1, outputFormat);
  }

  protected getHasherConstructor(): any {
    return nobleSha1;
  }

  /**
   * 静态方法：计算 SHA-1 哈希
   * @param data - 输入数据
   * @param outputFormat - 输出格式（默认 hex）
   * @returns 哈希摘要
   * @throws 输入类型或输出格式无效时抛出错误
   */
  static digest(data: string | Uint8Array, outputFormat: OutputFormatType = OutputFormat.HEX): string {
    assertOutputFormat(outputFormat);
    const bytes = normalizeInput(data);
    const hash = nobleSha1(bytes);
    return outputFormat === OutputFormat.BASE64 ? bytesToBase64(hash) : bytesToHex(hash);
  }
}
