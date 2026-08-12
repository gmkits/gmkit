---
title: Java SM2 + SM4 混合加密 API
description: 逐项说明 SM2Sm4Hybrid 的会话密钥封装、默认 GCM、载荷字段、失败行为和序列化边界。
pageInfo: false
contributors: false
editLink: false
icon: boxes-stacked
order: 7
category:
  - API 说明书
  - Java
tag:
  - SM2
  - SM4
  - 混合加密
---

# Java SM2 + SM4 混合加密 API

`SM2Sm4Hybrid` 每次生成一个随机 SM4 会话 key，用 SM4 加密业务数据，再用接收方 SM2 公钥加密该会话 key。这样避免直接用 SM2 处理较长消息，同时保留“只有指定 SM2 私钥持有方才能恢复会话 key”的语义。

这套 API 适合已经载入内存的订单、消息和文件片段。它是一次性内存接口，不提供流式文件读写，也不负责证书校验、key id、密钥轮换或跨服务序列化。

::: tip 先确定载荷格式
完整流程、字段落库和篡改失败见 [Java SM2 + SM4 使用手册](/manual/java/hybrid.html)。本页只解释两个公开类型及其成员，不把对象的 `toString()` 当作协议格式。0.10.1 的默认配置是 `SM2-C1C3C2 + SM4-GCM + 12 字节随机 nonce + 16 字节 tag`。
:::

## 两个公开类型

<ApiTable label="混合加密类型分工" min-width="58rem">

| 类型 | 用途 | 生命周期 |
|:--|:--|:--|
| `SM2Sm4Hybrid` | 生成会话 key、组合 SM2 和 SM4、完成加解密 | 保存安全上下文，可重复调用 |
| `SM2Sm4HybridPayload` | 保存会话 key 密文、业务密文和解密元数据 | 不可变值对象，数组防御性复制 |

</ApiTable>

## 处理流程

```text
加密：随机 SM4 key ──SM2 公钥加密──> encryptedKey
      业务明文 ──SM4 + IV/AAD──> ciphertext + tag

解密：encryptedKey ──SM2 私钥解密──> SM4 key
      ciphertext + IV/AAD/tag ──SM4──> 业务明文
```

会话 key 只在方法内部以 16 字节数组存在，不包含在返回对象的明文字段中。`encryptedKey` 固定为 SM2 `C1C3C2` raw 密文，而不是 ASN.1 DER。

## 构造器与安全上下文

<!-- code-reference -->
```java
public SM2Sm4Hybrid();
public SM2Sm4Hybrid(GmSecurityContext securityContext);
```

无参构造使用 `GmSecurityContexts.defaults()`。显式传 `null` 也回退到默认上下文；非 `null` 上下文同时绑定给内部 `SM2` 和 `SM4`，决定会话 key、SM2 临时随机数和自动 IV/nonce 的随机源。

自定义 `SM4Options.securityContext()` 不会替换构造器绑定的上下文，因为内部 `SM4` 实例已经固定使用混合加密对象的上下文。需要定制 Provider 或随机源时，应在构造 `SM2Sm4Hybrid` 时传入。

对象不保存会话 key 或上一条消息状态，无需 `reset()` 或 `close()`。

## 默认配置

<ApiTable label="SM2 + SM4 默认配置" min-width="58rem">

| 字段 | 默认值 | 载荷中的位置 |
|:--|:--|:--|
| 会话 key | 每次随机生成 16 字节 | 不直接返回，只返回 `encryptedKey` |
| 会话 key 封装 | SM2 `C1C3C2` | `encryptedKey` |
| 数据模式 | SM4-GCM | `mode` |
| padding | `NONE` | `padding` |
| nonce | 每次随机生成 12 字节 | `iv` |
| AAD | 未设置 | `aad == null` |
| tag | 16 字节 | `tag` |

</ApiTable>

传自定义 `SM4Options` 时保留 mode、padding、AAD 和 tag 长度。需要 IV/nonce 但未提供时会自动生成：GCM/CCM 为 12 字节，CBC/CTR/CFB/OFB 为 16 字节，ECB 不生成。

加密 options 中不能预先放入非空 tag；底层 SM4 会拒绝这种配置。改用 CBC、CTR、CFB 或 OFB 时，返回载荷没有认证 tag，调用方必须依照既有协议提供完整性保护。

## 加密 API

### 完整签名

<!-- code-reference -->
```java
SM2Sm4HybridPayload encrypt(
    String publicKeyHex,
    byte[] plaintext);

SM2Sm4HybridPayload encrypt(
    String publicKeyHex,
    String plaintext);

SM2Sm4HybridPayload encrypt(
    String publicKeyHex,
    String plaintext,
    Charset charset,
    SM4Options options);

SM2Sm4HybridPayload encrypt(
    String publicKeyHex,
    byte[] plaintext,
    SM4Options options);
```

<ApiTable label="混合加密重载" min-width="68rem">

| 重载 | 明文解释 | 字符集 | SM4 配置 |
|:--|:--|:--|:--|
| `encrypt(publicKey, byte[])` | 原始字节 | 不适用 | 默认 GCM |
| `encrypt(publicKey, String)` | 文本 | UTF-8 | 默认 GCM |
| `encrypt(publicKey, String, Charset, options)` | 文本 | `null` 回退 UTF-8 | `null` 使用默认 GCM |
| `encrypt(publicKey, byte[], options)` | 原始字节 | 不适用 | `null` 使用默认 GCM |

</ApiTable>

`publicKeyHex` 必须是合法 SM2 压缩或非压缩公钥。`plaintext` 不能为 `null`，但空数组和空字符串在默认 GCM 下合法。返回对象包含完成解密所需的算法字段，不包含接收方 key id 或证书信息。

## 解密 API

### 完整签名

<!-- code-reference -->
```java
byte[] decrypt(
    String privateKeyHex,
    SM2Sm4HybridPayload payload);

String decryptToUtf8(
    String privateKeyHex,
    SM2Sm4HybridPayload payload);

String decryptToString(
    String privateKeyHex,
    SM2Sm4HybridPayload payload,
    Charset charset);
```

<ApiTable label="混合解密返回值" min-width="64rem">

| 方法 | 返回值 | 适用数据 |
|:--|:--|:--|
| `decrypt` | 新的原始明文字节数组 | 任意二进制 |
| `decryptToUtf8` | UTF-8 文本 | 加密前是 UTF-8 字符串 |
| `decryptToString` | 指定字符集文本；`charset == null` 为 UTF-8 | 协议明确采用其他字符集 |

</ApiTable>

解密先以 SM2 `C1C3C2` 恢复 16 字节会话 key，再根据 payload 中的 mode、padding、IV、AAD 和 tag 还原 SM4 参数。默认 GCM 下，key、nonce、AAD、ciphertext 或 tag 任一不一致都会抛 `GmkitException`，不会返回未认证明文。

## `SM2Sm4HybridPayload`

### 构造器

<!-- code-reference -->
```java
public SM2Sm4HybridPayload(
    byte[] encryptedKey,
    byte[] ciphertext,
    byte[] iv,
    byte[] aad,
    byte[] tag,
    SM4CipherMode mode,
    SM4Padding padding);
```

<ApiTable label="混合载荷字段" min-width="72rem">

| 字段 | 必填 | 默认 GCM 长度 | 含义 |
|:--|:--:|:--|:--|
| `encryptedKey` | 是 | SM2 密文长度随封装而定 | `C1C3C2` 排列的 SM4 会话 key 密文 |
| `ciphertext` | 是 | 与 GCM 明文等长 | 业务密文主体，不含 tag |
| `iv` | 按模式 | 12 字节 | SM4 IV 或 AEAD nonce |
| `aad` | 否 | `null` | 未加密但参与 AEAD 认证的数据 |
| `tag` | AEAD 必填 | 16 字节 | GCM/CCM 认证标签 |
| `mode` | 是 | `GCM` | `SM4CipherMode` |
| `padding` | 是 | `NONE` | `SM4Padding`；流式/AEAD 模式实际不填充 |

</ApiTable>

构造器要求 `encryptedKey`、`ciphertext`、`mode`、`padding` 非 `null`，但不在构造阶段验证数组长度与模式组合；解密时由 SM2/SM4 做严格校验。IV、AAD、tag 可以为 `null`，空数组也会被 `has*()` 视为不存在。

### 全部访问器

<!-- code-reference -->
```java
byte[] encryptedKey();
String encryptedKeyHex();
String encryptedKeyBase64();

byte[] ciphertext();
String ciphertextHex();
String ciphertextBase64();

byte[] iv();
boolean hasIv();
String ivHex();

byte[] aad();
boolean hasAad();

byte[] tag();
boolean hasTag();
String tagHex();
String tagBase64();

SM4CipherMode mode();
SM4Padding padding();
```

<ApiTable label="混合载荷访问器返回规则" min-width="70rem">

| 成员组 | 返回规则 |
|:--|:--|
| `encryptedKey*` | 原始数组副本、小写 Hex 或标准 Base64 |
| `ciphertext*` | 原始数组副本、小写 Hex 或标准 Base64 |
| `iv()` / `ivHex()` | 不存在时返回 `null`；只有 Hex getter |
| `aad()` | 不存在时返回 `null`；没有内置 Hex/Base64 getter |
| `tag*` | 不存在时数组和字符串均返回 `null`；提供 Hex/Base64 getter |
| `hasIv/hasAad/hasTag` | 对应数组非 `null` 且长度大于 0 时返回 `true` |
| `mode/padding` | 返回构造器传入的枚举 |

</ApiTable>

所有数组构造参数都会复制，数组 getter 也返回副本。修改 getter 返回的内容不会改变 payload。

## 默认 GCM：成功与篡改失败

<!-- code-sample id="api-java-integration-06" steps="准备参数|混合加密|载荷字段断言|混合解密|成功断言|构造篡改载荷|失败断言" -->
```java
// 1. 准备参数：生成接收方 SM2 密钥对和订单明文。
SM2KeyPair keys = SM2Util.generateKeyPair();
SM2Sm4Hybrid hybrid = new SM2Sm4Hybrid();
String message = "order=GMKIT-DEMO-0001&amount=88.00";

// 2. 混合加密：默认使用随机 SM4 key、12 字节 nonce 和 GCM。
SM2Sm4HybridPayload payload = hybrid.encrypt(keys.publicKey(), message);

// 3. 载荷字段断言：GCM 解密所需的 mode、IV 和 tag 必须齐全。
if (payload.mode() != SM4CipherMode.GCM
        || !payload.hasIv()
        || payload.iv().length != 12
        || !payload.hasTag()
        || payload.tag().length != 16) {
    throw new IllegalStateException("hybrid GCM metadata mismatch");
}

// 4. 混合解密：SM2 私钥恢复会话 key，再解密订单明文。
String recovered = hybrid.decryptToUtf8(keys.privateKey(), payload);

// 5. 成功断言：解密结果必须等于订单原文。
if (!message.equals(recovered)) {
    throw new IllegalStateException("hybrid round-trip failed");
}

// 6. 构造篡改载荷：复制 tag 后修改第一个字节。
byte[] tamperedTag = payload.tag();
tamperedTag[0] ^= 0x01;
SM2Sm4HybridPayload tampered = new SM2Sm4HybridPayload(
        payload.encryptedKey(),
        payload.ciphertext(),
        payload.iv(),
        payload.aad(),
        tamperedTag,
        payload.mode(),
        payload.padding());

// 7. 失败断言：篡改 tag 后必须拒绝解密，不能返回明文。
try {
    hybrid.decrypt(keys.privateKey(), tampered);
    throw new IllegalStateException("tampered hybrid payload must fail");
} catch (cn.gmkit.core.GmkitException expected) {
    // 预期：认证失败，不会得到明文。
}
```

### 绑定业务上下文 AAD

<!-- code-sample id="api-java-integration-07" steps="配置 AAD|混合加密" -->
```java
// 1. 配置 AAD：租户和 schema 可公开，但必须参与 GCM 认证。
SM4Options options = SM4Options.builder()
        .mode(SM4CipherMode.GCM)
        .padding(SM4Padding.NONE)
        .aad(Texts.utf8("tenant=demo;schema=1"))
        .tagLength(16)
        .build();

// 2. 混合加密：订单明文与固定 AAD 一同进入认证加密流程。
SM2Sm4HybridPayload payload = hybrid.encrypt(
        keys.publicKey(),
        Texts.utf8("order=GMKIT-DEMO-0001&amount=88.00"),
        options);
```

AAD 不会被加密，应只放允许公开但必须防篡改的协议字段。解密端必须还原完全相同的 AAD 字节；JSON 字段重排、大小写变化或字符集变化都会导致认证失败。

## 序列化边界

`SM2Sm4HybridPayload` 不定义 JSON、CBOR、Protobuf 或二进制封包格式。跨进程或跨语言传输时，应用应建立带版本的 schema，例如：

```json
{
  "version": 1,
  "recipientKeyId": "merchant-sm2-2026-01",
  "encryptedKey": "<base64>",
  "ciphertext": "<base64>",
  "iv": "<base64-or-null>",
  "aad": "<base64-or-null>",
  "tag": "<base64-or-null>",
  "mode": "GCM",
  "padding": "NONE"
}
```

- 每个二进制字段固定一种编码，解码时禁止自动猜测。
- schema 必须带版本，并在外层增加接收方 key id；payload 本身没有这些字段。
- `mode`、`padding`、tag 长度和 SM2 密文排列都应进入协议说明。
- AAD 按收到的原始字节参与认证，不要重新拼接业务对象后假定结果相同。
- TypeScript 对端按字段调用 SM2/SM4 API，不能把 Java 类名或对象序列化细节当作跨语言协议。

## 失败行为

<ApiTable label="混合加密失败行为" min-width="70rem">

| 情况 | 结果 |
|:--|:--|
| 公钥/私钥为空或格式非法 | 抛出 `GmkitException` |
| `plaintext == null` 或 `payload == null` | 抛出 `GmkitException` |
| 会话 key 密文损坏、SM2 C3 校验失败 | SM2 阶段抛出 `GmkitException` |
| GCM/CCM 的 IV、AAD、ciphertext 或 tag 被修改 | SM4 阶段抛出 `GmkitException`，不返回明文 |
| payload 缺失所选模式必需的 IV/tag | 抛出 `GmkitException` |
| 自定义非 AEAD 模式密文被修改 | 不保证报错，必须由外层协议认证 |
| 文本解密使用错误 Charset | 可能产生替换字符，不属于密码校验失败 |

</ApiTable>

## 可执行案例

JUnit 文档测试覆盖默认 GCM 元数据、往返解密和篡改 tag 失败；集成专项测试覆盖更多算法组合。

::: details 查看混合加密文档案例
<!-- code-sample id="api-java-integration-08" steps="准备参数|混合加密|载荷字段断言|混合解密|成功断言|构造篡改载荷|失败断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit/src/test/java/cn/gmkit/PublicApiManualExamplesTest.java#java-hybrid-example -->
```
:::

运行测试：

```bash
cd packages/java
mvn -pl gmkit -Dtest=PublicApiManualExamplesTest,SMIntegrationTest test
```

## 公共项覆盖

本页覆盖 `SM2Sm4Hybrid`、`SM2Sm4HybridPayload` 两个公开顶层类型，以及它们的全部构造器、加解密重载、字段 getter 和编码 getter。

## 相关页面

- [Java SM2 API](./sm2.html)
- [Java SM4 API](./sm4.html)
- [跨语言公共约定](/api/common.html)
