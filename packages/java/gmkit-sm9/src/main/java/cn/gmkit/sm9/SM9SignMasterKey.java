package cn.gmkit.sm9;

/**
 * SM9 签名主密钥（由 KGC 持有）。
 * <p>
 * 通过 {@link #generate()} 生成包含私有部分的完整主密钥，用于派生用户签名私钥；
 * 通过 {@link #importPublicMasterKeyPem(String)} 仅导入公开主密钥，用于验签。
 * 使用完毕后应调用 {@link #close()} 释放 native 资源（推荐使用 try-with-resources）。
 * 实例不是并发安全对象；{@code close()} 不得与实例的其它方法并发执行，调用方必须自行同步。
 */
public final class SM9SignMasterKey implements AutoCloseable {

    private long handle;

    private boolean closed;

    SM9SignMasterKey(long handle) {
        this.handle = handle;
    }

    /**
     * 生成新的 SM9 签名主密钥（含私有部分）。
     *
     * @return 签名主密钥
     * @throws SM9Exception native 不可用或生成操作失败时抛出
     */
    public static SM9SignMasterKey generate() {
        SM9NativeBridge.requireAvailable();
        long handle = SM9NativeBridge.sm9SignMasterKeyGenerate();
        if (handle == 0L) {
            throw new SM9Exception(SM9Messages.operationReturnedNull("sign master key generate"));
        }
        return new SM9SignMasterKey(handle);
    }

    /**
     * 为指定用户标识派生签名私钥。
     *
     * @param id 用户标识（ID）
     * @return 用户签名私钥
     * @throws SM9Exception ID 为空、当前对象已关闭或 native 派生失败时抛出
     */
    public SM9SignKey extractKey(String id) {
        String userId = SM9Checks.requireNonBlank(id, "id");
        long keyHandle = SM9NativeBridge.sm9SignMasterKeyExtractKey(handle(), SM9Checks.utf8Bytes(userId));
        if (keyHandle == 0L) {
            throw new SM9Exception(SM9Messages.operationReturnedNull("sign master key extract"));
        }
        return new SM9SignKey(keyHandle, userId);
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
        int code = SM9NativeBridge.sm9SignMasterKeyInfoEncryptToPem(handle(), password, file);
        if (code != 1) {
            throw new SM9Exception(SM9Messages.pemIo("sign master key export", file));
        }
    }

    /**
     * 从加密 PEM 文件导入主密钥（含私有部分）。
     *
     * @param password 解密口令
     * @param file     PEM 文件路径
     * @return 签名主密钥
     * @throws SM9Exception native 不可用、参数无效、口令错误或 PEM 读取失败时抛出
     */
    public static SM9SignMasterKey importEncryptedMasterKeyInfoPem(String password, String file) {
        SM9NativeBridge.requireAvailable();
        SM9Checks.requireNonBlank(password, "password");
        SM9Checks.requireNonBlank(file, "file");
        long handle = SM9NativeBridge.sm9SignMasterKeyInfoDecryptFromPem(password, file);
        if (handle == 0L) {
            throw new SM9Exception(SM9Messages.pemIo("sign master key import", file));
        }
        return new SM9SignMasterKey(handle);
    }

    /**
     * 将公开主密钥导出为 PEM 文件（用于分发给验签方）。
     *
     * @param file 输出文件路径
     * @throws SM9Exception 路径为空、对象已关闭或 native 写入失败时抛出
     */
    public void exportPublicMasterKeyPem(String file) {
        SM9Checks.requireNonBlank(file, "file");
        int code = SM9NativeBridge.sm9SignMasterPublicKeyToPem(handle(), file);
        if (code != 1) {
            throw new SM9Exception(SM9Messages.pemIo("sign public master key export", file));
        }
    }

    /**
     * 从 PEM 文件导入公开主密钥（仅含公开部分，用于验签）。
     *
     * @param file PEM 文件路径
     * @return 仅含公开部分的签名主密钥
     * @throws SM9Exception native 不可用、路径无效或 PEM 读取失败时抛出
     */
    public static SM9SignMasterKey importPublicMasterKeyPem(String file) {
        SM9NativeBridge.requireAvailable();
        SM9Checks.requireNonBlank(file, "file");
        long handle = SM9NativeBridge.sm9SignMasterPublicKeyFromPem(file);
        if (handle == 0L) {
            throw new SM9Exception(SM9Messages.pemIo("sign public master key import", file));
        }
        return new SM9SignMasterKey(handle);
    }

    long handle() {
        if (closed || handle == 0L) {
            throw new SM9Exception(SM9Messages.handleClosed("SM9SignMasterKey"));
        }
        return handle;
    }

    /**
     * 释放底层 native 资源。重复调用安全。
     */
    @Override
    public void close() {
        if (!closed && handle != 0L) {
            SM9NativeBridge.sm9SignMasterKeyFree(handle);
            handle = 0L;
        }
        closed = true;
    }
}
