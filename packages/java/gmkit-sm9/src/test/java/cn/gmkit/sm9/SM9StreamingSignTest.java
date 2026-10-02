package cn.gmkit.sm9;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;

import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * SM9 流式签名 / 验签测试：多次 {@code update} 处理大数据（需要 native 库）。
 */
@EnabledIf("cn.gmkit.sm9.SM9Assumptions#nativeAvailable")
class SM9StreamingSignTest {

    @Test
    void chunkedUpdateShouldVerify() {
        byte[] data = new byte[200_000];
        new Random(42).nextBytes(data);

        try (SM9SignMasterKey master = SM9.generateSignMasterKey();
             SM9SignKey signKey = master.extractKey("stream@example.com")) {

            byte[] signature;
            try (SM9Signature signer = new SM9Signature(true)) {
                feedInChunks(signer, data);
                signature = signer.sign(signKey);
            }
            assertNotNull(signature);

            try (SM9Signature verifier = new SM9Signature(false)) {
                feedInChunks(verifier, data);
                assertTrue(verifier.verify(signature, master, "stream@example.com"));
            }
        }
    }

    @Test
    void resetShouldAllowReuse() {
        try (SM9SignMasterKey master = SM9.generateSignMasterKey();
             SM9SignKey signKey = master.extractKey("reuse@example.com");
             SM9Signature signer = new SM9Signature(true)) {

            signer.update("first".getBytes());
            byte[] first = signer.sign(signKey);

            signer.reset(true);
            signer.update("second".getBytes());
            byte[] second = signer.sign(signKey);

            assertNotNull(first);
            assertNotNull(second);
            assertTrue(SM9.verify(master, "reuse@example.com", "second".getBytes(), second));
        }
    }

    @Test
    void modeAndFinishedStateShouldBeEnforced() {
        byte[] message = "state-machine".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        try (SM9SignMasterKey master = SM9.generateSignMasterKey();
             SM9SignKey signKey = master.extractKey("state@example.com");
             SM9Signature signer = new SM9Signature(true);
             SM9Signature verifier = new SM9Signature(false)) {

            // 验签上下文不能执行签名，签名上下文不能执行验签。
            assertThrows(SM9Exception.class, () -> verifier.sign(signKey));
            assertThrows(SM9Exception.class,
                    () -> signer.verify(new byte[] {1}, master, "state@example.com"));
            signer.update(message);
            byte[] signature = signer.sign(signKey);
            assertThrows(SM9Exception.class, () -> signer.update(message));
            assertThrows(SM9Exception.class, () -> signer.sign(signKey));

            verifier.update(message);
            assertTrue(verifier.verify(signature, master, "state@example.com"));
            assertThrows(SM9Exception.class, () -> verifier.update(message));
            assertThrows(SM9Exception.class,
                    () -> verifier.verify(signature, master, "state@example.com"));
        }
    }

    @Test
    void resetShouldSwitchBetweenSignAndVerifyModes() {
        byte[] message = "reset-mode-switch".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        try (SM9SignMasterKey master = SM9.generateSignMasterKey();
             SM9SignKey signKey = master.extractKey("reset-mode@example.com");
             SM9Signature context = new SM9Signature(true)) {

            context.update(message);
            byte[] signature = context.sign(signKey);

            context.reset(false);
            context.update(message);
            assertTrue(context.verify(signature, master, "reset-mode@example.com"));

            context.reset(true);
            context.update(message);
            assertNotNull(context.sign(signKey));
        }
    }

    @Test
    void closeShouldBeIdempotentAndRejectFurtherUse() {
        SM9Signature context = new SM9Signature(true);
        context.close();
        assertDoesNotThrow(context::close);
        assertThrows(SM9Exception.class, () -> context.update(new byte[] {1}));
        assertThrows(SM9Exception.class, () -> context.update(new byte[0]));
        assertThrows(SM9Exception.class, () -> context.reset(false));
        assertThrows(SM9Exception.class, () -> context.sign(null));
        assertThrows(SM9Exception.class, () -> context.verify(new byte[] {1}, null, "closed"));
    }

    private static void feedInChunks(SM9Signature ctx, byte[] data) {
        int chunk = 4096;
        for (int offset = 0; offset < data.length; offset += chunk) {
            int len = Math.min(chunk, data.length - offset);
            ctx.update(data, offset, len);
        }
    }
}
