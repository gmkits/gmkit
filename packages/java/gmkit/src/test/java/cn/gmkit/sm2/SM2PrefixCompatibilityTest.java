package cn.gmkit.sm2;

import cn.gmkit.core.GmSecurityContext;
import cn.gmkit.core.GmkitException;
import cn.gmkit.core.HexCodec;
import cn.gmkit.core.SM2CipherMode;
import cn.gmkit.core.Texts;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.security.SecureRandom;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.*;

class SM2PrefixCompatibilityTest {
    private static final String PRIVATE_KEY = "0000000000000000000000000000000000000000000000000000000000000001";

    @ParameterizedTest
    @EnumSource(SM2CipherMode.class)
    void missingPrefixWithLeading04CoordinateMustRoundTrip(SM2CipherMode mode) {
        // 项目回归：固定临时标量 k=11，C1 的 X 坐标首字节恰为 04；不是国标向量。
        SM2 fixed = new SM2(GmSecurityContext.builder().secureRandom(new SecureRandom() {
            @Override
            public void nextBytes(byte[] bytes) {
                Arrays.fill(bytes, (byte) 0);
                bytes[bytes.length - 1] = 11;
            }
        }).build());
        String publicKey = HexCodec.encode(SM2Domain.X9_PARAMETERS.getG().getEncoded(false));
        byte[] message = Texts.utf8("prefix-collision-regression");
        byte[] raw = fixed.encrypt(publicKey, message, mode);
        assertEquals(0x04, raw[0]);
        assertEquals(0x04, raw[1]);
        byte[] withoutPrefix = Arrays.copyOfRange(raw, 1, raw.length);

        assertArrayEquals(message, fixed.decrypt(PRIVATE_KEY, raw, mode));
        assertArrayEquals(message, fixed.decrypt(PRIVATE_KEY, withoutPrefix, mode));
        assertArrayEquals(raw, SM2Ciphertexts.decodeAuto(withoutPrefix, mode));
        assertArrayEquals(SM2Ciphertexts.parse(raw, mode).c1(), SM2Ciphertexts.parse(withoutPrefix, mode).c1());
        assertArrayEquals(raw, SM2Ciphertexts.decodeDer(SM2Ciphertexts.encodeDer(withoutPrefix, mode), mode));

        int c2Offset = mode == SM2CipherMode.C1C3C2 ? 96 : 64;
        int c3Offset = mode == SM2CipherMode.C1C3C2 ? 64 : withoutPrefix.length - 32;
        for (int offset : new int[]{c2Offset, c3Offset}) {
            byte[] tampered = withoutPrefix.clone();
            tampered[offset] ^= 1;
            assertThrows(GmkitException.class, () -> fixed.decrypt(PRIVATE_KEY, tampered, mode));
        }
        byte[] shortestRaw = fixed.encrypt(publicKey, new byte[]{1}, mode);
        byte[] shortest = Arrays.copyOfRange(shortestRaw, 1, shortestRaw.length);
        assertEquals(97, shortest.length);
        assertArrayEquals(shortestRaw, SM2Ciphertexts.decodeAuto(shortest, mode));
        assertArrayEquals(new byte[]{1}, fixed.decrypt(PRIVATE_KEY, shortest, mode));
        byte[] invalid = new byte[101];
        invalid[0] = 0x04;
        assertThrows(GmkitException.class, () -> SM2Ciphertexts.parse(invalid, mode));
    }
}
