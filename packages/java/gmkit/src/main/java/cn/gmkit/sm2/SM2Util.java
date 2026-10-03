package cn.gmkit.sm2;

import cn.gmkit.core.GmSecurityContext;
import cn.gmkit.core.SM2CipherMode;
import cn.gmkit.core.SM2SignatureFormat;
import cn.gmkit.core.SM2SignatureInputFormat;

import java.nio.charset.Charset;

/**
 * SM2 静态工具入口。
 * <p>
 * 这个类提供与 {@link SM2} 对象式入口等价的静态方法，适合以下场景：
 * 老项目中已经大量使用工具类调用方式，或调用链本身不需要显式持有实例。
 * <p>
 * 除了调用风格不同外，静态接口与对象式接口的行为、默认值和异常语义保持一致。
 * 当需要显式绑定 {@link GmSecurityContext} 时，可使用带上下文参数的静态重载。
 */
public final class SM2Util {

    /**
     * 默认用户标识。
     */
    public static final String DEFAULT_USER_ID = SM2.DEFAULT_USER_ID;

    /**
     * 2023 版规范下可选的空用户标识。
     */
    /**
     * 历史空用户标识常量。
     *
     * @deprecated 当前选项 Builder 会把空字符串映射为兼容默认身份，不能表达独立的空用户标识
     */
    @Deprecated
    public static final String GM_2023_USER_ID = SM2.GM_2023_USER_ID;

    /**
     * SM2 标准曲线名称。
     */
    public static final String CURVE_NAME = SM2.CURVE_NAME;

    /**
     * SM3 摘要长度，单位为字节。
     */
    public static final int SM3_DIGEST_LENGTH = SM2.SM3_DIGEST_LENGTH;
    private static final SM2 DEFAULT = new SM2();

    private SM2Util() {
    }

    /**
     * 生成一组未压缩公钥形式的 SM2 密钥对。
     *
     * @return SM2 密钥对
     */
    public static SM2KeyPair generateKeyPair() {
        return DEFAULT.generateKeyPair();
    }

    /**
     * 生成一组 SM2 密钥对。
     *
     * @param compressedPublicKey 是否输出压缩公钥
     * @return SM2 密钥对
     */
    public static SM2KeyPair generateKeyPair(boolean compressedPublicKey) {
        return DEFAULT.generateKeyPair(compressedPublicKey);
    }

    /**
     * 使用指定安全上下文生成一组未压缩公钥形式的 SM2 密钥对。
     *
     * @param securityContext 安全上下文
     * @return SM2 密钥对
     */
    public static SM2KeyPair generateKeyPair(GmSecurityContext securityContext) {
        return new SM2(securityContext).generateKeyPair();
    }

    /**
     * 使用指定安全上下文生成一组 SM2 密钥对。
     *
     * @param compressedPublicKey 是否输出压缩公钥
     * @param securityContext     安全上下文
     * @return SM2 密钥对
     */
    public static SM2KeyPair generateKeyPair(boolean compressedPublicKey, GmSecurityContext securityContext) {
        return new SM2(securityContext).generateKeyPair(compressedPublicKey);
    }

    /**
     * 根据私钥推导公钥。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param compressed    是否输出压缩公钥
     * @return 公钥十六进制字符串
     */
    public static String getPublicKeyFromPrivateKey(String privateKeyHex, boolean compressed) {
        return DEFAULT.getPublicKeyFromPrivateKey(privateKeyHex, compressed);
    }

    /**
     * 将未压缩公钥压缩编码。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @return 压缩公钥
     */
    public static String compressPublicKey(String publicKeyHex) {
        return DEFAULT.compressPublicKey(publicKeyHex);
    }

    /**
     * 将压缩公钥恢复为未压缩编码。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @return 未压缩公钥
     */
    public static String decompressPublicKey(String publicKeyHex) {
        return DEFAULT.decompressPublicKey(publicKeyHex);
    }

    /**
     * 使用默认密文布局 {@code C1C3C2} 加密字节数组。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字节数组
     * @return 原始密文字节数组
     */
    public static byte[] encrypt(String publicKeyHex, byte[] data) {
        return DEFAULT.encrypt(publicKeyHex, data);
    }

    /**
     * 使用指定密文布局加密字节数组。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data         明文字节数组
     * @param mode         密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return 原始密文字节数组
     */
    public static byte[] encrypt(String publicKeyHex, byte[] data, SM2CipherMode mode) {
        return DEFAULT.encrypt(publicKeyHex, data, mode);
    }

    /**
     * 使用指定安全上下文和密文布局加密字节数组。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字节数组
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @param securityContext 安全上下文
     * @return 原始密文字节数组
     */
    public static byte[] encrypt(String publicKeyHex, byte[] data, SM2CipherMode mode, GmSecurityContext securityContext) {
        return new SM2(securityContext).encrypt(publicKeyHex, data, mode);
    }

    /**
     * 使用 UTF-8 编码字符串并按默认密文布局加密。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字符串
     * @return 原始密文字节数组
     */
    public static byte[] encrypt(String publicKeyHex, String data) {
        return DEFAULT.encrypt(publicKeyHex, data);
    }

    /**
     * 使用指定字符集编码字符串后加密。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字符串
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return 原始密文字节数组
     */
    public static byte[] encrypt(String publicKeyHex, String data, Charset charset, SM2CipherMode mode) {
        return DEFAULT.encrypt(publicKeyHex, data, charset, mode);
    }

    /**
     * 加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字节数组
     * @return 十六进制密文
     */
    public static String encryptHex(String publicKeyHex, byte[] data) {
        return DEFAULT.encryptHex(publicKeyHex, data);
    }

    /**
     * 使用指定密文布局加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字节数组
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return 十六进制密文
     */
    public static String encryptHex(String publicKeyHex, byte[] data, SM2CipherMode mode) {
        return DEFAULT.encryptHex(publicKeyHex, data, mode);
    }

    /**
     * 使用指定安全上下文加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字节数组
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @param securityContext 安全上下文
     * @return 十六进制密文
     */
    public static String encryptHex(String publicKeyHex, byte[] data, SM2CipherMode mode, GmSecurityContext securityContext) {
        return new SM2(securityContext).encryptHex(publicKeyHex, data, mode);
    }

    /**
     * 使用 UTF-8 编码字符串后加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字符串
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return 十六进制密文
     */
    public static String encryptHex(String publicKeyHex, String data, SM2CipherMode mode) {
        return DEFAULT.encryptHex(publicKeyHex, data, mode);
    }

    /**
     * 使用指定字符集编码字符串后加密并输出十六进制密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字符串
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return 十六进制密文
     */
    public static String encryptHex(String publicKeyHex, String data, Charset charset, SM2CipherMode mode) {
        return DEFAULT.encryptHex(publicKeyHex, data, charset, mode);
    }

    /**
     * 加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字节数组
     * @return Base64 密文
     */
    public static String encryptBase64(String publicKeyHex, byte[] data) {
        return DEFAULT.encryptBase64(publicKeyHex, data);
    }

    /**
     * 使用指定密文布局加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字节数组
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return Base64 密文
     */
    public static String encryptBase64(String publicKeyHex, byte[] data, SM2CipherMode mode) {
        return DEFAULT.encryptBase64(publicKeyHex, data, mode);
    }

    /**
     * 使用指定安全上下文加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字节数组
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @param securityContext 安全上下文
     * @return Base64 密文
     */
    public static String encryptBase64(String publicKeyHex, byte[] data, SM2CipherMode mode, GmSecurityContext securityContext) {
        return new SM2(securityContext).encryptBase64(publicKeyHex, data, mode);
    }

    /**
     * 使用 UTF-8 编码字符串后加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字符串
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return Base64 密文
     */
    public static String encryptBase64(String publicKeyHex, String data, SM2CipherMode mode) {
        return DEFAULT.encryptBase64(publicKeyHex, data, mode);
    }

    /**
     * 使用指定字符集编码字符串后加密并输出 Base64 密文。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param data 明文字符串
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return Base64 密文
     */
    public static String encryptBase64(String publicKeyHex, String data, Charset charset, SM2CipherMode mode) {
        return DEFAULT.encryptBase64(publicKeyHex, data, charset, mode);
    }

    /**
     * 使用默认密文布局解密字节密文。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext 密文字节数组
     * @return 明文字节数组
     */
    public static byte[] decrypt(String privateKeyHex, byte[] ciphertext) {
        return DEFAULT.decrypt(privateKeyHex, ciphertext);
    }

    /**
     * 使用指定密文布局解密字节密文。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext 密文字节数组
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return 明文字节数组
     */
    public static byte[] decrypt(String privateKeyHex, byte[] ciphertext, SM2CipherMode mode) {
        return DEFAULT.decrypt(privateKeyHex, ciphertext, mode);
    }

    /**
     * 自动识别十六进制或 Base64 字符串密文并解密。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext 十六进制或 Base64 字符串密文
     * @return 明文字节数组
     */
    public static byte[] decrypt(String privateKeyHex, String ciphertext) {
        return DEFAULT.decrypt(privateKeyHex, ciphertext);
    }

    /**
     * 使用指定密文布局解密字符串形式密文。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext 十六进制或 Base64 字符串密文
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return 明文字节数组
     */
    public static byte[] decrypt(String privateKeyHex, String ciphertext, SM2CipherMode mode) {
        return DEFAULT.decrypt(privateKeyHex, ciphertext, mode);
    }

    /**
     * 解密字节密文并按 UTF-8 解码。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext 密文字节数组
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return UTF-8 字符串
     */
    public static String decryptToUtf8(String privateKeyHex, byte[] ciphertext, SM2CipherMode mode) {
        return DEFAULT.decryptToUtf8(privateKeyHex, ciphertext, mode);
    }

    /**
     * 解密字符串形式密文并按 UTF-8 解码。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext 十六进制或 Base64 字符串密文
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return UTF-8 字符串
     */
    public static String decryptToUtf8(String privateKeyHex, String ciphertext, SM2CipherMode mode) {
        return DEFAULT.decryptToUtf8(privateKeyHex, ciphertext, mode);
    }

    /**
     * 解密字节密文并按指定字符集解码。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param ciphertext 密文字节数组
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param mode 密文布局；传入 {@code null} 时默认使用 {@code C1C3C2}
     * @return 解码后的字符串
     */
    public static String decryptToString(String privateKeyHex, byte[] ciphertext, Charset charset, SM2CipherMode mode) {
        return DEFAULT.decryptToString(privateKeyHex, ciphertext, charset, mode);
    }

    /**
     * 使用指定签名选项对消息进行签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return 签名字节数组
     */
    public static byte[] sign(String privateKeyHex, byte[] message, SM2SignOptions options) {
        return DEFAULT.sign(privateKeyHex, message, options);
    }

    /**
     * 对 UTF-8 字符串进行签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return 签名字节数组
     */
    public static byte[] sign(String privateKeyHex, String message, SM2SignOptions options) {
        return DEFAULT.sign(privateKeyHex, message, options);
    }

    /**
     * 使用指定字符集编码消息后签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return 签名字节数组
     */
    public static byte[] sign(String privateKeyHex, String message, Charset charset, SM2SignOptions options) {
        return DEFAULT.sign(privateKeyHex, message, charset, options);
    }

    /**
     * 对消息签名并输出十六进制字符串。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return 十六进制签名
     */
    public static String signHex(String privateKeyHex, byte[] message, SM2SignOptions options) {
        return DEFAULT.signHex(privateKeyHex, message, options);
    }

    /**
     * 对 UTF-8 字符串签名并输出十六进制字符串。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return 十六进制签名
     */
    public static String signHex(String privateKeyHex, String message, SM2SignOptions options) {
        return DEFAULT.signHex(privateKeyHex, message, options);
    }

    /**
     * 使用指定字符集编码消息后签名并输出十六进制字符串。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return 十六进制签名
     */
    public static String signHex(String privateKeyHex, String message, Charset charset, SM2SignOptions options) {
        return DEFAULT.signHex(privateKeyHex, message, charset, options);
    }

    /**
     * 对消息签名并输出 Base64 字符串。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return Base64 签名
     */
    public static String signBase64(String privateKeyHex, byte[] message, SM2SignOptions options) {
        return DEFAULT.signBase64(privateKeyHex, message, options);
    }

    /**
     * 对 UTF-8 字符串签名并输出 Base64 字符串。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return Base64 签名
     */
    public static String signBase64(String privateKeyHex, String message, SM2SignOptions options) {
        return DEFAULT.signBase64(privateKeyHex, message, options);
    }

    /**
     * 使用指定字符集编码消息后签名并输出 Base64 字符串。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param options 签名选项；传入 {@code null} 时使用默认选项
     * @return Base64 签名
     */
    public static String signBase64(String privateKeyHex, String message, Charset charset, SM2SignOptions options) {
        return DEFAULT.signBase64(privateKeyHex, message, charset, options);
    }

    /**
     * 按旧 no-Z 约定计算 {@code e = SM3(M)} 后签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param message 原文消息
     * @param signatureFormat 输出签名格式
     * @return 签名字节数组
     * @deprecated 非标准旧协议兼容入口；新协议应使用标准 {@code SM3(Z || M)} 签名
     */
    @Deprecated
    public static byte[] signWithoutZ(String privateKeyHex, byte[] message, SM2SignatureFormat signatureFormat) {
        return DEFAULT.signWithoutZ(privateKeyHex, message, signatureFormat);
    }

    /**
     * 对外部已计算好的 e 值直接签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param eHash 外部已计算好的 e 值
     * @param signatureFormat 输出签名格式
     * @return 签名字节数组
     */
    public static byte[] signDigest(String privateKeyHex, byte[] eHash, SM2SignatureFormat signatureFormat) {
        return DEFAULT.signDigest(privateKeyHex, eHash, signatureFormat);
    }

    /**
     * 使用指定安全上下文对外部已计算好的 e 值直接签名。
     *
     * @param privateKeyHex 私钥十六进制字符串
     * @param eHash 外部已计算好的 e 值
     * @param signatureFormat 输出签名格式
     * @param securityContext 安全上下文
     * @return 签名字节数组
     */
    public static byte[] signDigest(
        String privateKeyHex,
        byte[] eHash,
        SM2SignatureFormat signatureFormat,
        GmSecurityContext securityContext) {
        return new SM2(securityContext).signDigest(privateKeyHex, eHash, signatureFormat);
    }

    /**
     * 对字节消息和字节签名进行验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message 原文消息
     * @param signature 签名字节数组
     * @param options 验签选项；传入 {@code null} 时使用默认选项
     * @return 验签结果
     */
    public static boolean verify(String publicKeyHex, byte[] message, byte[] signature, SM2VerifyOptions options) {
        return DEFAULT.verify(publicKeyHex, message, signature, options);
    }

    /**
     * 对字节消息和字符串签名进行验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message 原文消息
     * @param signature 十六进制或 Base64 形式签名
     * @param options 验签选项；传入 {@code null} 时使用默认选项
     * @return 验签结果
     */
    public static boolean verify(String publicKeyHex, byte[] message, String signature, SM2VerifyOptions options) {
        return DEFAULT.verify(publicKeyHex, message, signature, options);
    }

    /**
     * 对 UTF-8 字符串消息和字节签名进行验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message 原文消息
     * @param signature 签名字节数组
     * @param options 验签选项；传入 {@code null} 时使用默认选项
     * @return 验签结果
     */
    public static boolean verify(String publicKeyHex, String message, byte[] signature, SM2VerifyOptions options) {
        return DEFAULT.verify(publicKeyHex, message, signature, options);
    }

    /**
     * 使用指定字符集对消息编码后与字节签名验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message 原文消息
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param signature 签名字节数组
     * @param options 验签选项；传入 {@code null} 时使用默认选项
     * @return 验签结果
     */
    public static boolean verify(String publicKeyHex, String message, Charset charset, byte[] signature, SM2VerifyOptions options) {
        return DEFAULT.verify(publicKeyHex, message, charset, signature, options);
    }

    /**
     * 对 UTF-8 字符串消息和字符串签名进行验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message 原文消息
     * @param signature 十六进制或 Base64 形式签名
     * @param options 验签选项；传入 {@code null} 时使用默认选项
     * @return 验签结果
     */
    public static boolean verify(String publicKeyHex, String message, String signature, SM2VerifyOptions options) {
        return DEFAULT.verify(publicKeyHex, message, signature, options);
    }

    /**
     * 按旧 no-Z 约定计算 {@code e = SM3(M)} 后验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message 原文消息
     * @param signature 签名字节数组
     * @param signatureFormat 签名输入格式
     * @return 验签结果
     * @deprecated 非标准旧协议兼容入口；新协议应使用标准 {@code SM3(Z || M)} 验签
     */
    @Deprecated
    public static boolean verifyWithoutZ(
        String publicKeyHex,
        byte[] message,
        byte[] signature,
        SM2SignatureInputFormat signatureFormat) {
        return DEFAULT.verifyWithoutZ(publicKeyHex, message, signature, signatureFormat);
    }

    /**
     * 对外部提供的 e 值和 DER 签名直接验签。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param eHash 外部已计算好的 e 值
     * @param derSignature ASN.1 DER 签名
     * @return 验签结果
     */
    public static boolean verifyDigest(String publicKeyHex, byte[] eHash, byte[] derSignature) {
        return DEFAULT.verifyDigest(publicKeyHex, eHash, derSignature);
    }

    /**
     * 计算 SM2 Z 值。
     *
     * @param userId 用户标识；传入 {@code null} 时使用默认值
     * @param publicKeyHex 公钥十六进制字符串
     * @return Z 值
     */
    public static byte[] computeZ(String userId, String publicKeyHex) {
        return DEFAULT.computeZ(userId, publicKeyHex);
    }

    /**
     * 计算 SM2 中用于签名与验签的 e 值。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message 原文消息
     * @param userId 用户标识
     * @param skipZComputation 为 {@code true} 时跳过 Z 值计算
     * @return e 值
     */
    public static byte[] computeE(String publicKeyHex, byte[] message, String userId, boolean skipZComputation) {
        return DEFAULT.computeE(publicKeyHex, message, userId, skipZComputation);
    }

    /**
     * 使用指定字符集编码消息后计算 e 值。
     *
     * @param publicKeyHex 公钥十六进制字符串
     * @param message 原文消息
     * @param charset 字符集；传入 {@code null} 时默认使用 UTF-8
     * @param userId 用户标识
     * @param skipZComputation 为 {@code true} 时跳过 Z 值计算
     * @return e 值
     */
    public static byte[] computeE(String publicKeyHex, String message, Charset charset, String userId, boolean skipZComputation) {
        return DEFAULT.computeE(publicKeyHex, message, charset, userId, skipZComputation);
    }

    /**
     * 按旧 no-Z 约定计算 {@code e = SM3(M)}。
     *
     * @param message 原文消息
     * @return e 值
     * @deprecated 非标准旧协议兼容入口；需要预计算 e 时应明确实现协议规定的摘要过程
     */
    @Deprecated
    public static byte[] computeEWithoutZ(byte[] message) {
        return DEFAULT.computeEWithoutZ(message);
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
    public static byte[] computeEWithoutZ(String message, Charset charset) {
        return DEFAULT.computeEWithoutZ(message, charset);
    }

    /**
     * 执行 SM2 密钥交换。
     *
     * @param selfStaticPrivateKeyHex 己方静态私钥
     * @param selfEphemeralPrivateKeyHex 己方临时私钥
     * @param peerStaticPublicKeyHex 对方静态公钥
     * @param peerEphemeralPublicKeyHex 对方临时公钥
     * @param options 协商参数；传入 {@code null} 时使用默认选项
     * @return 共享密钥
     */
    public static byte[] keyExchange(
        String selfStaticPrivateKeyHex,
        String selfEphemeralPrivateKeyHex,
        String peerStaticPublicKeyHex,
        String peerEphemeralPublicKeyHex,
        SM2KeyExchangeOptions options) {
        return DEFAULT.keyExchange(
            selfStaticPrivateKeyHex,
            selfEphemeralPrivateKeyHex,
            peerStaticPublicKeyHex,
            peerEphemeralPublicKeyHex,
            options);
    }

    /**
     * 执行带确认标签的 SM2 密钥交换。
     * <p>
     * {@code confirmationTag} 只用于发起方 A 验证响应方 B 发送的标准 S1；
     * 响应方对发起方返回的 S2 需要另行调用 {@link #confirmResponder(byte[], byte[])}。
     *
     * @param selfStaticPrivateKeyHex 己方静态私钥
     * @param selfEphemeralPrivateKeyHex 己方临时私钥
     * @param peerStaticPublicKeyHex 对方静态公钥
     * @param peerEphemeralPublicKeyHex 对方临时公钥
     * @param options 协商参数；传入 {@code null} 时使用默认选项
     * @return 包含共享密钥与确认标签的结果对象
     */
    public static SM2KeyExchangeResult keyExchangeWithConfirmation(
        String selfStaticPrivateKeyHex,
        String selfEphemeralPrivateKeyHex,
        String peerStaticPublicKeyHex,
        String peerEphemeralPublicKeyHex,
        SM2KeyExchangeOptions options) {
        return DEFAULT.keyExchangeWithConfirmation(
            selfStaticPrivateKeyHex,
            selfEphemeralPrivateKeyHex,
            peerStaticPublicKeyHex,
            peerEphemeralPublicKeyHex,
            options);
    }

    /**
     * 以常量时间比较响应方期望的 S2 与发起方返回的确认标签。
     *
     * @param expectedS2 响应方本地计算出的 S2 标签
     * @param confirmationTag 发起方返回的 S2 标签
     * @return 常量时间比较结果
     */
    public static boolean confirmResponder(byte[] expectedS2, byte[] confirmationTag) {
        return DEFAULT.confirmResponder(expectedS2, confirmationTag);
    }
}
