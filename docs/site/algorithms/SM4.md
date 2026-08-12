---
title: SM4 分组密码算法
description: 说明 SM4 模式、填充、IV、nonce、AAD、tag 和双语言协议差异。
icon: lock
order: 3
category: [算法]
tag: [SM4, GCM, CCM, 分组密码]
---

# SM4 分组密码算法

SM4 的密钥和分组长度都是 128 bit。GMKit 两端提供 ECB、CBC、CTR、CFB、OFB、GCM 和 CCM；能否互操作取决于 mode、padding、IV/nonce、AAD、tag 和字段编码，而不是算法名本身。

<div class="doc-path-grid doc-path-grid-compact">
  <a class="doc-path-card" href="/manual/typescript/api/sm4.html">
    <span class="doc-path-label">gmkitx</span>
    <strong>TypeScript SM4 API</strong>
    <small>选项、结果对象、SM4 类、全部模式以及认证失败案例。</small>
  </a>
  <a class="doc-path-card" href="/manual/java/api/sm4.html">
    <span class="doc-path-label">cn.gmkit:gmkit</span>
    <strong>Java SM4 API</strong>
    <small>实例与静态重载、Builder、结果对象和 Provider 配置。</small>
  </a>
</div>

## 模式参数矩阵

<ApiTable label="SM4 模式参数矩阵" min-width="72rem">

| 模式 | IV / nonce | padding | tag | 协议定位 |
|:--|:--|:--|:--|:--|
| ECB | 不使用 | PKCS7、ZERO、NONE | 无 | 固定向量或明确存在的旧单块协议 |
| CBC | 16 字节 IV | PKCS7、ZERO、NONE | 无 | 旧协议；必须另行认证 |
| CTR / CFB / OFB | 16 字节 IV | 不使用，显式 NONE | 无 | 旧协议；必须另行认证 |
| GCM | 跨端统一为 12 字节 nonce | NONE | 12–16 字节，默认 16 | 新业务优先评估 |
| CCM | 7–13 字节 nonce | NONE | 4–16 字节偶数，默认 16 | 新业务优先评估 |

</ApiTable>

TypeScript GCM 当前只接受 12 字节 nonce，Java 接受 12–16 字节；跨语言协议应固定双方交集 12 字节。两端都保留省略 mode 时的 ECB + PKCS7 兼容默认值，TypeScript 还会警告一次。新协议必须显式设置 mode，不能依赖兼容默认值。

`ZERO` 不能区分原文尾部零字节和填充零字节，只用于已经规定该语义的旧数据。ECB/CBC 的 NONE 要求明文长度为 16 字节倍数；流式和 AEAD 模式不使用分组填充。

## AEAD 载荷必须自描述

GCM/CCM 同时产生 ciphertext 和 tag。AAD 不加密，但参与认证；解密端必须逐字节重建相同 AAD。建议载荷至少明确以下字段：

```json
{
  "version": 1,
  "algorithm": "SM4",
  "mode": "GCM",
  "encoding": "base64",
  "nonce": "...",
  "aad": "tenant=demo;schema=1",
  "ciphertext": "...",
  "tag": "...",
  "tagLength": 16,
  "keyId": "non-secret-key-reference"
}
```

key 不写入载荷。AAD 如果能由外层协议无歧义重建，可以只记录其 schema 与版本；否则应与密文一同保存。相同 key 下不得复用 GCM/CCM nonce。

## 双语言结果和失败语义

<ApiTable label="SM4 双语言结果与失败语义" min-width="70rem">

| 项目 | TypeScript | Java | 协议建议 |
|:--|:--|:--|:--|
| 加密结果 | `{ ciphertext, tag?, format }` | `SM4CipherResult` | AEAD 时 ciphertext 与 tag 都是必需字段 |
| 文本解密 | `sm4Decrypt` 返回 UTF-8 字符串 | `decryptToUtf8` / `decryptToString` | 任意二进制改用字节入口 |
| 二进制解密 | `sm4DecryptBytes` | `decrypt` 返回 `byte[]` | 不经过字符串转换 |
| tag 分开传入 | `SM4DecryptOptions.tag` / `tagFormat` | `SM4Options.tag(...)` | 字段分离时显式记录各自编码 |
| 认证失败 | 抛 `Error`，不返回明文 | 抛 `GmkitException`，不返回明文 | 作为完整认证失败处理，不盲目重试 |

</ApiTable>

key、nonce、AAD、ciphertext、tag、tagLength 或编码任一不一致都可能导致认证失败。解密返回前必须先完成 tag 校验；调用方不能记录、解析或继续处理未经认证的明文。

## 固定向量与随机案例的区别

标准单分组向量使用 key `0123456789abcdeffedcba9876543210`、同值明文、ECB + NONE，期望密文为 `681edf34d206965e86b3e94f536e4246`。该向量只验证 SM4 分组运算，不代表推荐 ECB。

GCM/CCM 业务案例应每次生成新 nonce，验证正确往返，并分别篡改 AAD、ciphertext 和 tag。随机加密结果不应被当作固定标准向量。

## 密钥与使用边界

- key 必须是 16 字节，不能截断口令、时间戳、UUID 或普通摘要充当 key。
- CBC 的 IV 应不可预测；CTR/CFB/OFB/GCM/CCM 在同一 key 下不得复用 IV/nonce。
- ECB 会暴露重复分组；CBC/CTR/CFB/OFB 只提供机密性，仍需经过审查的认证机制。
- Java 需要封装业务载荷与会话 key 时，使用 [SM2 + SM4 混合加密 API](/manual/java/api/integration.html)；该对象不定义跨语言序列化格式。

## 验证依据

- GB/T 32907-2016 单分组向量
- [共享互操作向量](/standards/interop-vectors)
- [TypeScript SM4 可执行案例](/manual/typescript/api/sm4.html#可执行案例)
- [Java SM4 可执行案例](/manual/java/api/sm4.html#可执行案例)
