---
title: Java SM2 使用手册
description: 使用 GMKit Java 0.10.1 完成标准 Z 签名验签、C1C3C2 加解密、公钥处理和密钥交换。
pageInfo: false
contributors: false
editLink: false
icon: key
category: [使用手册, Java]
tag: [SM2, 签名, 加密]
---

# Java SM2 使用手册

本章固定标准签名 `e = SM3(Z || M)`、非空 `userId`、DER 签名、C1C3C2 密文和 Base64 外层编码。主流程使用一个 `SM2` 实例。

## 完整流程

<!-- code-sample id="manual-java-sm2" steps="准备参数|生成 SM2 密钥|SM2 签名|SM2 验签|篡改断言|SM2 加密|SM2 解密|密文篡改断言|公钥压缩往返|生成交换密钥|响应方计算|发起方计算|派生密钥断言|确认标签断言|身份错误断言" -->
```java
<!-- @include: ../../../../packages/java/gmkit/src/test/java/cn/gmkit/ManualJavaSm2Test.java#manual-java-sm2 -->
```

签名和密文含随机量，因此测试验证性质与往返，不把某次随机输出写成固定向量。

## 签名协议

<ApiTable label="Java SM2 签名字段" min-width="70rem">

| 字段 | 本章值 | API 表达 |
|:--|:--|:--|
| 消息 | UTF-8 | `StandardCharsets.UTF_8` |
| `userId` | `merchant@gmkit.cn` | `SM2SignOptions.userId` / `SM2VerifyOptions.userId` |
| e | `SM3(Z || M)` | 不设置 no-Z 兼容项 |
| 签名结构 | DER | `SM2SignatureFormat.DER` / `SM2SignatureInputFormat.DER` |
| 外层编码 | Base64 | `Base64Codec.encode/decode` |

</ApiTable>

使用 byte[] 验签时，消息或签名不匹配返回 `false`。签名字节无法按指定 RAW/DER 解析也返回 `false`。无效公钥会在进入该捕获边界前抛 `GmkitException`。

`userId` 是签名协议字段，不是随意变化的账户昵称。签名端和验签端必须使用相同 UTF-8 字节。

## 加密协议

<ApiTable label="Java SM2 加密字段" min-width="68rem">

| 字段 | 本章值 | 说明 |
|:--|:--|:--|
| 公钥 | 65 字节非压缩点 Hex | `04 || x || y` |
| 明文 | UTF-8 或任意 `byte[]` | 空明文会被拒绝 |
| 密文排列 | `SM2CipherMode.C1C3C2` | 两端显式固定 |
| 外层编码 | Base64 | 编码/解码在密码调用外明确完成 |
| 解密返回 | `byte[]` | 文本由 `Texts.text(..., UTF_8)` 解码 |

</ApiTable>

图片、文件和协议包直接使用 `byte[]`，不要先构造 `String`。密文校验失败或使用错误私钥时抛 `GmkitException`。

### 无点前缀的兼容输入

Java 兼容 `x || y || C3 || C2` 等省略点前缀 `04` 的既有协议。当前源码通过完整 C1 曲线点校验识别；若带前缀和补前缀解释均为合法点，优先保留带前缀布局。格式转换不能替代解密时的 C3 完整性校验。

**版本边界：** 已发布 `0.10.1` 在 X 坐标首字节恰为 `04` 时存在误判，推荐对接端传入明确包含 `04 || x || y` 的密文。本次修复尚未发布；固定标量回归见 `SM2PrefixCompatibilityTest`，它是项目回归，不是标准向量，测试固定随机源不能用于业务。

## 公钥和格式转换

- 私钥：32 字节标量，字符串为 64 个 Hex 字符。
- 非压缩公钥：65 字节，字符串为 130 个 Hex 字符。
- 压缩公钥：33 字节，字符串为 66 个 Hex 字符。
- `compressPublicKey`/`decompressPublicKey` 只改变点编码，不隐藏公钥。
- 签名 RAW/DER、密文 C1C3C2/C1C2C3/ASN.1 的转换成员用于已有协议；新协议固定一种格式后无需往返转换。

## 密钥交换

<ApiTable label="Java SM2 密钥交换角色" min-width="72rem">

| 参数 | 发起方 A | 响应方 B |
|:--|:--|:--|
| 静态私钥 | A | B |
| 临时私钥 | A 的本次会话值 | B 的本次会话值 |
| 对方静态公钥 | B | A |
| 对方临时公钥 | B | A |
| `selfId/peerId` | A / B | B / A |
| `initiator` | `true` | `false` |
| `keyBits` | 128 | 128 |

</ApiTable>

确认顺序是：

1. B 先计算结果，把 `s1` 发给 A。
2. A 通过 `confirmationTag(responder.s1())` 校验 B 的标签并计算结果。
3. A 把自己的 `s2` 发给 B。
4. B 调用 `confirmResponder(responder.s2(), initiator.s2())`。
5. 两次确认和共享 key 比对全部成功后，双方才接受会话。

`keyBits` 单位是 bit，默认 128。确认失败在 0.10.1 中由 BC 抛出 `IllegalStateException`。失败后丢弃派生 key 和临时私钥，不继续协议。

## 兼容边界

空 `userId` 会被 Builder 改成 `SM2.DEFAULT_USER_ID`，不能表达独立的空身份。已发布兼容成员见[旧系统迁移](/manual/migration.html)；C1C2C3 只在对端协议明确要求时使用。

全部构造器、重载、Builder 和转换成员见 [Java SM2 API](/manual/java/api/sm2.html)。
