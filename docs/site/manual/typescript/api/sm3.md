---
title: TypeScript SM3 API
description: 逐项说明 gmkitx 的 SM3 摘要、HMAC、增量状态、输出编码和复用行为。
pageInfo: false
contributors: false
editLink: false
icon: fingerprint
order: 3
category:
  - API 说明书
  - TypeScript
tag:
  - SM3
  - HMAC
  - 摘要
---

# TypeScript SM3 API

SM3 把任意长度消息映射为固定 256 bit（32 字节）摘要。`gmkitx` 提供一次性摘要、HMAC-SM3、自动复用的 `SM3` 类，以及命名空间中的低层增量状态。

摘要只能判断内容是否一致，不能证明消息来自谁。需要共享密钥认证时使用 HMAC-SM3；需要数字签名时使用 SM2。

::: tip 本页适用范围
以下签名和默认值按 `gmkitx 0.10.1` 说明。字符串消息与字符串 HMAC key 均按 UTF-8 编码，不会自动解释为 Hex。
:::

::: tip 先运行完整案例
固定摘要、HMAC、增量状态和金额篡改断言见 [TypeScript 摘要与 HMAC 使用手册](/manual/typescript/digest-hmac.html)。
:::

## 导入与入口选择

<!-- code-reference -->
```ts
import {
  OutputFormat,
  SM3,
  constantTimeEqual,
  hexToBytes,
  sm3,
  sm3Digest,
  sm3Hmac,
} from 'gmkitx';

import type { SM3Options } from 'gmkitx';
```

<ApiTable label="SM3 入口选择" min-width="54rem">

| 使用方式 | 入口 | 适用场景 | 调用后的状态 |
|:--|:--|:--|:--|
| 一次性摘要 | `sm3Digest` / `sm3.digest` | 已经拿到整段消息 | 不保存状态 |
| 一次性 HMAC | `sm3Hmac` / `sm3.hmac` | 已经拿到完整 key 和消息 | 不保存状态 |
| 增量封装 | `new SM3()` | 分块读取文件、网络流或大消息 | `digest()` 后自动清空消息状态 |
| 低层增量状态 | `new sm3.SM3HashState()` | 需要直接取得 32 字节摘要 | `digestBytes()` 后保持完成状态，必须手动 `reset()` |

</ApiTable>

根入口中的无前缀 `digest`、`hmac` 是弃用别名，分别改用 `sm3Digest`、`sm3Hmac`。命名空间还保留 `sm3.sm3Digest` 兼容名称，新代码使用 `sm3.digest`。

## 输入与输出约定

<ApiTable label="SM3 输入输出约定" min-width="52rem">

| 位置 | `string` | `Uint8Array` | 备注 |
|:--|:--|:--|:--|
| `data` | UTF-8 文本 | 原始消息字节 | 空消息合法 |
| HMAC `key` | UTF-8 文本 | 原始 key 字节 | 不自动识别 Hex/Base64 |
| 默认输出 | 64 个小写 Hex 字符 | 不适用 | 表示 32 字节摘要 |
| Base64 输出 | 44 个标准 Base64 字符 | 不适用 | 末尾通常包含 `=` 填充 |

</ApiTable>

同一可见字符串只有在两端使用相同字符编码时才会得到相同摘要。二进制协议应直接传 `Uint8Array`，不要先经过字符串转换。

## 一次性摘要

### 公开签名

<!-- code-reference -->
```ts
interface SM3Options {
  outputFormat?: 'hex' | 'base64';
}

sm3Digest(
  data: string | Uint8Array,
  options?: SM3Options,
): string
```

| 参数 | 必填 | 默认值 | 说明 |
|:--|:--:|:--|:--|
| `data` | 是 | 无 | UTF-8 字符串或原始字节 |
| `options.outputFormat` | 否 | `OutputFormat.HEX` | `hex` 或 `base64` |

函数总是返回字符串。空字符串会计算标准 SM3 空消息摘要；输出格式不是 `hex`/`base64` 时抛出 `Error`。

<!-- code-sample id="api-typescript-sm3-03" steps="计算摘要|固定向量断言|Base64 编码|Base64 结果断言|字节输入摘要|输入等价断言" -->
```ts
import { OutputFormat, sm3Digest } from 'gmkitx';

// 1. 计算摘要：使用标准输入 abc 计算 Hex 格式 SM3。
const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
const actual = sm3Digest('abc');

// 2. 固定向量断言：摘要必须与标准结果一致。
if (actual !== expected) throw new Error('SM3 vector mismatch');

// 3. Base64 编码：只改变摘要文本表示，不改变摘要字节。
const base64 = sm3Digest('abc', { outputFormat: OutputFormat.BASE64 });

// 4. Base64 结果断言：编码结果必须与同一摘要字节一致。
if (base64 !== 'Zsfw9GLu7dnR8tRr3BDk4kFnxIdc8veiKX2gK49LqOA=') {
  throw new Error('SM3 Base64 output mismatch');
}

// 5. 字节输入摘要：将 abc 显式编码为 UTF-8 后重新计算。
const utf8 = new TextEncoder().encode('abc');

// 6. 输入等价断言：UTF-8 字节与字符串输入必须得到相同摘要。
if (sm3Digest(utf8) !== actual) throw new Error('SM3 UTF-8 mismatch');
```

## HMAC-SM3

### 公开签名

<!-- code-reference -->
```ts
sm3Hmac(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SM3Options,
): string
```

HMAC-SM3 用共享密钥认证消息内容。key 超过 64 字节时会先做一次 SM3；较短 key 会按 HMAC 规则补齐到 64 字节。API 接受空 key，但业务协议不应使用低熵、可猜测或空密钥。

<ApiTable label="HMAC-SM3 参数" min-width="48rem">

| 参数 | 必填 | 默认值 | 说明 |
|:--|:--:|:--|:--|
| `key` | 是 | 无 | UTF-8 字符串或原始 key 字节 |
| `data` | 是 | 无 | UTF-8 字符串或原始消息字节 |
| `options.outputFormat` | 否 | `hex` | 返回 Hex 或 Base64 字符串 |

</ApiTable>

<!-- code-sample id="api-typescript-sm3-05" steps="准备认证输入|计算 HMAC-SM3|成功断言|计算篡改消息 HMAC|失败断言" -->
```ts
import {
  constantTimeEqual,
  hexToBytes,
  sm3Hmac,
} from 'gmkitx';

// 1. 准备认证输入：正常订单与篡改金额使用同一 HMAC key。
const key = 'merchant-demo-key';
const message = 'order=GMKIT-DEMO-0001&amount=88.00';
const tampered = 'order=GMKIT-DEMO-0001&amount=99.00';

// 2. 计算 HMAC-SM3：发送端和接收端分别计算认证值。
const expectedMac = sm3Hmac(key, message);
const receivedMac = sm3Hmac(key, message);

// 3. 成功断言：比较解码后的字节，避免字符串比较提前结束。
if (!constantTimeEqual(hexToBytes(expectedMac), hexToBytes(receivedMac))) {
  throw new Error('HMAC-SM3 verification failed');
}

// 4. 计算篡改消息 HMAC：金额变化后重新计算认证值。
const tamperedMac = sm3Hmac(key, tampered);

// 5. 失败断言：篡改消息的认证值不得通过比较。
if (constantTimeEqual(hexToBytes(expectedMac), hexToBytes(tamperedMac))) {
  throw new Error('tampered message must produce a different MAC');
}
```

库没有单独的 `verifyHmac` 函数。接收外部 MAC 时，应先按协议指定的 Hex/Base64 解码为字节，确认长度为 32 字节，再用 `constantTimeEqual` 比较。

## `SM3` 增量类

### 公开成员

<!-- code-reference -->
```ts
new SM3(outputFormat?: 'hex' | 'base64')

SM3.digest(
  data: string | Uint8Array,
  options?: SM3Options,
): string

SM3.hmac(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SM3Options,
): string

update(data: string | Uint8Array): this
digest(options?: SM3Options): string
reset(): this
setOutputFormat(format: 'hex' | 'base64'): void
getOutputFormat(): 'hex' | 'base64'
```

`SM3.digest`、`SM3.hmac` 是一次性函数的静态写法。实例方法用于分块摘要：完整的 64 字节分组会立即处理，内部最多保留 63 字节尾块，因此内存占用不随累计消息长度线性增长。

<ApiTable label="SM3 实例状态变化" min-width="58rem">

| 调用 | 消息状态 | 输出格式状态 | 返回值 |
|:--|:--|:--|:--|
| `update(data)` | 追加消息 | 不变 | 当前实例，可链式调用 |
| `digest()` | 完成摘要后自动重置 | 保留 | 摘要字符串 |
| `digest({ outputFormat })` | 完成摘要后自动重置 | 实例默认值不变 | 本次使用指定格式 |
| `reset()` | 丢弃累计消息 | 保留 | 当前实例 |
| `setOutputFormat(format)` | 不变 | 修改实例默认值 | `void` |

</ApiTable>

如果 `digest({ outputFormat })` 收到非法输出格式，它会在完成摘要之前抛错，当前累计消息仍可继续使用或手动重置。实例不是并发对象；多个异步任务应各自创建实例。

<!-- code-sample id="api-typescript-sm3-07" steps="创建增量实例|分块计算摘要|增量结果断言|自动重置断言|格式保留断言|主动重置|主动重置断言" -->
```ts
import { OutputFormat, SM3, sm3Digest } from 'gmkitx';

// 1. 创建增量实例：输出格式固定为 Hex。
const hasher = new SM3(OutputFormat.HEX);

// 2. 分块计算摘要：按业务字段顺序追加三段文本。
hasher.update('order=')
  .update('GMKIT-DEMO-0001')
  .update('&amount=88.00');
const incremental = hasher.digest();
const oneShot = sm3Digest('order=GMKIT-DEMO-0001&amount=88.00');

// 3. 增量结果断言：分块摘要必须与一次性摘要一致。
if (incremental !== oneShot) throw new Error('incremental SM3 mismatch');

// 4. 自动重置断言：digest() 后同一实例可以处理下一条消息。
if (hasher.update('abc').digest() !== sm3Digest('abc')) {
  throw new Error('SM3 instance reuse failed');
}

// 5. 格式保留断言：自动重置不得改变实例输出格式。
if (hasher.getOutputFormat() !== OutputFormat.HEX) {
  throw new Error('SM3 output format was not retained');
}

// 6. 主动重置：丢弃尚未完成的消息，再计算 abc。
hasher.update('discard this message').reset();

// 7. 主动重置断言：丢弃旧状态后必须得到标准 abc 摘要。
if (hasher.update('abc').digest() !== sm3Digest('abc')) {
  throw new Error('SM3 reset failed');
}
```

## 低层 `SM3HashState`

`SM3HashState` 通过 `sm3` 命名空间公开，不是根级具名导出。一般业务使用 `SM3` 类即可；需要直接取得原始 32 字节摘要时才使用低层状态。

<!-- code-reference -->
```ts
new sm3.SM3HashState()

update(data: string | Uint8Array): this
digestBytes(): Uint8Array
reset(): this
```

它与 `SM3` 类最重要的差异是：`digestBytes()` 完成后不会自动重置。再次调用 `digestBytes()`，或在未 `reset()` 时继续 `update()`，都会抛出 `Error`。

<!-- code-sample id="api-typescript-sm3-09" steps="创建低层状态并分块计算 abc 的原始摘要字节|摘要长度断言|已完成状态断言|显式重置|复用结果断言" -->
```ts
import { sm3, sm3Digest } from 'gmkitx';

// 1. 创建低层状态并分块计算 abc 的原始摘要字节。
const state = new sm3.SM3HashState();
const rawDigest = state.update('a').update('bc').digestBytes();

// 2. 摘要长度断言：SM3 原始结果固定为 32 字节。
if (rawDigest.length !== 32) throw new Error('SM3 raw digest length mismatch');

// 3. 已完成状态断言：digestBytes() 后继续 update 必须抛错。
let finalizedRejected = false;
try {
  state.update('next message');
} catch {
  finalizedRejected = true;
}
if (!finalizedRejected) throw new Error('finalized SM3 state must reject update');

// 4. 显式重置：低层状态必须手动 reset 后才能复用。
state.reset();
const reused = state.update('abc').digestBytes();

// 5. 复用结果断言：重置后的原始字节必须匹配高层摘要。
if (Array.from(reused, (value) => value.toString(16).padStart(2, '0')).join('')
  !== sm3Digest('abc')) {
  throw new Error('SM3HashState reuse failed');
}
```

## 安全使用边界

- SM3 摘要不是加密，无法从摘要恢复原文，但也不能证明消息来源。
- HMAC key 应由安全随机源生成并独立管理，不要直接使用用户密码或固定短文本。
- 不要用一次 SM3/HMAC 保存登录密码；使用带 salt 和成本参数的密码哈希方案。
- 对外部 MAC 先校验编码和长度，再进行不提前结束的字节比较。
- JavaScript 对象不适合由多个并发任务共同更新；流式任务一条消息对应一个状态实例。

## 失败处理速查

| API | 失败行为 | 常见原因 |
|:--|:--|:--|
| `sm3Digest` / `sm3Hmac` | 抛出 `Error` | 输入类型或 `outputFormat` 非法 |
| `SM3.update` | 抛出 `Error` | 运行时传入非字符串/字节输入 |
| `SM3.digest` | 抛出 `Error` | 本次输出格式非法；失败时消息状态保留 |
| `SM3HashState.update` | 抛出 `Error` | 状态已完成且未 reset |
| `SM3HashState.digestBytes` | 抛出 `Error` | 同一 reset 周期重复完成摘要 |

## 本页覆盖的公共 API

- 根导出：`sm3Digest`、`sm3Hmac`、`SM3`、`SM3Options`。
- 命名空间成员：`sm3.digest`、`sm3.hmac`、`sm3.SM3`、`sm3.SM3HashState` 和兼容名称 `sm3.sm3Digest`。
- 弃用根别名：`digest`、`hmac`。

## 可执行案例

下面的测试源码覆盖固定摘要、增量实例复用和 HMAC 篡改断言。站点检查会确认引用区域存在，文档示例任务会执行同一文件。

::: details 查看测试源码
<!-- code-sample id="api-typescript-sm3-10" steps="准备输入|计算 SM3 摘要|SM3 重置断言|计算 SM3 HMAC|计算 SHA-256 摘要|SHA-256 重置断言|计算 SHA-256 HMAC" -->
```js
<!-- @include: ../../../examples/node/public-api-manual.mjs#ts-sm3-sha-example -->
```
:::

## 相关页面

- [跨语言 SM3 协议与固定向量](/algorithms/SM3.html)
- [编码与敏感值比较](./common.html)
- [TypeScript SM2 API](./sm2.html)：使用 SM3 绑定身份的数字签名
