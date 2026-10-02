---
title: TypeScript ZUC API
description: 逐项说明 gmkitx 的 ZUC-128、byte/word/bit 长度、EEA3、EIA3、ZUC 类和底层状态。
pageInfo: false
contributors: false
editLink: false
icon: signal
order: 5
category:
  - API 说明书
  - TypeScript
tag:
  - ZUC
  - EEA3
  - EIA3
---

# TypeScript ZUC API

命名空间 `zuc.getKeystream` 与顶层 `zucKeystream` 是同一函数，长度单位为字节；`zuc.getKeystreamWords` 与 `zucKeystreamWords` 是同一函数，长度单位为 32-bit 字。二者的参数、返回值与异常边界分别见下面的密钥流说明。

`gmkitx` 当前实现 ZUC-128、3GPP 128-EEA3 和 128-EIA3，不实现 ZUC-256。ZUC-128 的 key 与 IV 都固定为 128 bit（16 字节），底层每次产生一个 32 bit 密钥流字。

普通 `zucEncrypt` 只是把明文与密钥流异或，不提供完整性保护。EEA3/EIA3 则面向已经采用相应 3GPP 参数的通信协议。一般业务若只需要认证加密，优先选择 SM4-GCM/CCM，不要自行设计 ZUC + MAC 组合。

::: tip 本页适用范围
以下签名和默认值按 `gmkitx 0.10.1` 说明。ZUC 页同时出现 byte、32-bit word 和 bit 三种长度单位，调用前先确认对应表格。
:::

::: tip 先按任务接入
普通流加解密、byte/word 对照和 EEA3/EIA3 失败边界见 [TypeScript ZUC 使用手册](/manual/typescript/zuc.html)。本页用于逐项核对签名和长度单位。
:::

## 导入与入口选择

<!-- code-reference -->
```ts
import {
  InputFormat,
  OutputFormat,
  ZUC,
  ZUCState,
  constantTimeEqual,
  eea3Encrypt,
  eia3,
  getRandomBytes,
  hexToBytes,
  zuc,
  zucDecrypt,
  zucDecryptBytes,
  zucEncrypt,
  zucGenerateKeystream,
  zucKeystream,
  zucKeystreamWords,
} from 'gmkitx';

import type { ZUCDecryptOptions, ZUCOptions } from 'gmkitx';
```

<ApiTable label="ZUC 入口选择" min-width="68rem">

| 入口 | 用途 | 长度单位 | 返回值 |
|:--|:--|:--|:--|
| `zucEncrypt` / `zucDecrypt*` | 普通 ZUC-128 字节流加解密 | 输入字节长度 | Hex/Base64 密文，或文本/字节明文 |
| `zucKeystream` | 取得指定字节数的密钥流 | byte | 小写 Hex |
| `zucKeystreamWords` | 取得指定数量的密钥流字 | 32-bit word | 大端拼接的小写 Hex |
| `zucGenerateKeystream` | 取得原始密钥流字数组 | 32-bit word | `Uint32Array` |
| `eea3Encrypt` | 按 EEA3 参数加解密消息 bit 串 | bit | 按 byte 向上取整的 Hex |
| `eia3` | 按 EIA3 参数计算 MAC-I | bit | 固定 32-bit / 8 位 Hex |
| `ZUC` | 保存 key/IV 的对象式调用 | 随方法变化 | 与对应函数相同 |
| `ZUCState` | 连续推进底层 ZUC 状态 | 每次 1 word | 无符号 32-bit `number` |

</ApiTable>

`zuc` 命名空间包含同名函数、`ZUC`、`ZUCState` 和底层 `generateKeystream`。根级没有 `generateKeystream` 这个短名称；根入口叫 `zucGenerateKeystream`。

## key、IV、文本与编码

<ApiTable label="ZUC 输入编码" min-width="60rem">

| 位置 | 字符串形式 | 字节形式 | 约束 |
|:--|:--|:--|:--|
| `key` | 恰好 32 个 Hex 字符，可带 `0x` | 恰好 16 字节 | 不接受 Base64 key |
| 普通 ZUC `iv` | 恰好 32 个 Hex 字符，可带 `0x` | 恰好 16 字节 | 相同 key 下不可复用 |
| 明文 / EEA3/EIA3 消息 | UTF-8 文本 | 原始字节 | `bitLength` 针对编码后的字节 |
| 密文字符串 | Hex 或 Base64 | 原始密文字节 | 省略格式时优先识别 Hex |

</ApiTable>

实例构造器和 `setIV` 只保存参数，不立即校验；第一次加解密或生成密钥流时才检查长度。传入 `Uint8Array` 时实例保存的是原引用，不会复制。

## 普通 ZUC-128 加解密

### 完整签名

<!-- code-reference -->
```ts
interface ZUCOptions {
  outputFormat?: 'hex' | 'base64';
}

interface ZUCDecryptOptions {
  inputFormat?: 'hex' | 'base64';
}

zucEncrypt(
  key: string | Uint8Array,
  iv: string | Uint8Array,
  plaintext: string | Uint8Array,
  options?: ZUCOptions,
): string

zucDecrypt(
  key: string | Uint8Array,
  iv: string | Uint8Array,
  ciphertext: string | Uint8Array,
  options?: ZUCDecryptOptions,
): string

zucDecryptBytes(
  key: string | Uint8Array,
  iv: string | Uint8Array,
  ciphertext: string | Uint8Array,
  options?: ZUCDecryptOptions,
): Uint8Array
```

<ApiTable label="普通 ZUC 函数参数" min-width="62rem">

| 参数 | 必填 | 默认值 | 说明 |
|:--|:--:|:--|:--|
| `key` | 是 | 无 | 16 字节 ZUC-128 key |
| `iv` | 是 | 无 | 16 字节初始向量 |
| `plaintext` | 是 | 无 | UTF-8 字符串或原始字节；密文与明文字节数相同 |
| `ciphertext` | 是 | 无 | 编码字符串或原始密文字节 |
| `options.outputFormat` | 否 | `hex` | 只影响密文字符串编码 |
| `options.inputFormat` | 否 | 自动识别 | 解密字符串按 Hex 或 Base64 解析 |

</ApiTable>

`zucDecrypt` 把明文字节解码为 UTF-8 文本；图片、压缩数据、协议帧等任意二进制使用 `zucDecryptBytes`。空消息合法并返回空结果。

<!-- code-sample id="api-typescript-zuc-03" steps="准备参数|ZUC 加密|ZUC 解密|往返断言" -->
```ts
import {
  InputFormat,
  OutputFormat,
  getRandomBytes,
  zucDecryptBytes,
  zucEncrypt,
} from 'gmkitx';

// 1. 准备参数：ZUC-128 使用 16 字节 key、16 字节 IV 和原始二进制明文。
const key = '000102030405060708090a0b0c0d0e0f';
const iv = getRandomBytes(16);
const plaintext = Uint8Array.of(0x00, 0xff, 0x80, 0x41);

// 2. ZUC 加密：密文输出显式固定为 Base64。
const ciphertext = zucEncrypt(key, iv, plaintext, {
  outputFormat: OutputFormat.BASE64,
});

// 3. ZUC 解密：按 Base64 解码密文并返回原始字节。
const decrypted = zucDecryptBytes(key, iv, ciphertext, {
  inputFormat: InputFormat.BASE64,
});

// 4. 往返断言：解密结果的长度和每个字节都必须与明文一致。
if (decrypted.length !== plaintext.length
  || decrypted.some((value, index) => value !== plaintext[index])) {
  throw new Error('ZUC binary round-trip failed');
}
```

自动识别适合读取旧数据，但可能把只含 Hex 字符的 Base64 文本先当作 Hex。跨系统协议应明确记录密文编码，并在解密时传 `inputFormat`。

::: warning 普通 ZUC 没有篡改检测
攻击者修改密文 bit 会让对应明文 bit 翻转，解密通常不会抛错。相同 key + IV 还会复用整段密钥流并泄漏两条明文的异或关系。IV 唯一性和完整性保护必须由上层协议负责。
:::

## 三个密钥流 API

### 完整签名

<!-- code-reference -->
```ts
zucKeystream(
  key: BytesLike,
  iv: BytesLike,
  length: number,
): string

zucKeystreamWords(
  key: BytesLike,
  iv: BytesLike,
  length: number,
): string

zucGenerateKeystream(
  key: string | Uint8Array,
  iv: string | Uint8Array,
  length: number,
): Uint32Array
```

<ApiTable label="ZUC 密钥流长度换算" min-width="62rem">

| API | `length` 单位 | 返回长度 | 例：`length = 2` |
|:--|:--|:--|:--|
| `zucKeystream` | byte | `length × 2` 个 Hex 字符 | 2 字节 / 4 Hex 字符 |
| `zucKeystreamWords` | 32-bit word | `length × 8` 个 Hex 字符 | 8 字节 / 16 Hex 字符 |
| `zucGenerateKeystream` | 32-bit word | `length` 个 `Uint32` 元素 | 2 个 word / 8 字节 |

</ApiTable>

三个 `length` 都必须是非负安全整数。`zucKeystream` 和 `zucKeystreamWords` 固定返回小写 Hex，没有输出格式选项；长度为 0 时返回空字符串或空数组。

<!-- code-sample id="api-typescript-zuc-05" steps="准备固定向量|生成字节密钥流|生成 word 密钥流|生成原始 word 数组|固定向量断言" -->
```ts
import {
  zucGenerateKeystream,
  zucKeystream,
  zucKeystreamWords,
} from 'gmkitx';

// 1. 准备固定向量：ZUC-128 的 key 和 IV 都为 16 字节全零。
const key = '00'.repeat(16);
const iv = '00'.repeat(16);

// 2. 生成字节密钥流：8 byte 输出必须匹配前两个标准 word。
if (zucKeystream(key, iv, 8) !== '27bede74018082da') {
  throw new Error('byte-length keystream vector mismatch');
}

// 3. 生成 word 密钥流：2 个 32-bit word 必须得到相同 8 字节结果。
if (zucKeystreamWords(key, iv, 2) !== '27bede74018082da') {
  throw new Error('word-length keystream vector mismatch');
}

// 4. 生成原始 word 数组：底层 API 返回两个 Uint32 元素。
const words = zucGenerateKeystream(key, iv, 2);

// 5. 固定向量断言：数组长度和每个 word 都必须匹配标准结果。
if (words.length !== 2
  || words[0] !== 0x27bede74
  || words[1] !== 0x018082da) {
  throw new Error('raw ZUC word vector mismatch');
}
```

`zucKeystream(key, iv, 5)` 内部生成两个 word，再只返回前 5 字节；`zucKeystreamWords(key, iv, 5)` 则返回完整 20 字节。不要只凭同一个数字比较两个函数。

## EEA3 消息加密

<!-- code-reference -->
```ts
eea3Encrypt(
  key: BytesLike,
  count: number,
  bearer: number,
  direction: number,
  message: string | Uint8Array,
  bitLength?: number,
): string
```

<ApiTable label="EEA3 消息入口" min-width="62rem">

| 入口 | 输入 | 长度单位 | 输出 |
|:--|:--|:--|:--|
| `eea3Encrypt` | 接收消息 | `bitLength` 为 bit | 消息与密钥流异或，只返回 `ceil(bitLength / 8)` 字节 |

</ApiTable>

<ApiTable label="EEA3/EIA3 公共参数" min-width="62rem">

| 参数 | 范围 | 说明 |
|:--|:--|:--|
| `key` | 16 字节 | 协议分配的保密或完整性 key |
| `count` | `0`–`0xffffffff` 的整数 | 32-bit COUNT |
| `bearer` | `0`–`31` 的整数 | 5-bit BEARER |
| `direction` | `0` 或 `1` | 1-bit DIRECTION；业务含义按对接协议角色确定 |
| `length` / `bitLength` | 非负安全整数 | 单位是 bit；消息入口不能超过消息字节容量 |

</ApiTable>

字符串消息先按 UTF-8 编码，再应用 `bitLength`。当 bit 长度不是 8 的倍数时，返回值最后一个字节未使用的低位会被清零。

<!-- code-sample id="api-typescript-zuc-07" steps="准备 EEA3 参数|EEA3 加密|bit 长度断言|EEA3 解密|解密断言" -->
```ts
import { eea3Encrypt, hexToBytes } from 'gmkitx';

// 1. 准备 EEA3 参数：只处理明文最高 5 bit。
const key = '00'.repeat(16);
const count = 0;
const bearer = 0;
const direction = 0;
const bitLength = 5;
const plaintext = Uint8Array.of(0b1111_1000);

// 2. EEA3 加密：消息与协议密钥流异或，返回 Hex 密文。
const ciphertextHex = eea3Encrypt(
  key,
  count,
  bearer,
  direction,
  plaintext,
  bitLength,
);

// 3. bit 长度断言：未使用的低 3 bit 必须被清零。
if (ciphertextHex.length !== 2
  || (Number.parseInt(ciphertextHex, 16) & 0b0000_0111) !== 0) {
  throw new Error('unused EEA3 bits must be zero');
}

// 4. EEA3 解密：先把 Hex 密文还原为字节，再执行同一异或运算。
const recoveredHex = eea3Encrypt(
  key,
  count,
  bearer,
  direction,
  hexToBytes(ciphertextHex),
  bitLength,
);

// 5. 解密断言：恢复结果的有效 5 bit 必须与原始明文一致。
if (recoveredHex !== 'f8') throw new Error('EEA3 decryption failed');
```

完整 3GPP 800-bit 固定向量由项目的 ZUC 回归测试执行。不要把 `eea3Encrypt` 返回的 Hex 字符串直接再次传入；那会把 Hex 字符当作 UTF-8 消息。

## EIA3 完整性标签

### 完整签名

<!-- code-reference -->
```ts
eia3(
  key: BytesLike,
  count: number,
  bearer: number,
  direction: number,
  message: string | Uint8Array,
  bitLength?: number,
): string
```

EIA3 返回固定 32 bit MAC-I，即 8 个小写 Hex 字符。`bitLength` 省略时认证全部消息字节；显式值不能超过 `message.length × 8`。它不返回布尔值，也没有单独的 verify 函数。

<!-- code-sample id="api-typescript-zuc-09" steps="计算 EIA3 完整性标签|固定向量断言|准备接收值|完整性校验" -->
```ts
import { constantTimeEqual, eia3, hexToBytes } from 'gmkitx';

// 1. 计算 EIA3 完整性标签：使用 3GPP 1-bit 固定向量。
const mac = eia3(
  '00'.repeat(16),
  0,
  0,
  0,
  Uint8Array.of(0),
  1,
);

// 2. 固定向量断言：MAC-I 必须等于标准的 32-bit 结果。
if (mac !== 'c8a9595e') throw new Error('EIA3 vector mismatch');

// 3. 准备接收值：先把外部 MAC-I 从 Hex 解码为 4 字节。
const received = hexToBytes('c8a9595e');

// 4. 完整性校验：确认长度后进行常量时间字节比较。
if (received.length !== 4 || !constantTimeEqual(hexToBytes(mac), received)) {
  throw new Error('EIA3 verification failed');
}
```

32 bit MAC-I 是相应通信协议的一部分，不能直接视为通用业务消息认证方案。协议还必须正确管理 COUNT、BEARER、DIRECTION、重放窗口和 key 生命周期。

## `ZUC` 类

### 完整公开成员

<!-- code-reference -->
```ts
new ZUC(key: string | Uint8Array, iv: string | Uint8Array)
ZUC.ZUC128(key, iv): ZUC

setIV(iv: string | Uint8Array): void
getIV(): string | Uint8Array
encrypt(plaintext, options?: ZUCOptions): string
decrypt(ciphertext, options?: ZUCDecryptOptions): string
decryptBytes(ciphertext, options?: ZUCDecryptOptions): Uint8Array
keystream(lengthInBytes: number): string

ZUC.eea3Encrypt(key, count, bearer, direction, message, bitLength?): string
ZUC.eia3(key, count, bearer, direction, message, bitLength?): string
```

<ApiTable label="ZUC 类成员行为" min-width="66rem">

| 成员 | 保存或使用的状态 | 说明 |
|:--|:--|:--|
| 构造器 / `ZUC128` | 保存 key 和 IV | 不立即校验，也不复制字节数组 |
| `setIV` | 替换 IV | 不自动生成、不校验、不递增 |
| `getIV` | 返回保存值 | `Uint8Array` 会返回同一引用 |
| `encrypt/decrypt/decryptBytes` | 每次从保存的 key/IV 重新初始化 | 调用后不会推进实例中的持久密钥流状态 |
| `keystream` | 每次从保存的 key/IV 重新初始化 | `length` 单位为 byte，固定返回 Hex |
| 两个静态 EEA3/EIA3 消息方法 | 不使用实例状态 | 与同名根函数一致 |

</ApiTable>

<!-- code-sample id="api-typescript-zuc-11" steps="创建实例|ZUC 加密|ZUC 解密|往返断言|更新 IV" -->
```ts
import { ZUC, getRandomBytes } from 'gmkitx';

// 1. 创建实例：ZUC-128 使用固定 key 和本次消息的新 IV。
const cipher = ZUC.ZUC128(
  '000102030405060708090a0b0c0d0e0f',
  getRandomBytes(16),
);
const message = 'order=GMKIT-DEMO-0001&amount=88.00';

// 2. ZUC 加密：实例从保存的 key/IV 起点生成密钥流。
const encrypted = cipher.encrypt(message);

// 3. ZUC 解密：同一 key/IV 再次生成密钥流并恢复明文。
const decrypted = cipher.decrypt(encrypted);

// 4. 往返断言：解密结果必须等于订单原文。
if (decrypted !== message) {
  throw new Error('ZUC class round-trip failed');
}

// 5. 更新 IV：下一条消息必须更换 IV，类不会自动更新。
cipher.setIV(getRandomBytes(16));
```

同一实例连续两次 `encrypt` 而不 `setIV`，会从相同密钥流起点处理两条消息。可变实例也不应被多个异步任务共享。

## `ZUCState` 底层连续状态

<!-- code-reference -->
```ts
new ZUCState()
initialize(key: Uint8Array, iv: Uint8Array): void
generateKeyword(): number
```

`initialize` 只接受两个恰好 16 字节的数组，会重建全部内部状态；可以再次调用它开始一条新密钥流。`generateKeyword` 每次推进状态并返回下一个无符号 32-bit word。

::: warning 构造器不会标记“未初始化”错误
实现没有在 `generateKeyword()` 前检查是否调用过 `initialize()`。未初始化时得到的数值没有协议意义，但不保证抛错。调用方必须把“先 initialize”作为硬性前置条件。
:::

<!-- code-sample id="api-typescript-zuc-13" steps="初始化底层状态|生成第一个 word 并比对固定向量|生成第二个 word 并比对固定向量|重新初始化|重置断言" -->
```ts
import { ZUCState } from 'gmkitx';

// 1. 初始化底层状态：key 和 IV 都为 16 字节全零。
const state = new ZUCState();
state.initialize(new Uint8Array(16), new Uint8Array(16));

// 2. 生成第一个 word 并比对固定向量。
if (state.generateKeyword() !== 0x27bede74) {
  throw new Error('ZUCState first word mismatch');
}

// 3. 生成第二个 word 并比对固定向量。
if (state.generateKeyword() !== 0x018082da) {
  throw new Error('ZUCState second word mismatch');
}

// 4. 重新初始化：相同 key/IV 必须回到同一密钥流起点。
state.initialize(new Uint8Array(16), new Uint8Array(16));

// 5. 重置断言：重新生成的第一个 word 必须与原结果一致。
if (state.generateKeyword() !== 0x27bede74) {
  throw new Error('ZUCState reinitialize failed');
}
```

普通业务优先用高层函数。直接使用底层状态时，不要把已推进的状态跨消息复用，也不要让多个并发任务交错调用 `generateKeyword`。

## 失败处理速查

<ApiTable label="ZUC 失败行为" min-width="68rem">

| API | 失败行为 | 常见原因 |
|:--|:--|:--|
| 普通加解密 / 密钥流 | 抛出 `Error` | key/IV 不是 16 字节、编码或输出格式非法 |
| 密钥流长度 | 抛出 `Error` | `length` 为负数、小数、NaN、Infinity 或超出安全整数 |
| EEA3/EIA3 参数 | 抛出 `Error` | COUNT、BEARER、DIRECTION 超出范围 |
| `eea3Encrypt` / `eia3` | 抛出 `Error` | `bitLength` 非法或超过消息 bit 容量 |
| `ZUCState.initialize` | 抛出 `Error` | key/IV 不是 16 字节数组 |
| 普通 ZUC 密文被篡改 | 通常不抛错 | 流密码本身没有认证；必须由上层检测 |

</ApiTable>

## 安全使用清单

- 普通 ZUC 相同 key 下不能复用 IV；实例不会替调用方跟踪唯一性。
- `zucEncrypt` 没有 tag，不能根据“解密成功”判断密文可信。
- EEA3/EIA3 参数来自既定通信协议，不要把 COUNT/BEARER/DIRECTION 当作随意填写的 nonce 字段。
- bit 长度不是 byte 长度；最后一个字节未使用的低位必须按协议处理。
- EIA3 的 32-bit MAC-I 只适用于相应协议及其重放、计数器和密钥管理机制。
- key、明文和底层状态都属于敏感数据；JavaScript 运行时不能保证内存及时清零或严格恒时。

## 本页覆盖的公共 API

- 根函数：`zucEncrypt`、`zucDecrypt`、`zucDecryptBytes`、`zucKeystream`、`zucKeystreamWords`、`zucGenerateKeystream`、`eea3`、`eea3Encrypt`、`eia3`。
- 根类：`ZUC` 与 `ZUCState` 的全部公开成员。
- 类型：`ZUCOptions`、`ZUCDecryptOptions`。
- 命名空间：`zuc` 及其中同名函数、类和底层 `generateKeystream`。

## 兼容成员

<details>
<summary>只在维护旧 EEA3 密钥流调用时展开</summary>

<!-- code-reference -->
```ts
eea3(
  key: BytesLike,
  count: number,
  bearer: number,
  direction: number,
  length: number,
): string

ZUC.eea3(key, count, bearer, direction, bitLength): string
```

这两个入口不接收消息，只返回按 32-bit word 向上补齐的密钥流 Hex。它们不能代替“加密”动作。新调用使用 `eea3Encrypt`；迁移时必须先确认旧调用消费的是密钥流还是密文，见[旧系统迁移](/manual/migration.html#旧-eea3-密钥流入口)。

</details>

## 可执行案例

下面的测试源码覆盖 byte/word 长度对照、全零固定向量和非法 key 失败；项目测试还包含 3GPP EEA3 800-bit 与 EIA3 固定向量。

::: details 查看测试源码
<!-- code-sample id="api-typescript-zuc-14" steps="准备参数|生成字节密钥流|生成 word 密钥流|非法参数断言" -->
```js
<!-- @include: ../../../examples/node/public-api-manual.mjs#ts-zuc-example -->
```
:::

## 相关页面

- [跨语言 ZUC、EEA3、EIA3 参数与向量](/algorithms/ZUC.html)
- [TypeScript 编码、随机数与字节工具](./common.html)
- [TypeScript SM4 API](./sm4.html)：一般业务的认证加密选择
