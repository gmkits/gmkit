package cn.gmkit.sm9;

/**
 * SM9 用户签名私钥。
 * <p>
 * 由 {@link SM9SignMasterKey#extractKey(String)} 派生，或从加密 PEM 文件导入。
 * 持有一个指向 native 资源的句柄，使用完毕后应调用 {@link #close()} 释放（推荐使用
 * try-with-resources）。
 * 实例不是并发安全对象；{@code close()} 不得与实例的其它方法并发执行，调用方必须自行同步。
 */
public final class SM9SignKey implements AutoCloseable {

    private final String id;

    private long handle;

    private boolean closed;

    SM9SignKey(long handle, String id) {
        this.handle = handle;
        this.id = id;
    }

    /**
     * 返回该签名私钥对应的用户标识（ID）。
     *
     * @return 用户标识，可能为 {@code null}（从 PEM 导入且未提供时）
     */
    public String getId() {
        return id;
    }

    /**
     * 将该签名私钥以口令加密为 PEM 文件。
     *
     * @param password 加密口令
     * @param file     输出文件路径
     * @throws SM9Exception 口令/路径为空、对象已关闭或 native 写入失败时抛出
     */
    public void exportEncryptedPrivateKeyInfoPem(String password, String file) {
        SM9Checks.requireNonBlank(password, "password");
        SM9Checks.requireNonBlank(file, "file");
        int code = SM9NativeBridge.sm9SignKeyInfoEncryptToPem(handle(), password, file);
        if (code != 1) {
            throw new SM9Exception(SM9Messages.pemIo("sign key export", file));
        }
    }

    /**
     * 从加密 PEM 文件导入用户签名私钥。
     *
     * @param password 解密口令
     * @param file     PEM 文件路径
     * @param id       该私钥对应的用户标识，可为 {@code null}
     * @return 导入的签名私钥
     * @throws SM9Exception native 不可用、参数无效、口令错误或 PEM 读取失败时抛出
     */
    public static SM9SignKey importEncryptedPrivateKeyInfoPem(String password, String file, String id) {
        SM9NativeBridge.requireAvailable();
        SM9Checks.requireNonBlank(password, "password");
        SM9Checks.requireNonBlank(file, "file");
        long handle = SM9NativeBridge.sm9SignKeyInfoDecryptFromPem(password, file);
        if (handle == 0L) {
            throw new SM9Exception(SM9Messages.pemIo("sign key import", file));
        }
        return new SM9SignKey(handle, id);
    }

    long handle() {
        if (closed || handle == 0L) {
            throw new SM9Exception(SM9Messages.handleClosed("SM9SignKey"));
        }
        return handle;
    }

    /**
     * 释放底层 native 资源。重复调用安全。
     */
    @Override
    public void close() {
        if (!closed && handle != 0L) {
            SM9NativeBridge.sm9SignKeyFree(handle);
            handle = 0L;
        }
        closed = true;
    }
}
