package cn.gmkit.sm9;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * SM9 加密 / 解密（IBE）功能测试（需要 native 库）。
 */
@EnabledIf("cn.gmkit.sm9.SM9Assumptions#nativeAvailable")
class SM9EncTest {

    private static final byte[] PLAINTEXT = "Hello GMKit SM9 IBE!".getBytes(StandardCharsets.UTF_8);

    @Test
    void encryptAndDecryptShouldRoundTrip() {
        try (SM9EncMasterKey master = SM9.generateEncMasterKey();
             SM9EncKey encKey = master.extractKey("bob@example.com")) {
            byte[] ciphertext = SM9.encrypt(master, "bob@example.com", PLAINTEXT);
            assertNotNull(ciphertext);
            byte[] decrypted = SM9.decrypt(encKey, ciphertext);
            assertArrayEquals(PLAINTEXT, decrypted);
        }
    }

    @Test
    void oneBytePlaintextShouldRoundTrip() {
        try (SM9EncMasterKey master = SM9.generateEncMasterKey();
             SM9EncKey encKey = master.extractKey("bob@example.com")) {
            byte[] plaintext = new byte[] {0x01};
            byte[] ciphertext = SM9.encrypt(master, "bob@example.com", plaintext);
            assertArrayEquals(plaintext, SM9.decrypt(encKey, ciphertext));
        }
    }

    @Test
    void decryptWithWrongUserKeyShouldFail() {
        try (SM9EncMasterKey master = SM9.generateEncMasterKey();
             SM9EncKey wrongKey = master.extractKey("carol@example.com")) {
            byte[] ciphertext = SM9.encrypt(master, "bob@example.com", PLAINTEXT);
            // 用错误身份派生的私钥解密应失败（抛异常或得到不同明文）。
            try {
                byte[] decrypted = SM9.decrypt(wrongKey, ciphertext);
                assertFalse(Arrays.equals(PLAINTEXT, decrypted));
            } catch (SM9Exception expected) {
                assertNotNull(expected.getMessage());
            }
        }
    }

    @Test
    void plaintextExceedingLimitShouldThrow() {
        try (SM9EncMasterKey master = SM9.generateEncMasterKey()) {
            byte[] tooLong = new byte[SM9EncMasterKey.MAX_PLAINTEXT_SIZE + 1];
            assertThrows(SM9Exception.class,
                    () -> SM9.encrypt(master, "bob@example.com", tooLong));
        }
    }

    @Test
    void maxLengthPlaintextShouldRoundTrip() {
        try (SM9EncMasterKey master = SM9.generateEncMasterKey();
             SM9EncKey encKey = master.extractKey("bob@example.com")) {
            byte[] maxPlaintext = new byte[SM9EncMasterKey.MAX_PLAINTEXT_SIZE];
            Arrays.fill(maxPlaintext, (byte) 0x5A);
            byte[] ciphertext = SM9.encrypt(master, "bob@example.com", maxPlaintext);
            byte[] decrypted = SM9.decrypt(encKey, ciphertext);
            assertArrayEquals(maxPlaintext, decrypted);
        }
    }

    @Test
    void emptyPlaintextShouldThrow() {
        try (SM9EncMasterKey master = SM9.generateEncMasterKey()) {
            assertThrows(SM9Exception.class,
                    () -> SM9.encrypt(master, "bob@example.com", new byte[0]));
        }
    }

    @ParameterizedTest(name = "identity: {0}")
    @MethodSource("unicodeIdentities")
    void unicodeIdentityShouldEncryptAndDecrypt(String name, String id) {
        try (SM9EncMasterKey master = SM9.generateEncMasterKey();
             SM9EncKey encKey = master.extractKey(id)) {
            byte[] ciphertext = SM9.encrypt(master, id, PLAINTEXT);

            assertArrayEquals(PLAINTEXT, SM9.decrypt(encKey, ciphertext), name);
        }
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("unicodePlaintexts")
    void unicodePlaintextShouldRoundTripWithinNativeLimit(String name, String message) {
        byte[] plaintext = message.getBytes(StandardCharsets.UTF_8);
        try (SM9EncMasterKey master = SM9.generateEncMasterKey();
             SM9EncKey encKey = master.extractKey("bob+unicode@example.com")) {
            byte[] ciphertext = SM9.encrypt(master, "bob+unicode@example.com", plaintext);
            byte[] decrypted = SM9.decrypt(encKey, ciphertext);

            assertArrayEquals(plaintext, decrypted, name);
        }
    }

    private static Stream<Arguments> unicodePlaintexts() {
        return Stream.of(
            Arguments.of("Chinese punctuation", "你好，GMKit！这是中文测试。"),
            Arguments.of("Emoji", "SM9 加密 😊🚀🔥"),
            Arguments.of("Mixed Unicode", "中文 + emoji 😊 + English + 123"),
            Arguments.of("Newlines and tabs", "第一行\nsecond line\t第三行"));
    }

    private static Stream<Arguments> unicodeIdentities() {
        return Stream.of(
            Arguments.of("Chinese identity", "用户-乙"),
            Arguments.of("Emoji identity", "recipient-🚀"),
            Arguments.of("Whitespace identity", "  recipient  "),
            Arguments.of("Embedded NUL identity", "recipient\u0000id"));
    }
}
