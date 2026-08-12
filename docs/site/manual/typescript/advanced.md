---
title: TypeScript 高级能力
description: 配置 gmkitx 0.10.1 的自定义随机源、TextCodec、ASN.1、低层状态和实例复用。
pageInfo: false
contributors: false
editLink: false
icon: sliders
category: [使用手册, TypeScript]
tag: [RNG, ASN.1, 状态管理]
---

# TypeScript 高级能力

本章面向受限 JavaScript 宿主、协议诊断和需要显式维护状态的调用方。Node.js 18 与现代浏览器的常规业务接入不需要自定义 RNG、TextCodec 或 `ZUCState`。

## 可执行案例

<!-- code-sample id="manual-ts-advanced" steps="检查环境|注入测试随机源|随机源失败断言|注入 UTF-8 codec|转换 SM2 签名|DER 失败断言|复用增量摘要|SM4-GCM 实例加密|SM4-GCM 实例解密|推进 ZUC 低层状态" -->
```js
<!-- @include: ../../examples/node/manual-typescript-advanced.mjs#manual-ts-advanced -->
```

## 环境报告

`getEnvReport()` 是即时探测，不修改配置：

<ApiTable label="EnvReport 字段" min-width="62rem">

| 字段 | 为 `true` 的含义 | 部署检查 |
|:--|:--|:--|
| `hasBigInt` | 有原生 `BigInt` | SM2 必须满足 |
| `hasTextEncoder` | 有全局或 Node 文本编码器 | 字符串输入可按 UTF-8 编码 |
| `hasTextDecoder` | 有全局或 Node 文本解码器 | 文本解密可恢复 UTF-8 |
| `hasWebCrypto` | 有 `crypto.getRandomValues` | 浏览器/现代 Node 的首选 CSPRNG |
| `hasNodeCrypto` | 当前 CommonJS 上下文可加载 `node:crypto.randomBytes` | 仅说明该兼容路径可见 |

</ApiTable>

在 ESM 中 `hasNodeCrypto` 可能为 `false`，但 `hasWebCrypto` 为 `true`，此时随机源仍可用。最终验证应调用 `configureRNG('strict')` 后执行一次 `getRandomBytes`，不能只看单一字段。

## 自定义随机源

`setCustomRNG(fn)` 的优先级高于系统随机源。适用场景是小程序、嵌入式 JS 宿主等已经拥有平台 CSPRNG、但没有暴露 Web Crypto 的环境。

传入函数必须：

- 接受正整数 byte 长度；
- 每次返回精确长度的 `Uint8Array`；
- 使用平台密码学安全随机源；
- 不缓存或重复输出；
- 不把测试中的确定性实现带入生产构建。

库会校验返回类型和长度，但不能判断随机质量。测试结束用 `clearCustomRNG()` 清除；进程启动可用 `hasCustomRNG()` 防止测试 fixture 泄漏。

## 自定义 TextCodec

`setTextCodec({ encode, decode })` 改变当前模块实例的字符串转换行为。它适用于没有 `TextEncoder`/`TextDecoder` 的受限宿主。

`encode` 必须返回 `Uint8Array`，`decode` 必须返回字符串，并与标准 UTF-8 对以下输入保持一致：

- 中文与 ASCII 混合文本；
- U+0000；
- 四字节 Unicode 字符；
- 孤立 surrogate 和无效 UTF-8 的替换行为。

应用启动阶段只配置一次。多个请求不能并发切换不同 codec；需要不同文本规则时，先在应用层转成 `Uint8Array` 再调用密码 API。

## SM2 签名 DER 转换

<ApiTable label="SM2 签名格式转换" min-width="66rem">

| API | 输入 | 返回 | 失败 |
|:--|:--|:--|:--|
| `rawToDer` | 64 字节或 128 个 Hex 字符的 `r || s` | DER `Uint8Array` | 长度或 Hex 非法时抛错 |
| `derToRaw` | DER `Uint8Array` | 128 个小写 Hex 字符 | SEQUENCE、INTEGER、尾随数据或整数长度非法时抛错 |
| `encodeSignature` | 独立的 `r`、`s` | DER `Uint8Array` | 非法非负整数编码时抛错 |
| `decodeSignature` | DER `Uint8Array` | `{ r, s }` 小写 Hex | 结构不完整或不是两个 INTEGER 时抛错 |

</ApiTable>

`asn1ToXml` 与 `signatureToXml` 用于诊断展示，不是稳定的跨语言序列化格式。协议传输应保存 DER/PEM/明确字段，而不是 XML 调试文本。

## 实例状态与并发

<ApiTable label="TypeScript 实例状态" min-width="72rem">

| 类型 | 保存的状态 | 可复用方式 | 并发要求 |
|:--|:--|:--|:--|
| `SM3`、`SHA256/384/512` | 尚未完成的摘要状态、输出格式 | `digest()` 自动重置；`reset()` 主动清空 | 同一实例一次处理一条消息 |
| `SM2` | 私钥、公钥、标准曲线声明 | 同一身份连续调用 | 密钥更新时创建新实例 |
| `SM4` | key、mode、padding、当前 IV/nonce | `setIV` 后处理下一条消息 | 不共享会变更 nonce 的实例 |
| `ZUC` | key 和 IV | `setIV` 后处理另一条独立流 | 同一 key/IV 不得被两条消息复用 |
| `ZUCState` | LFSR、FSM 和已消费 word 位置 | 重新 `initialize` 才回到流起点 | 单一顺序消费者，不能跨请求共享 |

</ApiTable>

“实例可复用”不等于“nonce/IV 可复用”。SM4-GCM、SM4-CCM 和 ZUC 的唯一性要求仍由应用协议保证。

## SM2 密钥交换

双方角色、长期密钥、临时密钥、身份和确认标签缺一不可。可执行案例与参数矩阵见 [TypeScript SM2 手册的密钥交换章节](/manual/typescript/sm2.html#密钥交换的使用条件)。

## 自定义曲线边界

`SM2CurveParams` 是已发布的兼容声明。0.10.1 固定使用标准 `sm2p256v1`；省略该对象即可。传入不同的 `p/a/b/Gx/Gy/n` 会抛错，不能借此启用其他椭圆曲线。

底层成员的完整签名见 [TypeScript 通用 API](/manual/typescript/api/common.html)、[SM2 API](/manual/typescript/api/sm2.html)、[SM4 API](/manual/typescript/api/sm4.html) 和 [ZUC API](/manual/typescript/api/zuc.html)。
