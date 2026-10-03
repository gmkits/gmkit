package cn.gmkit.sm2;

import cn.gmkit.core.Base64Codec;
import cn.gmkit.core.Bytes;
import cn.gmkit.core.HexCodec;

/**
 * SM2 密钥交换结果。
 * <p>
 * 同时封装共享密钥以及可选的 S1、S2 确认标签。
 */
public final class SM2KeyExchangeResult {

    private final byte[] key;
    private final byte[] s1;
    private final byte[] s2;

    /**
     * 创建一个密钥交换结果对象。
     *
     * @param key 协商出的共享密钥
     * @param s1  标准 S1（0x02）；由响应方 B 发送、发起方 A 在协议层验证
     * @param s2  标准 S2（0x03）；由发起方 A 发送、响应方 B 在协议层验证
     */
    public SM2KeyExchangeResult(byte[] key, byte[] s1, byte[] s2) {
        this.key = Bytes.clone(key);
        this.s1 = Bytes.clone(s1);
        this.s2 = Bytes.clone(s2);
    }

    /**
     * 获取共享密钥。
     *
     * @return 密钥字节数组的防御性拷贝
     */
    public byte[] key() {
        return Bytes.clone(key);
    }

    /**
     * 获取标准 S1（0x02）。
     *
     * @return S1 字节数组的防御性拷贝
     */
    public byte[] s1() {
        return Bytes.clone(s1);
    }

    /**
     * 获取标准 S2（0x03）。
     *
     * @return S2 字节数组的防御性拷贝
     */
    public byte[] s2() {
        return Bytes.clone(s2);
    }

    /**
     * 判断是否存在 S1。
     *
     * @return 存在 S1 时返回 {@code true}
     */
    public boolean hasS1() {
        return s1 != null && s1.length > 0;
    }

    /**
     * 判断是否存在 S2。
     *
     * @return 存在 S2 时返回 {@code true}
     */
    public boolean hasS2() {
        return s2 != null && s2.length > 0;
    }

    /**
     * 获取共享密钥的十六进制字符串。
     *
     * @return 十六进制共享密钥
     */
    public String keyHex() {
        return HexCodec.encode(key);
    }

    /**
     * 获取共享密钥的 Base64 字符串。
     *
     * @return Base64 共享密钥
     */
    public String keyBase64() {
        return Base64Codec.encode(key);
    }

    /**
     * 获取 S1 的十六进制字符串。
     *
     * @return S1 的十六进制表示；不存在时返回 {@code null}
     */
    public String s1Hex() {
        return hasS1() ? HexCodec.encode(s1) : null;
    }

    /**
     * 获取 S2 的十六进制字符串。
     *
     * @return S2 的十六进制表示；不存在时返回 {@code null}
     */
    public String s2Hex() {
        return hasS2() ? HexCodec.encode(s2) : null;
    }
}

