---
title: TypeScript 数据、编码与错误
description: 明确 gmkitx 0.10.1 的 UTF-8、Uint8Array、Hex、Base64、随机源和失败语义。
pageInfo: false
contributors: false
editLink: false
icon: binary
category: [使用手册, TypeScript]
tag: [编码, Uint8Array, RNG]
---

# TypeScript 数据、编码与错误

密码 API 处理的是字节。字符串只是输入或传输层表示；在写算法调用前，先为每个字段确定“文本还是二进制”和“Hex 还是 Base64”。

## 何时使用哪种类型

<ApiTable label="TypeScript 数据类型规则" min-width="66rem">

| 数据 | 应用层类型 | 字符串解释 | 示例 |
|:--|:--|:--|:--|
| 订单、用户标识、AAD | `string` | UTF-8 | `order=...`、`merchant@gmkit.cn` |
| 文件、图片、压缩包、协议帧 | `Uint8Array` | 不经过文本编解码 | `00 ff 80 41` |
| key、IV、nonce、公私钥 | API 指定的 `string \| Uint8Array` | 字符串按 Hex | 16 字节 key 写成 32 个 Hex 字符 |
| 密文、签名、tag | `string \| Uint8Array` | 由 `InputFormat`/`OutputFormat` 指定 | 数据库存 Base64，调用时写 `InputFormat.BASE64` |

</ApiTable>

`stringToBytes` 与 `bytesToString` 只用于 UTF-8 文本。任意二进制经过 `bytesToString` 后可能出现替换字符，不能再无损还原；这类数据直接保留为 `Uint8Array`。

## 编码、解码和失败比较

下面的文件由文档测试直接执行。它同时覆盖不可打印字节、UTF-8、显式编码、非法输入和认证值比较。

<!-- code-sample id="manual-ts-data" steps="准备二进制|编码二进制|显式解码|UTF-8 往返|Hex 边界|比较失败断言" -->
```js
<!-- @include: ../../examples/node/manual-typescript-data.mjs#manual-ts-data -->
```

### 0.10.1 的 Hex 边界

- `hexToBytes('abc')` 按 `0abc` 处理，这是已发布兼容行为。
- 非 Hex 字符会抛出 `Error`。
- `bytesToHex` 始终输出小写、不带 `0x`。
- 跨系统协议应要求偶数长度；不要利用奇数长度补零行为定义新格式。

## 显式编码

<ApiTable label="编码入口" min-width="62rem">

| API | 输入 | 输出 | 默认值 |
|:--|:--|:--|:--|
| `decodeInput(data, inputFormat)` | Hex/Base64 字符串或原始字节 | `Uint8Array` | `inputFormat = InputFormat.HEX` |
| `encodeOutput(bytes, outputFormat)` | `Uint8Array` | 编码字符串 | `outputFormat = OutputFormat.HEX` |
| `hexToBytes` / `bytesToHex` | Hex 与字节 | 对应另一种表示 | 无 |
| `base64ToBytes` / `bytesToBase64` | Base64 与字节 | 对应另一种表示 | 无 |

</ApiTable>

主手册要求协议字段同时固定值和编码；接收端按照 schema 指定的格式解码，不根据内容猜测。例如：

```json
{
  "ciphertext": "W2...",
  "encoding": "base64"
}
```

## 随机源

`configureRNG('strict')` 的作用是：系统和调用方都没有提供 CSPRNG 时抛错。它不会创建随机源，也不会证明宿主随机源质量。

<ApiTable label="随机源行为" min-width="62rem">

| 环境/配置 | 0.10.1 行为 | 接入要求 |
|:--|:--|:--|
| 浏览器有 `crypto.getRandomValues` | 使用 Web Crypto | 页面使用 HTTPS；启动时执行固定向量和随机长度检查 |
| Node.js 可用系统密码模块 | 使用系统 CSPRNG | Node.js 18 及以上 |
| 已调用 `setCustomRNG` | 自定义函数优先 | 只能注入宿主提供的 CSPRNG；返回值必须是精确长度 `Uint8Array` |
| 没有 CSPRNG 且策略为 `strict` | 抛出 `Error` | 正式环境使用这一策略 |
| 没有 CSPRNG 且沿用默认 `warn` | 警告后使用非安全兼容值 | 不能生成生产密钥、签名随机数或 nonce |

</ApiTable>

自定义随机源属于[高级能力](/manual/typescript/advanced.html#自定义随机源)，普通 Node.js 和现代浏览器不需要注入。

## `false` 与异常的边界

<ApiTable label="TypeScript 失败语义" min-width="68rem">

| 操作 | 失败结果 | 调用方处理 |
|:--|:--|:--|
| SM2 验签 | 签名不匹配、身份不匹配以及验签解析失败返回 `false` | 统一作为“不接受该签名”，不要依赖内部解析失败类型 |
| SM4-GCM/CCM 解密 | tag、AAD 或密文不匹配时抛出 `Error` | 丢弃所有输出并记录不含密钥/明文的审计信息 |
| SM2 解密 | 密钥、格式、曲线点或 C3 校验失败时抛出 `Error` | 不尝试把失败结果当明文继续处理 |
| 编码与参数校验 | 长度、范围、格式非法时抛出 `Error` | 在协议边界返回明确的输入错误 |
| `constantTimeEqual` | 任一值为空、长度不同或内容不同返回 `false` | 用于比较已解码的 MAC/tag 字节 |

</ApiTable>

JavaScript/JIT 不保证严格恒时；`constantTimeEqual` 只避免相同长度数据按首个不同字节提前返回。

完整参数见 [TypeScript 通用 API](/manual/typescript/api/common.html)。
