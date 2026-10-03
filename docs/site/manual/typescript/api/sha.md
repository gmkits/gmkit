---
title: TypeScript SHA API
description: 逐项说明 gmkitx 的 SHA-1、SHA-256、SHA-384、SHA-512、HMAC 和增量摘要类。
pageInfo: false
contributors: false
editLink: false
icon: fingerprint
order: 7
category:
  - API 说明书
  - TypeScript
tag:
  - SHA
  - HMAC
  - 摘要
---

# TypeScript SHA API

`gmkitx` 提供 SHA-256、SHA-384、SHA-512，以及仅供旧协议核对的 SHA-1。每种摘要都有一次性函数和可复用的增量类；HMAC 则提供 SHA-256/384/512 三种一次性函数。

SHA 摘要用于把消息映射为固定长度结果，不能证明消息来自谁。需要共享密钥认证时使用 HMAC；需要非对称签名时使用协议指定的签名算法。

::: warning SHA-1 只用于旧协议兼容
`sha1` 和 `SHA1` 已弃用。SHA-1 存在实际碰撞攻击，不应用于新签名、证书、内容寻址、安全校验或任何依赖抗碰撞性的设计。新协议从 SHA-256 起选。
:::

::: tip 本页适用范围
以下签名和默认值按 `gmkitx 0.10.1` 说明。字符串消息与字符串 HMAC key 均按 UTF-8 编码，不会自动解释为 Hex 或 Base64。
:::

::: tip 先按任务接入
摘要、HMAC、增量状态与篡改断言见 [TypeScript 摘要与 HMAC 使用手册](/manual/typescript/digest-hmac.html)。新代码只从 SHA-256、SHA-384、SHA-512 中按协议选择。
:::

## 导入与入口选择

<!-- code-reference -->
```ts
import {
  OutputFormat,
  SHA256,
  SHA384,
  SHA512,
  constantTimeEqual,
  hexToBytes,
  hmacSha256,
  hmacSha384,
  hmacSha512,
  sha,
  sha256,
  sha384,
  sha512,
} from 'gmkitx';

import type { SHAOptions } from 'gmkitx';
```

<ApiTable label="SHA 入口选择" min-width="58rem">

| 使用方式 | 入口 | 适用场景 | 状态 |
|:--|:--|:--|:--|
| 一次性摘要 | `sha256`、`sha384`、`sha512` | 已经拿到整段消息 | 不保存状态 |
| 一次性 HMAC | `hmacSha256`、`hmacSha384`、`hmacSha512` | 已经拿到完整 key 和消息 | 不保存状态 |
| 增量摘要 | `SHA256`、`SHA384`、`SHA512` | 文件、网络流或分块消息 | `digest()` 后自动清空消息状态 |
| 命名空间 | `sha.*` | 需要按算法组织调用 | 与同名根入口一致 |

</ApiTable>

`sha` 命名空间包含本页全部函数和四个类。ESM/CommonJS 新代码优先使用具名导出，调用位置更容易看出算法归属。

## 输入、输出与长度

<ApiTable label="SHA 输入输出规则" min-width="54rem">

| 位置 | `string` | `Uint8Array` | 备注 |
|:--|:--|:--|:--|
| 摘要 `data` | UTF-8 文本 | 原始消息字节 | 空消息合法 |
| HMAC `key` | UTF-8 文本 | 原始 key 字节 | 不自动识别 Hex/Base64 |
| HMAC `data` | UTF-8 文本 | 原始消息字节 | 两端必须使用同一编码 |
| 默认输出 | 小写 Hex 字符串 | 不适用 | 所有公开入口均返回字符串 |
| Base64 输出 | 标准 Base64 字符串 | 不适用 | 包含必要的 `=` 填充 |

</ApiTable>

<ApiTable label="SHA 输出长度" min-width="56rem">

| 算法 | 摘要长度 | Hex 长度 | Base64 长度 | 新协议定位 |
|:--|--:|--:|--:|:--|
| SHA-1 | 20 字节 / 160 bit | 40 | 28 | 禁用，只读旧数据 |
| SHA-256 | 32 字节 / 256 bit | 64 | 44 | 通用默认选择 |
| SHA-384 | 48 字节 / 384 bit | 96 | 64 | 协议明确要求 384 bit 时使用 |
| SHA-512 | 64 字节 / 512 bit | 128 | 88 | 协议明确要求 512 bit 时使用 |

</ApiTable>

二进制协议应直接传 `Uint8Array`。例如字符串 `'00ff'` 表示四个 UTF-8 字符；只有 `hexToBytes('00ff')` 才表示两个字节 `00 ff`。

## 一次性摘要

### 公开签名

<!-- code-reference -->
```ts
interface SHAOptions {
  outputFormat?: 'hex' | 'base64';
}

sha256(data: string | Uint8Array, options?: SHAOptions): string
sha384(data: string | Uint8Array, options?: SHAOptions): string
sha512(data: string | Uint8Array, options?: SHAOptions): string

```

<ApiTable label="一次性 SHA 参数" min-width="48rem">

| 参数 | 必填 | 默认值 | 说明 |
|:--|:--:|:--|:--|
| `data` | 是 | 无 | UTF-8 字符串或原始消息字节 |
| `options.outputFormat` | 否 | `OutputFormat.HEX` | `hex` 或 `base64` |

</ApiTable>

函数返回编码后的摘要字符串，不会修改输入。空消息合法；输出格式不是 `hex`/`base64` 时抛出 `Error`。

<!-- code-sample id="api-typescript-sha-03" steps="计算 SHA-256 摘要并比对标准 abc 向量|计算 SHA-384 摘要并比对标准 abc 向量|计算 SHA-512 摘要并比对标准 abc 向量|Base64 编码断言" -->
```ts
import {
  OutputFormat,
  sha256,
  sha384,
  sha512,
} from 'gmkitx';

// 1. 计算 SHA-256 摘要并比对标准 abc 向量。
if (sha256('abc')
  !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') {
  throw new Error('SHA-256 vector mismatch');
}

// 2. 计算 SHA-384 摘要并比对标准 abc 向量。
if (sha384('abc')
  !== 'cb00753f45a35e8bb5a03d699ac65007272c32ab0eded163'
    + '1a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7') {
  throw new Error('SHA-384 vector mismatch');
}

// 3. 计算 SHA-512 摘要并比对标准 abc 向量。
if (sha512('abc')
  !== 'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea2'
    + '0a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd'
    + '454d4423643ce80e2a9ac94fa54ca49f') {
  throw new Error('SHA-512 vector mismatch');
}

// 4. Base64 编码断言：outputFormat 只改变摘要文本表示。
if (sha256('abc', { outputFormat: OutputFormat.BASE64 })
  !== 'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=') {
  throw new Error('SHA-256 Base64 output mismatch');
}
```

## HMAC-SHA-256/384/512

### 公开签名

<!-- code-reference -->
```ts
hmacSha256(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SHAOptions,
): string

hmacSha384(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SHAOptions,
): string

hmacSha512(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SHAOptions,
): string
```

HMAC 用共享密钥认证消息。库按 HMAC 规范处理任意长度 key：超过算法分组长度的 key 会先摘要，再补齐到分组长度。SHA-256 的分组是 64 字节，SHA-384/512 的分组是 128 字节。

<ApiTable label="HMAC-SHA 参数" min-width="50rem">

| 参数 | 必填 | 默认值 | 说明 |
|:--|:--:|:--|:--|
| `key` | 是 | 无 | UTF-8 字符串或原始 key 字节；空 key 虽可计算，但不应在业务协议中使用 |
| `data` | 是 | 无 | UTF-8 字符串或原始消息字节 |
| `options.outputFormat` | 否 | `hex` | 返回 Hex 或 Base64 字符串 |

</ApiTable>

库没有 HMAC-SHA-1，也没有单独的 `verifyHmac`。接收外部 MAC 时应先按协议解码并检查长度，再对字节调用 `constantTimeEqual`。

<!-- code-sample id="api-typescript-sha-05" steps="准备固定向量|计算 HMAC-SHA-256 并比对 RFC 4231 结果|计算 HMAC-SHA-384 并比对 RFC 4231 结果|计算 HMAC-SHA-512 并比对 RFC 4231 结果|准备业务认证输入|计算发送端和接收端 HMAC-SHA-256，并解码为原始字节|成功断言|失败断言" -->
```ts
import {
  constantTimeEqual,
  hexToBytes,
  hmacSha256,
  hmacSha384,
  hmacSha512,
} from 'gmkitx';

// 1. 准备固定向量：RFC 4231 的 key 与消息保持原样。
const vectorKey = hexToBytes('0b'.repeat(20));
const vectorMessage = 'Hi There';

// 2. 计算 HMAC-SHA-256 并比对 RFC 4231 结果。
if (hmacSha256(vectorKey, vectorMessage)
  !== 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7') {
  throw new Error('HMAC-SHA-256 vector mismatch');
}

// 3. 计算 HMAC-SHA-384 并比对 RFC 4231 结果。
if (hmacSha384(vectorKey, vectorMessage)
  !== 'afd03944d84895626b0825f4ab46907f15f9dadbe4101ec6'
    + '82aa034c7cebc59cfaea9ea9076ede7f4af152e8b2fa9cb6') {
  throw new Error('HMAC-SHA-384 vector mismatch');
}

// 4. 计算 HMAC-SHA-512 并比对 RFC 4231 结果。
if (hmacSha512(vectorKey, vectorMessage)
  !== '87aa7cdea5ef619d4ff0b4241a1d6cb02379f4e2ce4ec278'
    + '7ad0b30545e17cde' + 'daa833b7d6b8a702038b274eaea3f4e4'
    + 'be9d914eeb61f1702e696c203a126854') {
  throw new Error('HMAC-SHA-512 vector mismatch');
}

// 5. 准备业务认证输入：正常订单与篡改金额使用同一 key。
const key = 'merchant-demo-key';
const message = 'order=GMKIT-DEMO-0001&amount=88.00';
const tampered = 'order=GMKIT-DEMO-0001&amount=99.00';

// 6. 计算发送端和接收端 HMAC-SHA-256，并解码为原始字节。
const expectedMac = hexToBytes(hmacSha256(key, message));
const receivedMac = hexToBytes(hmacSha256(key, message));

// 7. 成功断言：相同消息的认证值必须通过常量时间比较。
if (!constantTimeEqual(expectedMac, receivedMac)) {
  throw new Error('HMAC-SHA-256 verification failed');
}

// 8. 失败断言：金额变化后的认证值不得通过比较。
if (constantTimeEqual(expectedMac, hexToBytes(hmacSha256(key, tampered)))) {
  throw new Error('tampered order must not pass HMAC verification');
}
```

## `SHA256`、`SHA384` 与 `SHA512`

三个类具有相同的公开成员，只有算法与输出长度不同。

### 公开成员

<!-- code-reference -->
```ts
new SHA256(outputFormat?: 'hex' | 'base64')
new SHA384(outputFormat?: 'hex' | 'base64')
new SHA512(outputFormat?: 'hex' | 'base64')

SHA256.digest(data: string | Uint8Array, outputFormat?: 'hex' | 'base64'): string
SHA384.digest(data: string | Uint8Array, outputFormat?: 'hex' | 'base64'): string
SHA512.digest(data: string | Uint8Array, outputFormat?: 'hex' | 'base64'): string

update(data: string | Uint8Array): this
digest(): string
reset(): this
setOutputFormat(format: 'hex' | 'base64'): void
getOutputFormat(): 'hex' | 'base64'
```

::: note 静态方法与顶层函数的第二个参数不同
顶层 `sha256(data, { outputFormat })` 使用选项对象；类的静态方法 `SHA256.digest(data, outputFormat)` 直接接收 `hex`/`base64`。把对象传给静态方法会在运行时抛错。
:::

增量实例会立即处理完整分组，只保存尚未凑满一个分组的尾部，适合按块读取大文件或网络流。

<ApiTable label="SHA 增量实例状态" min-width="58rem">

| 调用 | 消息状态 | 输出格式状态 | 返回值 |
|:--|:--|:--|:--|
| `update(data)` | 追加消息 | 不变 | 当前实例，可链式调用 |
| `digest()` | 完成摘要后自动重置 | 保留 | 编码后的摘要字符串 |
| `reset()` | 丢弃累计消息 | 保留 | 当前实例 |
| `setOutputFormat(format)` | 不变 | 修改实例默认值 | `void` |
| `getOutputFormat()` | 不变 | 不变 | 当前 `hex`/`base64` 值 |

</ApiTable>

实例不是并发对象。多个异步任务应各自创建实例；同一实例上的分块顺序就是最终消息的字节顺序。

<!-- code-sample id="api-typescript-sha-07" steps="创建增量 SHA-256 实例|分块计算摘要|增量结果断言|自动重置断言|格式保留断言|主动重置|复用结果断言" -->
```ts
import { OutputFormat, SHA256, sha256 } from 'gmkitx';

// 1. 创建增量 SHA-256 实例：默认输出格式固定为 Hex。
const hasher = new SHA256(OutputFormat.HEX);

// 2. 分块计算摘要：按订单字段顺序追加三段文本。
hasher.update('order=')
  .update('GMKIT-DEMO-0001')
  .update('&amount=88.00');
const incremental = hasher.digest();
const oneShot = sha256('order=GMKIT-DEMO-0001&amount=88.00');

// 3. 增量结果断言：分块摘要必须与一次性摘要一致。
if (incremental !== oneShot) throw new Error('incremental SHA-256 mismatch');

// 4. 自动重置断言：digest() 后同一实例可以处理下一条消息。
if (hasher.update('abc').digest() !== sha256('abc')) {
  throw new Error('SHA-256 instance reuse failed');
}

// 5. 格式保留断言：自动重置不得改变实例输出格式。
if (hasher.getOutputFormat() !== OutputFormat.HEX) {
  throw new Error('SHA-256 output format was not retained');
}

// 6. 主动重置：丢弃尚未完成的消息，并切换为 Base64 输出。
hasher.update('discard this message').reset();
hasher.setOutputFormat(OutputFormat.BASE64);
const base64 = hasher.update('abc').digest();

// 7. 复用结果断言：实例结果必须与静态方法一致。
if (base64 !== SHA256.digest('abc', OutputFormat.BASE64)) {
  throw new Error('SHA-256 Base64 reuse failed');
}
```

## 失败处理速查

<ApiTable label="SHA 失败行为" min-width="62rem">

| API | 失败行为 | 状态影响 | 常见原因 |
|:--|:--|:--|:--|
| 一次性摘要/HMAC | 抛出 `Error` | 无状态 | 输入运行时类型或 `outputFormat` 非法 |
| 类构造器 | 抛出 `Error` | 实例不会创建 | 初始输出格式非法 |
| 静态 `digest` | 抛出 `Error` | 无状态 | 第二个参数不是 `hex`/`base64` |
| 实例 `update` | 抛出底层错误 | 当前实例不应继续复用 | 运行时传入非字符串/字节输入 |
| `setOutputFormat` | 抛出 `Error` | 消息和原输出格式保留 | 输出格式非法 |

</ApiTable>

摘要函数不会用 `false` 表示失败。协议验签或 MAC 比较返回不匹配时，应由调用方明确区分“消息不一致”和“输入编码非法”。

## 安全使用边界

- 普通 SHA 摘要没有密钥，不能替代 HMAC，也不能证明消息来源。
- HMAC key 应来自安全随机源并独立管理；不要使用空 key、短口令或可预测业务编号。
- SHA/HMAC 不能直接保存登录密码；使用带 salt 和成本参数的密码哈希方案。
- 算法由对接协议决定时，摘要名称、输出编码和字符编码都必须写入协议，不能只约定“做 SHA”。
- SHA-384 与 SHA-512 不是“多算几位就一定更安全”的开关；应根据协议、安全等级和对端能力选择。
- Java 主包没有 `cn.gmkit.sha` 封装；Java 对端可使用 JDK `MessageDigest` 和 `Mac` 实现同一数据格式。

## 本页覆盖的公共 API

- 根函数：`sha1`、`sha256`、`sha384`、`sha512`、`hmacSha256`、`hmacSha384`、`hmacSha512`。
- 根类：`SHA1`、`SHA256`、`SHA384`、`SHA512`。
- 类型：`SHAOptions`。
- 命名空间：`sha` 及其中的同名函数和类。

## SHA-1 兼容成员

<details>
<summary>只在核对无法立即迁移的旧数据时展开</summary>

<!-- code-reference -->
```ts
/** @deprecated 只用于旧协议兼容 */
sha1(data: string | Uint8Array, options?: SHAOptions): string

/** @deprecated 只用于旧协议兼容 */
new SHA1(outputFormat?: 'hex' | 'base64')
SHA1.digest(data: string | Uint8Array, outputFormat?: 'hex' | 'base64'): string
```

`sha1('abc')` 的固定结果为 `a9993e364706816aba3e25717850c26c9cd0d89d`。这个向量只能证明实现与旧数据一致，不能说明 SHA-1 适合新安全协议。替换顺序和双算校验方法见[旧系统迁移](/manual/migration.html#sha-1)。

</details>

## 可执行案例

下面的测试源码覆盖 SHA-256 固定摘要、增量复用和 HMAC 篡改断言。站点检查会确认引用区域存在，文档示例任务会执行同一文件。

::: details 查看测试源码
<!-- code-sample id="api-typescript-sha-08" steps="准备输入|计算 SM3 摘要|SM3 重置断言|计算 SM3 HMAC|计算 SHA-256 摘要|SHA-256 重置断言|计算 SHA-256 HMAC" -->
```js
<!-- @include: ../../../examples/node/public-api-manual.mjs#ts-sm3-sha-example -->
```
:::

## 相关页面

- [SHA 算法与 Java JDK 对照](/algorithms/SHA.html)
- [编码、随机数与敏感值比较](./common.html)
- [TypeScript SM3 API](./sm3.html)：国密摘要与 HMAC-SM3
