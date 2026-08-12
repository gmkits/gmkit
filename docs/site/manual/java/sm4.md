---
title: Java SM4 使用手册
description: 使用 GMKit Java 0.10.1 完成 SM4-GCM、AAD、tag、二进制解密和认证失败验证。
pageInfo: false
contributors: false
editLink: false
icon: lock
category: [使用手册, Java]
tag: [SM4, GCM, AEAD]
---

# Java SM4 使用手册

新协议先选择 GCM，并显式配置 mode、padding、nonce、AAD 和 tag 长度。不要调用省略 `SM4Options` 的默认 ECB 重载定义新格式。

## SM4-GCM 完整流程

<!-- code-sample id="manual-java-sm4" steps="准备参数|SM4-GCM 加密|编码传输字段|SM4-GCM 解密|认证失败断言|AAD 失败断言|二进制加密|二进制解密" -->
```java
<!-- @include: ../../../../packages/java/gmkit/src/test/java/cn/gmkit/ManualJavaSm4Test.java#manual-java-sm4 -->
```

测试固定 key 和 nonce 以得到稳定控制流。生产环境从密钥管理系统取得 key，并保证同一 key 下每条消息的 nonce 从未重复。

## 选项

<ApiTable label="Java SM4-GCM 选项" min-width="72rem">

| Builder 字段 | 本章值 | 单位/边界 |
|:--|:--|:--|
| `mode` | `SM4CipherMode.GCM` | 不省略；默认值是兼容 ECB |
| `padding` | `SM4Padding.NONE` | GCM 不使用分组填充 |
| `iv` | 12 字节 nonce | 相同 key 下不可重复 |
| `aad` | UTF-8 `tenant=demo;schema=1` | 可为空；加密和解密必须逐字节相同 |
| `tagLength` | 16 | byte；GCM 接受 12–16 |
| `tag` | 解密时可单独设置 | 传入 `SM4CipherResult` 时由结果对象并入 |
| `securityContext` | 默认或应用上下文 | Provider 和 SecureRandom |

</ApiTable>

`SM4Options` 是不可变对象，数组 getter 返回防御性拷贝。加密选项可以复用，但其中的 nonce 不能用于另一条消息。

## 传输与落库

`SM4CipherResult` 只含 `ciphertext` 和可选 `tag`，不是完整协议载荷。应用至少保存：

```json
{
  "schema": 1,
  "algorithm": "SM4-GCM",
  "nonceHex": "000102030405060708090a0b",
  "aad": "tenant=demo;schema=1",
  "ciphertextBase64": "...",
  "tagBase64": "...",
  "tagLengthBytes": 16
}
```

不要序列化 Java 对象本身。使用 `ciphertextBase64()`/`tagBase64()` 或明确的 codec，接收端重新构造自己的协议对象。

## 认证失败

tag、AAD、nonce、ciphertext 或 key 任一不匹配，解密抛 `GmkitException`。调用方不能使用任何部分明文。对外使用统一失败响应；日志不记录 key 和完整明文。

## CCM 与非 AEAD

<ApiTable label="Java SM4 模式边界" min-width="72rem">

| 模式 | IV/nonce | 完整性 | 接入要求 |
|:--|:--|:--|:--|
| GCM | 12 字节 | 有 | 新协议主选；tag 12–16 字节 |
| CCM | 7–13 字节 | 有 | tag 4–16 的偶数；消息上限取决于 nonce 长度 |
| CBC | 16 字节 | 无 | 需要协议已定义的独立认证组合 |
| CTR/CFB/OFB | 16 字节 | 无 | IV/计数器复用规则和独立认证必须另行定义 |
| ECB | 无 | 无 | 暴露重复分组，只维护既有格式 |

</ApiTable>

ECB/CBC 的默认填充是 PKCS7；`NONE` 要求长度为 16 字节倍数；`ZERO` 无法无歧义恢复原文尾部零。

全部实例、静态入口、Builder 字段和结果 getter 见 [Java SM4 API](/manual/java/api/sm4.html)。
