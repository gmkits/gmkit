---
title: TypeScript SM2 API
description: 逐项说明 gmkitx 的 SM2 密钥、加解密、签名验签、密钥交换和对象式 API。
pageInfo: false
contributors: false
editLink: false
icon: key
order: 2
category:
  - API 说明书
  - TypeScript
tag:
  - SM2
  - 加密
  - 签名
  - 密钥交换
---

# TypeScript SM2 API

`gmkitx` 的 SM2 模块提供密钥生成、公钥派生与压缩、加解密、签名验签和密钥交换。一次性操作优先使用 `sm2*` 具名函数；需要在多个操作之间持有密钥时使用 `SM2` 类。

SM2 适合数字签名、小体积密钥材料加密和协议级密钥交换。文件、图片或大段业务数据应由 SM4-GCM/CCM 处理，再用 SM2 保护随机会话密钥。

::: tip 本页适用范围
以下签名和默认值按 `gmkitx 0.10.1` 说明。字符串消息统一按 UTF-8 编码；Hex、Base64 和原始字节的区别会在各接口下单独标明。
:::

::: tip 先完成一条可运行链路
第一次接入请先按 [TypeScript SM2 使用手册](/manual/typescript/sm2.html) 完成 DER/Base64 签名验签、C1C3C2/Base64 加解密和失败断言，再回到本页核对参数。
:::

## 导入与入口选择

<!-- code-sample id="api-typescript-sm2-01" steps="配置随机源" -->
```ts
import {
  DEFAULT_USER_ID,
  InputFormat,
  OutputFormat,
  SM2,
  SM2CipherMode,
  configureRNG,
  sm2,
  sm2CompressPublicKey,
  sm2Decrypt,
  sm2DecryptBytes,
  sm2DecompressPublicKey,
  sm2Encrypt,
  sm2GenerateKeyPair,
  sm2GetPublicKeyFromPrivateKey,
  sm2KeyExchange,
  sm2Sign,
  sm2Verify,
} from 'gmkitx';

import type {
  KeyPair,
  SignOptions,
  SM2CurveParams,
  SM2DecryptOptions,
  SM2EncryptOptions,
  SM2KeyExchangeParams,
  SM2KeyExchangeResult,
  SM2SignatureFormat,
  SM2SignatureInputFormat,
  VerifyOptions,
} from 'gmkitx';

// 1. 配置随机源：生产环境缺少系统 CSPRNG 时直接失败。
configureRNG('strict');
```

<ApiTable label="SM2 入口选择" min-width="52rem">

| 使用方式 | 入口 | 适用场景 | 状态 |
|:--|:--|:--|:--|
| 具名函数 | `sm2GenerateKeyPair`、`sm2Encrypt`、`sm2Sign` 等 | 一次性调用、按需导入 | 不保存密钥或消息状态 |
| 算法命名空间 | `sm2.generateKeyPair`、`sm2.encrypt`、`sm2.SM2` | 需要把整组算法注入其他模块 | 与对应具名函数行为相同 |
| 对象式 API | `SM2` | 同一密钥连续执行加密、解密、签名或验签 | 保存密钥和曲线兼容声明 |

</ApiTable>

命名空间中的函数名不带 `sm2` 前缀，例如 `sm2Encrypt(...)` 对应 `sm2.encrypt(...)`。本页以具名函数为主，两种入口的参数、返回值和失败行为相同。

## 输入、编码与随机源

同样是 `string`，在不同参数位置表示的内容不同：

<ApiTable label="SM2 输入解释规则" min-width="54rem">

| 参数位置 | `string` 的解释 | `Uint8Array` 的解释 | 建议 |
|:--|:--|:--|:--|
| `data` 消息或明文 | UTF-8 文本 | 原始消息字节 | 跨语言协议先固定字符编码 |
| 私钥 | Hex，可带 `0x` 前缀 | 32 字节私钥 | 传输和存储时固定为 64 个 Hex 字符 |
| 公钥 | 压缩或非压缩点的 Hex，可带 `0x` 前缀 | 33 或 65 字节点编码 | 协议中明确是否压缩 |
| 密文、签名 | 协议指定的 Hex 或 Base64 | 已解码的原始字节 | 外部字符串调用显式传 `inputFormat` |
| `userId` | UTF-8 文本 | 不接受字节数组 | 签名端和验签端使用同一非空值 |

</ApiTable>

已发布接口允许省略部分输入格式。该行为只用于读取旧数据；新协议必须显式保存并传入编码。兼容优先级见[旧系统迁移](/manual/migration.html#密文和签名自动识别)。

密钥生成、加密、签名以及未提供临时私钥的密钥交换都需要安全随机数。浏览器通常使用 Web Crypto，Node.js 使用系统密码学随机源；受限运行环境应先注入平台 CSPRNG，详见[随机源 API](./common.html#随机源)。

## 密钥与公钥格式

### 公开签名

<!-- code-reference -->
```ts
interface KeyPair {
  publicKey: string;
  privateKey: string;
}

sm2GenerateKeyPair(compressed?: boolean): KeyPair

sm2GetPublicKeyFromPrivateKey(
  privateKey: string | Uint8Array,
  compressed?: boolean,
): string

sm2CompressPublicKey(publicKey: string | Uint8Array): string
sm2DecompressPublicKey(publicKey: string | Uint8Array): string
```

<ApiTable label="SM2 密钥函数参数" min-width="52rem">

| API | 参数 | 默认值 | 返回值 |
|:--|:--|:--|:--|
| `sm2GenerateKeyPair` | `compressed?: boolean` | `false` | 新生成的 `KeyPair` |
| `sm2GetPublicKeyFromPrivateKey` | `privateKey`、`compressed?` | `compressed = false` | 从私钥派生的公钥 Hex |
| `sm2CompressPublicKey` | 压缩或非压缩公钥 | 无 | 33 字节压缩公钥的 66 字符 Hex |
| `sm2DecompressPublicKey` | 压缩或非压缩公钥 | 无 | 65 字节非压缩公钥的 130 字符 Hex |

</ApiTable>

| 数据 | 编码与长度 |
|:--|:--|
| 私钥 | 32 字节标量；标准字符串表示为 64 个 Hex 字符 |
| 非压缩公钥 | 65 字节：`04 \|\| x \|\| y` |
| 压缩公钥 | 33 字节：`02/03 \|\| x` |
| 函数返回的 Hex | 小写、不带 `0x` 前缀 |

字符串私钥短于 64 个 Hex 字符时会在左侧补零，这是兼容行为；长于 64 个字符、包含非 Hex 字符或标量越界时会抛出 `Error`。公钥会校验长度、`02`/`03`/`04` 前缀和曲线点合法性。

<!-- code-sample id="api-typescript-sm2-03" steps="生成密钥对|密钥长度断言|派生公钥|公钥断言|压缩公钥|压缩长度断言|解压公钥" -->
```ts
import {
  sm2CompressPublicKey,
  sm2DecompressPublicKey,
  sm2GenerateKeyPair,
  sm2GetPublicKeyFromPrivateKey,
} from 'gmkitx';

// 1. 生成密钥对：默认返回 32 字节私钥和 65 字节非压缩公钥。
const keys = sm2GenerateKeyPair();

// 2. 密钥长度断言：Hex 长度必须分别为 64 和 130。
if (keys.privateKey.length !== 64 || keys.publicKey.length !== 130) {
  throw new Error('SM2 key length mismatch');
}

// 3. 派生公钥：从私钥重新计算非压缩公钥。
const derived = sm2GetPublicKeyFromPrivateKey(keys.privateKey);

// 4. 公钥断言：派生结果必须与密钥对中的公钥一致。
if (derived !== keys.publicKey) {
  throw new Error('SM2 public key derivation failed');
}

// 5. 压缩公钥：65 字节非压缩点转换为 33 字节压缩点。
const compressed = sm2CompressPublicKey(keys.publicKey);

// 6. 压缩长度断言：压缩公钥 Hex 长度必须为 66。
if (compressed.length !== 66) throw new Error('compressed key length mismatch');

// 7. 解压公钥：恢复非压缩点并比对同一个曲线点。
if (sm2DecompressPublicKey(compressed) !== keys.publicKey) {
  throw new Error('SM2 public key round-trip failed');
}
```

## 加密与解密

### 公开签名

<!-- code-reference -->
```ts
interface SM2EncryptOptions {
  mode?: 'C1C3C2' | 'C1C2C3';
  outputFormat?: 'hex' | 'base64';
}

interface SM2DecryptOptions {
  mode?: 'C1C3C2' | 'C1C2C3';
  inputFormat?: 'hex' | 'base64';
}

sm2Encrypt(
  publicKey: string | Uint8Array,
  data: string | Uint8Array,
  options?: SM2EncryptOptions,
): string

sm2Decrypt(
  privateKey: string | Uint8Array,
  encryptedData: string | Uint8Array,
  options?: SM2DecryptOptions,
): string

sm2DecryptBytes(
  privateKey: string | Uint8Array,
  encryptedData: string | Uint8Array,
  options?: SM2DecryptOptions,
): Uint8Array
```

`sm2Encrypt` 解决“小体积数据需要由接收方公钥保护”的问题。它不适合文件或大消息，也不提供流式接口。每次调用都会生成新的临时标量，因此同一公钥和明文的密文通常不同。

### 密文结构与选项

<ApiTable label="SM2 加解密选项" min-width="56rem">

| 选项 | 加密默认值 | 解密默认值 | 说明 |
|:--|:--|:--|:--|
| `mode` | `SM2CipherMode.C1C3C2` | 先试 C1C3C2，再试 C1C2C3 | 线上协议建议两端显式固定排列 |
| `outputFormat` | `OutputFormat.HEX` | 不适用 | 输出小写 Hex 或标准 Base64 |
| `inputFormat` | 不适用 | 自动识别 | 显式选择 Hex 或 Base64；字节输入不再解码 |

</ApiTable>

| 排列 | 字节结构 | 使用建议 |
|:--|:--|:--|
| C1C3C2 | `C1 \|\| C3 \|\| C2` | 当前默认值，新协议优先使用 |
| C1C2C3 | `C1 \|\| C2 \|\| C3` | 只用于对接采用旧排列的系统 |

本库加密端固定输出 65 字节非压缩 C1、32 字节 C3，以及与明文等长的 C2。原始密文总长度为 `97 + 明文字节数`。加密端不输出 ASN.1 密文；解密端可以识别首字节为 `0x30` 的 ASN.1 `SEQUENCE { x, y, hash, cipher }` 密文，也能读取以 `02`/`03` 开头的压缩 C1。

`sm2Decrypt` 将明文字节按 UTF-8 解码。图片、压缩数据、协议包以及可能包含无效 UTF-8 的内容必须使用 `sm2DecryptBytes`，否则文本解码器可能替换无法解码的字节。

### 文本、二进制与失败断言

<!-- code-sample id="api-typescript-sm2-05" steps="生成 SM2 密钥对并准备 UTF-8 订单明文|SM2 文本加密|SM2 文本解密|文本往返断言|准备二进制输入|SM2 二进制加密|SM2 二进制解密|二进制往返断言|构造篡改密文|失败断言" -->
```ts
import {
  InputFormat,
  OutputFormat,
  SM2CipherMode,
  sm2Decrypt,
  sm2DecryptBytes,
  sm2Encrypt,
  sm2GenerateKeyPair,
} from 'gmkitx';

// 1. 生成 SM2 密钥对并准备 UTF-8 订单明文。
const keys = sm2GenerateKeyPair();
const message = 'order=GMKIT-DEMO-0001&amount=88.00';

// 2. SM2 文本加密：显式固定 C1C3C2 排列和 Hex 编码。
const ciphertext = sm2Encrypt(keys.publicKey, message, {
  mode: SM2CipherMode.C1C3C2,
  outputFormat: OutputFormat.HEX,
});

// 3. SM2 文本解密：使用相同排列和编码恢复 UTF-8 文本。
const restored = sm2Decrypt(keys.privateKey, ciphertext, {
  mode: SM2CipherMode.C1C3C2,
  inputFormat: InputFormat.HEX,
});

// 4. 文本往返断言：解密结果必须等于订单原文。
if (restored !== message) throw new Error('SM2 text round-trip failed');

// 5. 准备二进制输入：包含无法安全经过普通文本转换的字节。
const binary = Uint8Array.of(0x00, 0xff, 0x80, 0x41);

// 6. SM2 二进制加密：原始字节直接进入加密函数。
const binaryCiphertext = sm2Encrypt(keys.publicKey, binary);

// 7. SM2 二进制解密：使用字节返回接口恢复原始数据。
const binaryRestored = sm2DecryptBytes(keys.privateKey, binaryCiphertext);

// 8. 二进制往返断言：长度和每个字节都必须一致。
if (binaryRestored.length !== binary.length
  || binaryRestored.some((value, index) => value !== binary[index])) {
  throw new Error('SM2 binary round-trip failed');
}

// 9. 构造篡改密文：修改最后一个字节以破坏 C3 完整性校验。
const damaged = `${ciphertext.slice(0, -2)}${ciphertext.endsWith('00') ? '01' : '00'}`;
let rejected = false;

// 10. 失败断言：篡改密文必须抛错，不能返回部分明文。
try {
  sm2Decrypt(keys.privateKey, damaged, { inputFormat: InputFormat.HEX });
} catch {
  rejected = true;
}
if (!rejected) throw new Error('tampered SM2 ciphertext must be rejected');
```

加密会拒绝空明文。加密、解密可能因为随机源、密钥、模式、编码、C1 曲线点、密文长度、ASN.1 结构或 C3 校验无效而抛出 `Error`；解密失败不会返回部分明文。

## 签名与验签

### 公开签名

<!-- code-reference -->
```ts
type SM2SignatureFormat = 'raw' | 'der';
type SM2SignatureInputFormat = 'raw' | 'der' | 'auto';

interface SignOptions {
  signatureFormat?: SM2SignatureFormat;
  outputFormat?: 'hex' | 'base64';
  userId?: string;
  curveParams?: SM2CurveParams;
}

interface VerifyOptions {
  signatureFormat?: SM2SignatureInputFormat;
  inputFormat?: 'hex' | 'base64';
  userId?: string;
  curveParams?: SM2CurveParams;
}

sm2Sign(
  privateKey: string | Uint8Array,
  data: string | Uint8Array,
  options?: SignOptions,
): string

sm2Verify(
  publicKey: string | Uint8Array,
  data: string | Uint8Array,
  signature: string | Uint8Array,
  options?: VerifyOptions,
): boolean
```

`sm2Sign` 对消息和用户身份产生 SM2 签名；`sm2Verify` 判断签名、消息、公钥和用户身份是否匹配。它们不负责证书链、密钥归属或业务授权判断。

### 签名选项

<ApiTable label="SM2 签名选项" min-width="58rem">

| 选项 | 签名默认值 | 验签默认值 | 说明 |
|:--|:--|:--|:--|
| `signatureFormat` | `raw` | `raw` | raw 固定 64 字节 `r \|\| s`；DER 为可变长度 ASN.1 SEQUENCE |
| `outputFormat` | `hex` | 不适用 | raw/DER 字节再编码为 Hex 或 Base64 |
| `inputFormat` | 不适用 | 自动识别 | 字符串签名的 Hex/Base64 外层编码 |
| `userId` | `DEFAULT_USER_ID` | `DEFAULT_USER_ID` | 省略或空字符串均使用 `1234567812345678` |
| `curveParams` | 标准曲线 | 标准曲线 | 只接受与标准参数相同的兼容声明 |

</ApiTable>

`userId` 先编码为 UTF-8，再参与 Z 值计算；编码后必须少于 8192 字节。空字符串会回落到 `DEFAULT_USER_ID`，当前 API 不能用空字符串表达一个独立身份。签名端和验签端必须使用完全相同的消息字节和非空 user ID。

验签只有在显式传入 `signatureFormat: 'auto'` 时才自动判断 raw/DER。固定协议应直接传 `raw` 或 `der`，避免把错误格式误当成另一种格式处理。

### 返回值与错误语义

- `sm2Sign` 成功时返回签名字符串；私钥、随机源、输出格式、user ID 或曲线声明无效时抛出 `Error`。
- `sm2Verify` 成功时返回 `true`。
- 消息或 user ID 不一致、签名被篡改、`r/s` 越界、签名编码错误、公钥错误或验签选项无效时，`sm2Verify` 都返回 `false`。该函数内部会收敛解析异常，不依靠 `try/catch` 区分失败原因。

<!-- code-sample id="api-typescript-sm2-07" steps="准备输入|SM2 签名|SM2 验签|成功断言|消息篡改断言|身份篡改断言" -->
```ts
import {
  InputFormat,
  OutputFormat,
  sm2GenerateKeyPair,
  sm2Sign,
  sm2Verify,
} from 'gmkitx';

// 1. 准备输入：正常订单、篡改订单和签名身份分别保存。
const keys = sm2GenerateKeyPair();
const message = 'order=GMKIT-DEMO-0001&amount=88.00';
const tampered = 'order=GMKIT-DEMO-0001&amount=99.00';
const userId = 'merchant@gmkit.cn';

// 2. SM2 签名：DER 决定内部结构，Base64 决定外层字符串编码。
const signature = sm2Sign(keys.privateKey, message, {
  userId,
  signatureFormat: 'der',
  outputFormat: OutputFormat.BASE64,
});

// 3. SM2 验签：使用相同消息、身份、签名格式和外层编码。
const valid = sm2Verify(keys.publicKey, message, signature, {
  userId,
  signatureFormat: 'der',
  inputFormat: InputFormat.BASE64,
});

// 4. 成功断言：原消息必须验证成功。
if (!valid) throw new Error('SM2 verification failed');

// 5. 消息篡改断言：金额变化后必须返回 false。
if (sm2Verify(keys.publicKey, tampered, signature, {
  userId,
  signatureFormat: 'der',
  inputFormat: InputFormat.BASE64,
})) {
  throw new Error('tampered message must not verify');
}

// 6. 身份篡改断言：userId 不同必须返回 false。
if (sm2Verify(keys.publicKey, message, signature, {
  userId: 'warehouse@gmkit.cn',
  signatureFormat: 'der',
  inputFormat: InputFormat.BASE64,
})) {
  throw new Error('wrong SM2 user ID must not verify');
}
```

标准签名固定计算 `e = SM3(Z || M)`。若旧系统曾使用 `SM3(M)`，不要把它混入新协议；迁移边界和弃用成员列在本页末尾。

## 曲线参数兼容声明

<!-- code-reference -->
```ts
interface SM2CurveParams {
  p?: string;
  a?: string;
  b?: string;
  Gx?: string;
  Gy?: string;
  n?: string;
}
```

`SM2CurveParams` 为历史类型兼容而保留，不代表支持任意自定义曲线。省略它即可使用标准 `sm2p256v1`；字段可以带 `0x` 前缀且不区分 Hex 大小写，但值必须与标准参数相同。

函数式签名在 `sm2Sign` 时校验声明，不一致会抛错；`sm2Verify` 会把同类错误收敛为 `false`。`SM2` 实例的 `setCurveParams` 只保存声明，实际校验发生在后续签名或验签时。加解密和密钥交换不读取这个兼容字段。

## 密钥交换

### 参数与返回值

<!-- code-reference -->
```ts
interface SM2KeyExchangeParams {
  privateKey: string | Uint8Array;
  publicKey?: string | Uint8Array;
  userId?: string;
  tempPrivateKey?: string | Uint8Array;
  peerPublicKey: string | Uint8Array;
  peerTempPublicKey: string | Uint8Array;
  peerUserId?: string;
  isInitiator: boolean;
  keyLength?: number;
}

interface SM2KeyExchangeResult {
  tempPublicKey: string;
  sharedKey: string;
  s1?: string;
  s2?: string;
}

sm2KeyExchange(params: SM2KeyExchangeParams): SM2KeyExchangeResult
```

<ApiTable label="SM2 密钥交换参数" min-width="60rem">

| 字段 | 必填 | 默认值 | 编码、单位与作用 |
|:--|:--:|:--|:--|
| `privateKey` | 是 | 无 | 当前参与方的 32 字节长期私钥 |
| `publicKey` | 否 | 从私钥派生 | 当前参与方的长期公钥；传入时必须与私钥匹配 |
| `userId` | 否 | `DEFAULT_USER_ID` | 当前参与方的 UTF-8 身份；空字符串也回落到默认值 |
| `tempPrivateKey` | 否 | 内部随机生成 | 本次会话的 32 字节临时私钥 |
| `peerPublicKey` | 是 | 无 | 对端参与方的长期公钥 |
| `peerTempPublicKey` | 是 | 无 | 对端参与方的本次会话临时公钥 |
| `peerUserId` | 否 | `DEFAULT_USER_ID` | 对端参与方的 UTF-8 身份 |
| `isInitiator` | 是 | 无 | 发起方传 `true`，响应方传 `false`；运行时按该布尔值选择双方顺序 |
| `keyLength` | 否 | `16` | 派生密钥字节数，必须为正安全整数 |

</ApiTable>

返回字段均为小写 Hex：

- `tempPublicKey`：当前参与方的 65 字节非压缩临时公钥。
- `sharedKey`：派生共享密钥，Hex 长度为 `keyLength × 2`。
- `s1`：标准 S1（0x02），由 B 发送、A 在协议层验证。
- `s2`：标准 S2（0x03），由 A 发送、B 在协议层验证。类型保留为可选字段；当前实现会同时返回两项。

`keyLength` 没有协议级上限。若该值来自配置或请求，应用必须先设置自己的合理上限，避免一次派生分配过大缓冲区。

双方需要先交换临时公钥，再以镜像身份和相反角色调用。为了让临时公钥在调用前可发送给对方，最直接的方式是先用 `sm2GenerateKeyPair()` 生成临时密钥对，并把临时私钥传给 `tempPrivateKey`。`sm2KeyExchange` 只计算 `s1`/`s2`，不接收对端确认值；A/B 的发送、验证、重放防护和失败处理必须由上层协议实现。

<!-- code-sample id="api-typescript-sm2-10" steps="生成长期密钥|生成临时密钥|发起方计算|响应方计算|密钥与确认值断言" -->
```ts
import { sm2GenerateKeyPair, sm2KeyExchange } from 'gmkitx';

// 1. 生成长期密钥：分别绑定 Alice 和 Bob 的稳定身份。
const alice = sm2GenerateKeyPair();
const bob = sm2GenerateKeyPair();

// 2. 生成临时密钥：每次密钥交换会话都使用新的临时密钥对。
const aliceTemp = sm2GenerateKeyPair();
const bobTemp = sm2GenerateKeyPair();

// 3. 发起方计算：Alice 使用自己的私钥和 Bob 的两个公钥派生结果。
const resultA = sm2KeyExchange({
  privateKey: alice.privateKey,
  publicKey: alice.publicKey,
  tempPrivateKey: aliceTemp.privateKey,
  peerPublicKey: bob.publicKey,
  peerTempPublicKey: bobTemp.publicKey,
  userId: 'Alice',
  peerUserId: 'Bob',
  isInitiator: true,
  keyLength: 32,
});

// 4. 响应方计算：Bob 镜像身份、密钥和角色顺序。
const resultB = sm2KeyExchange({
  privateKey: bob.privateKey,
  publicKey: bob.publicKey,
  tempPrivateKey: bobTemp.privateKey,
  peerPublicKey: alice.publicKey,
  peerTempPublicKey: aliceTemp.publicKey,
  userId: 'Bob',
  peerUserId: 'Alice',
  isInitiator: false,
  keyLength: 32,
});

// 5. 密钥与确认值断言：双方必须得到同一 32 字节密钥和相同确认值。
if (resultA.sharedKey.length !== 64
  || resultA.sharedKey !== resultB.sharedKey
  || resultA.s1 !== resultB.s1
  || resultA.s2 !== resultB.s2) {
  throw new Error('SM2 key exchange mismatch');
}
```

长期公私钥不匹配、任一曲线点非法、身份过长、派生长度无效、共享点为无穷远点以及 KDF 失败都会抛出 `Error`。角色或身份顺序没有镜像时，通常表现为双方共享密钥或确认值不一致，而不是单边调用立即抛错。因此应用必须比较确认值，不能只判断函数是否返回。`sm2KeyExchange` 只计算结果，不发送临时公钥或确认值；消息顺序、重放防护和会话绑定由上层协议负责。

## `SM2` 类

### 公开成员

<!-- code-reference -->
```ts
new SM2(keyPair?: Partial<KeyPair>, curveParams?: SM2CurveParams)

SM2.generateKeyPair(curveParams?: SM2CurveParams): SM2
SM2.fromPrivateKey(privateKey: string, curveParams?: SM2CurveParams): SM2
SM2.fromPublicKey(publicKey: string, curveParams?: SM2CurveParams): SM2

getPublicKey(): string
getPrivateKey(): string

encrypt(
  data: string | Uint8Array,
  options?: SM2EncryptOptions,
): string

decrypt(
  encryptedData: string | Uint8Array,
  options?: SM2DecryptOptions,
): string

decryptBytes(
  encryptedData: string | Uint8Array,
  options?: SM2DecryptOptions,
): Uint8Array

sign(
  data: string | Uint8Array,
  options?: Omit<SignOptions, 'curveParams'>,
): string

verify(
  data: string | Uint8Array,
  signature: string,
  options?: Omit<VerifyOptions, 'curveParams'>,
): boolean

setCurveParams(curveParams: SM2CurveParams): void
getCurveParams(): SM2CurveParams | undefined

keyExchange(
  peerPublicKey: string,
  peerTempPublicKey: string,
  isInitiator: boolean,
  options?: {
    userId?: string;
    peerUserId?: string;
    tempPrivateKey?: string;
    keyLength?: number;
  },
): SM2KeyExchangeResult
```

<ApiTable label="SM2 实例密钥状态" min-width="54rem">

| 实例状态 | 可以调用 | 不可以调用 |
|:--|:--|:--|
| 公私钥齐全 | 全部实例方法 | 无 |
| 只有公钥 | `getPublicKey`、`encrypt`、`verify` | `getPrivateKey`、`decrypt`、`sign`、`keyExchange` |
| 只有私钥 | `getPrivateKey`、`decrypt`、`sign` | 需要公钥的操作；建议改用 `SM2.fromPrivateKey` 自动派生公钥 |
| 没有密钥 | 曲线声明的 setter/getter | 所有密码操作和密钥 getter |

</ApiTable>

`SM2.generateKeyPair()` 返回同时持有公私钥的实例；`SM2.fromPrivateKey()` 会派生并保存非压缩公钥；`SM2.fromPublicKey()` 只保存传入公钥。直接构造时，如果同时传入公钥和私钥，构造器会确认两者表示同一个曲线点。

实例没有 `reset` 或 `close`，可以重复使用。除 `setCurveParams` 外，密码操作不会修改实例状态。`getCurveParams()` 返回构造或设置时保存的对象引用，不会复制；调用方不应在外部继续修改该对象。

<!-- code-sample id="api-typescript-sm2-12" steps="准备实例|SM2 签名|SM2 验签|缺少私钥断言" -->
```ts
import { SM2 } from 'gmkitx';

// 1. 准备实例：私钥实例负责签名，公钥实例只负责验签。
const message = 'order=GMKIT-DEMO-0001&amount=88.00';
const owner = SM2.generateKeyPair();
const verifier = SM2.fromPublicKey(owner.getPublicKey());

// 2. SM2 签名：由持有私钥的 owner 创建 DER 签名。
const signature = owner.sign(message, {
  userId: 'merchant@gmkit.cn',
  signatureFormat: 'der',
});

// 3. SM2 验签：公钥实例使用相同 userId 验证签名。
if (!verifier.verify(message, signature, {
  userId: 'merchant@gmkit.cn',
  signatureFormat: 'der',
})) {
  throw new Error('SM2 class verification failed');
}

// 4. 缺少私钥断言：公钥实例调用签名方法必须抛错。
let missingPrivateKeyRejected = false;
try {
  verifier.sign(message);
} catch {
  missingPrivateKeyRejected = true;
}
if (!missingPrivateKeyRejected) {
  throw new Error('public-only SM2 instance must not sign');
}
```

`SM2.verify()` 通常沿用函数式入口的 `false` 失败语义；但实例根本没有公钥时，`getPublicKey()` 会先抛出 `Error`。同理，缺少私钥的解密、签名和密钥交换会抛错。

## 失败处理速查

<ApiTable label="SM2 失败处理速查" min-width="60rem">

| API 家族 | 失败结果 | 常见原因 |
|:--|:--|:--|
| 密钥生成与格式转换 | 抛出 `Error` | 随机源、长度、Hex、标量或曲线点非法 |
| `sm2Encrypt` | 抛出 `Error` | 空明文、公钥、随机源、mode 或 outputFormat 非法 |
| `sm2Decrypt` / `sm2DecryptBytes` | 抛出 `Error` | 私钥、编码、密文结构、曲线点或 C3 校验失败 |
| `sm2Sign` | 抛出 `Error` | 私钥、随机源、user ID、曲线声明或输出选项非法 |
| `sm2Verify` | 返回 `false` | 消息、身份、签名、公钥、编码或选项不匹配/非法 |
| `sm2KeyExchange` | 抛出 `Error`，或双方结果不一致 | 密钥、身份顺序、角色、长度、共享点或 KDF 问题 |
| `SM2` 缺少所需密钥 | 抛出 `Error` | 公钥实例调用私钥操作，或空实例执行密码操作 |

</ApiTable>

不要把异常文本作为稳定协议字段。对外服务应把内部解析错误统一映射为固定错误码，并避免通过错误差异泄露密钥或密文处理细节。

## 本页覆盖的公共 API

- 函数：`sm2GenerateKeyPair`、`sm2GetPublicKeyFromPrivateKey`、`sm2CompressPublicKey`、`sm2DecompressPublicKey`、`sm2Encrypt`、`sm2Decrypt`、`sm2DecryptBytes`、`sm2Sign`、`sm2Verify`、`sm2KeyExchange`。
- 类型：`KeyPair`、`SM2CurveParams`、`SM2EncryptOptions`、`SM2DecryptOptions`、`SignOptions`、`VerifyOptions`、`SM2SignatureFormat`、`SM2SignatureInputFormat`、`SM2KeyExchangeParams`、`SM2KeyExchangeResult`。
- 对象式入口：`SM2` 构造器、3 个静态工厂和全部公开实例方法。

## 兼容成员

<details>
<summary>只在维护旧调用或 no-Z 协议时展开</summary>

无算法前缀函数已弃用：

| 旧名称 | 替代名称 |
|:--|:--|
| `generateKeyPair` | `sm2GenerateKeyPair` |
| `getPublicKeyFromPrivateKey` | `sm2GetPublicKeyFromPrivateKey` |
| `compressPublicKey` | `sm2CompressPublicKey` |
| `decompressPublicKey` | `sm2DecompressPublicKey` |
| `sign` | `sm2Sign` |
| `verify` | `sm2Verify` |
| `keyExchange` | `sm2KeyExchange` |

`SignOptions.skipZComputation?: boolean` 和 `VerifyOptions.skipZComputation?: boolean` 也已弃用，默认值均为 `false`。设为 `true` 时计算 `e = SM3(M)`，不会计算标准 SM2 的 Z 值；这不是性能选项，也不是预计算摘要接口。此类签名不能由标准 Bouncy Castle `SM2Signer` 验证。

TypeScript 0.10.1 没有公开的预计算 `e` 签名接口。替代方案和互操作风险见[旧系统迁移](/manual/migration.html#sm2-no-z)。

</details>

## 可执行案例

下面的测试源码覆盖标准签名、正确消息以及篡改消息返回 `false`。站点检查会确认引用区域存在，文档示例任务会执行同一文件。

::: details 查看测试源码
<!-- code-sample id="api-typescript-sm2-13" steps="准备输入|生成 SM2 密钥对|SM2 签名|SM2 验签|篡改断言" -->
```js
<!-- @include: ../../../examples/node/public-api-manual.mjs#ts-sm2-example -->
```
:::

## 相关页面

- [跨语言 SM2 协议与向量](/algorithms/SM2.html)
- [输入编码、随机源与字节工具](./common.html)
- [raw/DER 签名转换工具](./common.html#sm2-签名-asn-1-der)
- [TypeScript SM4 API](./sm4.html)：大数据混合加密的对称算法部分
