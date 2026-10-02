package cn.gmkit.sm9;

/**
 * SM9 加密主密钥（由 KGC 与加密方使用）。
 * <p>
 * 通过 {@link #generate()} 生成含私有部分的完整主密钥用于派生用户解密私钥；
 * 通过 {@link #importPublicMasterKeyPem(String)} 仅导入公开主密钥用于加密。
 * 使用完毕后应调用 {@link #close()} 释放 native 资源（推荐使用 try-with-resources）。
 *
 * <h2>明文长度限制</h2>
 * SM9 加密单次明文长度上限为 {@value #MAX_PLAINTEXT_SIZE} 字节，超过时
 * {@link #encrypt(byte[], String)} 会抛出 {@link SM9Exception}；更大数据请采用混合加密
 * （例如用 SM4 加密数据、用 SM9 封装 SM4 密钥）。
 * 实例不是并发安全对象；{@code close()} 不得与实例的其它方法并发执行，调用方必须自行同步。
 */
public final class SM9EncMasterKey implements AutoCloseable {

    /**
     * SM9 加密单次明文的最大字节数。
     */
    public static final int MAX_PLAINTEXT_SIZE = SM9NativeBridge.SM9_MAX_PLAINTEXT_SIZE;

    private long handle;

    private boolean closed;

    SM9EncMasterKey(long handle) {
        this.handle = handle;
    }

    /**
     * 生成新的 SM9 加密主密钥（含私有部分）。
     *
     * @return 加密主密钥
     * @throws SM9Exception native 不可用或生成操作失败时抛出
     */
    public static SM9EncMasterKey generate() {
        SM9NativeBridge.requireAvailable();
        long handle = SM9NativeBridge.sm9EncMasterKeyGenerate();
        if (handle == 0L) {
            throw new SM9Exception(SM9Messages.operationReturnedNull("enc master key generate"));
        }
        return new SM9EncMasterKey(handle);
    }

    /**
     * 为指定用户标识派生解密私钥。
     *
     * @param id 用户标识（ID）
     * @return 用户解密私钥
     * @throws SM9Exception ID 为空、当前对象已关闭或 native 派生失败时抛出
     */
    public SM9EncKey extractKey(String id) {
        String userId = SM9Checks.requireNonBlank(id, "id");
        long keyHandle = SM9NativeBridge.sm9EncMasterKeyExtractKey(handle(), SM9Checks.utf8Bytes(userId));
        if (keyHandle == 0L) {
            throw new SM9Exception(SM9Messages.operationReturnedNull("enc master key extract"));
        }
        return new SM9EncKey(keyHandle, userId);
    }

    /**
     * 向指定用户标识加密明文（IBE）。
     *
     * @param plaintext 明文，长度不得超过 {@link #MAX_PLAINTEXT_SIZE}
     * @param id        接收方用户标识
     * @return 密文
     * @throws SM9Exception ID/明文无效、明文超过上限、对象已关闭或 native 加密失败时抛出
     */
    public byte[] encrypt(byte[] plaintext, String id) {
        SM9Checks.requireNonEmpty(plaintext, "plaintext");
        String userId = SM9Checks.requireNonBlank(id, "id");
        if (plaintext.length > MAX_PLAINTEXT_SIZE) {
            throw new SM9Exception(SM9Messages.plaintextTooLong(plaintext.length, MAX_PLAINTEXT_SIZE));
        }
        byte[] ciphertext = SM9NativeBridge.sm9Encrypt(handle(), SM9Checks.utf8Bytes(userId), plaintext);
        if (ciphertext == null) {
            throw new SM9Exception(SM9Messages.operationReturnedNull("encrypt"));
        }
        return ciphertext;
    }

    /**
     * 将主密钥（含私有部分）以口令加密导出为 PEM 文件。
     *
     * @param password 加密口令
     * @param file     输出文件路径
     * @throws SM9Exception 口令/路径为空、对象已关闭或 native 写入失败时抛出
     */
    public void exportEncryptedMasterKeyInfoPem(String password, String file) {
        SM9Checks.requireNonBlank(password, "password");
        SM9Checks.requireNonBlank(file, "file");
        int code = SM9NativeBridge.sm9EncMasterKeyInfoEncryptToPem(handle(), password, file);
        if (code != 1) {
            throw new SM9Exception(SM9Messages.pemIo("enc master key export", file));
        }
    }

    /**
     * 从加密 PEM 文件导入主密钥（含私有部分）。
     *
     * @param password 解密口令
     * @param file     PEM 文件路径
     * @return 加密主密钥
     * @throws SM9Exception native 不可用、参数无效、口令错误或 PEM 读取失败时抛出
     */
    public static SM9EncMasterKey importEncryptedMasterKeyInfoPem(String password, String file) {
        SM9NativeBridge.requireAvailable();
        SM9Checks.requireNonBlank(password, "password");
        SM9Checks.requireNonBlank(file, "file");
        long handle = SM9NativeBridge.sm9EncMasterKeyInfoDecryptFromPem(password, file);
        if (handle == 0L) {
            throw new SM9Exception(SM9Messages.pemIo("enc master key import", file));
        }
        return new SM9EncMasterKey(handle);
    }

    /**
     * 将公开主密钥导出为 PEM 文件（用于分发给加密方）。
     *
     * @param file 输出文件路径
     * @throws SM9Exception 路径为空、对象已关闭或 native 写入失败时抛出
     */
    public void exportPublicMasterKeyPem(String file) {
        SM9Checks.requireNonBlank(file, "file");
        int code = SM9NativeBridge.sm9EncMasterPublicKeyToPem(handle(), file);
        if (code != 1) {
            throw new SM9Exception(SM9Messages.pemIo("enc public master key export", file));
        }
    }

    /**
     * 从 PEM 文件导入公开主密钥（仅含公开部分，用于加密）。
     *
     * @param file PEM 文件路径
     * @return 仅含公开部分的加密主密钥
     * @throws SM9Exception native 不可用、路径无效或 PEM 读取失败时抛出
     */
    public static SM9EncMasterKey importPublicMasterKeyPem(String file) {
        SM9NativeBridge.requireAvailable();
        SM9Checks.requireNonBlank(file, "file");
        long handle = SM9NativeBridge.sm9EncMasterPublicKeyFromPem(file);
        if (handle == 0L) {
            throw new SM9Exception(SM9Messages.pemIo("enc public master key import", file));
        }
        return new SM9EncMasterKey(handle);
    }

    long handle() {
        if (closed || handle == 0L) {
            throw new SM9Exception(SM9Messages.handleClosed("SM9EncMasterKey"));
        }
        return handle;
    }

    /**
     * 释放底层 native 资源。重复调用安全。
     */
    @Override
    public void close() {
        if (!closed && handle != 0L) {
            SM9NativeBridge.sm9EncMasterKeyFree(handle);
            handle = 0L;
        }
        closed = true;
    }
}
