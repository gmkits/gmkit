package cn.gmkit.sm9;

/**
 * SM9 用户解密私钥。
 * <p>
 * 由 {@link SM9EncMasterKey#extractKey(String)} 派生，或从加密 PEM 文件导入。
 * 解密时需要用户标识（ID），因此该对象同时持有句柄与 ID。使用完毕后应调用
 * {@link #close()} 释放 native 资源（推荐使用 try-with-resources）。
 * 实例不是并发安全对象；{@code close()} 不得与实例的其它方法并发执行，调用方必须自行同步。
 */
public final class SM9EncKey implements AutoCloseable {

    /**
     * GmSSL 单次 SM9 解密接受的最大 DER 密文字节数。
     */
    public static final int MAX_CIPHERTEXT_SIZE = SM9NativeBridge.SM9_MAX_CIPHERTEXT_SIZE;

    private final String id;

    private long handle;

    private boolean closed;

    SM9EncKey(long handle, String id) {
        this.handle = handle;
        this.id = id;
    }

    /**
     * 返回该解密私钥对应的用户标识（ID）。
     *
     * @return 用户标识
     */
    public String getId() {
        return id;
    }

    /**
     * 使用该用户解密私钥解密密文。
     *
     * @param ciphertext SM9 密文
     * @return 明文
     * @throws SM9Exception ID/密文无效、密文超过上限、对象已关闭或 native 解密失败时抛出
     */
    public byte[] decrypt(byte[] ciphertext) {
        SM9Checks.requireNonEmpty(ciphertext, "ciphertext");
        if (ciphertext.length > MAX_CIPHERTEXT_SIZE) {
            throw new SM9Exception(SM9Messages.ciphertextTooLong(ciphertext.length, MAX_CIPHERTEXT_SIZE));
        }
        String userId = SM9Checks.requireNonBlank(id, "id");
        byte[] plaintext = SM9NativeBridge.sm9Decrypt(handle(), SM9Checks.utf8Bytes(userId), ciphertext);
        if (plaintext == null) {
            throw new SM9Exception(SM9Messages.operationReturnedNull("decrypt"));
        }
        return plaintext;
    }

    /**
     * 将该解密私钥以口令加密为 PEM 文件。
     *
     * @param password 加密口令
     * @param file     输出文件路径
     * @throws SM9Exception 口令/路径为空、对象已关闭或 native 写入失败时抛出
     */
    public void exportEncryptedPrivateKeyInfoPem(String password, String file) {
        SM9Checks.requireNonBlank(password, "password");
        SM9Checks.requireNonBlank(file, "file");
        int code = SM9NativeBridge.sm9EncKeyInfoEncryptToPem(handle(), password, file);
        if (code != 1) {
            throw new SM9Exception(SM9Messages.pemIo("enc key export", file));
        }
    }

    /**
     * 从加密 PEM 文件导入用户解密私钥。
     *
     * @param password 解密口令
     * @param file     PEM 文件路径
     * @param id       该私钥对应的用户标识（解密时必填）
     * @return 导入的解密私钥
     * @throws SM9Exception native 不可用、参数无效、口令错误或 PEM 读取失败时抛出
     */
    public static SM9EncKey importEncryptedPrivateKeyInfoPem(String password, String file, String id) {
        SM9NativeBridge.requireAvailable();
        SM9Checks.requireNonBlank(password, "password");
        SM9Checks.requireNonBlank(file, "file");
        long handle = SM9NativeBridge.sm9EncKeyInfoDecryptFromPem(password, file);
        if (handle == 0L) {
            throw new SM9Exception(SM9Messages.pemIo("enc key import", file));
        }
        return new SM9EncKey(handle, id);
    }

    long handle() {
        if (closed || handle == 0L) {
            throw new SM9Exception(SM9Messages.handleClosed("SM9EncKey"));
        }
        return handle;
    }

    /**
     * 释放底层 native 资源。重复调用安全。
     */
    @Override
    public void close() {
        if (!closed && handle != 0L) {
            SM9NativeBridge.sm9EncKeyFree(handle);
            handle = 0L;
        }
        closed = true;
    }
}
