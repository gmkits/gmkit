package cn.gmkit.sm9;

import org.bouncycastle.asn1.ASN1Encodable;
import org.bouncycastle.asn1.ASN1Integer;
import org.bouncycastle.asn1.ASN1ObjectIdentifier;
import org.bouncycastle.asn1.DERBitString;
import org.bouncycastle.asn1.DEROctetString;
import org.bouncycastle.asn1.DERSequence;
import org.bouncycastle.asn1.pkcs.EncryptedPrivateKeyInfo;
import org.bouncycastle.asn1.pkcs.EncryptionScheme;
import org.bouncycastle.asn1.pkcs.KeyDerivationFunc;
import org.bouncycastle.asn1.pkcs.PBES2Parameters;
import org.bouncycastle.asn1.pkcs.PBKDF2Params;
import org.bouncycastle.asn1.pkcs.PKCSObjectIdentifiers;
import org.bouncycastle.asn1.x509.AlgorithmIdentifier;
import org.bouncycastle.crypto.digests.SM3Digest;
import org.bouncycastle.crypto.generators.PKCS5S2ParametersGenerator;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.util.encoders.Hex;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.Provider;
import java.util.Arrays;
import java.util.Base64;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SM9MasterKeyPemTest {
    private static final String PASSWORD = "Passw0rd!";
    private static final String ID = "pem-regression@gmkit.cn";
    private static final byte[] MESSAGE = "fixed-scalar-pem".getBytes(StandardCharsets.UTF_8);
    private static final ASN1ObjectIdentifier SM9_OID = new ASN1ObjectIdentifier("1.2.156.10197.1.302");
    private static final ASN1ObjectIdentifier SM4_CBC = new ASN1ObjectIdentifier("1.2.156.10197.1.104.2");
    private static final AlgorithmIdentifier HMAC_SM3 =
            new AlgorithmIdentifier(new ASN1ObjectIdentifier("1.2.156.10197.1.401.2"));
    private static final BigInteger ORDER = new BigInteger(
            "b640000002a3a6f1d603ab4ff58ec74449f2934b18ea8beee56ee19cd69ecf25", 16);
    private static final Provider BC = new BouncyCastleProvider();

    // 固定标量公钥点 [2^bit]P2 / [2^bit]P1 是项目回归 fixture，不是国标测试向量。
    // 使用固定 GmSSL d655c06 的 run 37136370654 Windows artifact 计算，无随机密钥生成。
    private static final Object[][] VECTORS = {
        {0,
            "0485aef3d078640c98597b6027b441a01ff1dd2c190f5e93c454806c11d8806141"
                + "3722755292130b08d2aab97fd34ec120ee265948d19c17abf9b7213baf82d65b"
                + "17509b092e845c1266ba0d262cbee6ed0736a96fa347c8bd856dc76b84ebeb96"
                + "a7cf28d519be3da65f3170153d278ff247efba98a71a08116215bba5c999a7c7",
            "0493de051d62bf718ff5ed0704487d01d6e1e4086909dc3280e8c4e4817c66dddd"
                + "21fe8dda4f21e607631065125c395bbc1c1c00cbfa6024350c464cd70a3ea616"},
        {247,
            "040f8a6c4868a01137a1047d6e3f0012ee4ec6ccf3f185c7a7c1700f1bb602a5c3"
                + "b056408c05938f1f369ca5c8e16c14dcce8c2008de8dd22b607f8686b49b0a81"
                + "4a1a2fd44e497a639ef15bc10dbbf4c09b33d6160d9b97849c42be00d69bf689"
                + "881e5b24f9a588558c83d0572c520f928820884a60ede4b5157d1337ab0b2bf4",
            "0415559dd9e1b9bdeb374b2d3cdd3f6d17a16c4399f8643121ec29cec2d79801c6"
                + "421aa67c2446861c2c6e30db72582787b255971972a49e861054270f1dba5b0e"},
        {248,
            "0440195aa7047b42b6f10163d1fe04d331cd5f863357f5e2cdb5b1084d81d7cb41"
                + "1bbe0d17e9cb41155b5a08a3fcbd83d958b43e06e723780fc066c022cd681d54a"
                + "4877d5d8dff183d121a8ab9ad0ea37cd8407069261345cb3c9e3630f7bce9ff8"
                + "f74eb3113c9d22f154479fc888190905ee1aa170c037c90b5f64a6eda5ced32",
            "048757717d264d9790ea94788ca5f2c31d997bec33059f0a8a2b80f68670ce48438"
                + "11364f82bd8e8405e070a21412a7baa6003686d7223212a6254a49ad61bd9c4"},
        {255,
            "0466cab11af9b19b94a8e07c17dcc292825fb93f2546c077fe0b06cf34c53e47a05"
                + "94e1ceb0692eb36ac5a9afa5e54722d1a38b9e6700d4c96a99efb20e861096b8"
                + "da605162242f0a718aeb9924e76505a07cae4fcb83f3de3b2f35a410b5e963f34"
                + "64199adceb6a17ff6d4a8902b4c988005a1c87e983f090d25ec4a60a1209fb",
            "044a0b8c5147798404e36495f67cf4a82f644cbc8aab5b0d2025ca8e42622c9de03"
                + "7618f94d58b19fabb3fd346c2ac93485b153d3403e1c5b249d05ed78d3099e6"}
    };

    @TempDir
    Path directory;

    static Stream<Arguments> masterKeys() {
        return Arrays.stream(VECTORS).flatMap(v -> Stream.of(
                Arguments.of(true, v[0], v[1]), Arguments.of(false, v[0], v[2])));
    }

    @ParameterizedTest(name = "sign={0}, scalar=2^{1}")
    @MethodSource("masterKeys")
    @EnabledIf("cn.gmkit.sm9.SM9Assumptions#nativeAvailable")
    void fixedScalarShouldImportAndRoundTrip(boolean sign, int bit, String pointHex) throws Exception {
        byte[] point = Hex.decode(pointHex);
        byte[] info = privateKeyInfo(sign, new ASN1Integer(BigInteger.ONE.shiftLeft(bit)), point);
        Path input = writePem("input.pem", label(sign), encrypt(info));
        Path exported = directory.resolve("exported.pem");
        byte[] publicDer = new DERSequence(new DERBitString(point)).getEncoded("DER");
        Path publicFile = writePem("public.pem", "SM9 " + (sign ? "SIGN" : "ENC")
                + " MASTER PUBLIC KEY", publicDer);
        Path actualPublic = directory.resolve("actual-public.pem");

        if (sign) {
            try (SM9SignMasterKey master = SM9SignMasterKey.importEncryptedMasterKeyInfoPem(
                    PASSWORD, input.toString())) {
                master.exportPublicMasterKeyPem(actualPublic.toString());
                master.exportEncryptedMasterKeyInfoPem(PASSWORD, exported.toString());
            }
            try (SM9SignMasterKey master = SM9SignMasterKey.importEncryptedMasterKeyInfoPem(
                    PASSWORD, exported.toString());
                 SM9SignKey key = master.extractKey(ID);
                 SM9SignMasterKey pub = SM9SignMasterKey.importPublicMasterKeyPem(publicFile.toString())) {
                assertTrue(SM9.verify(pub, ID, MESSAGE, SM9.sign(key, MESSAGE)));
            }
        } else {
            try (SM9EncMasterKey master = SM9EncMasterKey.importEncryptedMasterKeyInfoPem(
                    PASSWORD, input.toString())) {
                master.exportPublicMasterKeyPem(actualPublic.toString());
                master.exportEncryptedMasterKeyInfoPem(PASSWORD, exported.toString());
            }
            try (SM9EncMasterKey master = SM9EncMasterKey.importEncryptedMasterKeyInfoPem(
                    PASSWORD, exported.toString());
                 SM9EncKey key = master.extractKey(ID);
                 SM9EncMasterKey pub = SM9EncMasterKey.importPublicMasterKeyPem(publicFile.toString())) {
                assertArrayEquals(MESSAGE, SM9.decrypt(key, SM9.encrypt(pub, ID, MESSAGE)));
            }
        }
        assertArrayEquals(publicDer, readPem(actualPublic));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    @EnabledIf("cn.gmkit.sm9.SM9Assumptions#nativeAvailable")
    void omittedPrfShouldPreserveGmsslSm3Compatibility(boolean sign) throws Exception {
        byte[] point = Hex.decode((String) VECTORS[2][sign ? 1 : 2]);
        byte[] info = privateKeyInfo(sign, new ASN1Integer(BigInteger.ONE.shiftLeft(248)), point);
        Path input = writePem("omitted-prf.pem", label(sign), encrypt(info, false));
        Path output = directory.resolve("omitted-prf-public.pem");
        if (sign) {
            try (SM9SignMasterKey master = SM9SignMasterKey.importEncryptedMasterKeyInfoPem(
                    PASSWORD, input.toString())) {
                master.exportPublicMasterKeyPem(output.toString());
            }
        } else {
            try (SM9EncMasterKey master = SM9EncMasterKey.importEncryptedMasterKeyInfoPem(
                    PASSWORD, input.toString())) {
                master.exportPublicMasterKeyPem(output.toString());
            }
        }
        assertArrayEquals(new DERSequence(new DERBitString(point)).getEncoded("DER"), readPem(output));
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    @EnabledIf("cn.gmkit.sm9.SM9Assumptions#nativeAvailable")
    void invalidScalarsShouldBeRejected(boolean sign) throws Exception {
        byte[] point = Hex.decode((String) VECTORS[0][sign ? 1 : 2]);
        for (BigInteger scalar : new BigInteger[] {
                BigInteger.ZERO, BigInteger.valueOf(-1), BigInteger.ONE.shiftLeft(256), ORDER}) {
            assertRejected(sign, PASSWORD, encrypt(privateKeyInfo(sign, new ASN1Integer(scalar), point)));
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    @EnabledIf("cn.gmkit.sm9.SM9Assumptions#nativeAvailable")
    void invalidEnvelopesShouldBeRejected(boolean sign) throws Exception {
        byte[] point = Hex.decode((String) VECTORS[2][sign ? 1 : 2]);
        ASN1Integer scalar = new ASN1Integer(BigInteger.ONE.shiftLeft(248));
        byte[] info = privateKeyInfo(sign, scalar, point);
        byte[] encrypted = encrypt(info);
        assertRejected(sign, "wrong-password", encrypted);
        assertRejected(sign, PASSWORD, Arrays.copyOf(encrypted, encrypted.length - 1));
        assertRejected(sign, PASSWORD, Arrays.copyOf(encrypted, encrypted.length + 1));
        assertRejected(sign, PASSWORD, encrypt(Arrays.copyOf(info, info.length + 1)));
        assertRejected(sign, PASSWORD, encrypt(privateKeyInfo(!sign, scalar, point)));
        assertRejected(sign, PASSWORD, encrypt(privateKeyInfo(sign, scalar,
                Arrays.copyOf(point, point.length - 1))));
        point[0] = 0; // 非法的未压缩曲线点前缀。
        assertRejected(sign, PASSWORD, encrypt(privateKeyInfo(sign, scalar, point)));
    }

    @Test
    void fixturesUseCanonicalIntegersAndDecryptWithoutNative() throws Exception {
        int[] encodedIntegerLengths = {1, 32, 32, 33};
        for (int i = 0; i < VECTORS.length; i++) {
            ASN1Integer scalar = new ASN1Integer(BigInteger.ONE.shiftLeft((Integer) VECTORS[i][0]));
            assertEquals(encodedIntegerLengths[i], scalar.getEncoded("DER")[1]);
            for (boolean sign : new boolean[] {true, false}) {
                byte[] info = privateKeyInfo(sign, scalar, Hex.decode((String) VECTORS[i][sign ? 1 : 2]));
                EncryptedPrivateKeyInfo envelope = EncryptedPrivateKeyInfo.getInstance(encrypt(info));
                assertArrayEquals(info, cipher(Cipher.DECRYPT_MODE).doFinal(envelope.getEncryptedData()));
            }
        }
    }

    private void assertRejected(boolean sign, String password, byte[] encrypted) throws Exception {
        Path path = writePem("invalid.pem", label(sign), encrypted);
        assertThrows(SM9Exception.class, () -> {
            // 即使非法导入意外返回句柄，也要关闭以免测试泄漏资源。
            if (sign) {
                try (SM9SignMasterKey ignored = SM9SignMasterKey.importEncryptedMasterKeyInfoPem(
                        password, path.toString())) { }
            } else {
                try (SM9EncMasterKey ignored = SM9EncMasterKey.importEncryptedMasterKeyInfoPem(
                        password, path.toString())) { }
            }
        });
    }

    private static byte[] privateKeyInfo(boolean sign, ASN1Integer scalar, byte[] point) throws Exception {
        DERSequence key = new DERSequence(new ASN1Encodable[] {scalar, new DERBitString(point)});
        return new DERSequence(new ASN1Encodable[] {new ASN1Integer(0),
                new AlgorithmIdentifier(SM9_OID, SM9_OID.branch(sign ? "1" : "3")),
                new DEROctetString(key.getEncoded("DER"))}).getEncoded("DER");
    }

    private static byte[] encrypt(byte[] info) throws Exception {
        return encrypt(info, true);
    }

    private static byte[] encrypt(byte[] info, boolean explicitPrf) throws Exception {
        // 省略 PRF 的 fixture 仍以 SM3 加密，验证固定 GmSSL 的既有行为，非通用 PBKDF2 语义。
        PBKDF2Params kdf = explicitPrf ? new PBKDF2Params(new byte[16], 65536, 16, HMAC_SM3)
                : new PBKDF2Params(new byte[16], 65536, 16);
        PBES2Parameters parameters = new PBES2Parameters(
                new KeyDerivationFunc(PKCSObjectIdentifiers.id_PBKDF2, kdf),
                new EncryptionScheme(SM4_CBC, new DEROctetString(new byte[16])));
        return new EncryptedPrivateKeyInfo(
                new AlgorithmIdentifier(PKCSObjectIdentifiers.id_PBES2, parameters),
                cipher(Cipher.ENCRYPT_MODE).doFinal(info)).getEncoded("DER");
    }

    private static Cipher cipher(int mode) throws Exception {
        // 固定盐和 IV 仅供回归 fixture 使用，禁止用于生产加密。
        PKCS5S2ParametersGenerator kdf = new PKCS5S2ParametersGenerator(new SM3Digest());
        kdf.init(PASSWORD.getBytes(StandardCharsets.UTF_8), new byte[16], 65536);
        byte[] key = ((KeyParameter) kdf.generateDerivedParameters(128)).getKey();
        Cipher cipher = Cipher.getInstance("SM4/CBC/PKCS7Padding", BC);
        cipher.init(mode, new SecretKeySpec(key, "SM4"), new IvParameterSpec(new byte[16]));
        return cipher;
    }

    private static String label(boolean sign) {
        return "ENCRYPTED SM9 " + (sign ? "SIGN" : "ENC") + " MASTER KEY";
    }

    private Path writePem(String file, String label, byte[] der) throws Exception {
        String pem = "-----BEGIN " + label + "-----\n"
                + Base64.getMimeEncoder(64, new byte[] {'\n'}).encodeToString(der)
                + "\n-----END " + label + "-----\n";
        return Files.write(directory.resolve(file), pem.getBytes(StandardCharsets.US_ASCII));
    }

    private static byte[] readPem(Path file) throws Exception {
        StringBuilder base64 = new StringBuilder();
        for (String line : Files.readAllLines(file, StandardCharsets.US_ASCII)) {
            if (!line.startsWith("-----")) base64.append(line);
        }
        return Base64.getDecoder().decode(base64.toString());
    }
}
