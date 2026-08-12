package cn.gmkit.sm9;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * native 资源校验测试。
 *
 * 该测试不需要加载本机 native，先固定验证 loader 的篡改检测行为，避免
 * 普通 Java CI 因机器没有 GmSSL 而无法覆盖这条安全边界。
 */
class SM9NativeLoaderHashTest {

    @Test
    void acceptsExpectedSha256() {
        assertDoesNotThrow(() -> SM9NativeLoader.verifyHashForTest(
                "abc".getBytes(StandardCharsets.UTF_8),
                "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
    }

    @Test
    void rejectsTamperedNativeContent() {
        assertThrows(SM9Exception.class, () -> SM9NativeLoader.verifyHashForTest(
                "abc-tampered".getBytes(StandardCharsets.UTF_8),
                "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"));
    }
}
