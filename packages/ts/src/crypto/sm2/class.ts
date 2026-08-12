/**
 * SM2 类，提供面向对象的 API
 */

import {
  generateKeyPair as generateKeyPairFunc,
  getPublicKeyFromPrivateKey as getPublicKeyFromPrivateKeyFunc,
  decompressPublicKey as decompressPublicKeyFunc,
  encrypt as encryptFunc,
  decrypt as decryptFunc,
  decryptBytes as decryptBytesFunc,
  sign as signFunc,
  verify as verifyFunc,
  keyExchange as keyExchangeFunc,
  type KeyPair,
  type SignOptions as FuncSignOptions,
  type VerifyOptions as FuncVerifyOptions,
  type SM2EncryptOptions,
  type SM2DecryptOptions,
  type SM2CurveParams,
  type SM2KeyExchangeResult,
} from './index';
import type { BytesLike } from '../../core/utils';

/**
 * SM2 类，提供面向对象的 API
 * 
 * SM2 是中国国家密码管理局发布的椭圆曲线密码算法，
 * 支持公钥加密、数字签名和密钥交换功能。
 * 
 * @example
 * ```typescript
 * // 生成密钥对
 * const sm2 = SM2.generateKeyPair();
 * 
 * // 加密/解密
 * const message = 'order=GMKIT-DEMO-0001&amount=88.00';
 * const encrypted = sm2.encrypt(message);
 * const decrypted = sm2.decrypt(encrypted);
 *
 * // 签名/验签
 * const signature = sm2.sign(message, { userId: 'merchant@gmkit.cn' });
 * const isValid = sm2.verify(message, signature, { userId: 'merchant@gmkit.cn' });
 * ```
 */
export class SM2 {
  /** 公钥（十六进制字符串，04 开头的非压缩格式） */
  private publicKey?: string;
  /** 私钥（十六进制字符串，32 字节） */
  private privateKey?: string;
  /** 标准曲线参数兼容声明；不同于标准值的参数会被拒绝。 */
  private curveParams?: SM2CurveParams;

  /**
   * 创建新的 SM2 实例
   * @param keyPair - 可选的密钥对（公钥和/或私钥）
   * @param curveParams - 可选的标准曲线兼容声明；不支持自定义曲线
   */
  constructor(keyPair?: Partial<KeyPair>, curveParams?: SM2CurveParams) {
    if (keyPair?.privateKey && keyPair.publicKey) {
      const expectedPublicKey = getPublicKeyFromPrivateKeyFunc(keyPair.privateKey);
      if (!sm2PublicKeysEqual(expectedPublicKey, keyPair.publicKey)) {
        throw new Error('SM2 公钥与私钥不匹配');
      }
    }
    this.publicKey = keyPair?.publicKey;
    this.privateKey = keyPair?.privateKey;
    this.curveParams = curveParams;
  }

  /**
   * 生成新的密钥对
   * @param curveParams - 可选的标准曲线兼容声明；不支持自定义曲线
   * @returns 带有生成的密钥对的新 SM2 实例
   * @throws 当前运行环境无法提供符合策略的随机源时抛出错误
   */
  static generateKeyPair(curveParams?: SM2CurveParams): SM2 {
    const keyPair = generateKeyPairFunc();
    return new SM2(keyPair, curveParams);
  }

  /**
   * 从私钥创建 SM2 实例
   * @param privateKey - 私钥（十六进制字符串）
   * @param curveParams - 可选的标准曲线兼容声明；不支持自定义曲线
   * @returns 新的 SM2 实例
   */
  static fromPrivateKey(privateKey: string, curveParams?: SM2CurveParams): SM2 {
    const publicKey = getPublicKeyFromPrivateKeyFunc(privateKey);
    return new SM2({ privateKey, publicKey }, curveParams);
  }

  /**
   * 从公钥创建 SM2 实例
   * @param publicKey - 公钥（十六进制字符串）
   * @param curveParams - 可选的标准曲线兼容声明；不支持自定义曲线
   * @returns 新的 SM2 实例
   */
  static fromPublicKey(publicKey: string, curveParams?: SM2CurveParams): SM2 {
    return new SM2({ publicKey }, curveParams);
  }

  /**
   * 获取公钥
   * @returns 公钥（十六进制字符串，04 开头的非压缩格式）
   * @throws 如果公钥未设置则抛出异常
   */
  getPublicKey(): string {
    if (!this.publicKey) {
      throw new Error('公钥未设置');
    }
    return this.publicKey;
  }

  /**
   * 获取私钥
   * @returns 私钥（十六进制字符串，32 字节）
   * @throws 如果私钥未设置则抛出异常
   */
  getPrivateKey(): string {
    if (!this.privateKey) {
      throw new Error('私钥未设置');
    }
    return this.privateKey;
  }

  /**
   * 加密数据
   * @param data - 要加密的数据（字符串或 Uint8Array）
   * @param options - 加密选项（密文模式、输出格式等）
   * @returns 加密后的数据（默认十六进制字符串）
   * @throws 公钥、明文、随机源或选项无效时抛出错误
   */
  encrypt(data: string | Uint8Array, options?: SM2EncryptOptions): string {
    const publicKey = this.getPublicKey();
    return encryptFunc(publicKey, data, options);
  }

  /**
   * 解密数据
   * @param encryptedData - 加密的数据（十六进制字符串或 Uint8Array）
   * @param options - 解密选项（密文模式、输入格式等）
   * @returns 解密后的数据（字符串）
   * @throws 私钥缺失，或密文格式、曲线点、C3 校验无效时抛出错误
   */
  decrypt(encryptedData: BytesLike, options?: SM2DecryptOptions): string {
    const privateKey = this.getPrivateKey();
    return decryptFunc(privateKey, encryptedData, options);
  }

  /**
   * 解密任意二进制明文，不经过 UTF-8 解码。
   * @param encryptedData - Hex/Base64 密文字符串或原始密文字节
   * @param options - 密文排列与字符串输入编码；省略时按函数入口的默认规则处理
   * @returns 通过 C3 完整性校验的原始明文字节
   * @throws 私钥缺失，或密文格式、曲线点、C3 校验无效时抛出错误
   */
  decryptBytes(encryptedData: BytesLike, options?: SM2DecryptOptions): Uint8Array {
    const privateKey = this.getPrivateKey();
    return decryptBytesFunc(privateKey, encryptedData, options);
  }

  /**
   * 签名数据
   * @param data - 要签名的数据（字符串或 Uint8Array）
   * @param options - 签名选项（签名格式、用户 ID 等）
   * @returns 签名（默认十六进制字符串，r || s 格式）
   * @throws 私钥缺失，或消息、随机源、曲线参数、输出选项无效时抛出错误
   */
  sign(data: string | Uint8Array, options?: Omit<FuncSignOptions, 'curveParams'>): string {
    const privateKey = this.getPrivateKey();
    return signFunc(privateKey, data, { ...options, curveParams: this.curveParams });
  }

  /**
   * 验证签名
   * @param data - 原始数据（字符串或 Uint8Array）
   * @param signature - 签名（十六进制字符串）
   * @param options - 验签选项（签名格式、用户 ID 等）
   * @returns 签名数学上有效且身份、消息均匹配时返回 true，否则返回 false
   * @throws 公钥、签名编码、曲线参数或选项格式无效时抛出错误
   */
  verify(data: string | Uint8Array, signature: string, options?: Omit<FuncVerifyOptions, 'curveParams'>): boolean {
    const publicKey = this.getPublicKey();
    return verifyFunc(publicKey, data, signature, { ...options, curveParams: this.curveParams });
  }

  /**
   * 设置标准曲线参数兼容声明。传入不同于标准 SM2 曲线的值后，签名或验签会拒绝执行。
   * @param curveParams - 标准 SM2 曲线参数
   * @remarks 该声明不会切换曲线或重新计算密钥；它用于在后续签名和验签前拒绝非标准参数。实例保存的是调用方对象的当前引用。
   */
  setCurveParams(curveParams: SM2CurveParams): void {
    this.curveParams = curveParams;
  }

  /**
   * 获取构造或设置时保存的曲线参数声明。
   * @returns 参数声明的原对象；未设置时返回 undefined
   */
  getCurveParams(): SM2CurveParams | undefined {
    return this.curveParams;
  }

  /**
   * 执行 SM2 密钥交换协议
   *
   * @param peerPublicKey - 对方公钥（十六进制字符串）
   * @param peerTempPublicKey - 对方临时公钥（十六进制字符串）
   * @param isInitiator - 是否为发起方
   * @param options - 可选参数
   * @returns 密钥交换结果，包含本方临时公钥、共享密钥以及标准 S1（0x02）/S2（0x03）确认值
   * @throws 任一密钥、身份、角色或派生长度无效
   *
   * 此方法只计算确认值，不接收或验证对端确认值；“确认标签不匹配”必须由上层协议处理。
   *
   * @example
   * ```typescript
   * const sm2A = SM2.generateKeyPair();
   * const sm2B = SM2.generateKeyPair();
   * const tempA = SM2.generateKeyPair();
   * const tempB = SM2.generateKeyPair();
   *
   * const resultA = sm2A.keyExchange(sm2B.getPublicKey(), tempB.getPublicKey(), true, {
   *   tempPrivateKey: tempA.getPrivateKey()
   * });
   * const resultB = sm2B.keyExchange(sm2A.getPublicKey(), tempA.getPublicKey(), false, {
   *   tempPrivateKey: tempB.getPrivateKey()
   * });
   *
   * if (resultA.sharedKey !== resultB.sharedKey) {
   *   throw new Error('SM2 密钥交换结果不一致');
   * }
   * ```
   */
  keyExchange(
    peerPublicKey: string,
    peerTempPublicKey: string,
    isInitiator: boolean,
    options?: {
      userId?: string;
      peerUserId?: string;
      tempPrivateKey?: string;
      keyLength?: number;
    }
  ): SM2KeyExchangeResult {
    const privateKey = this.getPrivateKey();
    const publicKey = this.getPublicKey();

    return keyExchangeFunc({
      privateKey,
      publicKey,
      peerPublicKey,
      peerTempPublicKey,
      isInitiator,
      userId: options?.userId,
      peerUserId: options?.peerUserId,
      tempPrivateKey: options?.tempPrivateKey,
      keyLength: options?.keyLength,
    });
  }
}

function sm2PublicKeysEqual(left: string, right: string): boolean {
  return decompressPublicKeyFunc(left) === decompressPublicKeyFunc(right);
}
