/**
 * gmkitx 顶层入口。
 *
 * 算法范围：
 * - 国密：SM2、SM3、SM4、ZUC（含 EEA3 / EIA3）
 * - 国际：SHA-1、SHA-256、SHA-384、SHA-512（含 HMAC）
 *
 * 三种使用方式（任选其一，能力对等）：
 *   import * as gmkit from 'gmkitx';                 // 命名空间
 *   import { sm2, sm3, sm4, zuc, sha } from 'gmkitx'; // 算法模块
 *   import { sm2Encrypt, sm3Digest, sha256 } from 'gmkitx'; // 具名函数（推荐）
 *
 * generateKeyPair / sign / digest 等无算法前缀旧名继续兼容，但已标记弃用。
 * 新代码请使用带算法前缀的具名函数，或使用 sm2 / sm3 等算法命名空间。
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
 * SM2 椭圆曲线公钥密码算法模块。
 * 聚合所有具名函数与对象式入口 {@link SM2Class}。
 * @namespace
 */
export const sm2 = {
  ...sm2Functions,
  /** SM2 对象式 API。实例可持有密钥并执行加解密、签名验签和密钥交换。 */
  SM2: SM2Class,
};

/**
 * SM3 密码杂凑算法模块。
 * 聚合所有具名函数与对象式入口 {@link SM3Class}。
 * @namespace
 */
export const sm3 = {
  ...sm3Functions,
  /** SM3 对象式 API，支持一次性摘要、HMAC 和增量摘要。 */
  SM3: SM3Class,
};

/**
 * SM4 分组密码算法模块。
 * 聚合所有具名函数与对象式入口 {@link SM4Class}。
 * @namespace
 */
export const sm4 = {
  ...sm4Functions,
  /** SM4 对象式 API，实例保存 key、mode、padding 与可选 IV 配置。 */
  SM4: SM4Class,
};

/**
 * ZUC 流密码算法模块（含 EEA3 加密 / EIA3 完整性算法）。
 * 聚合所有具名函数与对象式入口 {@link ZUCClass}。
 * @namespace
 */
export const zuc = {
  ...zucFunctions,
  /** ZUC 对象式 API，实例保存 128 位 key 与 IV。 */
  ZUC: ZUCClass,
};

/**
 * SHA 系列哈希算法模块（FIPS 180-4 国际标准）。
 * 聚合 SHA-1 / SHA-256 / SHA-384 / SHA-512 的具名函数与对象式入口。
 * @namespace
 */
export const sha = {
  ...shaFunctions,
  /** SHA-256 增量摘要类。 */
  SHA256: SHA256Class,
  /** SHA-384 增量摘要类。 */
  SHA384: SHA384Class,
  /** SHA-512 增量摘要类。 */
  SHA512: SHA512Class,
  /** SHA-1 增量摘要类，仅用于旧协议兼容。 */
  SHA1: SHA1Class,
};

// ============================================================================
// 具名函数导出
// ============================================================================

// 优先使用带算法前缀的顶层函数，便于直接识别归属算法。
/** 生成 SM2 密钥对；参数、编码、返回值和异常与 `sm2.generateKeyPair` 相同。 */
export const sm2GenerateKeyPair = sm2Functions.generateKeyPair;
/** 从 32 字节 SM2 私钥派生公钥；行为与 `sm2.getPublicKeyFromPrivateKey` 相同。 */
export const sm2GetPublicKeyFromPrivateKey = sm2Functions.getPublicKeyFromPrivateKey;
/** 将 SM2 公钥转换为 33 字节压缩点编码；行为与 `sm2.compressPublicKey` 相同。 */
export const sm2CompressPublicKey = sm2Functions.compressPublicKey;
/** 将 SM2 压缩公钥转换为 65 字节非压缩点编码；行为与 `sm2.decompressPublicKey` 相同。 */
export const sm2DecompressPublicKey = sm2Functions.decompressPublicKey;
/** 使用 SM2 公钥加密；密文排列、输出编码和异常与 `sm2.encrypt` 相同。 */
export const sm2Encrypt = sm2Functions.encrypt;
/** 使用 SM2 私钥解密为 UTF-8 文本；二进制明文应使用 {@link sm2DecryptBytes}。 */
export const sm2Decrypt = sm2Functions.decrypt;
/** 使用 SM2 私钥解密并返回原始字节；行为与 `sm2.decryptBytes` 相同。 */
export const sm2DecryptBytes = sm2Functions.decryptBytes;
/** 生成 SM2 签名；用户标识、签名格式和异常与 `sm2.sign` 相同。 */
export const sm2Sign = sm2Functions.sign;
/** 验证 SM2 签名；用户标识和输入格式必须与签名端一致。 */
export const sm2Verify = sm2Functions.verify;
/** 执行 SM2 密钥交换；参与方角色、用户标识和派生长度见 `SM2KeyExchangeParams`。 */
export const sm2KeyExchange = sm2Functions.keyExchange;

/** 计算 SM3 摘要；字符串按 UTF-8 编码，默认返回小写十六进制。 */
export const sm3Digest = sm3Functions.digest;
/** 计算 HMAC-SM3；key 与消息字符串均按 UTF-8 编码。 */
export const sm3Hmac = sm3Functions.hmac;

/** 使用 SM4 加密；key、IV/nonce、mode、padding 与 AEAD 约束见 `SM4Options`。 */
export const sm4Encrypt = sm4Functions.encrypt;
/** 使用 SM4 解密为 UTF-8 文本；二进制明文应使用 {@link sm4DecryptBytes}。 */
export const sm4Decrypt = sm4Functions.decrypt;
/** 使用 SM4 解密并返回原始字节；AEAD 模式会先校验认证标签。 */
export const sm4DecryptBytes = sm4Functions.decryptBytes;

/** 使用 ZUC-128 流密码加密；key 与 IV 必须各为 16 字节。 */
export const zucEncrypt = zucFunctions.encrypt;
/** 使用 ZUC-128 解密为 UTF-8 文本；二进制明文应使用 {@link zucDecryptBytes}。 */
export const zucDecrypt = zucFunctions.decrypt;
/** 使用 ZUC-128 解密并返回原始字节。 */
export const zucDecryptBytes = zucFunctions.decryptBytes;
/** 生成指定字节数的 ZUC 密钥流并返回小写 Hex 字符串。 */
export const zucKeystream = zucFunctions.getKeystream;
/** 生成指定数量的 32 位 ZUC 密钥流字，按大端顺序返回 Hex 字符串。 */
export const zucKeystreamWords = zucFunctions.getKeystreamWords;
/** 兼容旧版的 EEA3 密钥流入口；`length` 表示需要生成的 bit 数。 */
export const eea3 = zucFunctions.eea3;
/** 按 3GPP EEA3 参数加密消息 bit 串，末字节未使用 bit 会被清零。 */
export const eea3Encrypt = zucFunctions.eea3Encrypt;
/** 按 3GPP EIA3 参数计算 32 位 MAC，返回 8 个十六进制字符。 */
export const eia3 = zucFunctions.eia3;
/** 底层 ZUC 密钥流生成入口；key/IV 为 16 字节，`length` 为 32 位字数量。 */
export const zucGenerateKeystream = zucFunctions.generateKeystream;

/** 计算 SHA-256；字符串按 UTF-8 编码，默认返回小写十六进制。 */
export const sha256 = shaFunctions.sha256;
/** 计算 SHA-384；字符串按 UTF-8 编码，默认返回小写十六进制。 */
export const sha384 = shaFunctions.sha384;
/** 计算 SHA-512；字符串按 UTF-8 编码，默认返回小写十六进制。 */
export const sha512 = shaFunctions.sha512;
/**
 * 计算 SHA-1，仅用于核对无法立即迁移的旧协议。
 * @deprecated 新协议请使用 {@link sha256} 或更高版本。
 */
export const sha1 = shaFunctions.sha1;
/** 计算 HMAC-SHA-256；key 与消息字符串均按 UTF-8 编码。 */
export const hmacSha256 = shaFunctions.hmacSha256;
/** 计算 HMAC-SHA-384；key 与消息字符串均按 UTF-8 编码。 */
export const hmacSha384 = shaFunctions.hmacSha384;
/** 计算 HMAC-SHA-512；key 与消息字符串均按 UTF-8 编码。 */
export const hmacSha512 = shaFunctions.hmacSha512;

// ============================================================================
// 弃用别名（无算法前缀的旧名）
// ============================================================================

/**
 * 旧版无前缀 SM2 密钥生成入口。
 * @deprecated 请改用 {@link sm2GenerateKeyPair}。
 */
export const generateKeyPair = sm2GenerateKeyPair;

/**
 * 旧版无前缀 SM2 公钥派生入口。
 * @deprecated 请改用 {@link sm2GetPublicKeyFromPrivateKey}。
 */
export const getPublicKeyFromPrivateKey = sm2GetPublicKeyFromPrivateKey;

/**
 * 旧版无前缀 SM2 公钥压缩入口。
 * @deprecated 请改用 {@link sm2CompressPublicKey}。
 */
export const compressPublicKey = sm2CompressPublicKey;

/**
 * 旧版无前缀 SM2 公钥解压入口。
 * @deprecated 请改用 {@link sm2DecompressPublicKey}。
 */
export const decompressPublicKey = sm2DecompressPublicKey;

/**
 * 旧版无前缀 SM2 签名入口。
 * @deprecated 请改用 {@link sm2Sign}。
 */
export const sign = sm2Sign;

/**
 * 旧版无前缀 SM2 验签入口。
 * @deprecated 请改用 {@link sm2Verify}。
 */
export const verify = sm2Verify;

/**
 * 旧版无前缀 SM2 密钥交换入口。
 * @deprecated 请改用 {@link sm2KeyExchange}。
 */
export const keyExchange = sm2KeyExchange;

/**
 * 旧版无前缀 SM3 摘要入口。
 * @deprecated 请改用 {@link sm3Digest}。
 */
export const digest = sm3Digest;

/**
 * 旧版无前缀 HMAC-SM3 入口。
 * @deprecated 请改用 {@link sm3Hmac}。
 */
export const hmac = sm3Hmac;

// ============================================================================
// 类型与对象式入口（每个算法重新导出对应 class）
// ============================================================================

export type {
  KeyPair,
  SignOptions,
  VerifyOptions,
  SM2CurveParams,
  SM2KeyExchangeParams,
  SM2KeyExchangeResult,
  SM2EncryptOptions,
  SM2DecryptOptions,
  SM2SignatureFormat,
  SM2SignatureInputFormat,
} from './crypto/sm2';

export { SM2 } from './crypto/sm2/class';

export type { SM3Options } from './crypto/sm3';

export { SM3 } from './crypto/sm3/class';

export type {
  SM4Options,
  SM4DecryptOptions,
  SM4CipherResult,
  SM4GCMResult,
  SM4CCMResult,
  SM4AEADResult,
} from './crypto/sm4';

export { SM4 } from './crypto/sm4/class';

export { ZUCState } from './crypto/zuc';
export type { ZUCOptions, ZUCDecryptOptions } from './crypto/zuc';

export { ZUC } from './crypto/zuc/class';

export type { SHAOptions } from './crypto/sha';

export { SHA256, SHA384, SHA512, SHA1 } from './crypto/sha/class';

// ============================================================================
// 常量和类型导出
// ============================================================================

export {
  CipherMode,
  PaddingMode,
  SM2CipherMode,
  OutputFormat,
  InputFormat,
  OID,
  DEFAULT_USER_ID,
  type CipherModeType,
  type PaddingModeType,
  type SM2CipherModeType,
  type OutputFormatType,
  type InputFormatType,
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
  decodeInput,
  encodeOutput,
  autoDecodeString,
  xor,
  rotl,
  isHexString,
  isBase64String,
  bytes4ToUint32BE,
  uint32ToBytes4BE,
  configureRNG,
  setRNGPolicy,
  setCustomRNG,
  clearCustomRNG,
  hasCustomRNG,
  getRandomBytes,
  setTextCodec,
  getEnvReport,
  constantTimeEqual,
  type BytesLike,
  type RNGPolicy,
  type TextCodec,
  type EnvReport,
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

/**
 * UMD 与旧版整体导入使用的聚合对象。
 *
 * 新的 ESM/CommonJS 代码优先使用具名导出，以便静态分析和 tree-shaking。
 */
export default {
  /** SM2 函数与对象式 API 命名空间。 */
  sm2,
  /** SM3 函数与对象式 API 命名空间。 */
  sm3,
  /** SM4 函数与对象式 API 命名空间。 */
  sm4,
  /** ZUC、EEA3 与 EIA3 API 命名空间。 */
  zuc,
  /** SHA 与 HMAC API 命名空间。 */
  sha,
  // 推荐使用的顶层函数导出
  /** 具名导出 {@link sm2GenerateKeyPair}。 */
  sm2GenerateKeyPair,
  /** 具名导出 {@link sm2GetPublicKeyFromPrivateKey}。 */
  sm2GetPublicKeyFromPrivateKey,
  /** 具名导出 {@link sm2CompressPublicKey}。 */
  sm2CompressPublicKey,
  /** 具名导出 {@link sm2DecompressPublicKey}。 */
  sm2DecompressPublicKey,
  /** 具名导出 {@link sm2Encrypt}。 */
  sm2Encrypt,
  /** 具名导出 {@link sm2Decrypt}。 */
  sm2Decrypt,
  /** 具名导出 {@link sm2DecryptBytes}。 */
  sm2DecryptBytes,
  /** 具名导出 {@link sm2Sign}。 */
  sm2Sign,
  /** 具名导出 {@link sm2Verify}。 */
  sm2Verify,
  /** 具名导出 {@link sm2KeyExchange}。 */
  sm2KeyExchange,
  /** 具名导出 {@link sm3Digest}。 */
  sm3Digest,
  /** 具名导出 {@link sm3Hmac}。 */
  sm3Hmac,
  /** 具名导出 {@link sm4Encrypt}。 */
  sm4Encrypt,
  /** 具名导出 {@link sm4Decrypt}。 */
  sm4Decrypt,
  /** 具名导出 {@link sm4DecryptBytes}。 */
  sm4DecryptBytes,
  /** 具名导出 {@link zucEncrypt}。 */
  zucEncrypt,
  /** 具名导出 {@link zucDecrypt}。 */
  zucDecrypt,
  /** 具名导出 {@link zucDecryptBytes}。 */
  zucDecryptBytes,
  /** 具名导出 {@link zucKeystream}。 */
  zucKeystream,
  /** 具名导出 {@link zucKeystreamWords}。 */
  zucKeystreamWords,
  /** 具名导出 {@link zucGenerateKeystream}。 */
  zucGenerateKeystream,
  /** 具名导出 {@link eea3}。 */
  eea3,
  /** 具名导出 {@link eea3Encrypt}。 */
  eea3Encrypt,
  /** 具名导出 {@link eia3}。 */
  eia3,
  /** 具名导出 {@link sha256}。 */
  sha256,
  /** 具名导出 {@link sha384}。 */
  sha384,
  /** 具名导出 {@link sha512}。 */
  sha512,
  /** 具名导出 {@link sha1}。 */
  sha1,
  /** 具名导出 {@link hmacSha256}。 */
  hmacSha256,
  /** 具名导出 {@link hmacSha384}。 */
  hmacSha384,
  /** 具名导出 {@link hmacSha512}。 */
  hmacSha512,
  // 旧版调用继续可用，类型提示会引导新代码迁移到带算法前缀的名称。
  /** @deprecated 请改用 {@link sm2GenerateKeyPair}。 */
  generateKeyPair,
  /** @deprecated 请改用 {@link sm2GetPublicKeyFromPrivateKey}。 */
  getPublicKeyFromPrivateKey,
  /** @deprecated 请改用 {@link sm2CompressPublicKey}。 */
  compressPublicKey,
  /** @deprecated 请改用 {@link sm2DecompressPublicKey}。 */
  decompressPublicKey,
  /** @deprecated 请改用 {@link sm2Sign}。 */
  sign,
  /** @deprecated 请改用 {@link sm2Verify}。 */
  verify,
  /** @deprecated 请改用 {@link sm2KeyExchange}。 */
  keyExchange,
  /** @deprecated 请改用 {@link sm3Digest}。 */
  digest,
  /** @deprecated 请改用 {@link sm3Hmac}。 */
  hmac,
};
