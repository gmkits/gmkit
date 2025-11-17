/**
 * SMKit - 中国国密算法库和国际标准算法库
 * 纯 TypeScript 实现的 SM2、SM3、SM4、ZUC 算法
 * 国际标准算法：SHA-256、SHA-384、SHA-512
 *
 * 支持多种导入方式：
 * 1. 命名空间导入: import * as gmkit from 'gmkit'; gmkit.sm2.encrypt(...)
 * 2. 算法模块导入: import { sm2, sm3, sm4, zuc, sha } from 'gmkit';
 * 3. 具名函数导入: import { sm2Encrypt, digest, sm4Encrypt, sha256 } from 'gmkit';
 */

// ============================================================================
// 算法模块命名空间导出
// ============================================================================

import * as sm2Functions from './crypto/sm2';
import * as sm3Functions from './crypto/sm3';
import * as sm4Functions from './crypto/sm4';
import * as zucFunctions from './crypto/zuc';
import * as shaFunctions from './crypto/sha';
import { SM2 as SM2Class } from './crypto/sm2/class';
import { SM3 as SM3Class } from './crypto/sm3/class';
import { SM4 as SM4Class } from './crypto/sm4/class';
import { ZUC as ZUCClass } from './crypto/zuc/class';
import { SHA256 as SHA256Class, SHA384 as SHA384Class, SHA512 as SHA512Class, SHA1 as SHA1Class } from './crypto/sha/class';

/**
 * SM2 椭圆曲线密码算法模块
 * 包含所有 SM2 相关的函数和类
 */
export const sm2 = {
  ...sm2Functions,
  SM2: SM2Class,
};

/**
 * SM3 哈希算法模块
 * 包含所有 SM3 相关的函数和类
 */
export const sm3 = {
  ...sm3Functions,
  SM3: SM3Class,
};

/**
 * SM4 分组密码算法模块
 * 包含所有 SM4 相关的函数和类
 */
export const sm4 = {
  ...sm4Functions,
  SM4: SM4Class,
};

/**
 * ZUC 流密码算法模块
 * 包含所有 ZUC 相关的函数和类
 */
export const zuc = {
  ...zucFunctions,
  ZUC: ZUCClass,
};

/**
 * SHA 哈希算法模块（国际标准）
 * 包含所有 SHA 相关的函数和类
 */
export const sha = {
  ...shaFunctions,
  SHA256: SHA256Class,
  SHA384: SHA384Class,
  SHA512: SHA512Class,
  SHA1: SHA1Class,
};


// ============================================================================
// 具名函数导出（向后兼容）
// ============================================================================

// SM2 椭圆曲线密码算法
export {
  generateKeyPair,
  getPublicKeyFromPrivateKey,
  compressPublicKey,
  decompressPublicKey,
  encrypt as sm2Encrypt,
  decrypt as sm2Decrypt,
  sign,
  verify,
  keyExchange,
  type KeyPair,
  type SignOptions,
  type VerifyOptions,
  type SM2CurveParams,
  type SM2KeyExchangeParams,
  type SM2KeyExchangeResult,
  type SM2EncryptOptions,
} from './crypto/sm2';

export { SM2 } from './crypto/sm2/class';

// SM3 哈希算法
export {
  digest,
  hmac,
  type SM3Options,
} from './crypto/sm3';

export { SM3 } from './crypto/sm3/class';

// SM4 分组密码算法
export {
  encrypt as sm4Encrypt,
  decrypt as sm4Decrypt,
  type SM4Options,
  type SM4GCMResult,
} from './crypto/sm4';

export { SM4 } from './crypto/sm4/class';

// ZUC 流密码算法
export {
  encrypt as zucEncrypt,
  decrypt as zucDecrypt,
  getKeystream as zucKeystream,
  eea3,
  eia3,
  ZUCState,
  generateKeystream as zucGenerateKeystream,
  type ZUCOptions,
} from './crypto/zuc';

export { ZUC } from './crypto/zuc/class';

// SHA 哈希算法（国际标准）
export {
  sha256,
  sha384,
  sha512,
  sha1,
  hmacSha256,
  hmacSha384,
  hmacSha512,
  type SHAOptions,
} from './crypto/sha';

export { SHA256, SHA384, SHA512, SHA1 } from './crypto/sha/class';

// ============================================================================
// 常量和类型导出
// ============================================================================

export {
  CipherMode,
  PaddingMode,
  SM2CipherMode,
  OutputFormat,
  OID,
  DEFAULT_USER_ID,
  type CipherModeType,
  type PaddingModeType,
  type SM2CipherModeType,
  type OutputFormatType,
} from './types/constants';

// ============================================================================
// 工具函数导出
// ============================================================================

export {
  hexToBytes,
  bytesToHex,
  base64ToBytes,
  bytesToBase64,
  stringToBytes,
  bytesToString,
  normalizeInput,
  xor,
  rotl,
} from './core/utils';

// ASN.1 工具
export {
  encodeSignature,
  decodeSignature,
  rawToDer,
  derToRaw,
  asn1ToXml,
  signatureToXml,
} from './core/asn1';

// ============================================================================
// 默认导出（用于 UMD 格式）
// ============================================================================

export default {
  sm2,
  sm3,
  sm4,
  zuc,
  sha,
  // 向后兼容的函数导出
  generateKeyPair: sm2Functions.generateKeyPair,
  getPublicKeyFromPrivateKey: sm2Functions.getPublicKeyFromPrivateKey,
  sm2Encrypt: sm2Functions.encrypt,
  sm2Decrypt: sm2Functions.decrypt,
  sign: sm2Functions.sign,
  verify: sm2Functions.verify,
  digest: sm3Functions.digest,
  hmac: sm3Functions.hmac,
  sm4Encrypt: sm4Functions.encrypt,
  sm4Decrypt: sm4Functions.decrypt,
  zucEncrypt: zucFunctions.encrypt,
  zucDecrypt: zucFunctions.decrypt,
  // SHA 国际标准算法
  sha256: shaFunctions.sha256,
  sha384: shaFunctions.sha384,
  sha512: shaFunctions.sha512,
  sha1: shaFunctions.sha1,
  hmacSha256: shaFunctions.hmacSha256,
  hmacSha384: shaFunctions.hmacSha384,
  hmacSha512: shaFunctions.hmacSha512,
};
