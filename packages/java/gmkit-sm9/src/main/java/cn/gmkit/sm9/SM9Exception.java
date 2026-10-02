package cn.gmkit.sm9;

/**
 * SM9 模块运行时异常。
 * <p>
 * SM9 通过 JNI 桥接 GmSSL native 实现。参数错误、native 库加载失败、加解密失败、
 * 密钥导入导出失败以及 native 操作错误会统一抛出该异常，便于业务侧集中兜底。
 * <p>
 * 验签输入校验失败、句柄关闭或上下文状态错误会抛出此异常。进入 GmSSL 后，
 * 当前 JNI 将非成功返回码统一映射为 {@code false}，包括签名不匹配或 DER 解析失败；
 * 不能仅凭 {@code false} 区分这些原因。JVM 链接、内存等错误不会被包装为此异常。
 */
public class SM9Exception extends RuntimeException {

    /**
     * 使用错误消息创建异常。
     *
     * @param message 错误消息
     */
    public SM9Exception(String message) {
        super(message);
    }

    /**
     * 使用错误消息和根因创建异常。
     *
     * @param message 错误消息
     * @param cause   根因异常
     */
    public SM9Exception(String message, Throwable cause) {
        super(message, cause);
    }
}
