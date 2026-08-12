---
title: TypeScript 摘要与 HMAC 使用手册
description: 使用 gmkitx 0.10.1 完成 SM3、SHA-2、HMAC、固定向量和增量摘要。
pageInfo: false
contributors: false
editLink: false
icon: fingerprint
category: [使用手册, TypeScript]
tag: [SM3, SHA-2, HMAC]
---

# TypeScript 摘要与 HMAC 使用手册

摘要用于内容指纹，任何人都能计算；HMAC 使用共享 key，接收方只有持有相同 key 才能重新计算认证值。需要确认发送者身份且双方不能共享 key 时，使用 SM2 签名。

## 选择算法

<ApiTable label="摘要与 HMAC 选择" min-width="66rem">

| 任务 | 使用入口 | 输出长度 | 注意 |
|:--|:--|:--|:--|
| 国密协议摘要 | `sm3Digest` | 32 字节 | 默认输出 64 个小写 Hex 字符 |
| 国密协议消息认证 | `sm3Hmac` | 32 字节 | key 是共享秘密，不是密码字符串的存储替代品 |
| SHA-2 摘要 | `sha256` / `sha384` / `sha512` | 32 / 48 / 64 字节 | 按对端协议选择 |
| HMAC-SHA-2 | `hmacSha256/384/512` | 32 / 48 / 64 字节 | 双方必须固定同一 SHA 变体 |
| 大消息分块摘要 | `SM3` / `SHA256/384/512` | 同对应算法 | `update` 分块，`digest` 完成并重置 |

</ApiTable>

SHA-1 不进入新协议，旧系统核对方式见[迁移附录](/manual/migration.html)。

## 固定向量、HMAC 与增量状态

<!-- code-sample id="manual-ts-digest-hmac" steps="准备参数|计算 SM3 摘要|计算 SHA-2 摘要|计算 HMAC|HMAC 成功断言|篡改断言|增量摘要" -->
```js
<!-- @include: ../../examples/node/manual-typescript-digest-hmac.mjs#manual-ts-digest-hmac -->
```

固定向量只用于核对实现和编码。订单 HMAC 没有写死结果，因为业务 key 应来自密钥管理系统，不能写进源码。

## 参数与编码

<ApiTable label="摘要与 HMAC 参数" min-width="64rem">

| 参数 | `string` 含义 | `Uint8Array` 含义 | 要求 |
|:--|:--|:--|:--|
| `data` | UTF-8 文本 | 原始消息字节 | 签发与验证必须使用完全相同字节 |
| `key` | UTF-8 文本 | 原始 HMAC key | 协议 key 是 Hex 时先 `hexToBytes`，不要把 Hex 字符本身作为 key |
| `outputFormat` | 不适用 | 不适用 | 默认 `hex`，可显式设为 `base64` |

</ApiTable>

例如协议给出的 key 是 `001122...` 的 Hex 字节，应写：

```text
hexToBytes(protocolKeyHex) → sm3Hmac(keyBytes, message)
```

直接写 `sm3Hmac(protocolKeyHex, message)` 会认证 Hex 文本的 UTF-8 字节，得到不同结果。

## 接收端验证

接收端先按约定编码解码 HMAC，再使用 `constantTimeEqual` 比较字节。不要使用字符串 `===` 或手写遇到不同字节就返回的循环。

HMAC 校验失败返回业务层“不接受消息”。摘要不带 key，不能用“摘要相等”证明发送者身份。

## 增量类的状态

- `update(data)` 追加 UTF-8 字符串或原始字节，并返回当前实例。
- `digest()` 返回结果后自动重置，实例可处理下一条消息。
- `reset()` 丢弃尚未完成的输入并返回当前实例。
- `SM3.digest(options)` 可在本次输出覆盖实例格式；`SHA256/384/512` 的实例输出格式通过构造器或 `setOutputFormat` 设置。
- 一个实例同一时刻只能处理一条消息。并发请求不能共享可变摘要实例。

一次性消息优先用顶层函数；只有流式读取、超大消息或分块协议才需要增量类。

完整成员见 [TypeScript SM3 API](/manual/typescript/api/sm3.html) 和 [TypeScript SHA API](/manual/typescript/api/sha.html)。
