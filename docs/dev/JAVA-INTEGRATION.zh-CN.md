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
        // BC SM2 签名示例可根据需要扩展
        // 此处以加密解密流程为主，完整的签名验签实现建议使用 Hutool
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

- 本页展示 Java 与 gmkitx 的对接方案；其他语言对接请参考对应的语言指南。
- 所有语言对接均使用统一的测试向量 `test/vectors/interop.json`，确保跨语言互操作性。
- 如需切换 Java 库，保持密钥/IV/模式/编码约定不变，替换代码即可。
- 扩展 CTR/OFB/CFB/GCM 或固定随机源的 SM2 用例时，先确认计数器/AAD/随机策略一致，再写入测试向量并在备注中标明。 
