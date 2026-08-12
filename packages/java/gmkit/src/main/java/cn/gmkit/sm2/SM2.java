package cn.gmkit.sm2;

import cn.gmkit.core.*;

import java.nio.charset.Charset;

/**
 * SM2 对象式入口。
 * <p>
 * 这个类面向希望保留实例并重复调用的场景，例如：
 * 使用同一个安全上下文连续生成密钥、执行加解密、签名验签，或完成密钥交换。
 * <p>
 * 如果业务更偏好传统工具类风格，可改用 {@link SM2Util} 的静态方法；两套 API
 * 在能力上保持一致，只是调用方式不同。
 * <p>
 * 兼容性说明：
 * 本类依赖 BouncyCastle Provider，目标运行环境为 JDK 8 及以上版本。
 */
public final class SM2 {

    /**
     * 默认用户标识。
     * <p>
     * 当前库默认按公开资料里最常见的 16 字节用户标识处理，
     * 便于与大多数 SM2 示例、测试向量和历史系统保持一致。
     */
    public static final String DEFAULT_USER_ID = "1234567812345678";

    /**
     * 历史空用户标识常量。
     *
     * @deprecated 当前选项 Builder 会把空字符串映射为 {@link #DEFAULT_USER_ID}，
     * 因此该常量不能表达独立的空用户标识。请为协议显式约定非空 user ID。
     */
    @Deprecated
    public static final String GM_2023_USER_ID = "";

    /**
     * SM2 标准曲线名称。
     */
    public static final String CURVE_NAME = "sm2p256v1";

    /**
     * SM3 摘要长度，单位为字节。
     */
    public static final int SM3_DIGEST_LENGTH = 32;

    private final GmSecurityContext securityContext;
    private final boolean securityContextPinned;

    /**
     * 创建一个使用默认安全上下文的 SM2 实例。
     * <p>
     * 默认情况下会自动解析 Provider 和随机源，适合绝大多数直接调用场景。
     */
    public SM2() {
        this(null);
    }

    /**
     * 创建一个绑定指定安全上下文的 SM2 实例。
     * <p>
     * 绑定后，该实例的密钥生成、加密、签名和密钥交换会优先使用这里指定的 Provider
     * 与随机源；当参数为 {@code null} 时，内部会自动回退到默认安全上下文。
     *
     * @param securityContext Provider 和随机源配置；传入 {@code null} 时回退为默认配置
     */
    public SM2(GmSecurityContext securityContext) {
        this.securityContext = SM2Domain.context(securityContext);
        this.securityContextPinned = securityContext != null;
    }

    /**
     * 返回当前实例绑定的安全上下文。
     *
     * @return 当前实例使用的安全上下文
     */
    public GmSecurityContext securityContext() {
        return securityContext;
    }

    /**
     * 生成一组 SM2 密钥，默认输出未压缩公钥。
     *
     * @return SM2 密钥对
     */
    public SM2KeyPair generateKeyPair() {
        return generateKeyPair(false);
    }

    /**
     * 生成一组 SM2 密钥。
     *
     * @param compressedPublicKey 是否输出压缩公钥
     * @return SM2 密钥对
     */
    public SM2KeyPair generateKeyPair(boolean compressedPublicKey) {
        return SM2KeyOps.generateKeyPair(compressedPublicKey, securityContext);
    }

    /**
     * 根据私钥推导公钥。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param compressed    是否输出压缩公钥
     * @return 公钥十六进制字符串
     */
    public String getPublicKeyFromPrivateKey(String privateKeyHex, boolean compressed) {
        return SM2KeyOps.getPublicKeyFromPrivateKey(privateKeyHex, compressed);
    }

    /**
     * 将未压缩公钥压缩编码。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @return 压缩公钥
     */
    public String compressPublicKey(String publicKeyHex) {
        return SM2KeyOps.compressPublicKey(publicKeyHex);
    }

    /**
     * 将压缩公钥恢复为未压缩编码。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @return 未压缩公钥
     */
    public String decompressPublicKey(String publicKeyHex) {
        return SM2KeyOps.decompressPublicKey(publicKeyHex);
    }

    /**
     * 使用默认密文布局 {@code C1C3C2} 加密。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字节数组
     * @return 原始密文
     */
    public byte[] encrypt(String publicKeyHex, byte[] data) {
        return encrypt(publicKeyHex, data, SM2CipherMode.C1C3C2);
    }

    /**
     * 使用 UTF-8 编码后的字符串进行加密。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字符串
     * @return 原始密文
     */
    public byte[] encrypt(String publicKeyHex, String data) {
        return encrypt(publicKeyHex, data, Texts.UTF_8, SM2CipherMode.C1C3C2);
    }

    /**
     * 使用指定字符集编码字符串后进行加密。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字符串
     * @param charset      字符集；传入 {@code null} 时默认使用 UTF-8
     * @param mode         密文布局
     * @return 原始密文
     */
    public byte[] encrypt(String publicKeyHex, String data, Charset charset, SM2CipherMode mode) {
        return encrypt(publicKeyHex, Texts.bytes(data, charset), mode);
    }

    /**
     * 使用指定密文布局加密。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字节数组
     * @param mode         密文布局，传入 {@code null} 时默认 {@code C1C3C2}
     * @return 原始密文
     */
    public byte[] encrypt(String publicKeyHex, byte[] data, SM2CipherMode mode) {
        return SM2Cryptor.encrypt(publicKeyHex, data, mode, securityContext);
    }

    /**
     * 加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字节数组
     * @return 十六进制密文
     */
    public String encryptHex(String publicKeyHex, byte[] data) {
        return encryptHex(publicKeyHex, data, SM2CipherMode.C1C3C2);
    }

    /**
     * 使用 UTF-8 编码后的字符串加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字符串
     * @param mode         密文布局
     * @return 十六进制密文
     */
    public String encryptHex(String publicKeyHex, String data, SM2CipherMode mode) {
        return encryptHex(publicKeyHex, Texts.bytes(data, Texts.UTF_8), mode);
    }

    /**
     * 使用指定字符集编码字符串后加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字符串
     * @param charset      字符集；传入 {@code null} 时默认使用 UTF-8
     * @param mode         密文布局
     * @return 十六进制密文
     */
    public String encryptHex(String publicKeyHex, String data, Charset charset, SM2CipherMode mode) {
        return encryptHex(publicKeyHex, Texts.bytes(data, charset), mode);
    }

    /**
     * 加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字节数组
     * @param mode         密文布局
     * @return 十六进制密文
     */
    public String encryptHex(String publicKeyHex, byte[] data, SM2CipherMode mode) {
        return SM2Cryptor.encryptHex(publicKeyHex, data, mode, securityContext);
    }

    /**
     * 加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字节数组
     * @return Base64 密文
     */
    public String encryptBase64(String publicKeyHex, byte[] data) {
        return encryptBase64(publicKeyHex, data, SM2CipherMode.C1C3C2);
    }

    /**
     * 使用 UTF-8 编码后的字符串加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字符串
     * @param mode         密文布局
     * @return Base64 密文
     */
    public String encryptBase64(String publicKeyHex, String data, SM2CipherMode mode) {
        return encryptBase64(publicKeyHex, Texts.bytes(data, Texts.UTF_8), mode);
    }

    /**
     * 使用指定字符集编码字符串后加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字符串
     * @param charset      字符集；传入 {@code null} 时默认使用 UTF-8
     * @param mode         密文布局
     * @return Base64 密文
     */
    public String encryptBase64(String publicKeyHex, String data, Charset charset, SM2CipherMode mode) {
        return encryptBase64(publicKeyHex, Texts.bytes(data, charset), mode);
    }

    /**
     * 加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字节数组
     * @param mode         密文布局
     * @return Base64 密文
     */
    public String encryptBase64(String publicKeyHex, byte[] data, SM2CipherMode mode) {
        return SM2Cryptor.encryptBase64(publicKeyHex, data, mode, securityContext);
    }

    /**
     * 使用默认密文布局 {@code C1C3C2} 解密。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext    原始密文字节数组，支持自动识别 ASN.1 DER
     * @return 明文字节数组
     */
    public byte[] decrypt(String privateKeyHex, byte[] ciphertext) {
        return decrypt(privateKeyHex, ciphertext, SM2CipherMode.C1C3C2);
    }

    /**
     * 使用指定密文布局解密。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext    原始密文字节数组，支持自动识别 ASN.1 DER
     * @param mode          密文布局
     * @return 明文字节数组
     */
    public byte[] decrypt(String privateKeyHex, byte[] ciphertext, SM2CipherMode mode) {
        return SM2Cryptor.decrypt(privateKeyHex, ciphertext, mode);
    }

    /**
     * 解密十六进制或 Base64 形式的密文字符串。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext    十六进制或 Base64 密文
     * @return 明文字节数组
     */
    public byte[] decrypt(String privateKeyHex, String ciphertext) {
        return decrypt(privateKeyHex, ciphertext, SM2CipherMode.C1C3C2);
    }

    /**
     * 解密十六进制或 Base64 形式的密文字符串。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext    十六进制或 Base64 密文
     * @param mode          密文布局
     * @return 明文字节数组
     */
    public byte[] decrypt(String privateKeyHex, String ciphertext, SM2CipherMode mode) {
        return SM2Cryptor.decrypt(privateKeyHex, ciphertext, mode);
    }

    /**
     * 使用 UTF-8 解码解密结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext    原始密文字节数组
     * @param mode          密文布局
     * @return 明文字符串
     */
    public String decryptToUtf8(String privateKeyHex, byte[] ciphertext, SM2CipherMode mode) {
        return Texts.utf8(decrypt(privateKeyHex, ciphertext, mode));
    }

    /**
     * 使用 UTF-8 解码字符串形式的密文解密结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext    十六进制或 Base64 密文
     * @param mode          密文布局
     * @return 明文字符串
     */
    public String decryptToUtf8(String privateKeyHex, String ciphertext, SM2CipherMode mode) {
        return Texts.utf8(decrypt(privateKeyHex, ciphertext, mode));
    }

    /**
     * 使用指定字符集解码解密结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext    原始密文字节数组
     * @param charset       字符集；传入 {@code null} 时默认使用 UTF-8
     * @param mode          密文布局
     * @return 明文字符串
     */
    public String decryptToString(String privateKeyHex, byte[] ciphertext, Charset charset, SM2CipherMode mode) {
        return Texts.text(decrypt(privateKeyHex, ciphertext, mode), charset);
    }

    /**
     * 使用默认签名参数签名，默认输出 RAW {@code r||s}。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @return 签名字节数组
     */
    public byte[] sign(String privateKeyHex, byte[] message) {
        return sign(privateKeyHex, message, null);
    }

    /**
     * 对 UTF-8 文本签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param options       签名参数
     * @return 签名字节数组
     */
    public byte[] sign(String privateKeyHex, String message, SM2SignOptions options) {
        return sign(privateKeyHex, message, Texts.UTF_8, options);
    }

    /**
     * 对指定字符集编码后的文本签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param charset       字符集；传入 {@code null} 时默认使用 UTF-8
     * @param options       签名参数
     * @return 签名字节数组
     */
    public byte[] sign(String privateKeyHex, String message, Charset charset, SM2SignOptions options) {
        return sign(privateKeyHex, Texts.bytes(message, charset), options);
    }

    /**
     * 使用指定签名参数签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param options       签名参数，传入 {@code null} 时使用默认值
     * @return 签名字节数组
     */
    public byte[] sign(String privateKeyHex, byte[] message, SM2SignOptions options) {
        return SM2SignerSupport.sign(privateKeyHex, message, resolveSignOptions(options));
    }

    /**
     * 签名并输出十六进制结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param options       签名参数
     * @return 十六进制签名
     */
    public String signHex(String privateKeyHex, byte[] message, SM2SignOptions options) {
        return SM2SignerSupport.signHex(privateKeyHex, message, resolveSignOptions(options));
    }

    /**
     * 对 UTF-8 文本签名并输出十六进制结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param options       签名参数
     * @return 十六进制签名
     */
    public String signHex(String privateKeyHex, String message, SM2SignOptions options) {
        return signHex(privateKeyHex, message, Texts.UTF_8, options);
    }

    /**
     * 对指定字符集编码后的文本签名并输出十六进制结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param charset       字符集；传入 {@code null} 时默认使用 UTF-8
     * @param options       签名参数
     * @return 十六进制签名
     */
    public String signHex(String privateKeyHex, String message, Charset charset, SM2SignOptions options) {
        return signHex(privateKeyHex, Texts.bytes(message, charset), options);
    }

    /**
     * 签名并输出 Base64 结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param options       签名参数
     * @return Base64 签名
     */
    public String signBase64(String privateKeyHex, byte[] message, SM2SignOptions options) {
        return SM2SignerSupport.signBase64(privateKeyHex, message, resolveSignOptions(options));
    }

    /**
     * 对 UTF-8 文本签名并输出 Base64 结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param options       签名参数
     * @return Base64 签名
     */
    public String signBase64(String privateKeyHex, String message, SM2SignOptions options) {
        return signBase64(privateKeyHex, message, Texts.UTF_8, options);
    }

    /**
     * 对指定字符集编码后的文本签名并输出 Base64 结果。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message       原文消息
     * @param charset       字符集；传入 {@code null} 时默认使用 UTF-8
     * @param options       签名参数
     * @return Base64 签名
     */
    public String signBase64(String privateKeyHex, String message, Charset charset, SM2SignOptions options) {
        return signBase64(privateKeyHex, Texts.bytes(message, charset), options);
    }

    /**
     * 按旧 no-Z 约定计算 {@code e = SM3(M)} 后签名。
     *
     * @param privateKeyHex   私钥十六进制字符串
     * @param message         原文消息
     * @param signatureFormat 输出签名格式
     * @return 签名字节数组
     * @deprecated 非标准旧协议兼容入口；新协议应使用标准 {@code SM3(Z || M)} 签名
     */
    @Deprecated
    public byte[] signWithoutZ(String privateKeyHex, byte[] message, SM2SignatureFormat signatureFormat) {
        return sign(
            privateKeyHex,
            message,
            SM2SignOptions.builder()
                .signatureFormat(signatureFormat)
                .skipZComputation(true)
                .build());
    }

    /**
     * 对外部已计算好的 e 值直接签名。
     *
     * @param privateKeyHex   私钥十六进制字符串
     * @param eHash           已计算好的 e 值
     * @param signatureFormat 输出签名格式
     * @return 签名字节数组
     */
    public byte[] signDigest(String privateKeyHex, byte[] eHash, SM2SignatureFormat signatureFormat) {
        return SM2SignerSupport.signDigest(privateKeyHex, eHash, signatureFormat, securityContext);
    }

    /**
     * 使用默认验签参数验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message      原文消息
     * @param signature    签名字节数组，支持 RAW/DER 自动识别
     * @return 验签结果
     */
    public boolean verify(String publicKeyHex, byte[] message, byte[] signature) {
        return verify(publicKeyHex, message, signature, null);
    }

    /**
     * 使用指定验签参数验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message      原文消息
     * @param signature    签名字节数组，支持 RAW/DER 自动识别
     * @param options      验签参数
     * @return 验签结果
     */
    public boolean verify(String publicKeyHex, byte[] message, byte[] signature, SM2VerifyOptions options) {
        return SM2SignerSupport.verify(publicKeyHex, message, signature, resolveVerifyOptions(options));
    }

    /**
     * 验签十六进制或 Base64 形式的签名字符串。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message      原文消息
     * @param signature    十六进制或 Base64 形式的签名
     * @param options      验签参数
     * @return 验签结果
     */
    public boolean verify(String publicKeyHex, byte[] message, String signature, SM2VerifyOptions options) {
        return SM2SignerSupport.verify(publicKeyHex, message, signature, resolveVerifyOptions(options));
    }

    /**
     * 对 UTF-8 文本验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message      原文消息
     * @param signature    签名字节数组
     * @param options      验签参数
     * @return 验签结果
     */
    public boolean verify(String publicKeyHex, String message, byte[] signature, SM2VerifyOptions options) {
        return verify(publicKeyHex, message, Texts.UTF_8, signature, options);
    }

    /**
     * 对指定字符集编码后的文本验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message      原文消息
     * @param charset      字符集；传入 {@code null} 时默认使用 UTF-8
     * @param signature    签名字节数组
     * @param options      验签参数
     * @return 验签结果
     */
    public boolean verify(String publicKeyHex, String message, Charset charset, byte[] signature, SM2VerifyOptions options) {
        return verify(publicKeyHex, Texts.bytes(message, charset), signature, options);
    }

    /**
     * 对 UTF-8 文本和字符串形式签名进行验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message      原文消息
     * @param signature    十六进制或 Base64 形式的签名
     * @param options      验签参数
     * @return 验签结果
     */
    public boolean verify(String publicKeyHex, String message, String signature, SM2VerifyOptions options) {
        return verify(publicKeyHex, Texts.bytes(message, Texts.UTF_8), signature, options);
    }

    /**
     * 按旧 no-Z 约定计算 {@code e = SM3(M)} 后验签。
     *
     * @param publicKeyHex    公钥十六进制字符串
     * @param message         原文消息
     * @param signature       签名字节数组
     * @param signatureFormat 签名输入格式
     * @return 验签结果
     * @deprecated 非标准旧协议兼容入口；新协议应使用标准 {@code SM3(Z || M)} 验签
     */
    @Deprecated
    public boolean verifyWithoutZ(
        String publicKeyHex,
        byte[] message,
        byte[] signature,
        SM2SignatureInputFormat signatureFormat) {
        return verify(
            publicKeyHex,
            message,
            signature,
            SM2VerifyOptions.builder()
                .signatureFormat(signatureFormat)
                .skipZComputation(true)
                .build());
    }

    /**
     * 对外部提供的 e 值和 DER 签名直接验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param eHash        已计算好的 e 值
     * @param derSignature ASN.1 DER 签名
     * @return 验签结果
     */
    public boolean verifyDigest(String publicKeyHex, byte[] eHash, byte[] derSignature) {
        return SM2SignerSupport.verifyDigest(publicKeyHex, eHash, derSignature);
    }

    /**
     * 计算 SM2 Z 值。
     *
     * @param userId       用户标识，传入 {@code null} 时使用默认值
     * @param publicKeyHex 公钥十六进制字符串
     * @return Z 值
     */
    public byte[] computeZ(String userId, String publicKeyHex) {
        return SM2SignerSupport.computeZ(userId, publicKeyHex);
    }

    /**
     * 计算 SM2 中用于签名的 e 值。
     *
     * @param publicKeyHex     公钥十六进制字符串
     * @param message          原文消息
     * @param userId           用户标识
     * @param skipZComputation 是否跳过 Z 计算
     * @return e 值
     */
    public byte[] computeE(String publicKeyHex, byte[] message, String userId, boolean skipZComputation) {
        return SM2SignerSupport.computeE(publicKeyHex, message, userId, skipZComputation);
    }

    /**
     * 使用指定字符集编码消息后计算 SM2 的 e 值。
     *
     * @param publicKeyHex     公钥十六进制字符串
     * @param message          原文消息
     * @param charset          字符集；传入 {@code null} 时默认使用 UTF-8
     * @param userId           用户标识
     * @param skipZComputation 是否跳过 Z 计算
     * @return e 值
     */
    public byte[] computeE(String publicKeyHex, String message, Charset charset, String userId, boolean skipZComputation) {
        return computeE(publicKeyHex, Texts.bytes(message, charset), userId, skipZComputation);
    }

    /**
     * 按旧 no-Z 约定计算 {@code e = SM3(M)}。
     *
     * @param message 原文消息
     * @return e 值
     * @deprecated 非标准旧协议兼容入口；需要预计算 e 时应明确实现协议规定的摘要过程
     */
    @Deprecated
    public byte[] computeEWithoutZ(byte[] message) {
        return SM2SignerSupport.computeEWithoutZ(message);
    }

    /**
     * 使用指定字符集编码消息后，按旧 no-Z 约定计算 {@code e = SM3(M)}。
     *
     * @param message 原文消息
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @return e 值
     * @deprecated 非标准旧协议兼容入口；需要预计算 e 时应明确实现协议规定的摘要过程
     */
    @Deprecated
    public byte[] computeEWithoutZ(String message, Charset charset) {
        return computeEWithoutZ(Texts.bytes(message, charset));
    }

    /**
     * 执行 SM2 密钥交换。
     *
     * @param selfStaticPrivateKeyHex    己方静态私钥
     * @param selfEphemeralPrivateKeyHex 己方临时私钥
     * @param peerStaticPublicKeyHex     对方静态公钥
     * @param peerEphemeralPublicKeyHex  对方临时公钥
     * @param options                    交换参数
     * @return 共享密钥
     */
    public byte[] keyExchange(
        String selfStaticPrivateKeyHex,
        String selfEphemeralPrivateKeyHex,
        String peerStaticPublicKeyHex,
        String peerEphemeralPublicKeyHex,
        SM2KeyExchangeOptions options) {
        return SM2KeyAgreements.keyExchange(
            selfStaticPrivateKeyHex,
            selfEphemeralPrivateKeyHex,
            peerStaticPublicKeyHex,
            peerEphemeralPublicKeyHex,
            options);
    }

    /**
     * 执行带确认信息的 SM2 密钥交换。
     * <p>
     * 按 SM2 标准，响应方 B 计算并发送 S1（0x02），发起方 A 通过
     * {@code confirmationTag} 验证；发起方 A 返回 S2（0x03），响应方 B
     * 再通过 {@link #confirmResponder(byte[], byte[])} 验证。该方法不负责网络传输。
     *
     * @param selfStaticPrivateKeyHex    己方静态私钥
     * @param selfEphemeralPrivateKeyHex 己方临时私钥
     * @param peerStaticPublicKeyHex     对方静态公钥
     * @param peerEphemeralPublicKeyHex  对方临时公钥
     * @param options                    交换参数
     * @return 共享密钥和确认标签
     */
    public SM2KeyExchangeResult keyExchangeWithConfirmation(
        String selfStaticPrivateKeyHex,
        String selfEphemeralPrivateKeyHex,
        String peerStaticPublicKeyHex,
        String peerEphemeralPublicKeyHex,
        SM2KeyExchangeOptions options) {
        return SM2KeyAgreements.keyExchangeWithConfirmation(
            selfStaticPrivateKeyHex,
            selfEphemeralPrivateKeyHex,
            peerStaticPublicKeyHex,
            peerEphemeralPublicKeyHex,
            options);
    }

    /**
     * 常量时间比较响应方应验证的 S2 确认标签。
     *
     * @param expectedS2      响应方本地计算出的 S2
     * @param confirmationTag 发起方返回的 S2
     * @return 一致时返回 {@code true}
     */
    public boolean confirmResponder(byte[] expectedS2, byte[] confirmationTag) {
        return SM2SignerSupport.confirmResponder(expectedS2, confirmationTag);
    }

    private SM2SignOptions resolveSignOptions(SM2SignOptions options) {
        SM2SignOptions base = Checks.defaultIfNull(options, SM2SignOptions.builder().build());
        if (!securityContextPinned) {
            return base;
        }
        return SM2SignOptions.builder()
            .signatureFormat(base.signatureFormat())
            .userId(base.userId())
            .skipZComputation(base.skipZComputation())
            .securityContext(securityContext)
            .build();
    }

    private SM2VerifyOptions resolveVerifyOptions(SM2VerifyOptions options) {
        return Checks.defaultIfNull(options, SM2VerifyOptions.builder().build());
    }
}
