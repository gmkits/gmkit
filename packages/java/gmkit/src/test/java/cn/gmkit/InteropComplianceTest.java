package cn.gmkit;

import cn.gmkit.core.HexCodec;
import cn.gmkit.core.SM2CipherMode;
import cn.gmkit.core.SM4CipherMode;
import cn.gmkit.sm2.SM2;
import cn.gmkit.sm2.SM2KeyExchangeOptions;
import cn.gmkit.sm2.SM2KeyExchangeResult;
import cn.gmkit.sm2.SM2Util;
import cn.gmkit.sm3.SM3Util;
import cn.gmkit.sm4.SM4Options;
import cn.gmkit.sm4.SM4Util;
import cn.gmkit.test.Vectors;
import cn.gmkit.zuc.ZUC;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.DynamicTest.dynamicTest;

/**
 * 跨语言互通向量测试：读取根 {@code /vectors/interop.json}，
 * 校验 Java 与 TypeScript 实现产生相同的字节级输出。
 *
 * <p>共享向量属于发版门禁：文件缺失、结构错误、未知操作或零匹配用例都必须失败，
 * 不允许通过跳过用例产生假绿结果。
 */
class InteropComplianceTest {

    @Test
    void sharedVectorSetIsNonEmptyUniqueAndSupported() throws Exception {
        Map<String, Object> root = loadRoot();
        Object schemaVersion = root.get("schemaVersion");
        assertTrue(schemaVersion instanceof Number, "共享向量缺少 schemaVersion");
        assertEquals(2, ((Number) schemaVersion).intValue(), "共享向量 schemaVersion 不受支持");
        List<Map<String, Object>> cases = cases(root);
        assertFalse(cases.isEmpty(), "共享互操作向量不能为空");

        Set<String> supported = new HashSet<>(Arrays.asList(
            "SM2/encrypt",
            "SM2/sign",
            "SM2/key-exchange",
            "SM3/digest",
            "SM4/encrypt",
            "ZUC/keystream",
            "ZUC/encrypt",
            "ZUC/eea3",
            "ZUC/eea3-encrypt",
            "ZUC/eia3"));
        Set<String> ids = new HashSet<>();
        Set<String> sourceIds = new HashSet<>();
        for (Map<String, Object> vector : cases) {
            String id = requiredString(vector, "id");
            assertTrue(ids.add(id), "共享向量 ID 重复: " + id);
            String operation = requiredString(vector, "algo") + "/" + requiredString(vector, "op");
            assertTrue(supported.contains(operation), "共享向量操作不受支持: " + operation);
            String sourceId = requiredString(vector, "sourceId");
            String sourceType = requiredString(vector, "sourceType");
            String sourceRef = requiredString(vector, "sourceRef");
            requiredString(vector, "description");
            assertTrue(sourceIds.add(sourceId), "共享向量 sourceId 重复: " + sourceId);
            assertTrue("standard".equals(sourceType) || "project-fixture".equals(sourceType),
                "共享向量 sourceType 不受支持: " + sourceType);
            if ("standard".equals(sourceType)) {
                assertTrue(sourceRef.matches("^(GM/T|3GPP|NIST|ISO|RFC|https?://).*"),
                    "标准向量必须包含可核对的标准来源: " + id);
            } else {
                assertEquals("vectors/interop.json", sourceRef,
                    "项目 fixture 的 sourceRef 必须指向共享文件: " + id);
            }
        }
    }

    @TestFactory
    Collection<DynamicTest> sm3DigestVectorsMatchTypeScript() throws Exception {
        return iterate("SM3", "digest", vector -> {
            String id = requiredString(vector, "id");
            String input = requiredString(vector, "input");
            String expectedHex = expectedString(vector, "hex");
            return dynamicTest(id, () -> {
                String actualHex = SM3Util.digestHex(input.getBytes(StandardCharsets.UTF_8));
                assertHexEquals(expectedHex, actualHex, "SM3 digest mismatch: " + id);
            });
        });
    }

    @TestFactory
    Collection<DynamicTest> sm4EncryptVectorsMatchTypeScript() throws Exception {
        return iterate("SM4", "encrypt", vector -> {
            String id = requiredString(vector, "id");
            String mode = requiredString(vector, "mode");
            String padding = requiredString(vector, "padding");
            String keyHex = requiredString(vector, "keyHex");
            String ivHex = optionalString(vector, "ivHex");
            String input = requiredString(vector, "input");
            String expectedHex = expectedString(vector, "cipherHex");
            if (!"PKCS7".equals(padding)) {
                throw new IllegalStateException("不受支持的 SM4 共享向量 padding: " + padding + " (" + id + ")");
            }
            SM4CipherMode cipherMode = SM4CipherMode.valueOf(mode);
            return dynamicTest(id, () -> {
                byte[] key = HexCodec.decodeStrict(keyHex, "sm4.keyHex");
                byte[] data = input.getBytes(StandardCharsets.UTF_8);
                SM4Options.Builder options = SM4Options.builder().mode(cipherMode);
                if (ivHex != null) {
                    options.iv(HexCodec.decodeStrict(ivHex, "sm4.ivHex"));
                }
                byte[] cipher = SM4Util.encrypt(key, data, options.build()).ciphertext();
                assertHexEquals(expectedHex, HexCodec.encode(cipher),
                    "SM4 " + mode + "/" + padding + " cipher mismatch: " + id);
            });
        });
    }

    @TestFactory
    Collection<DynamicTest> zucVectorsMatchTypeScript() throws Exception {
        Map<String, Object> root = loadRoot();
        Map<String, Object> defaults = requiredMap(root, "defaults");
        List<DynamicTest> tests = new ArrayList<>();
        for (Map<String, Object> vector : cases(root)) {
            if (!"ZUC".equals(vector.get("algo"))) {
                continue;
            }
            String id = requiredString(vector, "id");
            String op = requiredString(vector, "op");
            String keyHex = stringOr(optionalString(vector, "keyHex"), requiredString(defaults, "zucKeyHex"));
            String ivHex = stringOr(optionalString(vector, "ivHex"), requiredString(defaults, "zucIvHex"));
            tests.add(zucTest(id, op, vector, keyHex, ivHex));
        }
        requireTests("ZUC", tests);
        return tests;
    }

    @TestFactory
    Collection<DynamicTest> sm2VectorsMatchTypeScript() throws Exception {
        List<DynamicTest> tests = new ArrayList<>();
        for (Map<String, Object> vector : cases(loadRoot())) {
            if (!"SM2".equals(vector.get("algo"))) {
                continue;
            }
            String id = requiredString(vector, "id");
            String op = requiredString(vector, "op");
            if ("encrypt".equals(op)) {
                String publicKeyHex = requiredString(vector, "publicKeyHex");
                String privateKeyHex = requiredString(vector, "privateKeyHex");
                String input = requiredString(vector, "input");
                SM2CipherMode mode = SM2CipherMode.valueOf(requiredString(vector, "mode"));
                String expectedPlain = expectedString(vector, "plain");
                tests.add(dynamicTest(id, () -> {
                    SM2 sm2 = new SM2();
                    String cipherHex = sm2.encryptHex(publicKeyHex, input, mode);
                    assertEquals(expectedPlain, sm2.decryptToUtf8(privateKeyHex, cipherHex, mode),
                        "SM2 decrypt mismatch: " + id);
                }));
                continue;
            }
            if ("sign".equals(op)) {
                String publicKeyHex = requiredString(vector, "publicKeyHex");
                String privateKeyHex = requiredString(vector, "privateKeyHex");
                String input = requiredString(vector, "input");
                boolean expectedVerify = expectedBoolean(vector, "verify");
                tests.add(dynamicTest(id, () -> {
                    SM2 sm2 = new SM2();
                    String signature = sm2.signHex(privateKeyHex, input, null);
                    assertEquals(expectedVerify, sm2.verify(publicKeyHex, input, signature, null),
                        "SM2 verify mismatch: " + id);
                }));
                continue;
            }
            if ("key-exchange".equals(op)) {
                tests.add(sm2KeyExchangeTest(id, vector));
                continue;
            }
            throw new IllegalStateException("不受支持的 SM2 共享向量操作: " + op + " (" + id + ")");
        }
        requireTests("SM2", tests);
        return tests;
    }

    private static DynamicTest sm2KeyExchangeTest(String id, Map<String, Object> vector) {
        String staticPrivateA = requiredString(vector, "initiatorStaticPrivateKeyHex");
        String ephemeralPrivateA = requiredString(vector, "initiatorEphemeralPrivateKeyHex");
        String staticPrivateB = requiredString(vector, "responderStaticPrivateKeyHex");
        String ephemeralPrivateB = requiredString(vector, "responderEphemeralPrivateKeyHex");
        String idA = requiredString(vector, "initiatorId");
        String idB = requiredString(vector, "responderId");
        int keyLengthBytes = requiredInt(vector, "keyLengthBytes");
        String expectedKey = expectedString(vector, "sharedKeyHex");
        String expectedS1 = expectedString(vector, "s1Hex");
        String expectedS2 = expectedString(vector, "s2Hex");
        return dynamicTest(id, () -> {
            String staticPublicA = SM2Util.getPublicKeyFromPrivateKey(staticPrivateA, false);
            String ephemeralPublicA = SM2Util.getPublicKeyFromPrivateKey(ephemeralPrivateA, false);
            String staticPublicB = SM2Util.getPublicKeyFromPrivateKey(staticPrivateB, false);
            String ephemeralPublicB = SM2Util.getPublicKeyFromPrivateKey(ephemeralPrivateB, false);
            SM2KeyExchangeResult responder = SM2Util.keyExchangeWithConfirmation(
                staticPrivateB,
                ephemeralPrivateB,
                staticPublicA,
                ephemeralPublicA,
                SM2KeyExchangeOptions.builder()
                    .initiator(false)
                    .keyBits(keyLengthBytes * 8)
                    .selfId(idB)
                    .peerId(idA)
                    .build());
            SM2KeyExchangeResult initiator = SM2Util.keyExchangeWithConfirmation(
                staticPrivateA,
                ephemeralPrivateA,
                staticPublicB,
                ephemeralPublicB,
                SM2KeyExchangeOptions.builder()
                    .initiator(true)
                    .keyBits(keyLengthBytes * 8)
                    .selfId(idA)
                    .peerId(idB)
                    .confirmationTag(responder.s1())
                    .build());

            assertHexEquals(expectedKey, HexCodec.encode(responder.key()), "SM2 shared key mismatch: " + id);
            assertHexEquals(expectedKey, HexCodec.encode(initiator.key()), "SM2 initiator key mismatch: " + id);
            assertHexEquals(expectedS1, HexCodec.encode(responder.s1()), "SM2 S1 mismatch: " + id);
            assertHexEquals(expectedS2, HexCodec.encode(responder.s2()), "SM2 responder S2 mismatch: " + id);
            assertHexEquals(expectedS2, HexCodec.encode(initiator.s2()), "SM2 initiator S2 mismatch: " + id);
        });
    }

    private static DynamicTest zucTest(String id, String op, Map<String, Object> vector,
            String keyHex, String ivHex) {
        if ("keystream".equals(op)) {
            int length = requiredInt(vector, "lengthBytes");
            String expected = expectedString(vector, "hex");
            return dynamicTest(id, () -> assertHexEquals(expected,
                ZUC.keystreamHex(keyHex, ivHex, length), "ZUC keystream mismatch: " + id));
        }
        if ("encrypt".equals(op)) {
            String input = requiredString(vector, "input");
            String expected = expectedString(vector, "cipherHex");
            return dynamicTest(id, () -> assertHexEquals(expected,
                ZUC.encryptHex(keyHex, ivHex, input), "ZUC encrypt mismatch: " + id));
        }
        if ("eea3".equals(op)) {
            String expected = expectedString(vector, "hex");
            return dynamicTest(id, () -> assertHexEquals(expected, ZUC.eea3(
                keyHex,
                requiredInt(vector, "count"),
                requiredInt(vector, "bearer"),
                requiredInt(vector, "direction"),
                requiredInt(vector, "bitLength")), "ZUC EEA3 mismatch: " + id));
        }
        if ("eea3-encrypt".equals(op)) {
            String expected = expectedString(vector, "cipherHex");
            String inputHex = requiredString(vector, "inputHex");
            return dynamicTest(id, () -> assertHexEquals(expected, HexCodec.encode(ZUC.eea3Encrypt(
                keyHex,
                requiredInt(vector, "count"),
                requiredInt(vector, "bearer"),
                requiredInt(vector, "direction"),
                HexCodec.decodeStrict(inputHex, "EEA3 message"),
                requiredInt(vector, "bitLength"))), "ZUC EEA3 encrypt mismatch: " + id));
        }
        if ("eia3".equals(op)) {
            String expected = expectedString(vector, "macHex");
            String inputHex = optionalString(vector, "inputHex");
            if (inputHex != null) {
                return dynamicTest(id, () -> assertHexEquals(expected, ZUC.eia3(
                    keyHex,
                    requiredInt(vector, "count"),
                    requiredInt(vector, "bearer"),
                    requiredInt(vector, "direction"),
                    HexCodec.decodeStrict(inputHex, "EIA3 message"),
                    requiredInt(vector, "bitLength")), "ZUC EIA3 mismatch: " + id));
            }
            String input = requiredString(vector, "input");
            return dynamicTest(id, () -> assertHexEquals(expected, ZUC.eia3(
                keyHex,
                requiredInt(vector, "count"),
                requiredInt(vector, "bearer"),
                requiredInt(vector, "direction"),
                input), "ZUC EIA3 mismatch: " + id));
        }
        throw new IllegalStateException("不受支持的 ZUC 共享向量操作: " + op + " (" + id + ")");
    }

    private static Collection<DynamicTest> iterate(String algo, String op,
            Function<Map<String, Object>, DynamicTest> mapper) throws Exception {
        List<DynamicTest> tests = new ArrayList<>();
        for (Map<String, Object> vector : cases(loadRoot())) {
            if (algo.equals(vector.get("algo")) && op.equals(vector.get("op"))) {
                DynamicTest test = mapper.apply(vector);
                if (test == null) {
                    throw new IllegalStateException("共享向量映射器不得返回 null: " + requiredString(vector, "id"));
                }
                tests.add(test);
            }
        }
        requireTests(algo + "/" + op, tests);
        return tests;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> loadRoot() throws Exception {
        Object root = Vectors.load("/vectors/interop.json");
        if (!(root instanceof Map)) {
            throw new IllegalStateException("共享向量根节点必须是 JSON object");
        }
        return (Map<String, Object>) root;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> cases(Map<String, Object> root) {
        Object value = root.get("cases");
        if (!(value instanceof List)) {
            throw new IllegalStateException("共享向量 cases 必须是 JSON array");
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : (List<?>) value) {
            if (!(item instanceof Map)) {
                throw new IllegalStateException("共享向量 case 必须是 JSON object");
            }
            result.add((Map<String, Object>) item);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> requiredMap(Map<String, Object> source, String field) {
        Object value = source.get(field);
        if (!(value instanceof Map)) {
            throw new IllegalStateException("共享向量字段必须是 object: " + field);
        }
        return (Map<String, Object>) value;
    }

    private static String requiredString(Map<String, Object> source, String field) {
        String value = optionalString(source, field);
        if (value == null || value.isEmpty()) {
            throw new IllegalStateException("共享向量缺少字符串字段: " + field);
        }
        return value;
    }

    private static String optionalString(Map<String, Object> source, String field) {
        Object value = source.get(field);
        if (value == null) {
            return null;
        }
        if (!(value instanceof String)) {
            throw new IllegalStateException("共享向量字段必须是字符串: " + field);
        }
        return (String) value;
    }

    private static int requiredInt(Map<String, Object> source, String field) {
        Object value = source.get(field);
        if (!(value instanceof Number)) {
            throw new IllegalStateException("共享向量字段必须是整数: " + field);
        }
        return ((Number) value).intValue();
    }

    private static String expectedString(Map<String, Object> vector, String field) {
        return requiredString(requiredMap(vector, "expected"), field);
    }

    private static boolean expectedBoolean(Map<String, Object> vector, String field) {
        Object value = requiredMap(vector, "expected").get(field);
        if (!(value instanceof Boolean)) {
            throw new IllegalStateException("共享向量 expected 字段必须是 boolean: " + field);
        }
        return (Boolean) value;
    }

    private static void requireTests(String group, List<DynamicTest> tests) {
        if (tests.isEmpty()) {
            throw new IllegalStateException("共享向量分组没有匹配用例: " + group);
        }
    }

    private static void assertHexEquals(String expected, String actual, String message) {
        assertEquals(expected.toLowerCase(), actual.toLowerCase(), message);
    }

    private static String stringOr(String value, String fallback) {
        return value == null ? fallback : value;
    }
}
