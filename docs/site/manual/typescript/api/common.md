---
title: TypeScript 公共类型与工具
description: 逐项说明 gmkitx 的常量、编码、随机源、环境、字节、ASN.1 工具和兼容别名。
pageInfo: false
contributors: false
editLink: false
icon: toolbox
order: 1
category:
  - API 说明书
  - TypeScript
tag:
  - 编码
  - RNG
  - ASN.1
  - 类型
---

# TypeScript 公共类型与工具

本页覆盖 `gmkitx` 根入口中不属于单一算法的公开导出：格式常量、输入类型、Hex/Base64/UTF-8、字节运算、随机源、环境探测和 SM2 签名 ASN.1 转换。

这些函数大多不保存状态，但 `setTextCodec`、`configureRNG` 和 `setCustomRNG` 会改变当前模块实例的全局配置。应用应在启动阶段统一配置，不要在并发请求中反复切换。

::: tip 本页适用范围
以下签名和行为按 `gmkitx 0.10.1` 说明。`BytesLike` 只表示“字符串或字节”，字符串究竟是 UTF-8、Hex 还是 Base64，仍由每个 API 参数决定。
:::

::: tip 先看数据边界
如果正在设计传输字段，请先读 [TypeScript 数据、编码与失败边界](/manual/typescript/data.html)。本页用于核对函数签名，不把自动识别当作新协议入口。
:::

## 导入示例

<!-- code-reference -->
```ts
import {
  CipherMode,
  DEFAULT_USER_ID,
  InputFormat,
  OID,
  OutputFormat,
  PaddingMode,
  SM2CipherMode,
  asn1ToXml,
  base64ToBytes,
  bytes4ToUint32BE,
  bytesToBase64,
  bytesToHex,
  bytesToString,
  clearCustomRNG,
  configureRNG,
  constantTimeEqual,
  decodeInput,
  decodeSignature,
  derToRaw,
  encodeOutput,
  encodeSignature,
  getEnvReport,
  getRandomBytes,
  hasCustomRNG,
  hexToBytes,
  isBase64String,
  isHexString,
  normalizeInput,
  rawToDer,
  rotl,
  setCustomRNG,
  setTextCodec,
  signatureToXml,
  stringToBytes,
  uint32ToBytes4BE,
  xor,
} from 'gmkitx';

import type {
  BytesLike,
  CipherModeType,
  EnvReport,
  InputFormatType,
  OutputFormatType,
  PaddingModeType,
  RNGPolicy,
  SM2CipherModeType,
  TextCodec,
} from 'gmkitx';
```

## 公共类型

<!-- code-reference -->
```ts
type BytesLike = string | Uint8Array;
type OutputFormatType = 'hex' | 'base64';
type InputFormatType = 'hex' | 'base64';
type PaddingModeType = 'pkcs7' | 'none' | 'zero';
type CipherModeType = 'ecb' | 'cbc' | 'ctr' | 'cfb' | 'ofb' | 'gcm' | 'ccm';
type SM2CipherModeType = 'C1C3C2' | 'C1C2C3';
type RNGPolicy = 'strict' | 'warn' | 'allow';
```

<ApiTable label="TypeScript 公共类型" min-width="64rem">

| 类型 | 解决的问题 | 不能推断的内容 |
|:--|:--|:--|
| `BytesLike` | 允许 API 同时接收编码字符串和原始字节 | 字符串编码、长度单位、是否可为空 |
| `OutputFormatType` | 限定 Hex/Base64 输出 | 不改变底层密码结果 |
| `InputFormatType` | 限定 Hex/Base64 输入 | 不代表 UTF-8 文本 |
| `PaddingModeType` | 限定 SM4 ECB/CBC 填充 | 流式/AEAD 模式会忽略 padding |
| `CipherModeType` | 限定 SM4 工作模式 | IV、nonce、tag 的具体约束 |
| `SM2CipherModeType` | 限定 SM2 密文分段顺序 | 不改变公钥点编码 |
| `RNGPolicy` | 指定缺少系统 CSPRNG 时的行为 | 不检测自定义 RNG 的随机质量 |

</ApiTable>

例如 `sm3Digest('00ff')` 把参数视为 UTF-8 文本，而 `sm4Encrypt('00ff…', ...)` 的 key 字符串必须是 Hex。阅读具体 API 的参数表，不要根据 `BytesLike` 猜编码。

## 格式、模式和 OID 常量

### 字符串常量对象

<!-- code-reference -->
```ts
OutputFormat.HEX      // 'hex'
OutputFormat.BASE64   // 'base64'

InputFormat.HEX       // 'hex'
InputFormat.BASE64    // 'base64'

PaddingMode.PKCS7     // 'pkcs7'
PaddingMode.NONE      // 'none'
PaddingMode.ZERO      // 'zero'

CipherMode.ECB        // 'ecb'
CipherMode.CBC        // 'cbc'
CipherMode.CTR        // 'ctr'
CipherMode.CFB        // 'cfb'
CipherMode.OFB        // 'ofb'
CipherMode.GCM        // 'gcm'
CipherMode.CCM        // 'ccm'

SM2CipherMode.C1C3C2  // 'C1C3C2'
SM2CipherMode.C1C2C3  // 'C1C2C3'
```

<ApiTable label="格式与模式常量" min-width="64rem">

| 导出 | 用途 | 重要边界 |
|:--|:--|:--|
| `OutputFormat` | 控制公开 API 的字符串输出 | Hex 为小写；Base64 使用标准字符表和填充 |
| `InputFormat` | 指明字符串输入编码 | 不包含 UTF-8，UTF-8 由消息参数自身定义 |
| `PaddingMode` | SM4 ECB/CBC 填充 | ZERO 无法还原原文尾部零字节 |
| `CipherMode` | SM4 七种工作模式 | ECB 只兼容旧协议；GCM/CCM 才带认证 |
| `SM2CipherMode` | SM2 `C1/C2/C3` 排列 | 默认 C1C3C2；旧格式可能使用 C1C2C3 |

</ApiTable>

### `OID`

<!-- code-reference -->
```ts
OID.SM2           // '1.2.156.10197.1.301'
OID.SM2_SM3       // '1.2.156.10197.1.501'
OID.SM3           // '1.2.156.10197.1.401'
OID.SM4           // '1.2.156.10197.1.104'
OID.EC_PUBLIC_KEY // '1.2.840.10045.2.1'
```

`OID` 只提供标识字符串，不解析证书、SubjectPublicKeyInfo 或私钥容器。`EC_PUBLIC_KEY` 用于识别历史通用 EC 标识，不能据此断定曲线一定是 SM2。

### `DEFAULT_USER_ID`

<!-- code-reference -->
```ts
DEFAULT_USER_ID === '1234567812345678'
```

这是当前 SM2 签名兼容默认身份。签名和验签省略 `userId` 时使用它；当前实现传空字符串也会回落到这个值。协议需要独立身份时传非空 UTF-8 `userId`，并确保双方逐字节一致。

## Hex 编码

### `hexToBytes`

<!-- code-reference -->
```ts
hexToBytes(hex: string): Uint8Array
```

把 Hex 文本解码为新字节数组。接受大小写和可选 `0x`/`0X` 前缀，不裁剪空白。空字符串或只有 `0x` 时返回空数组。

::: note 奇数长度会在左侧补一个半字节 0
`hexToBytes('f')` 返回 `0f`，`hexToBytes('abc')` 返回 `0a bc`。需要固定宽度的 key、IV、签名字段仍应先校验精确字符数；不要把这个兼容行为当作协议补齐规则。
:::

非 Hex 字符会抛出 `Error`。

### `bytesToHex`

<!-- code-reference -->
```ts
bytesToHex(bytes: Uint8Array): string
```

按原顺序返回小写 Hex；每个字节固定两个字符，空数组返回空字符串。函数按公开类型假定参数是 `Uint8Array`，不承担运行时结构校验。

<!-- code-sample id="api-typescript-common-08" steps="Hex 解码|Hex 往返断言|奇数长度断言|非法输入断言" -->
```ts
import { bytesToHex, hexToBytes } from 'gmkitx';

// 1. Hex 解码：将协议字符串还原为原始二进制。
const binary = hexToBytes('00ff8041');

// 2. Hex 往返断言：重新编码后必须得到相同的小写字符串。
if (bytesToHex(binary) !== '00ff8041') {
  throw new Error('Hex round-trip failed');
}

// 3. 奇数长度断言：兼容逻辑会在左侧补 0。
if (bytesToHex(hexToBytes('abc')) !== '0abc') {
  throw new Error('odd-length Hex compatibility changed');
}

// 4. 非法输入断言：出现非 Hex 字符时必须抛错。
let rejected = false;
try {
  hexToBytes('0xz1');
} catch {
  rejected = true;
}
if (!rejected) throw new Error('invalid Hex must be rejected');
```

## Base64 编码

### 完整签名

<!-- code-reference -->
```ts
bytesToBase64(bytes: Uint8Array): string
base64ToBytes(base64: string): Uint8Array
```

<ApiTable label="Base64 规则" min-width="62rem">

| 行为 | `bytesToBase64` | `base64ToBytes` |
|:--|:--|:--|
| 字符表 | 标准 RFC 4648 `A-Z a-z 0-9 + /` | 只接受同一标准字符表 |
| 尾部 `=` | 始终生成规范填充 | 允许规范填充，也允许完全省略尾部填充 |
| 空白 | 不生成 | 忽略空格、Tab、CR、LF |
| Base64URL | 不生成 | 拒绝 `-`、`_` |
| 非零 pad bits | 不适用 | 拒绝，避免多个非规范文本映射到同一字节 |
| 空输入 | 返回空字符串 | 返回空数组 |

</ApiTable>

<!-- code-sample id="api-typescript-common-10" steps="准备二进制输入|Base64 编码断言|Base64 解码断言|非规范输入断言" -->
```ts
import { base64ToBytes, bytesToBase64, bytesToHex, hexToBytes } from 'gmkitx';

// 1. 准备二进制输入：包含 NUL、非 ASCII 字节和普通字符。
const binary = hexToBytes('00ff8041');

// 2. Base64 编码断言：结果必须使用标准字符表和规范 padding。
if (bytesToBase64(binary) !== 'AP+AQQ==') {
  throw new Error('Base64 encoding mismatch');
}

// 3. Base64 解码断言：允许省略尾部 padding，但字节必须不变。
if (bytesToHex(base64ToBytes('AP+AQQ')) !== '00ff8041') {
  throw new Error('unpadded Base64 decoding mismatch');
}

// 4. 非规范输入断言：pad bits 非零的 QR== 必须被拒绝。
let rejected = false;
try {
  base64ToBytes('QR==');
} catch {
  rejected = true;
}
if (!rejected) throw new Error('non-canonical Base64 must be rejected');
```

## UTF-8 与自定义 `TextCodec`

### 文本转换函数

<!-- code-reference -->
```ts
stringToBytes(str: string): Uint8Array
bytesToString(bytes: Uint8Array): string
normalizeInput(data: string | Uint8Array): Uint8Array
```

`stringToBytes` 使用自定义 codec、原生 `TextEncoder`、Node `TextEncoder` 或内部 UTF-8 fallback；`bytesToString` 按相同优先级解码。默认解码是宽松 UTF-8，非法序列会产生 U+FFFD 替换字符，不适合无损承载任意二进制。

`normalizeInput` 是算法消息入口的公共规则：字符串转 UTF-8；`Uint8Array` 原样返回同一引用，不复制，也不猜测 Hex。

<!-- code-sample id="api-typescript-common-12" steps="UTF-8 编码|编码结果断言|UTF-8 解码断言|字节输入断言" -->
```ts
import { bytesToHex, bytesToString, normalizeInput, stringToBytes } from 'gmkitx';

// 1. UTF-8 编码：将中文和 emoji 转换为原始字节。
const utf8 = stringToBytes('国密🔐');

// 2. 编码结果断言：字节序列必须与标准 UTF-8 一致。
if (bytesToHex(utf8) !== 'e59bbde5af86f09f9490') {
  throw new Error('UTF-8 encoding mismatch');
}

// 3. UTF-8 解码断言：原始字节必须恢复同一字符串。
if (bytesToString(utf8) !== '国密🔐') {
  throw new Error('UTF-8 decoding mismatch');
}

// 4. 字节输入断言：normalizeInput 不复制 Uint8Array。
const original = Uint8Array.of(0x00, 0xff);
if (normalizeInput(original) !== original) {
  throw new Error('byte input should be returned by reference');
}
```

### `TextCodec` 与 `setTextCodec`

<!-- code-reference -->
```ts
type TextCodec = {
  encode(input: string): Uint8Array;
  decode(bytes: Uint8Array): string;
};

setTextCodec(codec: TextCodec): void
```

这个入口供缺少标准 `TextEncoder`/`TextDecoder` 的小程序或嵌入式宿主注入 UTF-8 实现。调用后会清除内部编码器缓存，并影响后续所有字符串算法输入。

<ApiTable label="自定义 TextCodec 约定" min-width="60rem">

| 项目 | 要求 |
|:--|:--|
| `encode` | 接收 JavaScript 字符串，返回 `Uint8Array` UTF-8；正确处理代理对和非 BMP 字符 |
| `decode` | 接收 UTF-8 字节，返回字符串；明确约定非法序列策略 |
| 生命周期 | 模块级持续生效；当前没有清除函数，可再次 `setTextCodec` 替换 |
| 校验时机 | setter 不验证返回类型；错误会在后续编码/解码调用中暴露 |

</ApiTable>

现代浏览器和 Node 通常不需要调用它。不要使用 `charCodeAt` 截低 8 位冒充 UTF-8，否则中文、emoji 和签名摘要都会跨端不一致。

## 显式输入与输出编码

### 完整签名

<!-- code-reference -->
```ts
decodeInput(
  data: string | Uint8Array,
  inputFormat: 'hex' | 'base64' = 'hex',
): Uint8Array

encodeOutput(
  bytes: Uint8Array,
  outputFormat: 'hex' | 'base64' = 'hex',
): string

isHexString(str: string): boolean
isBase64String(str: string): boolean
```

<ApiTable label="通用编解码函数" min-width="70rem">

| API | 用途 | 精确行为 |
|:--|:--|:--|
| `decodeInput` | 协议已经知道输入编码 | 字符串严格按指定格式；字节输入原样返回，并忽略 `inputFormat` |
| `encodeOutput` | 把字节写成协议字符串 | `base64` 时 Base64；其余运行时值当前回落为 Hex |
| `isHexString` | 语法探测 | 非空且全部为 Hex 字符即 true；奇数长度也 true，不接受 `0x` |
| `isBase64String` | 语法探测 | 非空规范 Base64 才 true；允许可忽略空白和省略尾部填充 |

</ApiTable>

`encodeOutput` 的 TypeScript 类型只允许 `hex`/`base64`，但运行时没有对其他值抛错，而是返回 Hex。跨边界接收动态配置时先自行校验，不要依赖这个回落行为。

<!-- code-sample id="api-typescript-common-15" steps="Base64 解码|Hex 编码断言" -->
```ts
import { InputFormat, OutputFormat, decodeInput, encodeOutput } from 'gmkitx';

// 1. Base64 解码：显式声明输入格式并取得原始字节。
const bytes = decodeInput('AP+AQQ==', InputFormat.BASE64);

// 2. Hex 编码断言：转换后的协议字符串必须等于预期值。
if (encodeOutput(bytes, OutputFormat.HEX) !== '00ff8041') {
  throw new Error('explicit encoding conversion failed');
}
```

## 字节与 32-bit 整数工具

### 完整签名

<!-- code-reference -->
```ts
xor(a: Uint8Array, b: Uint8Array): Uint8Array
rotl(value: number, shift: number): number
bytes4ToUint32BE(bytes: Uint8Array, offset?: number): number
uint32ToBytes4BE(value: number): Uint8Array
constantTimeEqual(
  a: Uint8Array | null | undefined,
  b: Uint8Array | null | undefined,
): boolean
```

<ApiTable label="字节与整数工具行为" min-width="72rem">

| API | 返回值 | 校验与副作用 |
|:--|:--|:--|
| `xor` | 新的等长异或数组 | 长度不同抛错；不修改输入 |
| `rotl` | 无符号 32-bit 循环左移结果 | JavaScript 把 value/shift 转为 32-bit，shift 实际按低 5 bit 使用 |
| `bytes4ToUint32BE` | `0`–`0xffffffff` | 不做边界校验；调用方保证 offset 起至少还有 4 字节 |
| `uint32ToBytes4BE` | 固定 4 字节大端数组 | 写出 value 的低 32-bit 位模式；调用方先校验协议数值范围 |
| `constantTimeEqual` | 内容相同为 true | null/undefined/长度不同为 false；等长时扫描全部字节 |

</ApiTable>

<!-- code-sample id="api-typescript-common-18" steps="字节异或|异或结果断言|大端编码|大端往返断言" -->
```ts
import {
  bytes4ToUint32BE,
  constantTimeEqual,
  uint32ToBytes4BE,
  xor,
} from 'gmkitx';

// 1. 字节异或：两个等长数组逐字节异或并返回新数组。
const left = Uint8Array.of(0x00, 0xff);
const right = Uint8Array.of(0xff, 0x0f);

// 2. 异或结果断言：结果必须等于 ff f0。
if (!constantTimeEqual(xor(left, right), Uint8Array.of(0xff, 0xf0))) {
  throw new Error('xor mismatch');
}

// 3. 大端编码：将 32-bit 数值写成 4 字节数组。
const encoded = uint32ToBytes4BE(0x89abcdef);

// 4. 大端往返断言：重新读取后必须得到原数值。
if (bytes4ToUint32BE(encoded) !== 0x89abcdef) {
  throw new Error('uint32 big-endian round-trip failed');
}
```

`constantTimeEqual` 只避免源码中按内容提前结束；JavaScript JIT 和宿主运行时不保证严格恒时。它适合比较固定长度摘要、MAC 和 tag，但调用方仍应先验证外部数据的编码与期望长度。

## 随机源

### 策略与完整签名

<!-- code-reference -->
```ts
configureRNG(policy: RNGPolicy): void

/** @deprecated 使用 configureRNG */
setRNGPolicy(policy: RNGPolicy): void

setCustomRNG(fn: (length: number) => Uint8Array): void
clearCustomRNG(): void
hasCustomRNG(): boolean
getRandomBytes(length: number = 32): Uint8Array
```

随机源按以下顺序选择：

1. `setCustomRNG` 注入的函数；
2. `globalThis.crypto.getRandomValues`，大于 65,536 字节时自动分块；
3. 可用 CommonJS `require` 的 Node `crypto.randomBytes`；
4. 非密码学安全的兼容降级源。

<ApiTable label="RNGPolicy 行为" min-width="58rem">

| policy | 系统 CSPRNG 不可用时 | 适用场景 |
|:--|:--|:--|
| `strict` | `getRandomBytes` 抛出 `Error` | 生产环境推荐 |
| `warn` | 只警告一次，再返回非安全兼容随机数 | 当前默认，保留旧宿主可运行性 |
| `allow` | 不警告，直接返回非安全兼容随机数 | 只适合明确接受风险的非安全场景 |

</ApiTable>

`configureRNG` 修改模块级策略，但不立即探测随机源；调用 `getRandomBytes` 时才决定。自定义 RNG 优先级最高，即使 policy 是 `strict` 也会先使用它。库只能检查自定义函数的类型和返回长度，不能判断其是否为 CSPRNG。

### 生产启动检查

<!-- code-sample id="api-typescript-common-20" steps="启用严格随机策略|注入状态断言|生成 nonce|长度断言" -->
```ts
import { configureRNG, getRandomBytes, hasCustomRNG } from 'gmkitx';

// 1. 启用严格随机策略：系统 CSPRNG 不可用时直接失败。
configureRNG('strict');

// 2. 注入状态断言：生产启动时不应遗留测试随机源。
if (hasCustomRNG()) {
  throw new Error('unexpected custom RNG in production');
}

// 3. 生成 nonce：请求 12 字节安全随机数。
const nonce = getRandomBytes(12);

// 4. 长度断言：随机源必须返回精确请求长度。
if (nonce.length !== 12) throw new Error('RNG length mismatch');
```

### 受限宿主与测试注入

<!-- code-sample id="api-typescript-common-21" steps="注入测试随机源|生成测试 key|长度断言|清理测试状态" -->
```ts
import { clearCustomRNG, getRandomBytes, setCustomRNG } from 'gmkitx';

// 1. 注入测试随机源：固定输出只用于可重复测试。
setCustomRNG((length) => new Uint8Array(length).fill(0x42));
try {
  // 2. 生成测试 key：确认自定义函数收到并返回精确长度。
  const key = getRandomBytes(16);

  // 3. 长度断言：测试 key 必须为 16 字节。
  if (key.length !== 16) throw new Error('custom RNG length mismatch');
} finally {
  // 4. 清理测试状态：无论断言是否成功都必须移除注入函数。
  clearCustomRNG();
}
```

`setCustomRNG` 不是伪随机种子接口。它要求函数每次返回精确长度的 `Uint8Array`；类型或长度不符由 `getRandomBytes` 抛错。`getRandomBytes` 的 length 必须是正安全整数，`0`、负数、小数、NaN 和 Infinity 都会失败。

## 环境探测

<!-- code-reference -->
```ts
type EnvReport = {
  hasBigInt: boolean;
  hasTextEncoder: boolean;
  hasTextDecoder: boolean;
  hasWebCrypto: boolean;
  hasNodeCrypto: boolean;
};

getEnvReport(): EnvReport
```

<ApiTable label="EnvReport 字段" min-width="62rem">

| 字段 | 为 true 的条件 | 不代表什么 |
|:--|:--|:--|
| `hasBigInt` | 存在全局 `BigInt` | 不检测运算性能 |
| `hasTextEncoder` | 存在全局或可加载的 Node `TextEncoder` | 不反映自定义 `TextCodec` |
| `hasTextDecoder` | 存在全局或可加载的 Node `TextDecoder` | 不反映非法 UTF-8 策略 |
| `hasWebCrypto` | 存在 `crypto.getRandomValues` | 不检测具体实现质量 |
| `hasNodeCrypto` | 当前 CommonJS 环境可用 `require('node:crypto').randomBytes` | Node ESM 中可能为 false，即使 WebCrypto 可用 |

</ApiTable>

`getEnvReport` 是只读快照，不修改 RNG 或文本配置，也不包含 `hasCustomRNG`；自定义 RNG 状态用 `hasCustomRNG()` 查询。

<!-- code-sample id="api-typescript-common-23" steps="读取环境快照|能力检查" -->
```ts
import { getEnvReport } from 'gmkitx';

// 1. 读取环境快照：不修改随机源或文本编码配置。
const env = getEnvReport();

// 2. 能力检查：缺少系统 CSPRNG 时提示宿主注入安全实现。
if (!env.hasWebCrypto && !env.hasNodeCrypto) {
  console.warn('当前宿主需要注入并验证平台 CSPRNG');
}
```

## SM2 签名 ASN.1 / DER

这六个根导出只处理 SM2 raw/DER 签名转换和诊断文本，不是证书、PKCS、密钥容器或任意 ASN.1 schema 的通用解析器。

### 签名转换函数

<!-- code-reference -->
```ts
encodeSignature(
  r: string | Uint8Array,
  s: string | Uint8Array,
): Uint8Array

decodeSignature(signature: Uint8Array): {
  r: string;
  s: string;
}

rawToDer(rawSignature: string | Uint8Array): Uint8Array
derToRaw(derSignature: Uint8Array): string
```

<ApiTable label="SM2 签名 DER 工具" min-width="72rem">

| API | 输入 | 返回 | 关键校验 |
|:--|:--|:--|:--|
| `encodeSignature` | 非空 r、s；字符串必须为偶数长度 Hex | DER SEQUENCE 字节 | 去除冗余前导 0，必要时补正号 00；不强制 32 字节上限 |
| `decodeSignature` | DER 字节 | 最小宽度的小写 Hex `{r,s}` | 只接受一个根 SEQUENCE、恰好两个正 INTEGER、无尾随数据、规范长度/整数 |
| `rawToDer` | 64 字节，或恰好 128 Hex 字符的 `r || s` | DER 字节 | raw 长度必须固定 |
| `derToRaw` | DER 字节 | 128 个小写 Hex 字符 | r、s 各不得超过 32 字节，不足左补 0 |

</ApiTable>

`decodeSignature` 返回的 r/s 不保证各有 64 个字符。例如整数 1 返回 `'01'`。需要固定宽度 raw 签名时使用 `derToRaw`。

<!-- code-sample id="api-typescript-common-25" steps="准备 raw 签名|raw 转 DER|往返断言|DER 结构断言|DER 解码|整数结果断言|非法 DER 断言" -->
```ts
import {
  bytesToHex,
  decodeSignature,
  derToRaw,
  rawToDer,
} from 'gmkitx';

// 1. 准备 raw 签名：r 和 s 各占固定 32 字节。
const raw = `${'01'.padStart(64, '0')}${'02'.padStart(64, '0')}`;

// 2. raw 转 DER：把固定宽度 r || s 编码为 ASN.1 SEQUENCE。
const der = rawToDer(raw);

// 3. 往返断言：DER 转回 raw 后不得改变 r 和 s。
if (derToRaw(der) !== raw) throw new Error('raw/DER conversion failed');

// 4. DER 结构断言：首字节必须是 SEQUENCE 标签 30。
if (!bytesToHex(der).startsWith('30')) throw new Error('DER must start with SEQUENCE');

// 5. DER 解码：分别读取最小宽度的 r 和 s。
const parts = decodeSignature(der);

// 6. 整数结果断言：示例整数必须分别为 01 和 02。
if (parts.r !== '01' || parts.s !== '02') {
  throw new Error('DER INTEGER decoding mismatch');
}

// 7. 非法 DER 断言：根 SEQUENCE 后出现尾随字节必须失败。
let rejected = false;
try {
  derToRaw(Uint8Array.from([...der, 0x00]));
} catch {
  rejected = true;
}
if (!rejected) throw new Error('trailing DER data must be rejected');
```

### 诊断 XML

<!-- code-reference -->
```ts
asn1ToXml(data: Uint8Array, indent: number = 0): string

signatureToXml(
  signature: string | Uint8Array,
  options?: {
    signatureFormat?: 'raw' | 'der' | 'auto';
    inputFormat?: 'hex' | 'base64';
  },
): string
```

<ApiTable label="ASN.1 诊断输出" min-width="70rem">

| API | 默认值 | 用途与限制 |
|:--|:--|:--|
| `asn1ToXml` | `indent = 0` | 展示一个或多个连续 DER TLV；检查边界、规范长度和最多 64 层嵌套，但不理解证书 schema |
| `signatureToXml` | raw + Hex | 展示 SM2 r、s 和 DER TLV；`auto` 只根据首字节是否为 `0x30` 判断 raw/DER |

</ApiTable>

`indent` 必须是 0–64 的安全整数。`signatureFormat: 'auto'` 存在结构歧义：如果 raw 签名第一个字节恰好为 `0x30`，会先按 DER 处理。协议已知格式时总是显式传 `raw` 或 `der`。

<!-- code-sample id="api-typescript-common-27" steps="准备 raw 签名|生成诊断 XML|XML 内容断言" -->
```ts
import { signatureToXml } from 'gmkitx';

// 1. 准备 raw 签名：r 和 s 使用固定测试整数。
const raw = `${'01'.padStart(64, '0')}${'02'.padStart(64, '0')}`;

// 2. 生成诊断 XML：显式声明 raw 签名和 Hex 输入。
const xml = signatureToXml(raw, {
  signatureFormat: 'raw',
  inputFormat: 'hex',
});

// 3. XML 内容断言：根节点、r 和 s 都必须存在。
if (!xml.includes('<SM2Signature>')
  || !xml.includes('<r>01</r>')
  || !xml.includes('<s>02</s>')) {
  throw new Error('signature XML diagnostic output mismatch');
}
```

XML 仅供调试和人工查看，不是稳定交换格式，也不提供 XML→签名的反向 API。

## 兼容成员

<details>
<summary>只在读取无格式历史数据或迁移旧名称时展开</summary>

`autoDecodeString(str: string): Uint8Array` 会先判断非空 Hex，再尝试规范 Base64，最后按 Hex 抛错。`ABC` 因为全部是 Hex 字符，会得到 `0abc`，不会按 Base64 解码。新协议应保存格式字段并调用 `decodeInput`。

<!-- code-sample id="api-typescript-common-16" steps="自动解码" -->
```ts
import { autoDecodeString, bytesToHex } from 'gmkitx';

// 1. 自动解码：只复现无格式旧数据的 Hex 优先规则。
if (bytesToHex(autoDecodeString('ABC')) !== '0abc') {
  throw new Error('auto-decode precedence changed');
}
```

以下根导出仍可运行，但类型声明已标记 `@deprecated`。新代码使用右侧带算法归属的名称。

<ApiTable label="TypeScript 弃用兼容名称" min-width="56rem">

| 旧名称 | 替代名称 | 说明页 |
|:--|:--|:--|
| `generateKeyPair` | `sm2GenerateKeyPair` | [SM2](./sm2.html) |
| `getPublicKeyFromPrivateKey` | `sm2GetPublicKeyFromPrivateKey` | [SM2](./sm2.html) |
| `compressPublicKey` | `sm2CompressPublicKey` | [SM2](./sm2.html) |
| `decompressPublicKey` | `sm2DecompressPublicKey` | [SM2](./sm2.html) |
| `sign` | `sm2Sign` | [SM2](./sm2.html) |
| `verify` | `sm2Verify` | [SM2](./sm2.html) |
| `keyExchange` | `sm2KeyExchange` | [SM2](./sm2.html) |
| `digest` | `sm3Digest` | [SM3](./sm3.html) |
| `hmac` | `sm3Hmac` | [SM3](./sm3.html) |
| `setRNGPolicy` | `configureRNG` | 本页“随机源” |

</ApiTable>

弃用只影响迁移提示，不改变 0.10.1 的运行结果。完整替代步骤见[旧系统迁移](/manual/migration.html)。

</details>

## 失败处理速查

<ApiTable label="TypeScript 公共工具失败行为" min-width="72rem">

| API 家族 | 抛错场景 | 不会自动做的事 |
|:--|:--|:--|
| Hex/Base64 | 非法字符、Base64 长度/填充/pad bits 非规范 | 不识别 Base64URL，不校验业务字段宽度 |
| `decodeInput` | 字符串编码非法、格式枚举非法 | 字节输入不复制，且忽略格式参数 |
| `encodeOutput` | 公开类型内通常不抛错 | 非法运行时格式当前回落 Hex |
| 字节工具 | `xor` 长度不同 | 32-bit 工具不检查 offset/数值业务范围 |
| RNG | policy/length 非法、自定义返回错误、strict 下无 CSPRNG | 不评估自定义 RNG 熵质量 |
| ASN.1 签名 | raw 长度、DER 标签/长度/整数/边界非法 | 不解析证书、密钥容器或任意 ASN.1 schema |

</ApiTable>

## 本页覆盖的公共 API

- 类型：`BytesLike`、`OutputFormatType`、`InputFormatType`、`PaddingModeType`、`CipherModeType`、`SM2CipherModeType`、`RNGPolicy`、`TextCodec`、`EnvReport`。
- 常量：`OutputFormat`、`InputFormat`、`PaddingMode`、`CipherMode`、`SM2CipherMode`、`OID`、`DEFAULT_USER_ID`。
- 编码：`hexToBytes`、`bytesToHex`、`base64ToBytes`、`bytesToBase64`、`stringToBytes`、`bytesToString`、`normalizeInput`、`decodeInput`、`encodeOutput`、`autoDecodeString`、`isHexString`、`isBase64String`、`setTextCodec`。
- 字节：`xor`、`rotl`、`bytes4ToUint32BE`、`uint32ToBytes4BE`、`constantTimeEqual`。
- 随机与环境：`configureRNG`、`setRNGPolicy`、`setCustomRNG`、`clearCustomRNG`、`hasCustomRNG`、`getRandomBytes`、`getEnvReport`。
- ASN.1：`encodeSignature`、`decodeSignature`、`rawToDer`、`derToRaw`、`asn1ToXml`、`signatureToXml`。
- 无算法前缀兼容名称：`generateKeyPair`、`getPublicKeyFromPrivateKey`、`compressPublicKey`、`decompressPublicKey`、`sign`、`verify`、`keyExchange`、`digest`、`hmac`。

## 可执行案例

下面的测试源码覆盖显式编码、非法 Hex 和 raw/DER 签名往返。站点检查会确认引用区域存在，文档示例任务会执行同一文件。

::: details 查看测试源码
<!-- code-sample id="api-typescript-common-28" steps="Base64 解码|Hex 编码断言|非法输入断言|签名格式转换|往返断言" -->
```js
<!-- @include: ../../../examples/node/public-api-manual.mjs#ts-common-example -->
```
:::

## 相关页面

- [跨语言编码、错误与安全约定](/api/common.html)
- [TypeScript SM2 API](./sm2.html)
- [TypeScript SM4 API](./sm4.html)
- [API 稳定性规则](https://github.com/gmkits/gmkit/blob/main/docs/API_STABILITY.md)
