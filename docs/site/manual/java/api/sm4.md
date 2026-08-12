---
title: Java SM4 API
description: 逐项说明 Java SM4 的模式、填充、IV、nonce、AAD、tag、Builder、结果对象和全部加解密重载。
pageInfo: false
contributors: false
editLink: false
icon: lock
order: 4
category:
  - API 说明书
  - Java
tag:
  - SM4
  - AEAD
  - GCM
  - CCM
---

# Java SM4 API

`SM4` 是可绑定 `GmSecurityContext` 的实例入口，`SM4Util` 是同语义的静态入口。两者支持 ECB、CBC、CTR、CFB、OFB、GCM、CCM，并用 `SM4Options` 描述模式参数、用 `SM4CipherResult` 分开保存密文和认证标签。

新协议优先使用 GCM 或 CCM：解密端会先验证 tag，认证失败时不返回明文。ECB 只适合兼容已有格式；CBC、CTR、CFB、OFB 自身不能检测篡改。

::: warning 不要依赖默认模式设计新协议
`options == null` 的兼容默认值是 `ECB + PKCS7`。新代码应始终显式设置模式、padding 和 IV/nonce。
:::

::: tip 先完成认证加密闭环
nonce、AAD、ciphertext、tag、解密和 tag 篡改失败见 [Java SM4 使用手册](/manual/java/sm4.html)。本页再用于选择重载、模式和填充。
:::

## 导入与四个公开类型

<!-- code-reference -->
```java
import cn.gmkit.core.GmSecurityContext;
import cn.gmkit.core.GmSecurityContexts;
import cn.gmkit.core.HexCodec;
import cn.gmkit.core.SM4CipherMode;
import cn.gmkit.core.SM4Padding;
import cn.gmkit.core.Texts;
import cn.gmkit.sm4.SM4;
import cn.gmkit.sm4.SM4CipherResult;
import cn.gmkit.sm4.SM4Options;
import cn.gmkit.sm4.SM4Util;
```

<ApiTable label="Java SM4 类型分工" min-width="58rem">

| 类型 | 解决的问题 | 是否有状态 |
|:--|:--|:--|
| `SM4` | 生成 key，并通过实例方法加解密 | 只保存安全上下文，不保存 cipher 会话 |
| `SM4Util` | 用静态方法完成同样操作 | 无公开状态 |
| `SM4Options` | 固定一次调用的模式、IV/nonce、AAD 和 tag | 构建后不可变，数组防御性复制 |
| `SM4CipherResult` | 同时携带密文主体和可选 tag | 构建后不可变，数组防御性复制 |

</ApiTable>

## 模式、填充和长度

SM4 key 固定 128 bit（16 字节），分组大小也是 16 字节。key 的 Hex 文本必须恰好 32 个 Hex 字符。

<ApiTable label="Java SM4 模式参数矩阵" min-width="70rem">

| `SM4CipherMode` | IV/nonce | padding 行为 | tag | 使用建议 |
|:--|:--|:--|:--|:--|
| `ECB` | 不使用；即使传入也会忽略 | `PKCS7`、`NONE`、`ZERO` | 无 | 只兼容固定旧格式 |
| `CBC` | 恰好 16 字节 | `PKCS7`、`NONE`、`ZERO` | 无 | 必须另有完整性保护 |
| `CTR` | 恰好 16 字节 | 配置值被忽略，实际 NoPadding | 无 | nonce/counter 不得复用 |
| `CFB` | 恰好 16 字节 | 配置值被忽略，实际 NoPadding | 无 | 必须另有完整性保护 |
| `OFB` | 恰好 16 字节 | 配置值被忽略，实际 NoPadding | 无 | IV 不得复用 |
| `GCM` | 12–16 字节；跨语言优先 12 字节 | 配置值被忽略，实际 NoPadding | 12–16 字节，默认 16 | 新协议首选 |
| `CCM` | 7–13 字节 | 配置值被忽略，实际 NoPadding | 4–16 字节偶数，默认 16 | 对端协议要求 CCM 时使用 |

</ApiTable>

`NONE` 用在 ECB/CBC 时要求输入长度是 16 的倍数。`PKCS7` 会为已对齐消息再增加一整块填充。`ZERO` 只在未对齐时补零，解密会删除所有尾部 `0x00`，因此不能无损表示任意二进制数据。

## 实例、上下文与密钥生成

### `SM4` 公开成员

<!-- code-reference -->
```java
public SM4();
public SM4(GmSecurityContext securityContext);
public GmSecurityContext securityContext();
public byte[] generateKey();
public String generateKeyHex();
```

<ApiTable label="SM4 构造和密钥生成" min-width="64rem">

| 调用 | 参数/默认值 | 返回值 | 说明 |
|:--|:--|:--|:--|
| `new SM4()` | 默认安全上下文 | `SM4` | 每次调用可继续通过 options 指定上下文 |
| `new SM4(context)` | `null` 回退到默认上下文 | `SM4` | 非 `null` 上下文被固定到实例，并覆盖 options 中的上下文 |
| `securityContext()` | 无 | 当前上下文引用 | 不复制 `SecureRandom` |
| `generateKey()` | 无 | 新的 16 字节 key | 使用当前上下文的 Provider 和随机源 |
| `generateKeyHex()` | 无 | 32 个小写 Hex 字符 | 与 `generateKey()` 的随机语义相同 |

</ApiTable>

`SM4Util` 提供四个静态密钥生成入口：

<!-- code-reference -->
```java
static byte[] generateKey();
static byte[] generateKey(GmSecurityContext securityContext);
static String generateKeyHex();
static String generateKeyHex(GmSecurityContext securityContext);
```

密钥生成失败时抛出 `GmkitException`，常见原因是 Provider 不支持 SM4。生成的 key 应进入密钥管理设施，不要写入日志或源码。

## `SM4Options`

### Builder 完整签名

<!-- code-reference -->
```java
static SM4Options.Builder builder();

Builder mode(SM4CipherMode mode);
Builder padding(SM4Padding padding);
Builder iv(byte[] iv);
Builder aad(byte[] aad);
Builder tagLength(Integer tagLength);
Builder tag(byte[] tag);
Builder securityContext(GmSecurityContext securityContext);
SM4Options build();
```

<ApiTable label="SM4Options 字段" min-width="72rem">

| 字段 | Builder 默认值 | `null` 行为 | 单位/约束 | 何时使用 |
|:--|:--|:--|:--|:--|
| `mode` | `ECB` | 回退到 `ECB` | `SM4CipherMode` | 每次调用 |
| `padding` | `PKCS7` | 回退到 `PKCS7` | `SM4Padding` | ECB/CBC；其他模式忽略 |
| `iv` | `null` | 保持未设置 | 字节；长度见模式表 | 除 ECB 外必填 |
| `aad` | `null` | 保持未设置 | 原始字节，可为空 | 仅 GCM/CCM；解密必须与加密一致 |
| `tagLength` | `null` | AEAD 解析为 16 | 字节，不是 bit | GCM/CCM 加密与解密都要一致 |
| `tag` | `null` | 保持未设置 | 原始 tag 字节 | 只在用裸密文执行 AEAD 解密时填写 |
| `securityContext` | `GmSecurityContexts.defaults()` | 回退到默认上下文 | Provider 与随机源配置 | 需要指定 Provider 时 |

</ApiTable>

加密时不能预先提供非空 `tag`，tag 必须由算法生成。解密 `SM4CipherResult` 时通常不在 options 中重复设置 tag；解密裸 `byte[]` 密文时才使用 `.tag(...)`。

### Getter 完整签名

<!-- code-reference -->
```java
SM4CipherMode mode();
SM4Padding padding();
byte[] iv();
byte[] aad();
Integer tagLength();
byte[] tag();
GmSecurityContext securityContext();
boolean hasTag();
```

`iv()`、`aad()`、`tag()` 每次返回防御性副本；未设置时返回 `null`。`hasTag()` 只有在 tag 非 `null` 且长度大于 0 时才返回 `true`。`tagLength()` 返回 Builder 中的原值，未设置时仍是 `null`，不会直接显示运行时默认的 16。

<!-- code-sample id="api-java-sm4-06" steps="准备 GCM 参数|构建选项" -->
```java
// 1. 准备 GCM 参数：nonce 为 12 字节，AAD 使用 UTF-8。
byte[] nonce = HexCodec.decodeStrict(
        "000102030405060708090a0b", "SM4 nonce");
byte[] aad = Texts.utf8("tenant=demo;schema=1");

// 2. 构建选项：显式固定 GCM、NoPadding 和 16 字节 tag。
SM4Options gcm = SM4Options.builder()
        .mode(SM4CipherMode.GCM)
        .padding(SM4Padding.NONE) // GCM 实际总是 NoPadding，显式写出便于审阅
        .iv(nonce)
        .aad(aad)
        .tagLength(16)            // 单位是字节
        .build();
```

## 加密 API

### `SM4` 全部加密重载

<!-- code-reference -->
```java
SM4CipherResult encryptHex(
    String keyHex, String data, SM4Options options);
SM4CipherResult encryptHex(
    String keyHex, byte[] data, SM4Options options);

SM4CipherResult encrypt(byte[] key, byte[] data);
SM4CipherResult encrypt(
    byte[] key, String data, SM4Options options);
SM4CipherResult encrypt(
    byte[] key, String data, Charset charset, SM4Options options);
SM4CipherResult encrypt(
    byte[] key, byte[] data, SM4Options options);
```

<ApiTable label="SM4 加密重载矩阵" min-width="72rem">

| 重载 | key | 明文 | 字符集 | options |
|:--|:--|:--|:--|:--|
| `encryptHex(String, String, ...)` | 32 位 Hex | 文本 | UTF-8 | `null` 使用 ECB+PKCS7 |
| `encryptHex(String, byte[], ...)` | 32 位 Hex | 原始字节 | 不适用 | `null` 使用 ECB+PKCS7 |
| `encrypt(byte[], byte[])` | 16 字节 | 原始字节 | 不适用 | 固定使用默认配置 |
| `encrypt(byte[], String, ...)` | 16 字节 | 文本 | UTF-8 | `null` 使用默认配置 |
| `encrypt(byte[], String, Charset, ...)` | 16 字节 | 文本 | `null` 回退 UTF-8 | `null` 使用默认配置 |
| `encrypt(byte[], byte[], ...)` | 16 字节 | 原始字节 | 不适用 | `null` 使用默认配置 |

</ApiTable>

`SM4Util` 提供除无 options 简写外的五个对应静态重载：两个 `encryptHex`、三个 `encrypt`。所有重载都返回 `SM4CipherResult`；普通模式的 `tag` 为 `null`，GCM/CCM 的 `tag` 与密文分开保存。

## 解密 API

### `SM4` 全部解密重载

<!-- code-reference -->
```java
byte[] decryptHex(
    String keyHex, String ciphertextHex, SM4Options options);

String decryptToUtf8(
    byte[] key, byte[] ciphertext, SM4Options options);
String decryptToUtf8(
    byte[] key, SM4CipherResult result, SM4Options options);

String decryptToString(
    byte[] key, byte[] ciphertext, Charset charset, SM4Options options);
String decryptToString(
    byte[] key, SM4CipherResult result, Charset charset, SM4Options options);

byte[] decrypt(
    byte[] key, SM4CipherResult result, SM4Options options);
byte[] decrypt(byte[] key, byte[] ciphertext);
byte[] decrypt(
    byte[] key, byte[] ciphertext, SM4Options options);
```

<ApiTable label="SM4 解密输入和返回值" min-width="72rem">

| 方法族 | 密文输入 | 返回值 | AEAD tag 来源 |
|:--|:--|:--|:--|
| `decryptHex` | Hex 字符串 | 原始明文字节 | `options.tag()` |
| `decryptToUtf8` | 裸密文或结果对象 | UTF-8 文本 | 裸密文用 options；结果对象优先使用自身 tag |
| `decryptToString` | 裸密文或结果对象 | 指定 `Charset` 文本；`null` 为 UTF-8 | 同上 |
| `decrypt(result, ...)` | `SM4CipherResult` | 原始明文字节 | 结果对象中的非空 tag 覆盖 options tag |
| `decrypt(ciphertext)` | 裸密文字节 | 原始明文字节 | 默认 ECB 不使用 tag |
| `decrypt(ciphertext, options)` | 裸密文字节 | 原始明文字节 | `options.tag()` |

</ApiTable>

`SM4Util` 提供除无 options 的 `decrypt(byte[], byte[])` 之外的七个对应静态重载。二进制协议应使用返回 `byte[]` 的方法；`decryptToUtf8` 和 `decryptToString` 只负责把解密结果按字符集转换，不会验证业务文本格式。

## `SM4CipherResult`

### 完整签名

<!-- code-reference -->
```java
public SM4CipherResult(byte[] ciphertext, byte[] tag);

byte[] ciphertext();
byte[] tag();
boolean hasTag();
String ciphertextHex();
String ciphertextBase64();
String tagHex();
String tagBase64();
```

<ApiTable label="SM4CipherResult 字段和编码" min-width="62rem">

| 成员 | 返回值 | 无 tag 时 | 复制语义 |
|:--|:--|:--|:--|
| `ciphertext()` | 原始密文字节 | 不适用 | 防御性副本 |
| `tag()` | 原始 tag 字节 | `null` | 防御性副本 |
| `hasTag()` | 是否存在非空 tag | `false` | 不适用 |
| `ciphertextHex()` | 小写 Hex 密文 | 不适用 | 新字符串 |
| `ciphertextBase64()` | 标准 Base64 密文 | 不适用 | 新字符串 |
| `tagHex()` | 小写 Hex tag | `null` | 新字符串 |
| `tagBase64()` | 标准 Base64 tag | `null` | 新字符串 |

</ApiTable>

构造器会复制传入数组，getter 也返回副本。调用方应传非 `null` 密文；构造器本身不立即拒绝 `null`，但编码或解密时会失败。这个对象是内存结果模型，不是稳定的跨语言序列化格式；传输协议必须明确 `mode`、IV/nonce、AAD、tag 长度、密文和编码。

## GCM：成功与篡改失败

<!-- code-sample id="api-java-sm4-10" steps="准备参数|构建 GCM 选项|SM4-GCM 加密|加密结果断言|SM4-GCM 解密|成功断言|构造篡改结果|失败断言" -->
```java
// 1. 准备参数：固定测试 key、12 字节 nonce、订单明文和业务 AAD。
byte[] key = HexCodec.decodeStrict(
        "0123456789abcdeffedcba9876543210", "SM4 key");
byte[] nonce = HexCodec.decodeStrict(
        "000102030405060708090a0b", "SM4 nonce");
byte[] aad = Texts.utf8("tenant=demo;schema=1");
String message = "order=GMKIT-DEMO-0001&amount=88.00";

// 2. 构建 GCM 选项：tag 长度固定为 16 字节。
SM4Options options = SM4Options.builder()
        .mode(SM4CipherMode.GCM)
        .padding(SM4Padding.NONE)
        .iv(nonce)
        .aad(aad)
        .tagLength(16)
        .build();

// 3. SM4-GCM 加密：结果包含 ciphertext 和认证 tag。
SM4 sm4 = new SM4();
SM4CipherResult encrypted = sm4.encrypt(key, message, options);

// 4. 加密结果断言：tag 必须存在且长度为 16 字节。
if (!encrypted.hasTag() || encrypted.tag().length != 16) {
    throw new IllegalStateException("SM4-GCM tag missing");
}

// 5. SM4-GCM 解密：使用相同 key、nonce 和 AAD 恢复文本。
String plaintext = sm4.decryptToUtf8(key, encrypted, options);

// 6. 成功断言：解密结果必须等于订单原文。
if (!message.equals(plaintext)) {
    throw new IllegalStateException("SM4-GCM round-trip failed");
}

// 7. 构造篡改结果：复制 tag 后修改第一个字节。
byte[] tamperedTag = encrypted.tag();
tamperedTag[0] ^= 0x01;
SM4CipherResult tampered =
        new SM4CipherResult(encrypted.ciphertext(), tamperedTag);

// 8. 失败断言：篡改 tag 后必须抛错，不能返回未认证明文。
try {
    sm4.decryptToUtf8(key, tampered, options);
    throw new IllegalStateException("tampered tag must be rejected");
} catch (cn.gmkit.core.GmkitException expected) {
    // 预期：key、nonce、AAD、ciphertext 或 tag 不一致会认证失败。
}
```

同一 key 下不得复用 GCM nonce。AAD 不加密，但会参与认证；解密时必须逐字节使用同一 AAD。

## CBC：兼容模式示例

<!-- code-sample id="api-java-sm4-11" steps="准备参数|SM4-CBC 加密|模式结果断言|SM4-CBC 解密|往返断言" -->
```java
// 1. 准备参数：CBC 使用 16 字节 IV 和 PKCS7 padding。
byte[] key = HexCodec.decodeStrict(
        "0123456789abcdeffedcba9876543210", "SM4 key");
SM4Options options = SM4Options.builder()
        .mode(SM4CipherMode.CBC)
        .padding(SM4Padding.PKCS7)
        .iv(HexCodec.decodeStrict(
                "000102030405060708090a0b0c0d0e0f", "SM4 IV"))
        .build();

// 2. SM4-CBC 加密：结果只包含密文，不包含认证 tag。
String message = "order=GMKIT-DEMO-0001&amount=88.00";
SM4CipherResult encrypted = SM4Util.encrypt(key, message, options);

// 3. 模式结果断言：CBC 不得返回 AEAD tag。
if (encrypted.hasTag()) {
    throw new IllegalStateException("CBC must not return an AEAD tag");
}

// 4. SM4-CBC 解密：使用相同 key 和 IV 恢复文本。
String decrypted = SM4Util.decryptToUtf8(key, encrypted, options);

// 5. 往返断言：解密结果必须等于订单原文。
if (!message.equals(decrypted)) {
    throw new IllegalStateException("SM4-CBC round-trip failed");
}
```

CBC 往返成功只证明参数配对正确，不证明密文未被篡改。新协议不要把“可以解密”当作完整性验证。

## 失败行为

<ApiTable label="Java SM4 失败行为" min-width="72rem">

| 情况 | 结果 |
|:--|:--|
| key 不是 16 字节，或 key/ciphertext/data 为 `null` | 抛出 `GmkitException` |
| 非 ECB 模式未提供 IV/nonce，或长度不符合模式 | 抛出 `GmkitException` |
| 非 AEAD 模式提供非空 AAD | 抛出 `GmkitException` |
| 加密 options 预先提供非空 tag | 抛出 `GmkitException` |
| AEAD 裸密文解密没有 tag，或 tag 长度与 `tagLength` 不同 | 抛出 `GmkitException` |
| AEAD 的 key、nonce、AAD、ciphertext 或 tag 不匹配 | 抛出 `GmkitException`，不返回明文 |
| ECB/CBC + `NONE` 的输入不是 16 字节倍数 | 抛出 `GmkitException` |
| PKCS7 密文或填充非法 | 抛出 `GmkitException` |
| Provider 不支持所选 transformation | 抛出 `GmkitException`，保留底层 cause |

</ApiTable>

`SM4` 不保留每次加解密的中间状态，无需 `reset()` 或 `close()`。一个实例可顺序复用；不要把可变的自定义 `SecureRandom` 在未同步的情况下跨线程共享。

## 可执行案例

JUnit 文档测试覆盖 GCM 往返和篡改 tag 失败；SM4 专项测试还覆盖模式矩阵、标准向量、数组防御性复制和参数错误。

::: details 查看 GCM 文档案例
<!-- code-sample id="api-java-sm4-12" steps="准备参数|SM4-GCM 加密|加密结果断言|SM4-GCM 解密|成功断言|构造篡改结果|失败断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit/src/test/java/cn/gmkit/PublicApiManualExamplesTest.java#java-sm4-example -->
```
:::

运行测试：

```bash
cd packages/java
mvn -pl gmkit -Dtest=PublicApiManualExamplesTest,SM4StandardVectorsTest,SM4ErrorHandlingTest,SM4ContractsTest,SM4UtilTest test
```

## 公共项覆盖

本页覆盖 `SM4`、`SM4Util`、`SM4Options`、`SM4CipherResult` 四个公开顶层类型及全部公开成员。模式和 padding 枚举定义见 [Java 核心 API](./core.html#sm4-枚举)。

## 相关页面

- [跨语言 SM4 模式与认证加密](/algorithms/SM4.html)
- [Java 核心 Provider 与安全上下文](./core.html#gmsecuritycontext)
- [TypeScript SM4 API](/manual/typescript/api/sm4.html)
