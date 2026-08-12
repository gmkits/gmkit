package cn.gmkit.sm9;

/**
 * SM9 签名 / 验签上下文，支持流式 {@code update} 处理大数据。
 * <p>
 * 创建时通过 {@code doSign} 指定模式：{@code true} 为签名，{@code false} 为验签。
 * 使用完毕后应调用 {@link #close()} 释放 native 资源（推荐使用 try-with-resources）。
 * 同一个上下文不能与 {@code close()} 并发使用；调用方应在单线程或外部同步下管理句柄。
 *
 * <h2>典型用法</h2>
 * <pre>{@code
 * try (SM9Signature signer = new SM9Signature(true)) {
 *     signer.update(data);
 *     byte[] sig = signer.sign(signKey);
 * }
 * try (SM9Signature verifier = new SM9Signature(false)) {
 *     verifier.update(data);
 *     boolean ok = verifier.verify(sig, masterPublicKey, id);
 * }
 * }</pre>
 */
public final class SM9Signature implements AutoCloseable {

    private long ctx;

    private boolean closed;

    /** 当前上下文模式；true 为签名，false 为验签。 */
    private boolean doSign;

    /** sign/verify 完成后必须 reset 才能再次 update。 */
    private boolean finished;

    /**
     * 创建签名或验签上下文。
     *
     * @param doSign {@code true} 创建签名上下文，{@code false} 创建验签上下文
     * @throws SM9Exception native 不可用或上下文初始化失败时抛出
     */
    public SM9Signature(boolean doSign) {
        SM9NativeBridge.requireAvailable();
        long context = SM9NativeBridge.sm9SignCtxNew();
        if (context == 0L) {
            throw new SM9Exception(SM9Messages.operationReturnedNull("sign ctx new"));
        }
        this.ctx = context;
        this.doSign = doSign;
        try {
            init(doSign);
        } catch (RuntimeException ex) {
            SM9NativeBridge.sm9SignCtxFree(context);
            this.ctx = 0L;
            this.closed = true;
            throw ex;
        }
    }

    private void init(boolean doSign) {
        int code = doSign
                ? SM9NativeBridge.sm9SignInit(ctx())
                : SM9NativeBridge.sm9VerifyInit(ctx());
        if (code != 1) {
            throw new SM9Exception(SM9Messages.operationFailed(doSign ? "sign init" : "verify init", code));
        }
    }

    /**
     * 重置上下文以复用，重新进入签名或验签模式。
     *
     * @param doSign {@code true} 重置为签名模式，{@code false} 重置为验签模式
     * @throws SM9Exception 上下文已关闭或 native 初始化失败时抛出
     */
    public void reset(boolean doSign) {
        ctx();
        init(doSign);
        this.doSign = doSign;
        this.finished = false;
    }

    /**
     * 追加待处理数据。
     *
     * @param data 数据
     * @return 当前上下文，便于链式调用
     * @throws SM9Exception 数据为空、范围无效、上下文已关闭或 native 更新失败时抛出
     */
    public SM9Signature update(byte[] data) {
        SM9Checks.requireNonNull(data, "data");
        return update(data, 0, data.length);
    }

    /**
     * 追加待处理数据的指定区间。
     *
     * @param data   数据缓冲
     * @param offset 起始偏移
     * @param length 长度
     * @return 当前上下文，便于链式调用
     * @throws SM9Exception 缓冲区范围无效、上下文已关闭或 native 更新失败时抛出
     */
    public SM9Signature update(byte[] data, int offset, int length) {
        SM9Checks.requireRange(data, offset, length, "data range");
        ensureReady();
        if (length == 0) {
            return this;
        }
        int code = doSign
                ? SM9NativeBridge.sm9SignUpdate(ctx, data, offset, length)
                : SM9NativeBridge.sm9VerifyUpdate(ctx, data, offset, length);
        if (code != 1) {
            throw new SM9Exception(SM9Messages.operationFailed(doSign ? "sign update" : "verify update", code));
        }
        return this;
    }

    /**
     * 使用用户签名私钥完成签名，输出 DER 编码的签名值。
     *
     * @param signKey 用户签名私钥
     * @return 签名值
     * @throws SM9Exception 私钥为空、上下文已关闭或 native 签名失败时抛出
     */
    public byte[] sign(SM9SignKey signKey) {
        ensureMode(true, "sign");
        SM9Checks.requireNonNull(signKey, "signKey");
        finished = true;
        byte[] signature = SM9NativeBridge.sm9SignFinish(ctx, signKey.handle());
        if (signature == null) {
            throw new SM9Exception(SM9Messages.operationReturnedNull("sign finish"));
        }
        return signature;
    }

    /**
     * 使用公开主密钥与用户标识完成验签。
     *
     * @param signature       待验证签名值
     * @param masterPublicKey 公开主密钥
     * @param id              签名者用户标识
     * @return 验证通过返回 {@code true}
     * @throws SM9Exception 签名、主公钥或 ID 无效，或上下文已关闭时抛出
     */
    public boolean verify(byte[] signature, SM9SignMasterKey masterPublicKey, String id) {
        ensureMode(false, "verify");
        SM9Checks.requireNonEmpty(signature, "signature");
        SM9Checks.requireNonNull(masterPublicKey, "masterPublicKey");
        String userId = SM9Checks.requireNonBlank(id, "id");
        finished = true;
        int code = SM9NativeBridge.sm9VerifyFinish(
            ctx, signature, masterPublicKey.handle(), SM9Checks.utf8Bytes(userId));
        return code == 1;
    }

    private void ensureReady() {
        ctx();
        if (finished) {
            throw new SM9Exception(SM9Messages.signatureFinished());
        }
    }

    private void ensureMode(boolean requiredMode, String operation) {
        ensureReady();
        if (doSign != requiredMode) {
            throw new SM9Exception(SM9Messages.wrongSignatureMode(operation, doSign));
        }
    }

    private long ctx() {
        if (closed || ctx == 0L) {
            throw new SM9Exception(SM9Messages.handleClosed("SM9Signature"));
        }
        return ctx;
    }

    /**
     * 释放底层 native 资源。重复调用安全。
     */
    @Override
    public void close() {
        if (!closed && ctx != 0L) {
            SM9NativeBridge.sm9SignCtxFree(ctx);
            ctx = 0L;
        }
        closed = true;
    }
}
