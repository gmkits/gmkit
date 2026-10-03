/**
 * SM2 椭圆曲线公钥密码算法实现
 * 符合以下标准：
 * - GM/T 0003-2012: SM2 椭圆曲线公钥密码算法
 * - GM/T 0009-2023: SM2 密码算法使用规范（替代 GM/T 0009-2012）
 *
 * 使用 @noble/curves 进行高效的椭圆曲线运算
 */

import {digest as sm3Digest} from '../sm3';
import {
  normalizeInput,
  hexToBytes,
  bytesToHex,
  bytesToString,
  decodeInput,
  autoDecodeString,
  encodeOutput,
  getRandomBytes,
  type BytesLike,
} from '../../core/utils';
import {
  SM2CipherMode,
  OutputFormat,
  type SM2CipherModeType,
  type OutputFormatType,
  type InputFormatType,
  DEFAULT_USER_ID
} from '../../types/constants';
import {sm2, SM2_CURVE_PARAMS} from './curve';
import {encodeSignature, decodeSignature} from '../../core/asn1';

/**
 * 标准 SM2 曲线参数的兼容声明。
 *
 * 当前实现固定使用 `sm2p256v1`。调用方可以省略该对象，或重复声明标准参数；
 * 传入不同参数会抛出错误，不表示支持自定义曲线。
 */
export interface SM2CurveParams {
  /** 素数域模数，小写或大写十六进制字符串。 */
  p?: string;
  /** 曲线系数 a，十六进制字符串。 */
  a?: string;
  /** 曲线系数 b，十六进制字符串。 */
  b?: string;
  /** 基点 x 坐标，十六进制字符串。 */
  Gx?: string;
  /** 基点 y 坐标，十六进制字符串。 */
  Gy?: string;
  /** 基点的阶 n，十六进制字符串。 */
  n?: string;
}

/**
 * 密钥对接口
 */
export interface KeyPair {
  /** 公钥十六进制字符串；默认是以 `04` 开头的 65 字节非压缩点。 */
  publicKey: string;
  /** 私钥小写十六进制字符串，固定 32 字节。 */
  privateKey: string;
}

/**
 * SM2 加密选项
 */
export interface SM2EncryptOptions {
  /**
   * 密文模式
   * - C1C3C2: C1 || C3 || C2（默认，推荐）
   * - C1C2C3: C1 || C2 || C3
   *
   * 默认：C1C3C2
   */
  mode?: SM2CipherModeType;

  /**
   * 输出格式
   * - hex：十六进制字符串（默认，保持向后兼容）
   * - base64：Base64 编码字符串
   *
   * 默认：hex
   */
  outputFormat?: OutputFormatType;
}

/**
 * SM2 解密选项
 */
export interface SM2DecryptOptions {
  /**
   * 密文模式
   * - C1C3C2: C1 || C3 || C2（默认，推荐）
   * - C1C2C3: C1 || C2 || C3
   */
  mode?: SM2CipherModeType;

  /**
   * 输入格式（可选）
   * - hex: 十六进制字符串
   * - base64: Base64 编码字符串
   *
   * 不传时会自动识别 hex/base64（优先按 hex 识别）
   */
  inputFormat?: InputFormatType;
}

/** SM2 签名输出格式：64 字节 `r || s` 或 ASN.1 DER SEQUENCE。 */
export type SM2SignatureFormat = 'raw' | 'der';

/** SM2 签名输入格式；`auto` 根据首字节与长度尝试识别 raw/DER。 */
export type SM2SignatureInputFormat = SM2SignatureFormat | 'auto';

/**
 * 验证字符串是否为有效的十六进制字符串（不使用正则表达式）
 */
function isValidHexString(str: string): boolean {
  if (str.length === 0) {
    return false;
  }

  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    // 检查是否为 0-9、a-f、A-F
    const isDigit = c >= 48 && c <= 57;  // 字符 0-9
    const isLowerHex = c >= 97 && c <= 102;  // 字符 a-f
    const isUpperHex = c >= 65 && c <= 70;  // 字符 A-F

    if (!isDigit && !isLowerHex && !isUpperHex) {
      return false;
    }
  }

  return true;
}

function normalizeSM2CipherMode(mode?: SM2CipherModeType): SM2CipherModeType {
  if (mode === undefined) {
    return SM2CipherMode.C1C3C2;
  }
  if (mode !== SM2CipherMode.C1C3C2 && mode !== SM2CipherMode.C1C2C3) {
    throw new Error(`Unsupported SM2 cipher mode: ${String(mode)}`);
  }
  return mode;
}

function normalizeSM2OutputFormat(outputFormat?: OutputFormatType): OutputFormatType {
  if (outputFormat === undefined) {
    return OutputFormat.HEX;
  }
  if (outputFormat !== OutputFormat.HEX && outputFormat !== OutputFormat.BASE64) {
    throw new Error(`Unsupported output format: ${String(outputFormat)}`);
  }
  return outputFormat;
}

function normalizeSM2SignatureFormat(signatureFormat?: SM2SignatureFormat): SM2SignatureFormat {
  if (signatureFormat === undefined) {
    return 'raw';
  }
  if (signatureFormat !== 'raw' && signatureFormat !== 'der') {
    throw new Error(`Unsupported SM2 signature format: ${String(signatureFormat)}`);
  }
  return signatureFormat;
}

function normalizeSM2SignatureInputFormat(signatureFormat?: SM2SignatureInputFormat): SM2SignatureInputFormat {
  if (signatureFormat === undefined) {
    return 'raw';
  }
  if (signatureFormat !== 'raw' && signatureFormat !== 'der' && signatureFormat !== 'auto') {
    throw new Error(`Unsupported SM2 signature format: ${String(signatureFormat)}`);
  }
  return signatureFormat;
}

/**
 * 自动识别并规范化私钥输入
 * 支持：hex字符串（带或不带0x前缀）
 */
function normalizePrivateKeyInput(privateKey: BytesLike): string {
  if (privateKey instanceof Uint8Array) {
    if (privateKey.length !== 32) {
      throw new Error('Invalid private key: must be 32 bytes');
    }
    return bytesToHex(privateKey);
  }

  let cleaned = privateKey.trim();

  // 移除 0x 前缀
  if (cleaned.startsWith('0x') || cleaned.startsWith('0X')) {
    cleaned = cleaned.slice(2);
  }

  // 验证是否为有效的十六进制字符串
  if (!isValidHexString(cleaned)) {
    throw new Error('Invalid private key: must be a hexadecimal string');
  }

  // 确保长度为64个字符（32字节）
  if (cleaned.length !== 64) {
    // 如果太短，左侧填充0
    if (cleaned.length < 64) {
      cleaned = cleaned.padStart(64, '0');
    } else {
      throw new Error('Invalid private key: must be 32 bytes (64 hex characters)');
    }
  }

  return cleaned.toLowerCase();
}

/**
 * 自动识别并规范化公钥输入
 * 支持：压缩格式（02/03开头）和非压缩格式（04开头）
 */
function normalizePublicKeyInput(publicKey: BytesLike): string {
  let cleaned = publicKey instanceof Uint8Array ? bytesToHex(publicKey) : publicKey.trim();

  // 移除 0x 前缀
  if (cleaned.startsWith('0x') || cleaned.startsWith('0X')) {
    cleaned = cleaned.slice(2);
  }

  // 验证是否为有效的十六进制字符串
  if (!isValidHexString(cleaned)) {
    throw new Error('Invalid public key: must be a hexadecimal string');
  }

  cleaned = cleaned.toLowerCase();

  // 检查格式
  const prefix = cleaned.slice(0, 2);

  if (prefix === '04') {
    // 非压缩格式：130个字符（65字节）
    if (cleaned.length !== 130) {
      throw new Error('Invalid uncompressed public key: must be 65 bytes (130 hex characters)');
    }
    return cleaned;
  } else if (prefix === '02' || prefix === '03') {
    // 压缩格式：66个字符（33字节）- 需要解压
    if (cleaned.length !== 66) {
      throw new Error('Invalid compressed public key: must be 33 bytes (66 hex characters)');
    }
    // 使用 @noble/curves 解压公钥
    const point = sm2.Point.fromHex(cleaned);
    const uncompressedBytes = point.toBytes(false); // false 表示非压缩格式
    return bytesToHex(uncompressedBytes);
  } else {
    throw new Error('Invalid public key prefix: must be 02, 03, or 04');
  }
}

/**
 * 比较两个 Uint8Array，并避免按内容提前退出。
 * JavaScript/JIT 运行时不提供严格恒时保证。
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}


/**
 * 准备解密所需的中间值
 * @param privateKey
 * @param c1Point
 * @param c2Length
 */
function prepareDecrypt(privateKey: string, c1Point: any, c2Length: number) {
  const privateKeyBigInt = BigInt('0x' + privateKey);
  const s = c1Point.multiply(privateKeyBigInt);
  const sBytes = s.toBytes(false);

  // 2. 获取 x2, y2
  const x2 = sBytes.slice(1, 33);
  const y2 = sBytes.slice(33, 65);

  // 3. 计算密钥流 t (耗时操作)
  const kdfInput = new Uint8Array(x2.length + y2.length);
  kdfInput.set(x2, 0);
  kdfInput.set(y2, x2.length);
  const t = kdf(kdfInput, c2Length);

  return {x2, y2, t};
}

function tryVerifyAndDecrypt(
  x2: Uint8Array, y2: Uint8Array, t: Uint8Array,
  c2: Uint8Array, c3: Uint8Array
): Uint8Array | null {
  // 计算 M' = C2 ^ t
  const plainBytes = new Uint8Array(c2.length);
  for (let i = 0; i < c2.length; i++) {
    plainBytes[i] = c2[i] ^ t[i];
  }

  // 计算 u = SM3(x2 || M' || y2)
  const c3VerifyInput = new Uint8Array(x2.length + plainBytes.length + y2.length);
  c3VerifyInput.set(x2, 0);
  c3VerifyInput.set(plainBytes, x2.length);
  c3VerifyInput.set(y2, x2.length + plainBytes.length);
  const c3VerifyHex = sm3Digest(c3VerifyInput);
  const c3Verify = hexToBytes(c3VerifyHex);
  if (constantTimeEqual(c3, c3Verify)) {
    return plainBytes;
  }
  return null;
}

/**
 * 使用 SM2 解密数据
 *
 * 支持自动识别密文格式：
 * - 0x30 开头：ASN.1 格式
 * - 0x04 开头：C1 为非压缩点格式（04 + x + y），默认 C1C3C2 模式
 * - 0x02/0x03 开头：C1 为压缩点格式（02/03 + x），默认 C1C3C2 模式
 *
 * 注意：
 * 1. 虽然可以穷举、尝试所有可能的密文格式，但这会影响解密性能。
 * 2. 在与其他系统集成时，建议明确约定密文格式，做到知己知彼。
 * 3. 本实现通过首字节自动检测格式（基于首字节只有固定几种可能的假设）：
 *    - 0x30：ASN.1 格式
 *    - 0x04：C1 为非压缩点格式，具体是 C1C3C2 还是 C1C2C3 取决于解密时的选项参数，默认为 C1C3C2
 *    - 0x02/0x03：C1 为压缩点格式，具体是 C1C3C2 还是 C1C2C3 取决于解密时的选项参数，默认为 C1C3C2
 *
 * @param privateKey - 私钥（十六进制字符串）
 * @param encryptedData - 加密的数据（十六进制/Base64 字符串或 Uint8Array）
 * @param options - 输入编码和密文排列；省略时自动识别编码并默认使用 C1C3C2
 * @returns 解密后的数据（UTF-8 字符串）
 * @throws 私钥、密文编码、椭圆曲线点或 C3 完整性校验无效时抛出错误
 */
export function decrypt(
  privateKey: BytesLike,
  encryptedData: BytesLike,
  options?: SM2DecryptOptions
): string {
  return bytesToString(decryptBytes(privateKey, encryptedData, options));
}

/**
 * 当前底层曲线对象固定为标准 SM2 曲线。为保留旧类型兼容，只允许调用方重复声明
 * 标准参数；传入其他曲线时明确拒绝，避免产生“配置已生效”的错误安全假设。
 */
function requireStandardCurveParams(curveParams?: SM2CurveParams): void {
  if (!curveParams) return;
  for (const key of ['p', 'a', 'b', 'Gx', 'Gy', 'n'] as const) {
    const value = curveParams[key];
    if (value !== undefined && value.toLowerCase().replace(/^0x/, '') !== SM2_CURVE_PARAMS[key].toLowerCase()) {
      throw new Error('Custom SM2 curve parameters are not supported');
    }
  }
}

/**
 * 使用 SM2 私钥解密并返回原始字节；二进制协议不应经过 UTF-8 字符串转换。
 * @param privateKey - 32 字节私钥或对应 Hex 字符串
 * @param encryptedData - Hex/Base64 密文字符串或原始密文字节
 * @param options - 密文排列与字符串输入编码；省略时自动识别编码和排列
 * @returns 通过 C3 完整性校验的原始明文字节
 * @throws 私钥、编码、曲线点、密文结构或 C3 校验无效时抛出错误
 */
export function decryptBytes(
  privateKey: BytesLike,
  encryptedData: BytesLike,
  options?: SM2DecryptOptions
): Uint8Array {
  const cleanPrivateKey = normalizePrivateKeyInput(privateKey);
  const requestedMode = options?.mode === undefined ? undefined : normalizeSM2CipherMode(options.mode);
  const cipherBytes = encryptedData instanceof Uint8Array
    ? encryptedData
    : options?.inputFormat
      ? decodeInput(encryptedData, options.inputFormat)
      : autoDecodeString(encryptedData);

  if (cipherBytes.length === 0) throw new Error('Invalid ciphertext: empty data');
  if (cipherBytes[0] === 0x30) return decryptAsn1(cleanPrivateKey, cipherBytes);

  // 解析 C1
  let c1Length = 65;
  const firstByte = cipherBytes[0];
  if (firstByte === 0x02 || firstByte === 0x03) c1Length = 33;
  else if (firstByte !== 0x04) throw new Error('Invalid ciphertext: unsupported format');

  const c3Length = 32;
  // 本库加密端明确拒绝空明文，因此原始密文必须至少包含 1 字节 C2。
  if (cipherBytes.length < c1Length + c3Length + 1) throw new Error('Invalid ciphertext: too short');

  const c1Bytes = cipherBytes.slice(0, c1Length);
  const c1Point = sm2.Point.fromHex(bytesToHex(c1Bytes));
  const c2Length = cipherBytes.length - c1Length - c3Length;
  const {x2, y2, t} = prepareDecrypt(cleanPrivateKey, c1Point, c2Length);
  // 定义提取辅助函数
  const getComponents = (m: SM2CipherModeType) => {
    if (m === SM2CipherMode.C1C2C3) {
      return {
        c2: cipherBytes.slice(c1Length, c1Length + c2Length),
        c3: cipherBytes.slice(c1Length + c2Length)
      };
    } else { // C1C3C2
      return {
        c3: cipherBytes.slice(c1Length, c1Length + c3Length),
        c2: cipherBytes.slice(c1Length + c3Length)
      };
    }
  };

  // 1. 指定模式：直接尝试
  if (requestedMode) {
    const {c2, c3} = getComponents(requestedMode);
    const result = tryVerifyAndDecrypt(x2, y2, t, c2, c3);
    if (result !== null) return result;
    throw new Error('Decryption failed: C3 verification failed');
  }

  // 2. 自动模式：先试 C1C3C2 (推荐)，失败再试 C1C2C3
  // 复用 x2, y2, t，零额外开销
  const v1 = getComponents(SM2CipherMode.C1C3C2);
  const res1 = tryVerifyAndDecrypt(x2, y2, t, v1.c2, v1.c3);
  if (res1 !== null) return res1;

  const v2 = getComponents(SM2CipherMode.C1C2C3);
  const res2 = tryVerifyAndDecrypt(x2, y2, t, v2.c2, v2.c3);
  if (res2 !== null) return res2;

  throw new Error('Decryption failed: unable to decrypt with C1C3C2 or C1C2C3 mode');
}

/**
 * 从 ASN.1 格式解密 SM2 密文
 * ASN.1 格式：SEQUENCE { x INTEGER, y INTEGER, hash OCTET STRING, cipher OCTET STRING }
 *
 * @param privateKey - 私钥（十六进制字符串）
 * @param cipherBytes - ASN.1 编码的密文
 * @returns 解密后的数据（UTF-8 字符串）
 */
function decryptAsn1(privateKey: string, cipherBytes: Uint8Array): Uint8Array {
  const sequence = readDerElement(cipherBytes, 0, 0x30, 'SEQUENCE');
  if (sequence.end !== cipherBytes.length) throw new Error('Invalid ASN.1 ciphertext: trailing data');

  let offset = sequence.contentStart;
  const xElement = readDerElement(cipherBytes, offset, 0x02, 'INTEGER tag for x');
  const xClean = readPositiveDerInteger(cipherBytes, xElement, 'x');
  offset = xElement.end;
  const yElement = readDerElement(cipherBytes, offset, 0x02, 'INTEGER tag for y');
  const yClean = readPositiveDerInteger(cipherBytes, yElement, 'y');
  offset = yElement.end;
  const hashElement = readDerElement(cipherBytes, offset, 0x04, 'OCTET STRING tag for hash');
  const c3 = cipherBytes.slice(hashElement.contentStart, hashElement.end);
  if (c3.length !== 32) throw new Error('Invalid ASN.1 ciphertext: C3 must be 32 bytes');
  offset = hashElement.end;
  const cipherElement = readDerElement(cipherBytes, offset, 0x04, 'OCTET STRING tag for cipher');
  const c2 = cipherBytes.slice(cipherElement.contentStart, cipherElement.end);
  if (cipherElement.end !== sequence.end) {
    throw new Error('Invalid ASN.1 ciphertext: unexpected element or trailing data');
  }

  // 构造 C1 点（非压缩格式）
  const c1Bytes = new Uint8Array(65);
  c1Bytes[0] = 0x04;
  // 左填充到 32 字节
  if (xClean.length <= 32) {
    c1Bytes.set(xClean, 1 + (32 - xClean.length));
  } else {
    throw new Error('Invalid ASN.1 ciphertext: x coordinate too long');
  }
  if (yClean.length <= 32) {
    c1Bytes.set(yClean, 33 + (32 - yClean.length));
  } else {
    throw new Error('Invalid ASN.1 ciphertext: y coordinate too long');
  }
  const c1Point = sm2.Point.fromHex(bytesToHex(c1Bytes));
  return decryptCore(privateKey, c1Point, c2, c3);
}

interface DerElement {
  contentStart: number;
  end: number;
}

/** 只接受 DER 最小长度编码，避免 BER 宽松解析产生歧义。 */
function readDerElement(data: Uint8Array, offset: number, expectedTag: number, label: string): DerElement {
  if (offset >= data.length || data[offset] !== expectedTag) {
    throw new Error(`Invalid ASN.1 ciphertext: expected ${label}`);
  }
  if (offset + 1 >= data.length) throw new Error('Invalid ASN.1 ciphertext: truncated length');
  const firstLength = data[offset + 1];
  let length = 0;
  let lengthBytes = 1;
  if (firstLength < 0x80) {
    length = firstLength;
  } else {
    const count = firstLength & 0x7f;
    if (count === 0 || count > 4 || offset + 2 + count > data.length) {
      throw new Error('Invalid ASN.1 ciphertext: invalid length encoding');
    }
    if (data[offset + 2] === 0) throw new Error('Invalid ASN.1 ciphertext: non-minimal length');
    lengthBytes += count;
    for (let i = 0; i < count; i++) length = length * 256 + data[offset + 2 + i];
    if (length < 0x80) throw new Error('Invalid ASN.1 ciphertext: non-minimal length');
  }
  const contentStart = offset + 1 + lengthBytes;
  const end = contentStart + length;
  if (!Number.isSafeInteger(end) || end > data.length) {
    throw new Error('Invalid ASN.1 ciphertext: truncated value');
  }
  return {contentStart, end};
}

function readPositiveDerInteger(data: Uint8Array, element: DerElement, label: string): Uint8Array {
  let value = data.slice(element.contentStart, element.end);
  if (value.length === 0) throw new Error(`Invalid ASN.1 ciphertext: empty ${label} coordinate`);
  if ((value[0] & 0x80) !== 0) throw new Error(`Invalid ASN.1 ciphertext: negative ${label} coordinate`);
  if (value.length > 1 && value[0] === 0) {
    if ((value[1] & 0x80) === 0) throw new Error(`Invalid ASN.1 ciphertext: non-canonical ${label} coordinate`);
    value = value.slice(1);
  }
  return value;
}

/**
 * SM2 解密核心逻辑
 *
 * @param privateKey - 私钥（十六进制字符串）
 * @param c1Point - C1 点
 * @param c2 - C2 密文
 * @param c3 - C3 哈希值
 * @returns 解密后的数据（UTF-8 字符串）
 */
function decryptCore(
  privateKey: string,
  c1Point: any,
  c2: Uint8Array,
  c3: Uint8Array
): Uint8Array {
  // 计算 [dB]C1
  const privateKeyBigInt = BigInt('0x' + privateKey);
  const s = c1Point.multiply(privateKeyBigInt);
  const sBytes = s.toBytes(false);

  // x2, y2 是 [dB]C1 的坐标
  const x2 = sBytes.slice(1, 33);
  const y2 = sBytes.slice(33, 65);

  // 计算 t = KDF(x2 || y2, klen)
  const kdfInput = new Uint8Array(x2.length + y2.length);
  kdfInput.set(x2, 0);
  kdfInput.set(y2, x2.length);
  const t = kdf(kdfInput, c2.length);

  // 计算 M' = C2 ⊕ t
  const plainBytes = new Uint8Array(c2.length);
  for (let i = 0; i < c2.length; i++) {
    plainBytes[i] = c2[i] ^ t[i];
  }

  // 计算 u = SM3(x2 || M' || y2) 并验证 u === C3
  const c3VerifyInput = new Uint8Array(x2.length + plainBytes.length + y2.length);
  c3VerifyInput.set(x2, 0);
  c3VerifyInput.set(plainBytes, x2.length);
  c3VerifyInput.set(y2, x2.length + plainBytes.length);
  const c3VerifyHex = sm3Digest(c3VerifyInput);
  const c3Verify = hexToBytes(c3VerifyHex);

  // 验证 C3：避免显式按内容早退，但不承诺 JavaScript/JIT 下严格恒时。
  if (!constantTimeEqual(c3, c3Verify)) {
    throw new Error('Decryption failed: C3 verification failed');
  }

  // 将字节转换为 UTF-8 字符串
  return plainBytes;
}

/**
 * 计算 Z 值（用于签名）
 * Z = SM3(ENTL || ID || a || b || xG || yG || xA || yA)
 */
function computeZ(userId: string, publicKey: string): Uint8Array {
  const userIdBytes = normalizeInput(userId);
  if (userIdBytes.length >= 8192) {
    throw new Error('SM2 userId must be shorter than 8192 bytes (ENTL is 16-bit)');
  }
  const entl = new Uint8Array(2);
  const bitLength = userIdBytes.length * 8;
  entl[0] = (bitLength >> 8) & 0xff;
  entl[1] = bitLength & 0xff;

  const publicKeyBytes = hexToBytes(publicKey);
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);

  // 使用常量的曲线参数
  const a = hexToBytes(SM2_CURVE_PARAMS.a);
  const b = hexToBytes(SM2_CURVE_PARAMS.b);
  const xG = hexToBytes(SM2_CURVE_PARAMS.Gx);
  const yG = hexToBytes(SM2_CURVE_PARAMS.Gy);

  // 连接所有部分
  const totalLength = entl.length + userIdBytes.length + a.length + b.length +
    xG.length + yG.length + x.length + y.length;
  const data = new Uint8Array(totalLength);
  let offset = 0;

  data.set(entl, offset);
  offset += entl.length;
  data.set(userIdBytes, offset);
  offset += userIdBytes.length;
  data.set(a, offset);
  offset += a.length;
  data.set(b, offset);
  offset += b.length;
  data.set(xG, offset);
  offset += xG.length;
  data.set(yG, offset);
  offset += yG.length;
  data.set(x, offset);
  offset += x.length;
  data.set(y, offset);

  // sm3Digest 返回 hex 字符串，需要转换为 Uint8Array
  const zHex = sm3Digest(data);
  return hexToBytes(zHex);
}

const SM2_N = BigInt('0x' + SM2_CURVE_PARAMS.n);
const MAX_SM2_SIGNING_PRIVATE_KEY = SM2_N - 1n;

class KdfAllZeroError extends Error {
  constructor() {
    super('KDF derived key is all zeros');
    this.name = 'KdfAllZeroError';
  }
}

function mod(value: bigint, modulo: bigint = SM2_N): bigint {
  const result = value % modulo;
  return result >= 0n ? result : result + modulo;
}

function modInverse(value: bigint, modulo: bigint = SM2_N): bigint {
  let a = mod(value, modulo);
  let b = modulo;
  let x = 0n;
  let y = 1n;
  let u = 1n;
  let v = 0n;

  while (a !== 0n) {
    const q = b / a;
    [x, u] = [u, x - q * u];
    [y, v] = [v, y - q * v];
    [b, a] = [a, b - q * a];
  }

  if (b !== 1n) {
    throw new Error('Invalid scalar: inverse does not exist');
  }
  return mod(x, modulo);
}

function bytesToBigIntBE(bytes: Uint8Array): bigint {
  return BigInt('0x' + bytesToHex(bytes));
}

function bigIntTo32Bytes(value: bigint): Uint8Array {
  return hexToBytes(mod(value).toString(16).padStart(64, '0'));
}

const MAX_RANDOM_SCALAR_ATTEMPTS = 128;

function randomScalar(): bigint {
  for (let attempt = 0; attempt < MAX_RANDOM_SCALAR_ATTEMPTS; attempt++) {
    const k = bytesToBigIntBE(getRandomBytes(32));
    if (k > 0n && k < SM2_N) {
      return k;
    }
  }
  throw new Error('Failed to generate a valid SM2 scalar');
}

function sm2PointX(point: ReturnType<typeof sm2.Point.BASE.multiply>): bigint {
  return bytesToBigIntBE(point.toBytes(false).slice(1, 33));
}

function sm2SignDigest(e: Uint8Array, privateKeyBytes: Uint8Array): Uint8Array {
  const d = bytesToBigIntBE(privateKeyBytes);
  // 通用 EC 私钥可取 n-1，但 SM2 签名需要计算 (1+d)^-1，因此上界只能到 n-2。
  if (d <= 0n || d >= MAX_SM2_SIGNING_PRIVATE_KEY) {
    throw new Error('Invalid SM2 signing private key: scalar must be in [1, n-2]');
  }

  const eInt = bytesToBigIntBE(e);
  const onePlusDInv = modInverse(1n + d);

  for (let attempt = 0; attempt < MAX_RANDOM_SCALAR_ATTEMPTS; attempt++) {
    const k = randomScalar();
    const x1 = sm2PointX(sm2.Point.BASE.multiply(k));
    const r = mod(eInt + x1);

    if (r === 0n || r + k === SM2_N) {
      continue;
    }

    // SM2 签名不是 ECDSA：s = (1 + d)^-1 * (k - r*d) mod n。
    const s = mod(onePlusDInv * (k - r * d));
    if (s === 0n) {
      continue;
    }

    const signature = new Uint8Array(64);
    signature.set(bigIntTo32Bytes(r), 0);
    signature.set(bigIntTo32Bytes(s), 32);
    return signature;
  }
  throw new Error('Failed to generate a valid SM2 signature');
}

function sm2VerifyDigest(e: Uint8Array, publicKeyHex: string, r: bigint, s: bigint): boolean {
  if (r <= 0n || r >= SM2_N || s <= 0n || s >= SM2_N) {
    return false;
  }

  const t = mod(r + s);
  if (t === 0n) {
    return false;
  }

  const publicPoint = sm2.Point.fromHex(publicKeyHex);
  // 验签公式为 (x1, y1) = [s]G + [t]P，不能复用 ECDSA 的 u1/u2 公式。
  const point = sm2.Point.BASE.multiply(s).add(publicPoint.multiply(t));
  const x1 = sm2PointX(point);
  const R = mod(bytesToBigIntBE(e) + x1);
  return R === r;
}

/**
 * 签名选项
 *
 * SM2 签名算法的可配置选项，用于控制签名过程的各个方面
 */
export interface SignOptions {
  /**
   * 签名格式
   *
   * - raw（默认）: 返回 Raw 格式签名（r || s，64 字节）
   * - der: 返回 DER 编码格式签名（符合 ASN.1 标准，长度可变）
   */
  signatureFormat?: SM2SignatureFormat;

  /**
   * 输出格式
   * - hex：十六进制字符串（默认）
   * - base64：Base64 编码字符串
   */
  outputFormat?: OutputFormatType;

  /**
   * 用户 ID（用于计算 Z 值）
   *
   * 本库默认值：'1234567812345678'（保持向后兼容）
   *
   * Z 值是 SM2 签名算法的一个特殊部分，包含了用户身份信息和公钥信息，
   * 用于将签名与特定用户绑定。不同的用户 ID 会产生不同的 Z 值，
   * 从而产生不同的签名。
   *
   * 兼容约定：省略值或空字符串都会回落到 DEFAULT_USER_ID。
   * 如需自定义身份，请传入非空字符串，并确保验签端使用相同值。
   */
  userId?: string;

  /**
   * 标准曲线参数兼容声明。
   *
   * 省略即可使用标准 SM2 曲线。当前实现不支持自定义曲线；传入与标准曲线
   * 不同的参数会抛出错误。
   */
  curveParams?: SM2CurveParams;

  /**
   * 是否跳过 Z 值计算
   *
   * - false（默认）: 标准 SM2 签名流程，计算 e = SM3(Z || M)
   * - true: 简化流程，直接计算 e = SM3(M)，跳过 Z 值
   *
   * 该路径计算 `e = SM3(M)`，不执行标准 SM2 的 `e = SM3(Z || M)`。
   * 它只用于迁移已经采用相同 no-Z 约定的旧协议，不能用于新协议，也不是
   * 性能优化选项。Bouncy Castle 的标准 `SM2Signer` 不接受这种签名。
   *
   * @deprecated 非标准旧协议兼容选项。新代码应保留默认值 `false`；调用方已持有
   * 预计算 e 时使用摘要签名接口，不要用该选项代替预计算 e。
   */
  skipZComputation?: boolean;
}

/**
 * 验签选项
 *
 * SM2 验签算法的可配置选项，必须与签名时使用的选项保持一致
 */
export interface VerifyOptions {
  /**
   * 签名格式
   *
   * - raw（默认）: 签名为 Raw 格式（r || s）
   * - der: 签名为 DER 编码格式
   * - auto: 自动识别签名格式（仅在显式指定时启用）
   */
  signatureFormat?: SM2SignatureInputFormat;

  /**
   * 签名输入格式
   * - hex：十六进制字符串
   * - base64：Base64 编码字符串
   *
   * 不传时会自动识别 hex/base64（优先按 hex 识别）
   */
  inputFormat?: InputFormatType;

  /**
   * 用户 ID（必须与签名时使用的相同）
   *
   * 本库默认值：'1234567812345678'（保持向后兼容）
   *
   * ⚠️ 重要：签名和验签必须使用相同的 userId，否则验签会失败
   *
   * 兼容约定：省略值或空字符串都会回落到 DEFAULT_USER_ID。
   * 如需自定义身份，请传入非空字符串，并确保签名端使用相同值。
   */
  userId?: string;

  /**
   * 标准曲线参数兼容声明。当前实现不支持自定义曲线。
   */
  curveParams?: SM2CurveParams;

  /**
   * 是否跳过 Z 值计算（必须与签名时保持一致）
   *
   * `true` 只用于验证采用 `e = SM3(M)` 的旧协议签名；标准签名必须保留默认值
   * `false`。两端设置不一致时验签返回 `false`。
   *
   * @deprecated 非标准旧协议兼容选项。新代码应使用标准 SM2 身份绑定流程。
   */
  skipZComputation?: boolean;
}

/**
 * 生成 SM2 密钥对
 * @param compressed - 是否返回压缩格式的公钥（默认 false，返回非压缩格式）
 * @returns 包含公钥和私钥的对象
 * @throws strict 策略缺少安全随机源、随机源返回无效数据或重试耗尽时抛出错误
 */
export function generateKeyPair(compressed: boolean = false): KeyPair {
  let privateKey: Uint8Array | undefined;
  for (let attempt = 0; attempt < MAX_RANDOM_SCALAR_ATTEMPTS; attempt++) {
    const candidate = sm2.keygen().secretKey;
    if (bytesToBigIntBE(candidate) < MAX_SM2_SIGNING_PRIVATE_KEY) {
      privateKey = candidate;
      break;
    }
  }
  if (!privateKey) {
    throw new Error('Failed to generate an SM2 private key valid for signing');
  }

  // 从私钥导出公钥，确保格式正确
  const publicKeyBytes = sm2.getPublicKey(privateKey, compressed);

  return {
    publicKey: bytesToHex(publicKeyBytes),
    privateKey: bytesToHex(privateKey),
  };
}

/**
 * 从私钥导出公钥
 * @param privateKey - 私钥（十六进制字符串）
 * @param compressed - 是否返回压缩格式（默认 false，返回非压缩格式）
 * @returns 公钥（十六进制字符串，压缩格式：02/03 + x，非压缩格式：04 + x + y）
 */
export function getPublicKeyFromPrivateKey(privateKey: BytesLike, compressed: boolean = false): string {
  // 自动识别输入格式
  const cleanPrivateKey = normalizePrivateKeyInput(privateKey);

  // 使用 @noble/curves 从私钥计算公钥
  const privateKeyBytes = hexToBytes(cleanPrivateKey);
  const publicKeyBytes = sm2.getPublicKey(privateKeyBytes, compressed);

  return bytesToHex(publicKeyBytes);
}

/**
 * 压缩公钥（从非压缩格式转换为压缩格式）
 *
 * SM2 公钥是椭圆曲线上的点 (x, y)，有两种表示格式：
 *
 * 1. 非压缩格式（65 字节）：04 || x || y
 *    - 前缀 04 表示非压缩格式
 *    - x 坐标：32 字节
 *    - y 坐标：32 字节
 *    - 总长度：1 + 32 + 32 = 65 字节（130 个十六进制字符）
 *
 * 2. 压缩格式（33 字节）：02/03 || x
 *    - 前缀 02 表示 y 坐标为偶数
 *    - 前缀 03 表示 y 坐标为奇数
 *    - x 坐标：32 字节
 *    - 总长度：1 + 32 = 33 字节（66 个十六进制字符）
 *
 * 压缩的原理：
 * 由于椭圆曲线方程 y² = x³ + ax + b，给定 x 坐标，可以计算出两个可能的 y 值
 * （一个为正，一个为负，或者说一个为奇数，一个为偶数）。
 * 因此只需要保存 x 坐标和 y 的奇偶性，就可以恢复完整的点坐标。
 *
 * 优势：
 * - 节省存储空间（从 65 字节减少到 33 字节，节省约 49%）
 * - 节省网络传输带宽
 * - 适合资源受限的环境（如物联网设备）
 *
 * @param publicKey - 非压缩格式的公钥（十六进制字符串，04 + x + y）
 * @returns 压缩格式的公钥（十六进制字符串，02/03 + x）
 *
 * @example
 * ```typescript
 * const uncompressed = '04...'; // 130 个字符
 * const compressed = compressPublicKey(uncompressed); // 66 个字符
 * ```
 */
export function compressPublicKey(publicKey: BytesLike): string {
  // 规范化输入
  const cleanPublicKey = normalizePublicKeyInput(publicKey);

  // 使用 @noble/curves 压缩公钥
  const point = sm2.Point.fromHex(cleanPublicKey);
  const compressedBytes = point.toBytes(true); // true = 压缩格式

  return bytesToHex(compressedBytes);
}

/**
 * 解压公钥（从压缩格式转换为非压缩格式）
 *
 * 从压缩格式恢复完整的公钥坐标。
 *
 * 解压过程：
 * 1. 读取 x 坐标（32 字节）
 * 2. 读取前缀字节（02 或 03）确定 y 的奇偶性
 * 3. 根据椭圆曲线方程 y² = x³ + ax + b 计算 y²
 * 4. 对 y² 开平方得到两个可能的 y 值
 * 5. 根据前缀字节选择正确的 y 值（奇数或偶数）
 * 6. 组合 x 和 y 得到完整的非压缩公钥
 *
 * 注意：
 * - 如果输入已经是非压缩格式（前缀 04），则直接返回
 * - 解压过程涉及模平方根计算，需要一定的计算量
 * - 使用 @noble/curves 库进行高效的椭圆曲线运算
 *
 * @param publicKey - 压缩格式的公钥（十六进制字符串，02/03 + x）或非压缩格式
 * @returns 非压缩格式的公钥（十六进制字符串，04 + x + y）
 *
 * @example
 * ```typescript
 * const compressed = '02...'; // 66 个字符
 * const uncompressed = decompressPublicKey(compressed); // 130 个字符
 * ```
 */
export function decompressPublicKey(publicKey: BytesLike): string {
  // 统一经过曲线点解析，避免未压缩格式只校验 04 前缀便原样返回无效点。
  const normalized = normalizePublicKeyInput(publicKey);
  const point = sm2.Point.fromHex(normalized);
  return bytesToHex(point.toBytes(false));
}

/**
 * KDF（密钥派生函数）
 * 使用 SM3 作为哈希函数
 *
 * 标准参考：
 * - GM/T 0003.1-2012: 密钥派生函数规范
 * - GM/T 0009-2023: SM2 密码算法使用规范
 *
 * 优化说明：
 * - 减少内存分配，复用缓冲区
 * - 优化零值检测，提前退出
 * - 按照标准实现，确保互操作性
 */
function kdf(z: Uint8Array, klen: number): Uint8Array {
  const k = new Uint8Array(klen);
  // 预分配输入缓冲区，避免每次迭代都分配内存
  const input = new Uint8Array(z.length + 4);
  input.set(z, 0);

  let offset = 0;
  let hasNonZero = false;

  for (let i = 1; offset < klen; i++) {
    // 将计数器转换为 32 位大端字节（优化：直接写入预分配的缓冲区）
    input[z.length] = (i >> 24) & 0xff;
    input[z.length + 1] = (i >> 16) & 0xff;
    input[z.length + 2] = (i >> 8) & 0xff;
    input[z.length + 3] = i & 0xff;

    // 计算 SM3(Z || ct)
    const hashHex = sm3Digest(input);
    const hash = hexToBytes(hashHex);

    // 将哈希结果追加到密钥流
    const toCopy = Math.min(hash.length, klen - offset);
    for (let j = 0; j < toCopy; j++) {
      const byte = hash[j];
      k[offset + j] = byte;
      // 优化：在复制过程中同时检测是否有非零字节
      if (byte !== 0) {
        hasNonZero = true;
      }
    }
    offset += toCopy;
  }

  // 验证派生的密钥不全为零
  if (!hasNonZero) {
    throw new KdfAllZeroError();
  }

  return k;
}

/**
 * 使用 SM2 加密数据
 * @param publicKey - 公钥（十六进制字符串）
 * @param data - 要加密的数据（字符串或 Uint8Array）
 * @param options - 加密选项对象
 * @returns 加密后的数据（默认十六进制字符串）
 * @throws 公钥、模式或编码无效、随机源失败或 KDF 重试耗尽时抛出错误
 *
 * @example
 * // 基本用法
 * const encrypted = encrypt(publicKey, 'data');
 *
 * @example
 * // 使用选项对象
 * const encrypted = encrypt(publicKey, 'data', {
 *   mode: SM2CipherMode.C1C3C2,
 *   outputFormat: OutputFormat.BASE64
 * });
 */
export function encrypt(
  publicKey: BytesLike,
  data: string | Uint8Array,
  options?: SM2EncryptOptions
): string {
  const mode = normalizeSM2CipherMode(options?.mode);
  const outputFormat = normalizeSM2OutputFormat(options?.outputFormat);

  // 自动识别并规范化公钥输入
  const cleanPublicKey = normalizePublicKeyInput(publicKey);
  const plainBytes = normalizeInput(data);
  if (plainBytes.length === 0) {
    throw new Error('SM2 plaintext must not be empty');
  }

  // 解析公钥点
  const publicKeyPoint = sm2.Point.fromHex(cleanPublicKey);

  for (let attempt = 0; attempt < MAX_RANDOM_SCALAR_ATTEMPTS; attempt++) {
    const k = sm2.keygen().secretKey;
    const kScalar = bytesToBigIntBE(k);
    const c1Bytes = sm2.Point.BASE.multiply(kScalar).toBytes(false);
    const kPbBytes = publicKeyPoint.multiply(kScalar).toBytes(false);
    const x2 = kPbBytes.slice(1, 33);
    const y2 = kPbBytes.slice(33, 65);

    const kdfInput = new Uint8Array(x2.length + y2.length);
    kdfInput.set(x2, 0);
    kdfInput.set(y2, x2.length);

    let t: Uint8Array;
    try {
      t = kdf(kdfInput, plainBytes.length);
    } catch (error) {
      // GM/T 0003.4 要求派生结果全零时重新选择临时标量 k，而不是返回失败密文。
      if (error instanceof KdfAllZeroError) continue;
      throw error;
    }

    const c2 = new Uint8Array(plainBytes.length);
    for (let i = 0; i < plainBytes.length; i++) {
      c2[i] = plainBytes[i] ^ t[i];
    }

    const c3Input = new Uint8Array(x2.length + plainBytes.length + y2.length);
    c3Input.set(x2, 0);
    c3Input.set(plainBytes, x2.length);
    c3Input.set(y2, x2.length + plainBytes.length);
    const c3 = hexToBytes(sm3Digest(c3Input));

    const ciphertext = new Uint8Array(c1Bytes.length + c2.length + c3.length);
    ciphertext.set(c1Bytes, 0);
    if (mode === SM2CipherMode.C1C2C3) {
      ciphertext.set(c2, c1Bytes.length);
      ciphertext.set(c3, c1Bytes.length + c2.length);
    } else {
      ciphertext.set(c3, c1Bytes.length);
      ciphertext.set(c2, c1Bytes.length + c3.length);
    }
    return encodeOutput(ciphertext, outputFormat);
  }

  throw new Error('Failed to generate an SM2 ciphertext with a non-zero KDF result');
}


/**
 * 使用 SM2 签名数据
 * @param privateKey - 私钥（十六进制字符串）
 * @param data - 要签名的数据（字符串或 Uint8Array）
 * @param options - 签名选项
 * @returns 签名（默认十六进制字符串；raw 为 r||s，der 为 ASN.1 DER）
 * @throws 私钥、用户标识或格式选项无效，使用非标准曲线，或随机源失败时抛出错误
 */
export function sign(
  privateKey: BytesLike,
  data: string | Uint8Array,
  options?: SignOptions
): string {
  requireStandardCurveParams(options?.curveParams);
  // 自动识别并规范化私钥输入
  const cleanPrivateKey = normalizePrivateKeyInput(privateKey);
  const userId = options?.userId || DEFAULT_USER_ID;
  const signatureFormat = normalizeSM2SignatureFormat(options?.signatureFormat);
  const outputFormat = normalizeSM2OutputFormat(options?.outputFormat);
  const skipZ = options?.skipZComputation || false;

  // 使用 @noble/curves 进行签名
  const privateKeyBytes = hexToBytes(cleanPrivateKey);

  let e: Uint8Array;

  if (skipZ) {
    // 跳过 Z 值计算，直接对数据进行 SM3 哈希
    const dataBytes = normalizeInput(data);
    const eHex = sm3Digest(dataBytes);
    e = hexToBytes(eHex);
  } else {
    // 标准流程：计算 Z 值并与数据一起哈希
    // 从私钥获取公钥
    const publicKey = getPublicKeyFromPrivateKey(cleanPrivateKey);

    // 计算 Z 值（使用本库实现的 SM3）
    const z = computeZ(userId, publicKey);

    // 计算消息摘要 e = SM3(Z || M)（使用本库实现的 SM3）
    const dataBytes = normalizeInput(data);
    const hashInput = new Uint8Array(z.length + dataBytes.length);
    hashInput.set(z, 0);
    hashInput.set(dataBytes, z.length);
    const eHex = sm3Digest(hashInput);
    e = hexToBytes(eHex);
  }

  const signatureBytes = sm2SignDigest(e, privateKeyBytes);

  // 根据选项返回 DER 编码或原始格式
  if (signatureFormat === 'der') {
    const r = bytesToHex(signatureBytes.slice(0, 32));
    const s = bytesToHex(signatureBytes.slice(32, 64));
    const derBytes = encodeSignature(r, s);
    return encodeOutput(derBytes, outputFormat);
  }

  return encodeOutput(signatureBytes, outputFormat);
}

/**
 * 使用 SM2 验证签名
 * @param publicKey - 公钥（十六进制字符串）
 * @param data - 原始数据（字符串或 Uint8Array）
 * @param signature - 签名（十六进制字符串，r || s 格式或 DER 编码）
 * @param options - 验签选项
 * @returns 签名有效返回 true；签名不匹配、输入或选项无效以及内部校验异常均返回 false
 */
export function verify(
  publicKey: BytesLike,
  data: string | Uint8Array,
  signature: BytesLike,
  options?: VerifyOptions
): boolean {
  try {
    requireStandardCurveParams(options?.curveParams);
    // 自动识别并规范化公钥输入
    const cleanPublicKey = normalizePublicKeyInput(publicKey);
    const userId = options?.userId || DEFAULT_USER_ID;
    const signatureFormat = normalizeSM2SignatureInputFormat(options?.signatureFormat);
    const inputFormat = options?.inputFormat;
    const skipZ = options?.skipZComputation || false;

    let e: Uint8Array;

    if (skipZ) {
      // 跳过 Z 值计算，直接对数据进行 SM3 哈希（使用本库实现的 SM3）
      const dataBytes = normalizeInput(data);
      const eHex = sm3Digest(dataBytes);
      e = hexToBytes(eHex);
    } else {
      // 标准流程：计算 Z 值并与数据一起哈希
      // 计算 Z 值（使用本库实现的 SM3）
      const z = computeZ(userId, cleanPublicKey);

      // 计算消息摘要 e = SM3(Z || M)（使用本库实现的 SM3）
      const dataBytes = normalizeInput(data);
      const hashInput = new Uint8Array(z.length + dataBytes.length);
      hashInput.set(z, 0);
      hashInput.set(dataBytes, z.length);
      const eHex = sm3Digest(hashInput);
      e = hexToBytes(eHex);
    }

    // 解析签名
    let r: string, s: string;
    const sigBytes = signature instanceof Uint8Array
      ? signature
      : inputFormat
        ? decodeInput(signature, inputFormat)
        : autoDecodeString(signature);

    if (signatureFormat === 'der') {
      const decoded = decodeSignature(sigBytes);
      r = decoded.r;
      s = decoded.s;
    } else if (signatureFormat === 'auto') {
      if (sigBytes.length === 64) {
        r = bytesToHex(sigBytes.slice(0, 32));
        s = bytesToHex(sigBytes.slice(32, 64));
      } else if (sigBytes[0] === 0x30) {
        const decoded = decodeSignature(sigBytes);
        r = decoded.r;
        s = decoded.s;
      } else {
        return false;
      }
    } else {
      if (sigBytes.length !== 64) {
        return false;
      }
      r = bytesToHex(sigBytes.slice(0, 32));
      s = bytesToHex(sigBytes.slice(32, 64));
    }

    return sm2VerifyDigest(e, cleanPublicKey, BigInt('0x' + r), BigInt('0x' + s));
  } catch (error) {
    // 验证失败
    return false;
  }
}

/**
 * SM2 密钥交换协议参数（用于初始化或响应方）
 *
 * 标准参考：
 * - GM/T 0003.3-2012: SM2 椭圆曲线密钥交换协议
 * - GM/T 0009-2023: SM2 密码算法使用规范
 */
export interface SM2KeyExchangeParams {
  /**
   * 当前参与方的长期私钥（十六进制字符串）。发起方 A 和响应方 B 分别传入自己的私钥。
   */
  privateKey: BytesLike;

  /**
   * 当前参与方的长期公钥（十六进制字符串，可选，如果不提供会从私钥派生）
   */
  publicKey?: BytesLike;

  /**
   * 当前参与方的用户 ID
   *
   * 默认：'1234567812345678'（DEFAULT_USER_ID，保持向后兼容）
   * 省略值或空字符串均回落到 DEFAULT_USER_ID
   */
  userId?: string;

  /**
   * 当前参与方的临时私钥（十六进制字符串，可选，如果不提供会自动生成）
   */
  tempPrivateKey?: BytesLike;

  /**
   * 对端参与方的长期公钥（十六进制字符串）
   */
  peerPublicKey: BytesLike;

  /**
   * 对端参与方的本次会话临时公钥（十六进制字符串）
   */
  peerTempPublicKey: BytesLike;

  /**
   * 对端参与方的用户 ID
   *
   * 默认：'1234567812345678'（DEFAULT_USER_ID，保持向后兼容）
   * 省略值或空字符串均回落到 DEFAULT_USER_ID
   */
  peerUserId?: string;

  /**
   * 是否为发起方（true = 发起方，false = 响应方）
   */
  isInitiator: boolean;

  /**
   * 派生密钥的字节长度（默认：16，即 128 位）
   */
  keyLength?: number;
}

/**
 * SM2 密钥交换结果
 */
export interface SM2KeyExchangeResult {
  /**
   * 当前参与方的临时公钥（十六进制字符串）
   */
  tempPublicKey: string;

  /**
   * 派生的共享密钥（十六进制字符串）
   */
  sharedKey: string;

  /**
   * 标准 S1（0x02）：B 方计算并发送给 A，A 应在协议层验证；十六进制字符串
   */
  s1?: string;

  /**
   * 标准 S2（0x03）：A 方计算并发送给 B，B 应在协议层验证；十六进制字符串
   */
  s2?: string;
}

/**
 * SM2 密钥交换协议
 *
 * 标准参考：
 * - GM/T 0003.3-2012: SM2 椭圆曲线密钥交换协议
 * - GM/T 0009-2023: SM2 密码算法使用规范
 *
 * 这是一个安全的密钥协商协议，允许两方在不安全的通道上协商出共享密钥。
 *
 * 协议流程：
 * 1. 发起方 A 生成临时密钥对 (rA, RA)，发送 RA 给响应方 B
 * 2. 响应方 B 生成临时密钥对 (rB, RB)，发送 RB 给发起方 A
 * 3. 双方各自计算共享密钥 K
 * 4. 可选：双方交换确认哈希值进行相互认证
 *
 * 本函数只计算共享密钥和确认值，不负责发送临时公钥、交换 S1/S2 或验证对端确认值。
 * 当前公开 API 没有接收对端确认值的参数，因此不能单独宣称完成相互认证、前向保密
 * 或抗中间人攻击。上层协议必须明确 A/B 角色、消息顺序、重放防护、确认失败处理和
 * 临时私钥销毁策略。
 *
 * @param params - 密钥交换参数
 * @returns 密钥交换结果，包含临时公钥、共享密钥和可选的确认哈希值
 * @throws 密钥、ID 或派生长度无效，公私钥不匹配，或所需随机源失败时抛出错误
 *
 * @example
 * ```typescript
 * // 双方先生成长期密钥对和本次会话的临时密钥对。
 * const keyPairA = generateKeyPair();
 * const keyPairB = generateKeyPair();
 * const tempKeyPairA = generateKeyPair();
 * const tempKeyPairB = generateKeyPair();
 *
 * const resultA = keyExchange({
 *   privateKey: keyPairA.privateKey,
 *   publicKey: keyPairA.publicKey,
 *   peerPublicKey: keyPairB.publicKey,
 *   tempPrivateKey: tempKeyPairA.privateKey,
 *   peerTempPublicKey: tempKeyPairB.publicKey,
 *   isInitiator: true
 * });
 *
 * const resultB = keyExchange({
 *   privateKey: keyPairB.privateKey,
 *   publicKey: keyPairB.publicKey,
 *   peerPublicKey: keyPairA.publicKey,
 *   tempPrivateKey: tempKeyPairB.privateKey,
 *   peerTempPublicKey: tempKeyPairA.publicKey,
 *   isInitiator: false
 * });
 *
 * if (resultA.sharedKey !== resultB.sharedKey) {
 *   throw new Error('SM2 密钥交换结果不一致');
 * }
 * ```
 */
export function keyExchange(params: SM2KeyExchangeParams): SM2KeyExchangeResult {
  // 规范化输入参数
  const selfPrivateKey = normalizePrivateKeyInput(params.privateKey);
  const selfPublicKey = params.publicKey
    ? normalizePublicKeyInput(params.publicKey)
    : getPublicKeyFromPrivateKey(selfPrivateKey);
  if (params.publicKey && !sm2.Point.fromHex(selfPublicKey).equals(
    sm2.Point.fromHex(getPublicKeyFromPrivateKey(selfPrivateKey))
  )) {
    throw new Error('SM2 public key does not match the supplied private key');
  }
  const selfUserId = params.userId || DEFAULT_USER_ID;

  const peerPublicKey = normalizePublicKeyInput(params.peerPublicKey);
  const peerTempPublicKey = normalizePublicKeyInput(params.peerTempPublicKey);
  const peerUserId = params.peerUserId || DEFAULT_USER_ID;

  const keyLength = params.keyLength ?? 16;
  if (!Number.isSafeInteger(keyLength) || keyLength <= 0) {
    throw new Error('SM2 key exchange keyLength must be a positive safe integer');
  }
  const isInitiator = params.isInitiator;

  // 生成或使用提供的临时密钥对
  let tempPrivateKey: string;
  let tempPublicKey: string;

  if (params.tempPrivateKey) {
    tempPrivateKey = normalizePrivateKeyInput(params.tempPrivateKey);
    tempPublicKey = getPublicKeyFromPrivateKey(tempPrivateKey);
  } else {
    const tempKeyPair = generateKeyPair();
    tempPrivateKey = tempKeyPair.privateKey;
    tempPublicKey = tempKeyPair.publicKey;
  }

  // 解析公钥点
  const peerPublicKeyPoint = sm2.Point.fromHex(peerPublicKey);
  const tempPublicKeyPoint = sm2.Point.fromHex(tempPublicKey);
  const peerTempPublicKeyPoint = sm2.Point.fromHex(peerTempPublicKey);

  // 计算 x̄ = 2^w + (x mod 2^w)，其中 w = ⌈(log2(n) + 1) / 2⌉ - 1
  // 对于 SM2，w = 127
  const w = 127;
  const powerOf2W = 1n << BigInt(w);

  function calculateXBar(point: any): bigint {
    const pointBytes = point.toBytes(false);
    const x = pointBytes.slice(1, 33); // x 坐标（32 字节）
    const xBigInt = BigInt('0x' + bytesToHex(x));
    return powerOf2W + (xBigInt % powerOf2W);
  }

  // 计算己方和对方的 x̄
  const selfXBar = calculateXBar(tempPublicKeyPoint);
  const peerXBar = calculateXBar(peerTempPublicKeyPoint);

  // 计算 tA = (dA + x̄A · rA) mod n
  const n = BigInt('0x' + SM2_CURVE_PARAMS.n);
  const selfPrivateKeyBigInt = BigInt('0x' + selfPrivateKey);
  const tempPrivateKeyBigInt = BigInt('0x' + tempPrivateKey);
  const t = (selfPrivateKeyBigInt + selfXBar * tempPrivateKeyBigInt) % n;

  // 计算 V = [h · tA] (PB + [x̄B]RB)，其中 h = 1
  // V = [tA] (PB + [x̄B]RB)
  const peerCombinedPoint = peerPublicKeyPoint.add(peerTempPublicKeyPoint.multiply(peerXBar));
  const vPoint = peerCombinedPoint.multiply(t);

  // 检查 V 是否为无穷远点
  if (vPoint.equals(sm2.Point.ZERO)) {
    throw new Error('Key exchange failed: V is point at infinity');
  }

  const vBytes = vPoint.toBytes(false);
  const xv = vBytes.slice(1, 33);
  const yv = vBytes.slice(33, 65);

  // 计算 Z 值
  const selfZ = computeZ(selfUserId, selfPublicKey);
  const peerZ = computeZ(peerUserId, peerPublicKey);

  // 构造 KDF 输入：xv || yv || ZA || ZB
  let kdfInput: Uint8Array;
  if (isInitiator) {
    // 发起方：KDF(xv || yv || ZA || ZB)
    kdfInput = new Uint8Array(xv.length + yv.length + selfZ.length + peerZ.length);
    kdfInput.set(xv, 0);
    kdfInput.set(yv, xv.length);
    kdfInput.set(selfZ, xv.length + yv.length);
    kdfInput.set(peerZ, xv.length + yv.length + selfZ.length);
  } else {
    // 响应方：KDF(xv || yv || ZB || ZA)
    kdfInput = new Uint8Array(xv.length + yv.length + peerZ.length + selfZ.length);
    kdfInput.set(xv, 0);
    kdfInput.set(yv, xv.length);
    kdfInput.set(peerZ, xv.length + yv.length);
    kdfInput.set(selfZ, xv.length + yv.length + peerZ.length);
  }

  // 派生共享密钥
  const sharedKeyBytes = kdf(kdfInput, keyLength);
  const sharedKey = bytesToHex(sharedKeyBytes);

  // 计算可选的确认哈希值（用于相互认证）
  // 根据标准（GM/T 0003.3-2012 及 GM/T 0009-2023）:
  // 对于发起方 A: S1 = Hash(0x02 || yv || Hash(xv || ZA || ZB || xRA || yRA || xRB || yRB))
  // 对于响应方 B: S1 = Hash(0x02 || yv || Hash(xv || ZB || ZA || xRB || yRB || xRA || yRA))

  const tempPublicKeyBytes = tempPublicKeyPoint.toBytes(false);
  const peerTempPublicKeyBytes = peerTempPublicKeyPoint.toBytes(false);

  const xSelf = tempPublicKeyBytes.slice(1, 33);
  const ySelf = tempPublicKeyBytes.slice(33, 65);
  const xPeer = peerTempPublicKeyBytes.slice(1, 33);
  const yPeer = peerTempPublicKeyBytes.slice(33, 65);

  // 确认标签始终按 A/B 协议视角拼接，响应方不能改成 self/peer 顺序。
  // A = 发起方，B = 响应方：xv || ZA || ZB || xRA || yRA || xRB || yRB。
  const zA = isInitiator ? selfZ : peerZ;
  const zB = isInitiator ? peerZ : selfZ;
  const xRA = isInitiator ? xSelf : xPeer;
  const yRA = isInitiator ? ySelf : yPeer;
  const xRB = isInitiator ? xPeer : xSelf;
  const yRB = isInitiator ? yPeer : ySelf;

  const innerHashInput = new Uint8Array(
    xv.length + zA.length + zB.length + xRA.length + yRA.length + xRB.length + yRB.length
  );
  let offset = 0;
  innerHashInput.set(xv, offset);
  offset += xv.length;
  innerHashInput.set(zA, offset);
  offset += zA.length;
  innerHashInput.set(zB, offset);
  offset += zB.length;
  innerHashInput.set(xRA, offset);
  offset += xRA.length;
  innerHashInput.set(yRA, offset);
  offset += yRA.length;
  innerHashInput.set(xRB, offset);
  offset += xRB.length;
  innerHashInput.set(yRB, offset);

  const innerHash = sm3Digest(innerHashInput);
  const innerHashBytes = hexToBytes(innerHash);

  // 计算标准 S1（0x02）：响应方 B 发送给发起方 A，由 A 在协议层验证。
  const s1Input = new Uint8Array(1 + yv.length + innerHashBytes.length);
  s1Input[0] = 0x02;
  s1Input.set(yv, 1);
  s1Input.set(innerHashBytes, 1 + yv.length);
  const s1 = sm3Digest(s1Input);

  // 计算标准 S2（0x03）：发起方 A 发送给响应方 B，由 B 在协议层验证。
  const s2Input = new Uint8Array(1 + yv.length + innerHashBytes.length);
  s2Input[0] = 0x03;
  s2Input.set(yv, 1);
  s2Input.set(innerHashBytes, 1 + yv.length);
  const s2 = sm3Digest(s2Input);

  return {
    tempPublicKey,
    sharedKey,
    s1,
    s2,
  };
}
