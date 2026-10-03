package cn.gmkit.sm9;

/**
 * SM9 门面工具类，提供一次性签名、验签与 IBE 加解密入口。
 * <p>
 * 该类封装了 {@link SM9Signature} 上下文的创建与释放，适合“一次性”短数据场景；
 * 对大数据流式处理或需要复用上下文的场景，请直接使用 {@link SM9Signature}。
 *
 * <h2>能力范围</h2>
 * 当前 Java API 提供 <b>签名 / 验签</b> 与 <b>加密 / 解密（IBE）</b>，
 * <b>未提供 SM9 密钥交换入口</b>。这是本模块的封装范围，不是 SM9 标准的能力限制。
 *
 * <h2>可用性</h2>
 * 密码操作依赖 native 库；诊断方法在加载失败时仍可调用，
 * 可先通过 {@link #isAvailable()} 判断当前平台是否可用。
 */
public final class SM9 {

    private SM9() {
    }

    /**
     * 判断当前平台的 SM9 native 库是否已成功加载。
     *
     * @return 已加载返回 {@code true}
     */
    public static boolean isAvailable() {
        return SM9NativeBridge.isAvailable();
    }

    /**
     * 返回 native 桥接版本标识。
     *
     * @return 版本标识
     */
    public static String nativeVersion() {
        return SM9NativeBridge.VERSION;
    }

    /**
     * 返回当前运行环境对应的 native 平台标识，例如 {@code linux-x86_64}。
     * <p>
     * 如果操作系统或 CPU 架构不在支持范围内，返回 {@code unsupported}，可结合
     * {@link #nativeLoadErrorMessage()} 查看具体原因。
     *
     * @return native 平台标识
     */
    public static String nativePlatform() {
        return SM9NativeBridge.platform();
    }

    /**
     * 返回 native 库加载失败的诊断消息。
     *
     * @return 加载失败消息；native 已可用时返回 {@code null}
     */
    public static String nativeLoadErrorMessage() {
        return SM9NativeBridge.loadErrorMessage();
    }

    // ---------------------------------------------------------------------
    // 密钥管理
    // ---------------------------------------------------------------------

    /**
     * 生成 SM9 签名主密钥。
     *
     * @return 签名主密钥
     * @throws SM9Exception native 不可用或生成操作失败时抛出
     */
    public static SM9SignMasterKey generateSignMasterKey() {
        return SM9SignMasterKey.generate();
    }

    /**
     * 生成 SM9 加密主密钥。
     *
     * @return 加密主密钥
     * @throws SM9Exception native 不可用或生成操作失败时抛出
     */
    public static SM9EncMasterKey generateEncMasterKey() {
        return SM9EncMasterKey.generate();
    }

    /**
     * 派生用户签名私钥。
     *
     * @param master 签名主密钥
     * @param id     用户标识
     * @return 用户签名私钥
     * @throws SM9Exception master 为空、ID 为空或 native 派生失败时抛出
     */
    public static SM9SignKey extractSignKey(SM9SignMasterKey master, String id) {
        SM9Checks.requireNonNull(master, "master");
        return master.extractKey(id);
    }

    /**
     * 派生用户解密私钥。
     *
     * @param master 加密主密钥
     * @param id     用户标识
     * @return 用户解密私钥
     * @throws SM9Exception master 为空、ID 为空或 native 派生失败时抛出
     */
    public static SM9EncKey extractEncKey(SM9EncMasterKey master, String id) {
        SM9Checks.requireNonNull(master, "master");
        return master.extractKey(id);
    }

    // ---------------------------------------------------------------------
    // 签名 / 验签
    // ---------------------------------------------------------------------

    /**
     * 使用用户签名私钥对数据进行签名。
     *
     * @param signKey 用户签名私钥
     * @param data    待签名数据
     * @return 签名值
     * @throws SM9Exception 参数为空、native 不可用或签名失败时抛出
     */
    public static byte[] sign(SM9SignKey signKey, byte[] data) {
        SM9Checks.requireNonNull(signKey, "signKey");
        SM9Checks.requireNonNull(data, "data");
        try (SM9Signature signer = new SM9Signature(true)) {
            signer.update(data);
            return signer.sign(signKey);
        }
    }

    /**
     * 使用公开主密钥与用户标识验证签名。
     *
     * @param masterPublicKey 公开主密钥
     * @param id              签名者用户标识
     * @param data            原始数据
     * @param signature       待验证签名值
     * @return GmSSL 验证通过返回 {@code true}；非成功返回码统一为 {@code false}，不区分签名或 DER 错误
     * @throws SM9Exception 主公钥、数据或签名为空，或用户标识无效时抛出
     */
    public static boolean verify(SM9SignMasterKey masterPublicKey, String id, byte[] data, byte[] signature) {
        SM9Checks.requireNonNull(masterPublicKey, "masterPublicKey");
        SM9Checks.requireNonNull(data, "data");
        SM9Checks.requireNonNull(signature, "signature");
        try (SM9Signature verifier = new SM9Signature(false)) {
            verifier.update(data);
            return verifier.verify(signature, masterPublicKey, id);
        }
    }

    // ---------------------------------------------------------------------
    // 加密 / 解密（IBE）
    // ---------------------------------------------------------------------

    /**
     * 使用公开主密钥向指定用户标识加密明文。
     *
     * @param masterPublicKey 公开主密钥
     * @param id              接收方用户标识
     * @param plaintext       明文，长度不得超过 {@link SM9EncMasterKey#MAX_PLAINTEXT_SIZE}
     * @return 密文
     * @throws SM9Exception 主密钥为空、ID 无效、明文为空/超长或 native 加密失败时抛出
     */
    public static byte[] encrypt(SM9EncMasterKey masterPublicKey, String id, byte[] plaintext) {
        SM9Checks.requireNonNull(masterPublicKey, "masterPublicKey");
        return masterPublicKey.encrypt(plaintext, id);
    }

    /**
     * 使用用户解密私钥解密密文。
     *
     * @param encKey     用户解密私钥
     * @param ciphertext 密文
     * @return 明文
     * @throws SM9Exception 私钥为空、密文为空/超长或 native 解密失败时抛出
     */
    public static byte[] decrypt(SM9EncKey encKey, byte[] ciphertext) {
        SM9Checks.requireNonNull(encKey, "encKey");
        return encKey.decrypt(ciphertext);
    }
}
