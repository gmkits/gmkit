package cn.gmkit.sm9;

/**
 * SM9 模块的双语错误消息集中定义，风格与 GMKit 主模块保持一致。
 */
final class SM9Messages {

    private SM9Messages() {
    }

    static String nullValue(String label) {
        return label + " 不能为 null / must not be null";
    }

    static String blankValue(String label) {
        return label + " 不能为空白 / must not be blank";
    }

    static String emptyValue(String label) {
        return label + " 不能为空 / must not be empty";
    }

    static String nulCharacter(String label) {
        return label + " 不能包含 NUL 字符 / must not contain a NUL character";
    }

    static String plaintextTooLong(int actual, int max) {
        return "SM9 明文长度 " + actual + " 超过上限 " + max
                + " 字节，请使用混合加密 / plaintext length " + actual
                + " exceeds the SM9 limit of " + max + " bytes, use hybrid encryption";
    }

    static String ciphertextTooLong(int actual, int max) {
        return "SM9 密文长度 " + actual + " 超过上限 " + max
                + " 字节 / ciphertext length " + actual
                + " exceeds the SM9 limit of " + max + " bytes";
    }

    static String nativeUnavailable(Throwable cause) {
        String reason = cause == null ? "未知原因 / unknown" : String.valueOf(cause.getMessage());
        return "当前平台没有可用的 SM9 native 库 / no SM9 native library available for this platform: "
                + reason;
    }

    static String operationFailed(String operation, int code) {
        return "SM9 " + operation + " 调用失败，native 返回码 " + code
                + " / SM9 " + operation + " failed with native return code " + code;
    }

    static String operationReturnedNull(String operation) {
        return "SM9 " + operation + " 返回空结果 / SM9 " + operation + " returned no result";
    }

    static String handleClosed(String label) {
        return label + " 已释放，无法继续使用 / " + label + " has been closed";
    }

    static String wrongSignatureMode(String operation, boolean doSign) {
        String expected = doSign ? "签名" : "验签";
        return "SM9Signature 当前是" + expected + "模式，不能调用 " + operation
                + " / SM9Signature is in " + (doSign ? "sign" : "verify")
                + " mode and cannot call " + operation;
    }

    static String signatureFinished() {
        return "SM9Signature 已完成，请先 reset / SM9Signature has finished; call reset before reuse";
    }

    static String pemIo(String operation, String file) {
        return "SM9 " + operation + " 处理 PEM 文件失败：" + file
                + " / SM9 " + operation + " failed for PEM file: " + file;
    }
}
