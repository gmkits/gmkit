package cn.gmkit.sm2;

import cn.gmkit.core.Bytes;
import cn.gmkit.core.GmkitException;
import cn.gmkit.core.HexCodec;
import cn.gmkit.core.Messages;
import cn.gmkit.core.SM2CipherMode;
import org.bouncycastle.asn1.*;
import org.bouncycastle.util.BigIntegers;

import java.io.IOException;
import java.math.BigInteger;
import java.util.Arrays;

/**
 * SM2 密文编码转换工具。
 * <p>
 * 负责在原始 C1/C2/C3 布局、GmSSL 兼容布局以及 ASN.1 DER 编码之间做转换。
 * 无点前缀的兼容布局以完整 C1 曲线点校验识别，不能仅按首字节判断。
 * 若带前缀和补前缀两种解释均为合法点，优先采用带前缀布局；转换本身不校验 C3。
 */
public final class SM2Ciphertexts {

    private SM2Ciphertexts() {
    }

    /**
     * 解析SM2密文数据
     *
     * @param ciphertext 密文字节数组
     * @param mode       密文排列模式
     * @return SM2密文对象
     * @throws GmkitException 如果密文格式无效
     */
    public static SM2Ciphertext parse(byte[] ciphertext, SM2CipherMode mode) {
        SM2CipherMode resolvedMode = SM2Domain.cipherMode(mode);
        byte[] normalizedCiphertext = normalizeRawCiphertext(ciphertext);
        if (normalizedCiphertext == null || normalizedCiphertext.length < SM2Domain.MIN_CIPHERTEXT_LENGTH) {
            throw new GmkitException(
                "Invalid SM2 ciphertext: expected raw C1||C3||C2 or C1||C2||C3 bytes, but length was "
                    + (normalizedCiphertext == null ? 0 : normalizedCiphertext.length));
        }
        int c1Length = SM2Domain.C1_LENGTH;
        int c3Length = SM2.SM3_DIGEST_LENGTH;
        if (normalizedCiphertext.length < c1Length + c3Length + 1) {
            throw new GmkitException(Messages.bilingual(
                "SM2 密文缺少 C1/C3/C2 片段",
                "Invalid SM2 ciphertext: missing C1/C3/C2 segments"));
        }
        byte[] c1 = Bytes.copyOfRange(normalizedCiphertext, 0, c1Length);
        // parse() 也是公开编码入口，应在解析阶段确认 C1 是曲线上的合法点。
        SM2KeyOps.toPublicKeyPoint(HexCodec.encode(c1));
        byte[] c2;
        byte[] c3;
        if (resolvedMode == SM2CipherMode.C1C3C2) {
            c3 = Bytes.copyOfRange(normalizedCiphertext, c1Length, c1Length + c3Length);
            c2 = Bytes.copyOfRange(normalizedCiphertext, c1Length + c3Length, normalizedCiphertext.length);
        } else {
            c2 = Bytes.copyOfRange(normalizedCiphertext, c1Length, normalizedCiphertext.length - c3Length);
            c3 = Bytes.copyOfRange(normalizedCiphertext, normalizedCiphertext.length - c3Length, normalizedCiphertext.length);
        }
        return new SM2Ciphertext(c1, c2, c3, resolvedMode);
    }

    /**
     * 将密文编码为DER格式
     *
     * @param ciphertext 原始密文字节数组
     * @param mode       密文排列模式
     * @return DER编码的密文
     * @throws GmkitException 如果编码失败
     */
    public static byte[] encodeDer(byte[] ciphertext, SM2CipherMode mode) {
        SM2CipherMode resolvedMode = SM2Domain.cipherMode(mode);
        SM2Ciphertext parsed = parse(ciphertext, resolvedMode);
        byte[] c1 = parsed.c1();
        byte[] c1x = Bytes.copyOfRange(c1, 1, 1 + SM2Domain.CURVE_LENGTH);
        byte[] c1y = Bytes.copyOfRange(c1, 1 + SM2Domain.CURVE_LENGTH, c1.length);

        ASN1EncodableVector vector = new ASN1EncodableVector();
        vector.add(new ASN1Integer(new BigInteger(1, c1x)));
        vector.add(new ASN1Integer(new BigInteger(1, c1y)));
        if (resolvedMode == SM2CipherMode.C1C3C2) {
            vector.add(new DEROctetString(parsed.c3()));
            vector.add(new DEROctetString(parsed.c2()));
        } else {
            vector.add(new DEROctetString(parsed.c2()));
            vector.add(new DEROctetString(parsed.c3()));
        }
        try {
            return new DERSequence(vector).getEncoded();
        } catch (IOException ex) {
            throw new GmkitException(Messages.bilingual(
                "SM2 密文编码为 ASN.1 DER 序列失败",
                "Failed to encode SM2 ciphertext as ASN.1 DER sequence"), ex);
        }
    }

    /**
     * 将原始密文编码为 ASN.1 DER 格式。
     *
     * @param ciphertext 原始密文字节数组
     * @param mode       密文排列模式
     * @return ASN.1 DER 编码密文
     */
    public static byte[] encodeAsn1(byte[] ciphertext, SM2CipherMode mode) {
        return encodeDer(ciphertext, mode);
    }

    /**
     * 将DER格式的密文解码为原始格式
     *
     * @param derCiphertext DER编码的密文
     * @param mode          密文排列模式
     * @return 原始格式的密文字节数组
     * @throws GmkitException 如果解码失败
     */
    public static byte[] decodeDer(byte[] derCiphertext, SM2CipherMode mode) {
        try {
            byte[] safeCiphertext = Bytes.requireNonNull(derCiphertext, "SM2 DER ciphertext");
            ASN1Primitive primitive = ASN1Primitive.fromByteArray(safeCiphertext);
            if (!(primitive instanceof ASN1Sequence)) {
                throw new GmkitException(Messages.bilingual(
                    "SM2 密文 ASN.1 DER 编码无效，根节点必须是 SEQUENCE",
                    "Invalid SM2 ciphertext ASN.1 DER encoding: root must be a SEQUENCE"));
            }
            // ASN1Primitive 会兼容读取 BER；对外声明 DER 的入口必须拒绝非规范编码。
            if (!Arrays.equals(safeCiphertext, primitive.getEncoded(ASN1Encoding.DER))) {
                throw new GmkitException(Messages.bilingual(
                    "SM2 密文不是规范 ASN.1 DER 编码",
                    "SM2 ciphertext is not canonical ASN.1 DER"));
            }
            ASN1Sequence sequence = (ASN1Sequence) primitive;
            if (sequence.size() != 4) {
                throw new GmkitException(Messages.bilingual(
                    "SM2 密文 ASN.1 DER 编码无效，应为包含 4 个元素的 SEQUENCE",
                    "Invalid SM2 ciphertext ASN.1 DER encoding: expected SEQUENCE of 4 elements"));
            }
            byte[] c1x = coordinateBytes(ASN1Integer.getInstance(sequence.getObjectAt(0)), "x");
            byte[] c1y = coordinateBytes(ASN1Integer.getInstance(sequence.getObjectAt(1)), "y");
            byte[] first = ASN1OctetString.getInstance(sequence.getObjectAt(2)).getOctets();
            byte[] second = ASN1OctetString.getInstance(sequence.getObjectAt(3)).getOctets();

            byte[] c1 = Bytes.concat(new byte[]{0x04}, c1x, c1y);
            SM2KeyOps.toPublicKeyPoint(HexCodec.encode(c1));
            SM2CipherMode resolvedMode = SM2Domain.cipherMode(mode);
            byte[] c2 = resolvedMode == SM2CipherMode.C1C3C2 ? second : first;
            byte[] c3 = resolvedMode == SM2CipherMode.C1C3C2 ? first : second;
            if (c3.length != SM2.SM3_DIGEST_LENGTH) {
                throw new GmkitException(Messages.bilingual(
                    "SM2 密文 C3 必须为 32 字节",
                    "SM2 ciphertext C3 must be 32 bytes"));
            }
            Bytes.requireNonEmpty(c2, "SM2 ciphertext C2");
            return Bytes.concat(c1, first, second);
        } catch (IOException | IllegalArgumentException ex) {
            throw new GmkitException(Messages.bilingual("SM2 密文 ASN.1 DER 编码无效", "Invalid SM2 ciphertext ASN.1 DER encoding"), ex);
        }
    }

    private static byte[] coordinateBytes(ASN1Integer integer, String label) {
        BigInteger value = integer.getValue();
        if (value.signum() < 0 || value.bitLength() > SM2Domain.CURVE_LENGTH * 8) {
            throw new GmkitException(Messages.bilingual(
                "SM2 密文 " + label + " 坐标必须是 256 位以内的非负整数",
                "SM2 ciphertext " + label + " coordinate must be a non-negative integer up to 256 bits"));
        }
        return BigIntegers.asUnsignedByteArray(SM2Domain.CURVE_LENGTH, value);
    }

    /**
     * 将 ASN.1 DER 密文解码为原始 SM2 密文。
     *
     * @param asn1Ciphertext ASN.1 DER 编码密文
     * @param mode           密文排列模式
     * @return 原始 SM2 密文
     */
    public static byte[] decodeAsn1(byte[] asn1Ciphertext, SM2CipherMode mode) {
        return decodeDer(asn1Ciphertext, mode);
    }

    /**
     * 自动识别原始密文和 ASN.1 DER 密文。
     *
     * @param ciphertext 密文字节数组
     * @param mode       密文排列模式
     * @return 原始 SM2 密文
     */
    public static byte[] decodeAuto(byte[] ciphertext, SM2CipherMode mode) {
        if (shouldDecodeAsn1(ciphertext)) {
            return decodeDer(ciphertext, mode);
        }
        return normalizeRawCiphertext(ciphertext);
    }

    static byte[] normalizeForDecrypt(byte[] ciphertext, SM2CipherMode mode) {
        byte[] safeCiphertext = Bytes.requireNonNull(ciphertext, "SM2 ciphertext");
        if (shouldDecodeAsn1(safeCiphertext)) {
            return decodeDer(safeCiphertext, mode);
        }
        return normalizeRawCiphertext(safeCiphertext);
    }

    static boolean looksLikeAsn1(byte[] ciphertext) {
        if (ciphertext == null || ciphertext.length <= 2 || ciphertext[0] != 0x30) {
            return false;
        }
        try {
            ASN1Primitive primitive = ASN1Primitive.fromByteArray(ciphertext);
            if (!(primitive instanceof ASN1Sequence)) {
                return false;
            }
            ASN1Sequence sequence = (ASN1Sequence) primitive;
            if (sequence.size() != 4) {
                return false;
            }
            ASN1Integer.getInstance(sequence.getObjectAt(0));
            ASN1Integer.getInstance(sequence.getObjectAt(1));
            ASN1OctetString.getInstance(sequence.getObjectAt(2));
            ASN1OctetString.getInstance(sequence.getObjectAt(3));
            return true;
        } catch (IOException ex) {
            return false;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static boolean shouldDecodeAsn1(byte[] ciphertext) {
        return looksLikeAsn1(ciphertext)
            || (ciphertext != null
            && ciphertext.length > 0
            && ciphertext[0] == 0x30
            && ciphertext.length < SM2Domain.MIN_CIPHERTEXT_LENGTH);
    }

    private static byte[] normalizeRawCiphertext(byte[] ciphertext) {
        if (ciphertext == null) {
            throw new GmkitException(Messages.nullValue("SM2 ciphertext"));
        }
        if (ciphertext.length < SM2Domain.MIN_CIPHERTEXT_LENGTH) {
            byte[] prefixed = tryAddMissingPointPrefix(ciphertext);
            if (prefixed != null) {
                return prefixed;
            }
            throw new GmkitException(Messages.bilingual(
                "SM2 密文长度无效，应为原始 C1||C3||C2 或 C1||C2||C3 格式，当前长度为 " + ciphertext.length + " 字节",
                "Invalid SM2 ciphertext: expected raw C1||C3||C2 or C1||C2||C3 bytes, but length was " + ciphertext.length));
        }
        // 无前缀密文的 X 坐标也可能以 04 开头，必须校验完整 C1，不能只看首字节。
        // 有前缀且点合法时优先保留原布局；解密仍由 BC 校验 C3，不放宽认证。
        if (!hasValidUncompressedC1(ciphertext)) {
            byte[] prefixed = tryAddMissingPointPrefix(ciphertext);
            if (prefixed != null) {
                return prefixed;
            }
            throw new GmkitException(Messages.bilingual(
                "SM2 原始密文必须以未压缩点前缀 0x04 开头；仅当可以恢复 C1 点时，才兼容不带此前缀的 GmSSL 风格密文",
                "Invalid SM2 ciphertext: raw format must start with uncompressed point prefix 0x04; GmSSL-style ciphertext without the prefix is accepted only when the C1 point can be recovered"));
        }
        return ciphertext;
    }

    private static byte[] tryAddMissingPointPrefix(byte[] ciphertext) {
        if (ciphertext == null || ciphertext.length < SM2Domain.MIN_CIPHERTEXT_LENGTH - 1) {
            return null;
        }
        byte[] candidate = Bytes.concat(new byte[]{0x04}, ciphertext);
        return hasValidUncompressedC1(candidate) ? candidate : null;
    }

    private static boolean hasValidUncompressedC1(byte[] ciphertext) {
        if (ciphertext.length < SM2Domain.C1_LENGTH || ciphertext[0] != 0x04) {
            return false;
        }
        try {
            SM2Domain.X9_PARAMETERS.getCurve().decodePoint(Bytes.copyOfRange(ciphertext, 0, SM2Domain.C1_LENGTH)).normalize();
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
