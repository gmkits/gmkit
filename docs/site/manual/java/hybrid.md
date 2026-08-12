---
title: Java SM2 + SM4 混合加密
description: 使用 GMKit Java 0.10.1 组合 SM2 与 SM4-GCM 保护会话密钥和大消息。
pageInfo: false
contributors: false
editLink: false
icon: boxes
category: [使用手册, Java]
tag: [SM2, SM4-GCM, 混合加密]
---

# Java SM2 + SM4 混合加密

`SM2Sm4Hybrid` 为每条消息生成随机 16 字节 SM4 会话 key，用 SM4-GCM 加密业务数据，再用接收方 SM2 公钥以 C1C3C2 保护会话 key。它适合大于 SM2 直接加密范围的业务报文。

## 完整流程

<!-- code-sample id="manual-java-hybrid" steps="准备参数|混合加密|载荷字段断言|编码传输字段|重建载荷|混合解密|构造篡改载荷|失败断言" -->
```java
<!-- @include: ../../../../packages/java/gmkit/src/test/java/cn/gmkit/ManualJavaHybridTest.java#manual-java-hybrid -->
```

示例不序列化 `SM2Sm4HybridPayload` Java 对象，而是逐字段编码并在接收端重建。

## 加密过程

```text
随机 16-byte SM4 key
  ├─ SM4-GCM(key, nonce, AAD, plaintext) → ciphertext + tag
  └─ SM2-C1C3C2(recipient public key, SM4 key) → encryptedKey
```

解密先用接收方 SM2 私钥恢复会话 key，再执行 SM4-GCM 认证解密。SM2 密钥密文、GCM tag 或其他字段被修改时，流程必须失败。

## 载荷字段

<ApiTable label="SM2Sm4HybridPayload 字段" min-width="74rem">

| 字段 | 含义 | 建议外层编码 | 必填条件 |
|:--|:--|:--|:--|
| `encryptedKey` | SM2-C1C3C2 保护后的 SM4 会话 key | Base64 | 是 |
| `ciphertext` | SM4 业务密文 | Base64 | 是 |
| `iv` | IV/nonce | Base64 或固定 Hex | 除 ECB 外 |
| `aad` | 附加认证数据 | Base64；若协议定义 UTF-8 也可保存文本 | GCM/CCM 可为空，但两端必须一致 |
| `tag` | AEAD 认证标签 | Base64 | GCM/CCM |
| `mode` | SM4 工作模式 | 稳定协议枚举 | 是 |
| `padding` | SM4 填充 | 稳定协议枚举 | 是 |

</ApiTable>

还要由应用增加 `schema`、算法名称、接收方 key ID、字段编码和创建时间。`SM2Sm4HybridPayload` 没有这些字段。

## 建议的协议对象

```json
{
  "schema": 1,
  "algorithm": "SM2-C1C3C2+SM4-GCM",
  "recipientKeyId": "merchant-sm2-2026-01",
  "encryptedKeyBase64": "...",
  "ciphertextBase64": "...",
  "nonceBase64": "...",
  "aadBase64": "...",
  "tagBase64": "...",
  "mode": "GCM",
  "padding": "NONE"
}
```

这只是字段约定示例，不是 0.10.1 自动实现的序列化格式。上线前固定 JSON 规范、字段大小写、未知字段策略和版本升级规则。

## 默认值与显式选项

`hybrid.encrypt(..., options = null)` 的确切默认组合是：

- SM4-GCM；
- NONE padding；
- 12 字节随机 nonce；
- 16 字节 tag；
- 无 AAD；
- SM2-C1C3C2 会话 key 密文。

新协议应像可执行样例一样显式传 `SM4Options`，尤其要固定 AAD 和 tag 长度。调用方省略需要的 IV/nonce 时，组合入口会用安全上下文生成随机值并写入 payload。

## 失败与边界

- tag、AAD、nonce 或 ciphertext 不匹配：抛 `GmkitException`。
- `encryptedKey` 被修改或 SM2 私钥错误：会话 key 解密失败。
- 返回数组 getter 是防御性拷贝，修改副本不会修改原 payload。
- 该组合只提供加密与认证，不提供发送者数字签名；需要不可否认性时在协议层另加 SM2 签名。
- 不把 payload 的 Java 类序列化结果当稳定网络格式。

全部构造器、重载和字段 getter 见 [Java SM2 + SM4 混合加密 API](/manual/java/api/integration.html)。
