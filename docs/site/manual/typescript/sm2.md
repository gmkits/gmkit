---
title: TypeScript SM2 使用手册
description: 使用 gmkitx 0.10.1 完成标准 SM2 签名验签、C1C3C2 加解密、公钥处理和密钥交换。
pageInfo: false
contributors: false
editLink: false
icon: key
category: [使用手册, TypeScript]
tag: [SM2, 签名, 加密]
---

# TypeScript SM2 使用手册

本章用于两类任务：以身份绑定的 SM2 签名确认消息来源；使用接收方 SM2 公钥保护小体积数据。文件和大段业务数据应使用 SM4-GCM 加密，再用 SM2 保护会话 key。

## 本章固定的协议

<ApiTable label="SM2 示例协议" min-width="64rem">

| 字段 | 值或格式 | 接收方必须知道 |
|:--|:--|:--|
| 消息 | UTF-8 | 原始字节必须与签名端一致 |
| `userId` | 非空 UTF-8：`merchant@gmkit.cn` | 参与 `Z` 计算，验签端必须使用相同值 |
| 签名结构 | ASN.1 DER | 传 `signatureFormat: 'der'` |
| 签名外层 | Base64 | 传 `inputFormat: InputFormat.BASE64` |
| 密文排列 | C1C3C2 | 加密、解密两端显式指定 |
| 密文外层 | Base64 | 解密端显式指定 |

</ApiTable>

签名使用标准路径 `e = SM3(Z || M)`。不要把 `userId` 当作展示名称随意修改；它是签名协议字段。

## 签名、验签、加密和解密

样例使用随机密钥、随机签名和随机密文，因此只断言长度、验签结果、明文往返和篡改失败，不断言随机输出的固定字符串。

<!-- code-sample id="manual-ts-sm2" steps="准备参数|生成 SM2 密钥|SM2 签名|SM2 验签|篡改断言|SM2 加密|SM2 解密|密文篡改断言|公钥压缩往返" -->
```js
<!-- @include: ../../examples/node/manual-typescript-sm2.mjs#manual-ts-sm2 -->
```

### 调用参数

<ApiTable label="SM2 主流程参数" min-width="70rem">

| API | 参数 | 本章取值 | 返回值 |
|:--|:--|:--|:--|
| `sm2GenerateKeyPair()` | `compressed = false` | 不传，生成非压缩公钥 | `{ privateKey, publicKey }`，均为小写 Hex |
| `sm2Sign` | 私钥、消息、`userId`、签名结构、输出编码 | 32 字节私钥 Hex、UTF-8、非空 ID、DER、Base64 | 签名字节的 Base64 |
| `sm2Verify` | 公钥、原消息、签名和与签名端一致的选项 | 非压缩公钥 Hex、DER、Base64 | 有效为 `true`，不接受为 `false` |
| `sm2Encrypt` | 公钥、非空明文、排列、输出编码 | C1C3C2、Base64 | 随机 SM2 密文 |
| `sm2Decrypt` | 私钥、密文、排列、输入编码 | C1C3C2、Base64 | UTF-8 文本 |
| `sm2DecryptBytes` | 与文本解密相同 | 用于文件或协议字节 | 原始 `Uint8Array` |

</ApiTable>

私钥固定 32 字节；默认非压缩公钥固定 65 字节（`04 || x || y`）。压缩公钥固定 33 字节（`02/03 || x`）。字符串均为 Hex。

## 失败行为

- 消息或 `userId` 变化：`sm2Verify` 返回 `false`。
- 签名编码、DER 结构、公钥或参数无法用于验签：0.10.1 的 `sm2Verify` 捕获错误并返回 `false`。
- SM2 明文为空：`sm2Encrypt` 抛出 `Error`。
- 私钥、公钥、密文模式或输入编码非法：加解密抛出 `Error`。
- 密文被修改或使用错误私钥：C3 校验失败并抛出 `Error`，不得返回部分明文。

服务端可把验签的所有 `false` 统一映射为“签名无效”；不要根据解析细节向外暴露不同响应。

## 二进制数据

`sm2Encrypt` 接受 `Uint8Array`。解密时必须选择 `sm2DecryptBytes`：

```text
Uint8Array 明文
  → sm2Encrypt(..., { mode: C1C3C2, outputFormat: BASE64 })
  → Base64 密文
  → sm2DecryptBytes(..., { mode: C1C3C2, inputFormat: BASE64 })
  → Uint8Array 明文
```

不要把文件字节先交给 `bytesToString`。无法表示的 UTF-8 序列会被替换，之后不能还原原文件。

## 公钥压缩

压缩只改变点编码，不改变公钥本身。数据库使用压缩公钥时，协议字段要保存 `compressed` 或通过首字节 `02/03` 明确识别；需要非压缩点的系统可用 `sm2DecompressPublicKey` 转换。

公钥压缩不是加密，也不隐藏公钥。

## 密钥交换的使用条件

只有协议明确要求 SM2 密钥交换时才使用 `sm2KeyExchange`。双方必须预先拥有可信的长期公钥，并为每次会话生成临时密钥对。参数中的 `keyLength` 单位是 byte，默认值为 16。

<ApiTable label="SM2 密钥交换角色" min-width="70rem">

| 参数 | 发起方 A | 响应方 B |
|:--|:--|:--|
| `privateKey/publicKey` | A 的长期密钥 | B 的长期密钥 |
| `tempPrivateKey` | A 的本次临时私钥 | B 的本次临时私钥 |
| `peerPublicKey` | B 的长期公钥 | A 的长期公钥 |
| `peerTempPublicKey` | B 的本次临时公钥 | A 的本次临时公钥 |
| `userId/peerUserId` | A / B | B / A |
| `isInitiator` | `true` | `false` |

</ApiTable>

双方的 `sharedKey` 必须相同。按标准角色，响应方 B 发送 `S1`、发起方 A 验证 `S1`；发起方 A 发送 `S2`、响应方 B 验证 `S2`。当前函数只返回计算结果，不接收对端确认值，也不自动完成验证。完整可执行流程见[高级能力中的 SM2 密钥交换](/manual/typescript/advanced.html#sm2-密钥交换)。

<!-- code-sample id="manual-ts-sm2-key-exchange" steps="生成长期密钥|生成临时密钥|发起方计算|响应方计算|派生密钥断言|确认标签断言|身份错误断言" -->
```js
<!-- @include: ../../examples/node/manual-typescript-advanced.mjs#manual-ts-sm2-key-exchange -->
```

0.10.1 的结果同时返回标准 `s1`（0x02，B -> A）和 `s2`（0x03，A -> B）。应用协议应明确谁先发送哪个确认值、如何使用常量时间比较、在什么时点销毁临时私钥，并在确认失败时丢弃 `sharedKey`。示例中的 `sharedKey` 只做双方一致性断言，不直接当作长期存储 key。

## 不在主流程使用的兼容能力

- 空 `userId` 在 0.10.1 中会回落到 `DEFAULT_USER_ID`，不能表达独立的空身份。
- no-Z 签名计算 `SM3(M)`，不是标准 SM2 签名，也不能由标准 BC `SM2Signer` 直接验证。
- 传入的 `SM2CurveParams` 只能重复声明标准 `sm2p256v1` 参数；0.10.1 不支持自定义曲线。
- 既有系统的格式分支统一在迁移层处理，不混入本页的标准调用。

替代方案和风险见[旧系统迁移](/manual/migration.html)。全部函数、选项和类成员见 [TypeScript SM2 API](/manual/typescript/api/sm2.html)。
