---
title: TypeScript SM4 使用手册
description: 使用 gmkitx 0.10.1 完成 SM4-GCM 认证加密、CCM、二进制处理和篡改验证。
pageInfo: false
contributors: false
editLink: false
icon: lock
category: [使用手册, TypeScript]
tag: [SM4, GCM, AEAD]
---

# TypeScript SM4 使用手册

新协议先选择 GCM。它同时加密明文并认证 ciphertext、AAD 和 tag；接收端只有在认证通过后才能得到明文。CCM 也提供认证加密，但 nonce 与消息长度约束不同。

## GCM 协议字段

<ApiTable label="SM4-GCM 落库字段" min-width="72rem">

| 字段 | 本章格式 | 必须保存的原因 |
|:--|:--|:--|
| `schema` | 整数，本章为 `1` | 约束后续字段解释 |
| `algorithm` | `SM4-GCM` | 禁止接收端猜测模式 |
| `nonce` | 12 字节 Hex | 相同 key 下不可重复；解密必须使用原值 |
| `aad` | UTF-8 约定：`tenant=demo;schema=1` | 不加密但参与认证；字段顺序和字节必须一致 |
| `ciphertext` | Base64 | 保存加密结果 |
| `tag` | 16 字节，Base64 | 认证失败时解密必须拒绝 |
| `encoding` | `base64` | 明确 ciphertext 和 tag 的外层编码 |

</ApiTable>

样例使用固定 key 和 nonce 以便测试。生产环境的 key 来自密钥管理系统；每条消息必须在该 key 下使用从未出现过的 nonce。

## SM4-GCM 文本和二进制

<!-- code-sample id="manual-ts-sm4" steps="准备参数|SM4-GCM 加密|SM4-GCM 解密|认证失败断言|二进制加密|二进制解密" -->
```js
<!-- @include: ../../examples/node/manual-typescript-sm4.mjs#manual-ts-sm4 -->
```

### 参数

<ApiTable label="SM4-GCM 参数" min-width="70rem">

| 参数 | 本章取值 | 单位/编码 | 失败行为 |
|:--|:--|:--|:--|
| `key` | `012345...3210` | 16 字节，字符串为 32 个 Hex 字符 | 长度或字符非法时抛错 |
| `mode` | `CipherMode.GCM` | 枚举值 | 不要省略；省略会进入旧 ECB 兼容默认值 |
| `padding` | `PaddingMode.NONE` | GCM 不使用分组填充 | 显式写出协议意图 |
| `iv` | 12 字节 nonce | 字符串为 24 个 Hex 字符 | 缺失或长度非法时抛错 |
| `aad` | 租户与 schema | 字符串按 UTF-8 | 解密端不同会认证失败 |
| `tagLength` | `16` | byte | GCM 接受 12–16 |
| `outputFormat` | `OutputFormat.BASE64` | ciphertext、tag 同时生效 | 结果对象的 `format` 为 `base64` |

</ApiTable>

传入完整 `SM4CipherResult` 解密时，0.10.1 按对象的 `format` 解码 ciphertext 和 tag。示例仍写出 `inputFormat`/`tagFormat`，使把字段拆开传输后的协议要求也清楚。

## 认证失败怎么处理

tag、AAD、nonce、ciphertext 或 key 任一不匹配，GCM 解密都会抛出 `Error`。调用方必须：

1. 丢弃本次结果，不使用任何部分明文。
2. 对外返回同一类“认证失败”，避免泄露具体失败位置。
3. 日志记录消息 ID、schema 和算法，不记录 key、完整明文或可重放的凭据。

认证失败不是“解密后内容为空”，也不是布尔 `false`。

## CCM

将主流程的 `mode` 改为 `CipherMode.CCM` 后，还必须重新确认：

- nonce 长度为 7–13 字节；
- tag 长度为 4–16 的偶数字节；
- `q = 15 - nonceLength`，单条消息最大长度为 `2^(8q) - 1` 字节；
- 相同 key 下 nonce 同样不可重复；
- 加密和解密使用完全相同的 AAD。

协议没有明确要求 CCM 时，不要仅为了“换一种模式”修改 GCM。

## 非 AEAD 模式

<ApiTable label="SM4 非 AEAD 模式边界" min-width="70rem">

| 模式 | IV | 完整性 | 新接入处理 |
|:--|:--|:--|:--|
| ECB | 无 | 无 | 会暴露重复分组，只维护既有格式 |
| CBC | 16 字节 | 无 | 需要独立、先验定义的 MAC 组合；不能只加密 |
| CTR | 16 字节计数器 | 无 | key 下计数器不可重复，并需独立认证 |
| CFB/OFB | 16 字节 | 无 | 不提供篡改检测，只按既有协议使用 |

</ApiTable>

ECB/CBC 的默认填充是 PKCS7；`NONE` 要求长度是 16 字节倍数；`ZERO` 无法区分原文尾部零与填充零。流式模式和 AEAD 模式忽略分组填充。

## 实例复用

`SM4` 类可以保存 key、mode 和初始配置，但不能让同一个 GCM nonce 安全地重复使用。并发任务使用独立实例或顶层函数，并在调用前为每条消息生成、登记和保存新 nonce。

全部模式、选项、结果对象和类工厂见 [TypeScript SM4 API](/manual/typescript/api/sm4.html)。
