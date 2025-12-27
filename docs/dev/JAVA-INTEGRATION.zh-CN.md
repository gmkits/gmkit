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
  - 对接其他语言
---

# Java 对接指南

本页聚焦 Java 端与 gmkitx 的互通，提供三种集成方案：

1. **Hutool + Bouncy Castle** - 推荐方案，需要引入 BC 依赖
2. **直接使用 Bouncy Castle** - 底层实现，更灵活
3. **gmkit-java** - 原生 Java 实现（敬请期待）

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
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.70</version>
</dependency>
```

```gradle
// Gradle
implementation 'cn.hutool:hutool-crypto:5.8.23'
implementation 'org.bouncycastle:bcprov-jdk15on:1.70'
```

### 方案二：Bouncy Castle

```xml
<!-- Maven -->
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.70</version>
</dependency>
```

```gradle
// Gradle
implementation 'org.bouncycastle:bcprov-jdk15on:1.70'
```

### 方案三：gmkit-java

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

## SM2 对接

::: code-tabs#sm2
@tab Hutool
```java
import cn.hutool.core.util.HexUtil;
import cn.hutool.crypto.SmUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
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
      var sm2 = SmUtil.sm2(pri, pub);

      if ("encrypt".equals(c.op())) {
        var mode = "C1C2C3".equals(c.mode()) ? SmUtil.SM2EngineMode.C1C2C3 : SmUtil.SM2EngineMode.C1C3C2;
        var cipher = sm2.encryptHex(c.input(), mode);
        var back = sm2.decryptStr(cipher, mode);
        assert back.equals(c.input()) : c.id();
      } else if ("sign".equals(c.op())) {
        var sig = sm2.signHex(c.input());
        assert sm2.verifyHex(c.input(), sig) : c.id();
      }
    }
  }
}
```

@tab Bouncy Castle
```java
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bouncycastle.asn1.gm.GMNamedCurves;
import org.bouncycastle.crypto.engines.SM2Engine;
import org.bouncycastle.crypto.params.*;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.math.ec.ECPoint;
import org.bouncycastle.util.encoders.Hex;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.Security;
import java.security.spec.ECPrivateKeySpec;
import java.util.Map;

record Case(String id, String algo, String op, String mode,
            String input, String publicKeyHex, String privateKeyHex) {}

public class SM2BCInterop {
  static {
    Security.addProvider(new BouncyCastleProvider());
  }

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

      var d = curve.getN().subtract(Hex.decodeToBigInteger(priHex)); // use positive scalar
      var privParams = new ECPrivateKeyParameters(d, domain);
      KeyFactory kf = KeyFactory.getInstance("EC", "BC");
      var privSpec = new ECPrivateKeySpec(d, curve);

      ECPoint q = curve.getCurve().decodePoint(Hex.decode(pubHex));
      var pubParams = new ECPublicKeyParameters(q, domain);

      if ("encrypt".equals(c.op())) {
        var engine = new SM2Engine(c.mode().equals("C1C2C3") ? SM2Engine.Mode.C1C2C3 : SM2Engine.Mode.C1C3C2);
        engine.init(true, new ParametersWithRandom(pubParams));
        var cipher = engine.processBlock(c.input().getBytes(StandardCharsets.UTF_8), 0, c.input().getBytes(StandardCharsets.UTF_8).length);

        var decrypt = new SM2Engine(c.mode().equals("C1C2C3") ? SM2Engine.Mode.C1C2C3 : SM2Engine.Mode.C1C3C2);
        decrypt.init(false, privParams);
        var plain = decrypt.processBlock(cipher, 0, cipher.length);
        assert new String(plain, StandardCharsets.UTF_8).equals(c.input()) : c.id();
      } else if ("sign".equals(c.op())) {
        // BC SM2 signer示例可根据需要扩展；此处以验签流程为主，仍建议用 Hutool 快速签名。
      }
    }
  }
}
```
:::

## SM3 对接

::: code-tabs#sm3
@tab Hutool
```java
import cn.hutool.crypto.SmUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Paths;

public class SM3Interop {
  public static void main(String[] args) throws Exception {
    var root = new ObjectMapper().readTree(Paths.get("test/vectors/interop.json").toFile());
    var sm3 = SmUtil.sm3();
    for (var node : root.get("cases")) {
      if (!"SM3".equals(node.get("algo").asText())) continue;
      var expected = node.get("expected").get("hex").asText();
      var out = sm3.digestHex(node.get("input").asText());
      assert out.equals(expected) : node.get("id").asText();
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
      var padding = node.get("padding").asText().equals("PKCS7") ? Padding.PKCS5Padding : Padding.valueOf(node.get("padding").asText());

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

- 本页仅 Java；其他语言请创建独立指南，沿用 `test/vectors/interop.json`。
- 如需切换 Java 库，保持密钥/IV/模式/编码约定不变，替换代码即可。
- 拓展 CTR/OFB/CFB/GCM 或固定随机源的 SM2 用例时，先确认计数器/AAD/随机策略一致，再写入向量并在备注标明。 
