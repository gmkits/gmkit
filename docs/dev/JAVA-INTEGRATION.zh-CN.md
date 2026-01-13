---
title: Java 对接指南
icon: plug
order: 3
author: mumu
date: 2025-11-23
category:
  - 开发指南
  - 集成
tag:
  - Java
  - Hutool
  - Bouncy Castle
  - Kona
  - 对接其他语言
---

# Java 对接指南

本页聚焦 Java 端与 gmkitx 的互通，提供四种集成方案：

1. **Hutool + Bouncy Castle** - 推荐方案，需要引入 BC 依赖
2. **直接使用 Bouncy Castle** - 底层实现，更灵活
3. **Tencent Kona SM Suite** - JCA 标准提供者，纯 Java 实现
4. **gmkit-java** - 原生 Java 实现（敬请期待）

## 依赖配置

### 方案一：Hutool（推荐）

::: tip 注意
Hutool 的国密算法实现依赖 Bouncy Castle 库，必须同时引入 BC 依赖。
:::

```xml
<!-- Maven -->
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-crypto</artifactId>
    <version>5.8.23</version>
</dependency>
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk15to18</artifactId>
    <version>1.70</version>
</dependency>
```

```gradle
// Gradle
implementation 'cn.hutool:hutool-crypto:5.8.23'
implementation 'org.bouncycastle:bcprov-jdk15to18:1.70'
```

### 方案二：Bouncy Castle

```xml
<!-- Maven -->
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk15to18</artifactId>
    <version>1.70</version>
</dependency>
```

```gradle
// Gradle
implementation 'org.bouncycastle:bcprov-jdk15to18:1.70'
```

### 方案三：Tencent Kona SM Suite

Tencent Kona SM Suite 基于 JCA 标准提供者实现 SM2/SM3/SM4，适合希望遵循 JDK 原生 API 的场景。

```xml
<!-- Maven -->
<dependency>
    <groupId>com.tencent.kona</groupId>
    <artifactId>kona-crypto</artifactId>
    <version>1.0.19</version>
</dependency>
<dependency>
    <groupId>com.tencent.kona</groupId>
    <artifactId>kona-provider</artifactId>
    <version>1.0.19</version>
</dependency>
```

```gradle
// Gradle
implementation 'com.tencent.kona:kona-crypto:1.0.19'
implementation 'com.tencent.kona:kona-provider:1.0.19'
```

::: tip 说明
仅需 SM2/SM3/SM4 时引入 `kona-crypto` 即可；若需要一站式 Provider，可额外引入 `kona-provider`。
:::

### 方案四：gmkit-java

::: info 开发中
gmkit-java 是纯 Java 实现的国密算法库，不依赖第三方库。敬请期待！
:::

```xml
<!-- 即将发布 -->
<dependency>
    <groupId>com.cherryrum</groupId>
    <artifactId>gmkit-java</artifactId>
    <version>1.0.0</version>
</dependency>
```

## 数据要点

| 项目       | 约定                      | 备注                             |
|----------|-------------------------|--------------------------------|
| SM2 公钥   | 非压缩 04+X+Y（130 hex）     | 保持与 Java 侧一致                   |
| SM2 私钥   | 64 hex                  | 参见 `defaults.sm2PrivateKeyHex` |
| SM2 密文模式 | C1C3C2（默认）、C1C2C3       | 两端一致                           |
| SM4 密钥   | 32 hex（128bit）          |                                |
| SM4 填充   | PKCS7/PKCS5，或 NONE/ZERO | 流模式不填充                         |
| 传输编码     | UTF-8 + 小写 hex          |                                |

## 模式与填充详解

### SM2 密文模式

SM2 加密后的密文由三部分组成：
- **C1**：椭圆曲线点（65字节，非压缩格式）
- **C2**：密文数据（与明文等长）
- **C3**：摘要值（32字节，SM3哈希）

两种排列模式：
- **C1C3C2**：gmkitx 默认模式，国密标准推荐格式
- **C1C2C3**：部分旧版实现使用，需显式指定

::: warning 重要
对接时必须确保双方使用相同的密文模式，否则无法正确解密！
:::

::: tip Kona 说明
Tencent Kona 的 SM2 `Cipher` 输出 ASN.1 DER（C1C3C2），gmkitx 解密时可自动识别 0x30 开头的 ASN.1 格式。
:::

### SM4 填充模式

SM4 是分组密码，块大小为 16 字节。当明文长度不是 16 的倍数时需要填充：

- **PKCS7/PKCS5**：标准填充，自动添加 1-16 字节填充数据，每个字节值为填充长度
  - 示例：明文 11 字节，填充 5 个 0x05
- **ZERO**：补零填充，填充 0x00 直到块大小
  - 注意：解密后需手动去除尾部零
- **NONE**：无填充，仅用于 CTR/OFB/CFB 等流模式，或明文已对齐 16 字节

::: tip 推荐
ECB/CBC 模式推荐使用 PKCS7 填充，可自动处理任意长度明文。
:::

## SM2 对接

::: code-tabs#sm2

@tab gmkitx
```typescript
import { sm2Encrypt, sm2Decrypt, sign, verify, SM2CipherMode } from 'gmkitx';

// 使用测试向量中的密钥
const publicKey = '04a09455a450af78e7bc6b2f8c7f1e0e...'; // 完整的04开头公钥
const privateKey = '228049e009de869baf9aba74f8f8c52e...'; // 64位十六进制私钥

// 加密 - C1C3C2 模式（默认）
const plaintext = 'Hello, SM2!';
const ciphertext = sm2Encrypt(publicKey, plaintext, SM2CipherMode.C1C3C2);
console.log('密文:', ciphertext);

// 解密
const decrypted = sm2Decrypt(privateKey, ciphertext, SM2CipherMode.C1C3C2);
console.log('明文:', decrypted); // 'Hello, SM2!'

// 签名
const message = 'Important message';
const signature = sign(privateKey, message);
console.log('签名:', signature);

// 验签
const isValid = verify(publicKey, message, signature);
console.log('验签结果:', isValid); // true
```

@tab Hutool
```java
import cn.hutool.core.util.HexUtil;
import cn.hutool.crypto.SmUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bouncycastle.crypto.engines.SM2Engine;
import java.nio.file.Paths;
import java.util.Map;

record Case(String id, String algo, String op, String mode,
            String input, String publicKeyHex, String privateKeyHex,
            Map<String, String> expected) {}

public class SM2Interop {
  public static void main(String[] args) throws Exception {
    var mapper = new ObjectMapper();
    var root = mapper.readTree(Paths.get("test/vectors/interop.json").toFile());
    var defaults = root.get("defaults");

    for (var node : root.get("cases")) {
      var c = mapper.convertValue(node, Case.class);
      if (!"SM2".equals(c.algo())) continue;

      var pri = HexUtil.decodeHex(c.privateKeyHex() != null ? c.privateKeyHex() : defaults.get("sm2PrivateKeyHex").asText());
      var pub = HexUtil.decodeHex(c.publicKeyHex() != null ? c.publicKeyHex() : defaults.get("sm2PublicKeyHex").asText());
      // Hutool 基于 Bouncy Castle，密钥使用 16 进制原始格式即可
      var sm2 = SmUtil.sm2(pri, pub);

      if ("encrypt".equals(c.op())) {
        var mode = "C1C2C3".equals(c.mode()) ? SM2Engine.Mode.C1C2C3 : SM2Engine.Mode.C1C3C2;
        sm2.setMode(mode);
        var cipher = sm2.encryptHex(c.input());
        var back = sm2.decryptStr(cipher);
        assert back.equals(c.input()) : c.id();
      } else if ("sign".equals(c.op())) {
        // 默认 userId = 1234567812345678，与 gmkitx 一致
        var sig = sm2.signHex(c.input());
        assert sm2.verifyHex(c.input(), sig) : c.id();
      }
    }
  }
}
```

@tab Tencent Kona
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tencent.kona.crypto.KonaCryptoProvider;
import com.tencent.kona.crypto.spec.SM2PrivateKeySpec;
import com.tencent.kona.crypto.spec.SM2PublicKeySpec;
import com.tencent.kona.crypto.spec.SM2SignatureParameterSpec;

import javax.crypto.Cipher;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.Security;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;

record Case(String id, String algo, String op, String mode,
            String input, String publicKeyHex, String privateKeyHex) {}

public class SM2KonaInterop {
  static {
    Security.addProvider(new KonaCryptoProvider());
  }

  private static byte[] hexToBytes(String hex) {
    int len = hex.length();
    byte[] out = new byte[len / 2];
    for (int i = 0; i < len; i += 2) {
      out[i / 2] = (byte) Integer.parseInt(hex.substring(i, i + 2), 16);
    }
    return out;
  }

  public static void main(String[] args) throws Exception {
    var mapper = new ObjectMapper();
    var root = mapper.readTree(Paths.get("test/vectors/interop.json").toFile());
    var defaults = root.get("defaults");
    var kf = KeyFactory.getInstance("SM2", "KonaCrypto");

    for (var node : root.get("cases")) {
      if (!"SM2".equals(node.get("algo").asText())) continue;
      var c = mapper.convertValue(node, Case.class);
      var priHex = c.privateKeyHex() != null ? c.privateKeyHex() : defaults.get("sm2PrivateKeyHex").asText();
      var pubHex = c.publicKeyHex() != null ? c.publicKeyHex() : defaults.get("sm2PublicKeyHex").asText();

      var privateKey = kf.generatePrivate(new SM2PrivateKeySpec(hexToBytes(priHex)));
      var publicKey = (ECPublicKey) kf.generatePublic(new SM2PublicKeySpec(hexToBytes(pubHex)));

      if ("encrypt".equals(c.op())) {
        var cipher = Cipher.getInstance("SM2", "KonaCrypto");
        cipher.init(Cipher.ENCRYPT_MODE, publicKey);
        var cipherBytes = cipher.doFinal(c.input().getBytes(StandardCharsets.UTF_8));

        // Kona 输出 ASN.1 DER（C1C3C2），gmkitx 可自动识别
        var decrypt = Cipher.getInstance("SM2", "KonaCrypto");
        decrypt.init(Cipher.DECRYPT_MODE, privateKey);
        var plain = decrypt.doFinal(cipherBytes);
        assert new String(plain, StandardCharsets.UTF_8).equals(c.input()) : c.id();
      } else if ("sign".equals(c.op())) {
        var signer = Signature.getInstance("SM2", "KonaCrypto");
        signer.setParameter(new SM2SignatureParameterSpec(publicKey));
        signer.initSign(privateKey);
        var msg = c.input().getBytes(StandardCharsets.UTF_8);
        signer.update(msg);
        var sig = signer.sign();

        var verifier = Signature.getInstance("SM2", "KonaCrypto");
        verifier.setParameter(new SM2SignatureParameterSpec(publicKey));
        verifier.initVerify(publicKey);
        verifier.update(msg);
        assert verifier.verify(sig) : c.id();
      }
    }
  }
}
```

@tab Bouncy Castle
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bouncycastle.asn1.gm.GMNamedCurves;
import org.bouncycastle.crypto.digests.SM3Digest;
import org.bouncycastle.crypto.engines.SM2Engine;
import org.bouncycastle.crypto.params.*;
import org.bouncycastle.crypto.signers.SM2Signer;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.math.ec.ECPoint;
import org.bouncycastle.util.encoders.Hex;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.security.Security;

record Case(String id, String algo, String op, String mode,
            String input, String publicKeyHex, String privateKeyHex) {}

public class SM2BCInterop {
  static {
    Security.addProvider(new BouncyCastleProvider());
  }

  private static final byte[] DEFAULT_ID = "1234567812345678".getBytes(StandardCharsets.UTF_8);

  public static void main(String[] args) throws Exception {
    var mapper = new ObjectMapper();
    var root = mapper.readTree(Paths.get("test/vectors/interop.json").toFile());
    var defaults = root.get("defaults");
    var curve = GMNamedCurves.getByName("sm2p256v1");
    var domain = new ECDomainParameters(curve.getCurve(), curve.getG(), curve.getN());

    for (var node : root.get("cases")) {
      if (!"SM2".equals(node.get("algo").asText())) continue;
      var c = mapper.convertValue(node, Case.class);
      var priHex = c.privateKeyHex() != null ? c.privateKeyHex() : defaults.get("sm2PrivateKeyHex").asText();
      var pubHex = c.publicKeyHex() != null ? c.publicKeyHex() : defaults.get("sm2PublicKeyHex").asText();

      // 构造公私钥参数（原始 16 进制格式）
      var d = new BigInteger(1, Hex.decode(priHex));
      var privParams = new ECPrivateKeyParameters(d, domain);
      ECPoint q = curve.getCurve().decodePoint(Hex.decode(pubHex));
      var pubParams = new ECPublicKeyParameters(q, domain);

      if ("encrypt".equals(c.op())) {
        var mode = "C1C2C3".equals(c.mode()) ? SM2Engine.Mode.C1C2C3 : SM2Engine.Mode.C1C3C2;
        var engine = new SM2Engine(mode);
        engine.init(true, new ParametersWithRandom(pubParams));
        var input = c.input().getBytes(StandardCharsets.UTF_8);
        var cipher = engine.processBlock(input, 0, input.length);

        var decrypt = new SM2Engine(mode);
        decrypt.init(false, privParams);
        var plain = decrypt.processBlock(cipher, 0, cipher.length);
        assert new String(plain, StandardCharsets.UTF_8).equals(c.input()) : c.id();
      } else if ("sign".equals(c.op())) {
        // SM2 签名（默认 userId = 1234567812345678）
        var signer = new SM2Signer(new SM3Digest());
        signer.init(true, new ParametersWithID(new ParametersWithRandom(privParams), DEFAULT_ID));
        var msg = c.input().getBytes(StandardCharsets.UTF_8);
        signer.update(msg, 0, msg.length);
        var sig = signer.generateSignature();

        var verifier = new SM2Signer(new SM3Digest());
        verifier.init(false, new ParametersWithID(pubParams, DEFAULT_ID));
        verifier.update(msg, 0, msg.length);
        assert verifier.verifySignature(sig) : c.id();
      }
    }
  }
}
```
:::

## SM3 对接

::: code-tabs#sm3

@tab gmkitx
```typescript
import { digest, hmac } from 'gmkitx';

// 计算 SM3 摘要
const hash = digest('Hello, SM3!');
console.log('SM3摘要:', hash);
// 输出: 32字节（64位十六进制）哈希值

// HMAC-SM3
const mac = hmac('secret-key', 'message');
console.log('HMAC-SM3:', mac);

// 增量哈希
import { SM3 } from 'gmkitx';
const sm3 = new SM3();
sm3.update('Hello, ');
sm3.update('World!');
const result = sm3.digest();
console.log('增量哈希:', result);
```

@tab Hutool
```java
import cn.hutool.crypto.SmUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Paths;

public class SM3Interop {
  public static void main(String[] args) throws Exception {
    var root = new ObjectMapper().readTree(Paths.get("test/vectors/interop.json").toFile());
    for (var node : root.get("cases")) {
      if (!"SM3".equals(node.get("algo").asText())) continue;
      // 每次重新创建 SM3 实例，避免状态串扰
      var sm3 = SmUtil.sm3();
      var expected = node.get("expected").get("hex").asText();
      var out = sm3.digestHex(node.get("input").asText());
      assert out.equals(expected) : node.get("id").asText();
    }
  }
}
```

@tab Tencent Kona
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tencent.kona.crypto.KonaCryptoProvider;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.Security;

public class SM3KonaInterop {
  static {
    Security.addProvider(new KonaCryptoProvider());
  }

  private static String toHex(byte[] input) {
    var sb = new StringBuilder(input.length * 2);
    for (byte b : input) {
      sb.append(String.format("%02x", b));
    }
    return sb.toString();
  }

  public static void main(String[] args) throws Exception {
    var root = new ObjectMapper().readTree(Paths.get("test/vectors/interop.json").toFile());
    for (var node : root.get("cases")) {
      if (!"SM3".equals(node.get("algo").asText())) continue;
      var expected = node.get("expected").get("hex").asText();
      var input = node.get("input").asText().getBytes(StandardCharsets.UTF_8);

      // 通过 JCA 调用 KonaCrypto 的 SM3 实现
      var md = MessageDigest.getInstance("SM3", "KonaCrypto");
      var out = md.digest(input);
      assert toHex(out).equals(expected) : node.get("id").asText();
    }
  }
}
```

@tab Bouncy Castle
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bouncycastle.crypto.digests.SM3Digest;
import org.bouncycastle.util.encoders.Hex;
import java.nio.file.Paths;

public class SM3BCInterop {
  public static void main(String[] args) throws Exception {
    var root = new ObjectMapper().readTree(Paths.get("test/vectors/interop.json").toFile());
    for (var node : root.get("cases")) {
      if (!"SM3".equals(node.get("algo").asText())) continue;
      var expected = node.get("expected").get("hex").asText();
      var input = node.get("input").asText().getBytes(java.nio.charset.StandardCharsets.UTF_8);
      // BC 直接使用 SM3Digest
      var d = new SM3Digest();
      d.update(input, 0, input.length);
      byte[] out = new byte[d.getDigestSize()];
      d.doFinal(out, 0);
      assert Hex.toHexString(out).equals(expected) : node.get("id").asText();
    }
  }
}
```
:::

## SM4 对接

::: code-tabs#sm4

@tab gmkitx
```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode, PaddingMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210'; // 32位十六进制（16字节）
const iv = 'fedcba98765432100123456789abcdef';   // CBC模式需要IV
const plaintext = 'Hello, SM4!';

// ECB 模式 + PKCS7 填充
const cipherECB = sm4Encrypt(key, plaintext, {
  mode: CipherMode.ECB,
  padding: PaddingMode.PKCS7
});
console.log('ECB密文:', cipherECB);

const plainECB = sm4Decrypt(key, cipherECB, {
  mode: CipherMode.ECB,
  padding: PaddingMode.PKCS7
});
console.log('ECB明文:', plainECB);

// CBC 模式 + PKCS7 填充
const cipherCBC = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv
});
console.log('CBC密文:', cipherCBC);

const plainCBC = sm4Decrypt(key, cipherCBC, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv
});
console.log('CBC明文:', plainCBC);

// 面向对象 API
import { SM4 } from 'gmkitx';
const sm4ecb = SM4.ECB(key);
const encrypted = sm4ecb.encrypt('Hello, SM4 OOP!');
const decrypted = sm4ecb.decrypt(encrypted);
```

@tab Hutool
```java
import cn.hutool.core.util.HexUtil;
import cn.hutool.crypto.Mode;
import cn.hutool.crypto.Padding;
import cn.hutool.crypto.symmetric.SymmetricAlgorithm;
import cn.hutool.crypto.symmetric.SymmetricCrypto;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Paths;

public class SM4Interop {
  public static void main(String[] args) throws Exception {
    var mapper = new ObjectMapper();
    var root = mapper.readTree(Paths.get("test/vectors/interop.json").toFile());
    for (var node : root.get("cases")) {
      if (!"SM4".equals(node.get("algo").asText())) continue;

      var key = HexUtil.decodeHex(node.has("keyHex") ? node.get("keyHex").asText() : root.get("defaults").get("sm4KeyHex").asText());
      var iv = node.has("ivHex") ? HexUtil.decodeHex(node.get("ivHex").asText()) : null;
      var mode = Mode.valueOf(node.get("mode").asText());
      // Hutool 使用 PKCS5Padding 表示 PKCS7（块大小 16）
      var padding = node.get("padding").asText().equals("PKCS7") ? Padding.PKCS5Padding : Padding.valueOf(node.get("padding").asText());

      // ECB 不需要 IV，CBC 需要 IV
      var sm4 = new SymmetricCrypto(mode, padding, SymmetricAlgorithm.SM4.getValue(), key, iv);
      var cipher = sm4.encryptHex(node.get("input").asText());
      if (node.get("expected").has("cipherHex")) {
        assert cipher.equals(node.get("expected").get("cipherHex").asText()) : node.get("id").asText();
      }
      var plain = sm4.decryptStr(cipher);
      assert plain.equals(node.get("input").asText()) : node.get("id").asText() + "-decrypt";
    }
  }
}
```

@tab Tencent Kona
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tencent.kona.crypto.KonaCryptoProvider;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.security.Security;

public class SM4KonaInterop {
  static {
    Security.addProvider(new KonaCryptoProvider());
  }

  private static byte[] hexToBytes(String hex) {
    int len = hex.length();
    byte[] out = new byte[len / 2];
    for (int i = 0; i < len; i += 2) {
      out[i / 2] = (byte) Integer.parseInt(hex.substring(i, i + 2), 16);
    }
    return out;
  }

  private static String toHex(byte[] input) {
    var sb = new StringBuilder(input.length * 2);
    for (byte b : input) {
      sb.append(String.format("%02x", b));
    }
    return sb.toString();
  }

  public static void main(String[] args) throws Exception {
    var root = new ObjectMapper().readTree(Paths.get("test/vectors/interop.json").toFile());
    for (var node : root.get("cases")) {
      if (!"SM4".equals(node.get("algo").asText())) continue;
      var mode = node.get("mode").asText();
      var padding = node.get("padding").asText();

      var key = hexToBytes(node.has("keyHex") ? node.get("keyHex").asText() : root.get("defaults").get("sm4KeyHex").asText());
      var iv = node.has("ivHex") ? hexToBytes(node.get("ivHex").asText()) : null;
      var transformation = "SM4/" + mode + "/" + (padding.equals("PKCS7") ? "PKCS7Padding" : "NoPadding");
      var keySpec = new SecretKeySpec(key, "SM4");

      // 加密
      var encrypt = Cipher.getInstance(transformation, "KonaCrypto");
      if ("CBC".equals(mode)) {
        encrypt.init(Cipher.ENCRYPT_MODE, keySpec, new IvParameterSpec(iv));
      } else {
        encrypt.init(Cipher.ENCRYPT_MODE, keySpec);
      }
      var cipherBytes = encrypt.doFinal(node.get("input").asText().getBytes(StandardCharsets.UTF_8));
      if (node.get("expected").has("cipherHex")) {
        assert toHex(cipherBytes).equals(node.get("expected").get("cipherHex").asText()) : node.get("id").asText();
      }

      // 解密
      var decrypt = Cipher.getInstance(transformation, "KonaCrypto");
      if ("CBC".equals(mode)) {
        decrypt.init(Cipher.DECRYPT_MODE, keySpec, new IvParameterSpec(iv));
      } else {
        decrypt.init(Cipher.DECRYPT_MODE, keySpec);
      }
      var plain = decrypt.doFinal(cipherBytes);
      assert new String(plain, StandardCharsets.UTF_8).equals(node.get("input").asText()) : node.get("id").asText() + "-decrypt";
    }
  }
}
```

@tab Bouncy Castle
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bouncycastle.crypto.BufferedBlockCipher;
import org.bouncycastle.crypto.engines.SM4Engine;
import org.bouncycastle.crypto.modes.CBCBlockCipher;
import org.bouncycastle.crypto.paddings.PaddedBufferedBlockCipher;
import org.bouncycastle.crypto.params.KeyParameter;
import org.bouncycastle.crypto.params.ParametersWithIV;
import org.bouncycastle.util.encoders.Hex;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;

public class SM4BCInterop {
  private static byte[] run(BufferedBlockCipher cipher, byte[] input) throws Exception {
    byte[] buf = new byte[cipher.getOutputSize(input.length)];
    int len = cipher.processBytes(input, 0, input.length, buf, 0);
    len += cipher.doFinal(buf, len);
    byte[] out = new byte[len];
    System.arraycopy(buf, 0, out, 0, len);
    return out;
  }

  public static void main(String[] args) throws Exception {
    var root = new ObjectMapper().readTree(Paths.get("test/vectors/interop.json").toFile());
    for (var node : root.get("cases")) {
      if (!"SM4".equals(node.get("algo").asText())) continue;
      var key = Hex.decode(node.has("keyHex") ? node.get("keyHex").asText() : root.get("defaults").get("sm4KeyHex").asText());
      var iv = node.has("ivHex") ? Hex.decode(node.get("ivHex").asText()) : null;

      // PaddedBufferedBlockCipher 默认使用 PKCS7Padding
      BufferedBlockCipher enc;
      if (iv != null) {
        enc = new PaddedBufferedBlockCipher(new CBCBlockCipher(new SM4Engine()));
        enc.init(true, new ParametersWithIV(new KeyParameter(key), iv));
      } else {
        enc = new PaddedBufferedBlockCipher(new SM4Engine());
        enc.init(true, new KeyParameter(key));
      }
      var cipher = run(enc, node.get("input").asText().getBytes(StandardCharsets.UTF_8));

      if (node.get("expected").has("cipherHex")) {
        assert Hex.toHexString(cipher).equals(node.get("expected").get("cipherHex").asText()) : node.get("id").asText();
      }

      BufferedBlockCipher dec;
      if (iv != null) {
        dec = new PaddedBufferedBlockCipher(new CBCBlockCipher(new SM4Engine()));
        dec.init(false, new ParametersWithIV(new KeyParameter(key), iv));
      } else {
        dec = new PaddedBufferedBlockCipher(new SM4Engine());
        dec.init(false, new KeyParameter(key));
      }
      var plain = run(dec, cipher);
      assert new String(plain, StandardCharsets.UTF_8).equals(node.get("input").asText()) : node.get("id").asText() + "-decrypt";
    }
  }
}
```
:::

## 扩展指引

- 本页展示 Java 与 gmkitx 的对接方案；其他语言对接请参考对应的语言指南。
- 所有语言对接均使用统一的测试向量 `test/vectors/interop.json`，确保跨语言互操作性。
- 如需切换 Java 库，保持密钥/IV/模式/编码约定不变，替换代码即可。
- 扩展 CTR/OFB/CFB/GCM 或固定随机源的 SM2 用例时，先确认计数器/AAD/随机策略一致，再写入测试向量并在备注中标明。 
