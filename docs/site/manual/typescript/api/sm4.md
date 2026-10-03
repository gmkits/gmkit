---
title: TypeScript SM4 API
description: 逐项说明 gmkitx 的 SM4 模式、填充、AEAD、结果对象、类工厂和失败行为。
pageInfo: false
contributors: false
editLink: false
icon: lock
order: 4
category:
  - API 说明书
  - TypeScript
tag:
  - SM4
  - AEAD
  - GCM
  - CCM
---

# TypeScript SM4 API

SM4 是 128 bit 分组密码：key 固定 16 字节，分组也固定 16 字节。`gmkitx` 支持 ECB、CBC、CTR、CFB、OFB、GCM 和 CCM，并为所有模式返回统一的密文结果对象。

新协议优先使用 GCM 或 CCM。它们同时保护机密性和完整性；CBC、CTR、CFB、OFB 只加密，不会阻止密文被篡改；ECB 会暴露重复分组，只用于明确要求它的既有格式。

::: tip 本页适用范围
以下签名和默认值按 `gmkitx 0.10.1` 说明。key、IV、nonce 的字符串形式是 Hex；明文和 AAD 字符串按 UTF-8 编码。
:::

::: tip 先完成认证加密闭环
nonce、AAD、ciphertext、tag、解密和 tag 篡改失败见 [TypeScript SM4 使用手册](/manual/typescript/sm4.html)。本页用于核对模式、填充、重载和状态。
:::

## 导入与入口选择

<!-- code-reference -->
```ts
import {
  CipherMode,
  InputFormat,
  OutputFormat,
  PaddingMode,
  SM4,
  getRandomBytes,
  hexToBytes,
  sm4,
  sm4Decrypt,
  sm4DecryptBytes,
  sm4Encrypt,
} from 'gmkitx';

import type {
  SM4AEADResult,
  SM4CCMResult,
  SM4CipherResult,
  SM4DecryptOptions,
  SM4GCMResult,
  SM4Options,
} from 'gmkitx';
```

<ApiTable label="SM4 入口选择" min-width="58rem">

| 入口 | 用途 | 返回值 | 是否保存配置 |
|:--|:--|:--|:--|
| `sm4Encrypt` / `sm4.encrypt` | 加密文本或字节 | `SM4CipherResult` | 否 |
| `sm4Decrypt` / `sm4.decrypt` | 解密 UTF-8 文本 | `string` | 否 |
| `sm4DecryptBytes` / `sm4.decryptBytes` | 解密任意二进制 | `Uint8Array` | 否 |
| `new SM4(...)` / `SM4.GCM(...)` 等 | 保存 key、mode、padding、IV/nonce 后重复调用 | 同上 | 是 |

</ApiTable>

所有加密入口都返回对象，不返回裸密文字符串。二进制明文必须用 `sm4DecryptBytes` 取回；`sm4Decrypt` 会把结果当作 UTF-8 文本解码。

## 三个函数的完整签名

<!-- code-reference -->
```ts
sm4Encrypt(
  key: string | Uint8Array,
  data: string | Uint8Array,
  options?: SM4Options,
): SM4CipherResult

sm4Decrypt(
  key: string | Uint8Array,
  encryptedData: string | Uint8Array | SM4CipherResult,
  options?: SM4DecryptOptions,
): string

sm4DecryptBytes(
  key: string | Uint8Array,
  encryptedData: string | Uint8Array | SM4CipherResult,
  options?: SM4DecryptOptions,
): Uint8Array
```

<ApiTable label="SM4 函数参数" min-width="62rem">

| 参数 | 必填 | 编码或类型 | 说明 |
|:--|:--:|:--|:--|
| `key` | 是 | 32 个 Hex 字符，或 16 字节 | Hex 可带 `0x` 前缀；长度不符时抛错 |
| `data` | 加密时是 | UTF-8 字符串，或原始字节 | 空消息合法，具体密文长度由模式和填充决定 |
| `encryptedData` | 解密时是 | 结果对象、编码字符串或原始密文字节 | AEAD 模式还必须同时提供 tag |
| `options` | 否 | 见下文 | 新代码必须显式写 `mode`；需要 IV/nonce 的模式也必须提供 `iv` |

</ApiTable>

## `SM4Options` 与 `SM4DecryptOptions`

<!-- code-reference -->
```ts
interface SM4Options {
  mode?: CipherModeType;
  padding?: PaddingModeType;
  iv?: string | Uint8Array;
  aad?: string | Uint8Array;
  tagLength?: number;
  outputFormat?: OutputFormatType;
}

interface SM4DecryptOptions extends SM4Options {
  inputFormat?: InputFormatType;
  tag?: string | Uint8Array;
  tagFormat?: InputFormatType;
}
```

### 模式矩阵

<ApiTable label="TypeScript SM4 模式参数与使用边界" min-width="68rem">

| `mode` | IV / nonce | padding | tag | 适用与限制 |
|:--|:--|:--|:--|:--|
| `CipherMode.ECB` | 不使用 | PKCS7/NONE/ZERO | 无 | 泄漏重复分组，只兼容既有协议 |
| `CipherMode.CBC` | 16 字节 IV | PKCS7/NONE/ZERO | 无 | IV 应随机且不可预测；另行认证密文 |
| `CipherMode.CTR` | 16 字节计数器 | 忽略 | 无 | 相同 key 下初始计数器不可重复；另行认证 |
| `CipherMode.CFB` | 16 字节 IV | 忽略 | 无 | CFB-128；不提供完整性 |
| `CipherMode.OFB` | 16 字节 IV | 忽略 | 无 | 相同 key 下 IV 不可重复；不提供完整性 |
| `CipherMode.GCM` | 固定 12 字节 nonce | 忽略 | 12–16 字节 | 新协议优先；相同 key 下 nonce 绝不能重复 |
| `CipherMode.CCM` | 7–13 字节 nonce | 忽略 | 4–16 的偶数字节 | 相同 key 下 nonce 绝不能重复；nonce 越长，单条消息上限越小 |

</ApiTable>

省略 `mode` 时函数沿用旧版 `ECB` 默认值，并在当前进程第一次发生时输出一次警告。这个默认值仅为兼容旧调用；新代码应显式写出模式。`new SM4(key)` 会把 `ECB` 保存为实例配置，调用时仍会显式传给底层函数。

CCM 的消息长度上限由 `q = 15 - nonce字节数` 决定，最大为 `2^(8q) - 1` 字节。例如 13 字节 nonce 最多处理 65,535 字节；12 字节 nonce 最多处理 16,777,215 字节。超出上限会在加密或解密时抛错。

### 填充

<ApiTable label="SM4 填充规则" min-width="60rem">

| `padding` | 默认值 | 生效模式 | 行为 |
|:--|:--:|:--|:--|
| `PaddingMode.PKCS7` | 是 | ECB、CBC | 总会追加 1–16 字节；解密严格校验每个填充字节 |
| `PaddingMode.NONE` | 否 | ECB、CBC | 明文和密文长度必须是 16 字节的倍数 |
| `PaddingMode.ZERO` | 否 | ECB、CBC | 补零到 16 字节边界；原文已对齐时不追加 |

</ApiTable>

`ZERO` 解密会删除所有尾部 `00`，因此不能无损承载本来就以零结尾的二进制数据。CTR、CFB、OFB、GCM、CCM 不使用分组填充，传入的 `padding` 会被忽略。

Java/JCE 中常见的 `PKCS5Padding` 名称在 16 字节分组密码上通常实现与这里相同的 PKCS#7 规则；跨语言对接仍应以固定向量确认 Provider 行为。

### AAD、tag 与编码字段

<ApiTable label="SM4 其余选项" min-width="68rem">

| 字段 | 默认值 | 生效位置 | 精确语义 |
|:--|:--|:--|:--|
| `iv` | 无 | 除 ECB 外 | 字符串按 Hex；GCM 中叫 nonce，CCM 中也作为 nonce 使用 |
| `aad` | 空字节 | GCM、CCM | 字符串按 UTF-8；参与认证但不进入密文 |
| `tagLength` | 16 字节 | GCM、CCM | GCM 接受 12–16 的整数；CCM 接受 4–16 的偶数 |
| `outputFormat` | `hex` | 加密 | 同时控制 `ciphertext` 和 `tag` 的编码 |
| `inputFormat` | 自动识别 | 单独传字符串密文解密 | `hex` 或 `base64`；自动识别时优先 Hex |
| `tag` | 无 | AEAD 分离传输解密 | 未传完整结果对象时必须提供 |
| `tagFormat` | `tagFormat → inputFormat → 自动` | 字符串 tag | 明确 tag 的 Hex/Base64 编码 |

</ApiTable>

`SM4DecryptOptions` 因继承关系也有 `outputFormat`，但解密返回文本或字节，不读取这个字段。传入完整结果对象时，密文和 tag 都按对象自己的 `format` 解码，`inputFormat` 不会覆盖它。

自动识别只适合本地兼容：只由 Hex 字符组成的 Base64 文本会优先按 Hex 解释。跨系统协议应始终保存编码字段，或在解密时显式指定 `inputFormat`/`tagFormat`。

## `SM4CipherResult` 与三个别名

<!-- code-reference -->
```ts
interface SM4CipherResult {
  ciphertext: string;
  tag?: string;
  format: 'hex' | 'base64';
}

type SM4GCMResult = SM4CipherResult;
type SM4CCMResult = SM4CipherResult;
type SM4AEADResult = SM4CipherResult;
```

<ApiTable label="SM4 加密结果字段" min-width="56rem">

| 字段 | 始终存在 | 说明 |
|:--|:--:|:--|
| `ciphertext` | 是 | 按 `format` 编码的密文 |
| `tag` | GCM/CCM 是，其他模式否 | 按 `format` 编码的认证标签；字段名固定为 `tag` |
| `format` | 是 | `hex` 或 `base64`，同时描述 ciphertext 和 tag |

</ApiTable>

三个别名没有新增字段，只是让调用方表达 GCM、CCM 或通用 AEAD 语义。TypeScript 接口把 `tag` 定义为可选，是因为同一个结果类型也承载非 AEAD 模式；GCM/CCM 成功加密后 `tag` 一定存在。

跨网络保存时还需要把 mode、nonce/IV、AAD 约定、tag 长度和协议版本放入自己的消息结构。仅保存 `SM4CipherResult` 不足以让接收方恢复全部参数。

## SM4-GCM：推荐的新协议写法

<!-- code-sample id="api-typescript-sm4-05" steps="准备参数|生成 nonce|SM4-GCM 加密|加密结果断言|SM4-GCM 解密|成功断言|构造篡改结果|失败断言" -->
```ts
import {
  CipherMode,
  OutputFormat,
  getRandomBytes,
  sm4Decrypt,
  sm4Encrypt,
} from 'gmkitx';

// 1. 准备参数：固定测试 key、订单明文和业务 AAD。
const key = '0123456789abcdeffedcba9876543210';
const message = 'order=GMKIT-DEMO-0001&amount=88.00';
const aad = 'tenant=demo;schema=1';

// 2. 生成 nonce：每次加密使用新的 12 字节值，并随密文保存。
const nonce = getRandomBytes(12);
const options = {
  mode: CipherMode.GCM,
  iv: nonce,
  aad,
  tagLength: 16,
  outputFormat: OutputFormat.BASE64,
} as const;

// 3. SM4-GCM 加密：得到 Base64 编码的 ciphertext 和 tag。
const encrypted = sm4Encrypt(key, message, options);

// 4. 加密结果断言：tag 必须存在，输出格式必须与约定一致。
if (!encrypted.tag || encrypted.format !== OutputFormat.BASE64) {
  throw new Error('SM4-GCM result is incomplete');
}

// 5. SM4-GCM 解密：使用相同 key、nonce 和 AAD 恢复明文。
const decrypted = sm4Decrypt(key, encrypted, options);

// 6. 成功断言：解密结果必须等于订单原文。
if (decrypted !== message) {
  throw new Error('SM4-GCM round-trip failed');
}

// 7. 构造篡改结果：只修改 tag，其他字段保持不变。
const tampered = {
  ...encrypted,
  tag: `${encrypted.tag[0] === 'A' ? 'B' : 'A'}${encrypted.tag.slice(1)}`,
};
let rejected = false;

// 8. 失败断言：篡改 tag 后必须抛错，不能返回未经认证的明文。
try {
  sm4Decrypt(key, tampered, options);
} catch {
  rejected = true;
}
if (!rejected) throw new Error('tampered GCM tag must be rejected');
```

nonce 不需要保密，但必须与密文一起原样保存。相同 key 下重复 GCM nonce 会破坏机密性与认证安全；库不会替调用方记录或轮换 nonce。

### 密文与 tag 分开传输

<!-- code-sample id="api-typescript-sm4-06" steps="SM4-GCM 解密|成功断言" -->
```ts
import { InputFormat, sm4Decrypt } from 'gmkitx';

// 1. SM4-GCM 解密：密文和 tag 分开传输时分别声明输入格式。
const plaintext = sm4Decrypt(key, encrypted.ciphertext, {
  mode: CipherMode.GCM,
  iv: nonce,
  aad,
  inputFormat: InputFormat.BASE64,
  tag: encrypted.tag,
  tagFormat: InputFormat.BASE64,
});

// 2. 成功断言：分离字段后仍应恢复相同明文。
if (plaintext !== message) throw new Error('separated GCM fields failed');
```

未显式传 `tagLength` 时，解密会从 tag 的实际字节数推断合法长度。显式传入后，它必须和 tag 长度完全一致。密文、AAD、nonce、tag 或 key 任一不匹配，认证都会抛出 `Error`。

## SM4-CCM：nonce 长度影响消息上限

<!-- code-sample id="api-typescript-sm4-07" steps="准备参数|SM4-CCM 加密|tag 长度断言|SM4-CCM 解密|成功断言" -->
```ts
import { CipherMode, getRandomBytes, sm4Decrypt, sm4Encrypt } from 'gmkitx';

// 1. 准备参数：CCM 使用 12 字节 nonce、12 字节 tag 和固定 AAD。
const key = '0123456789abcdeffedcba9876543210';
const nonce = getRandomBytes(12);
const message = 'order=GMKIT-DEMO-0001&amount=88.00';
const aad = 'tenant=demo;schema=1';
const options = {
  mode: CipherMode.CCM,
  iv: nonce,
  aad,
  tagLength: 12,
} as const;

// 2. SM4-CCM 加密：输出密文和认证 tag。
const encrypted = sm4Encrypt(key, message, options);

// 3. tag 长度断言：12 字节 tag 的 Hex 长度必须为 24。
if (!encrypted.tag || encrypted.tag.length !== 24) {
  throw new Error('SM4-CCM tag length mismatch');
}

// 4. SM4-CCM 解密：使用相同 nonce、AAD 和 tag 长度恢复明文。
const decrypted = sm4Decrypt(key, encrypted, options);

// 5. 成功断言：解密结果必须等于订单原文。
if (decrypted !== message) {
  throw new Error('SM4-CCM round-trip failed');
}
```

CCM 与 GCM 一样要求相同 key 下 nonce 唯一，AAD 也必须逐字节一致。选择较短 tag 会降低伪造难度，必须由协议统一规定，不能由每条消息任意决定。

## ECB/CBC/CTR/CFB/OFB

### SM4 标准分组向量

下面只用 ECB + NONE 暴露单个分组的算法结果，目的是核对实现，不是推荐 ECB 作为业务模式。

<!-- code-sample id="api-typescript-sm4-08" steps="准备固定向量|SM4 单分组加密|加密向量断言|SM4 单分组解密|解密向量断言" -->
```ts
import {
  CipherMode,
  PaddingMode,
  hexToBytes,
  sm4DecryptBytes,
  sm4Encrypt,
} from 'gmkitx';

// 1. 准备固定向量：key 和单分组明文都来自 SM4 标准样例。
const key = '0123456789abcdeffedcba9876543210';
const plaintext = hexToBytes('0123456789abcdeffedcba9876543210');

// 2. SM4 单分组加密：ECB + NONE 只用于核对分组原语。
const encrypted = sm4Encrypt(key, plaintext, {
  mode: CipherMode.ECB,
  padding: PaddingMode.NONE,
});

// 3. 加密向量断言：密文必须与标准结果一致。
if (encrypted.ciphertext !== '681edf34d206965e86b3e94f536e4246') {
  throw new Error('SM4 standard block vector mismatch');
}

// 4. SM4 单分组解密：使用同一 key 恢复原始分组。
const decrypted = sm4DecryptBytes(key, encrypted, {
  mode: CipherMode.ECB,
  padding: PaddingMode.NONE,
});

// 5. 解密向量断言：恢复的每个字节都必须与明文一致。
if (decrypted.some((value, index) => value !== plaintext[index])) {
  throw new Error('SM4 block vector decryption failed');
}
```

### CBC 文本往返

<!-- code-sample id="api-typescript-sm4-09" steps="准备参数|SM4-CBC 加密|SM4-CBC 解密|往返断言" -->
```ts
import { CipherMode, PaddingMode, getRandomBytes, sm4Decrypt, sm4Encrypt } from 'gmkitx';

// 1. 准备参数：CBC 使用 16 字节随机 IV 和 PKCS7 padding。
const key = '0123456789abcdeffedcba9876543210';
const iv = getRandomBytes(16);
const options = {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv,
} as const;
const message = 'order=GMKIT-DEMO-0001&amount=88.00';

// 2. SM4-CBC 加密：输出只包含密文，不包含认证 tag。
const encrypted = sm4Encrypt(key, message, options);

// 3. SM4-CBC 解密：使用相同 key 和 IV 恢复文本。
const decrypted = sm4Decrypt(key, encrypted, options);

// 4. 往返断言：解密结果必须等于原文。
if (decrypted !== message) {
  throw new Error('SM4-CBC round-trip failed');
}
```

CBC 往返成功只说明参数一致，不表示密文未被攻击者修改。使用 CBC/CTR/CFB/OFB 接收不可信数据时，应采用经过审查的 encrypt-then-MAC 协议；没有既有协议约束时直接使用 GCM/CCM。

CTR 的 16 字节 `iv` 是初始大端计数器；CFB 使用完整 128 bit 反馈段。与其他库互操作时，应确认计数器递增方向、CFB 段大小、padding 和 IV 传输方式全部一致。

## 文本解密与二进制解密

<!-- code-sample id="api-typescript-sm4-10" steps="准备二进制输入|SM4-CTR 加密|SM4-CTR 解密|二进制断言" -->
```ts
import { CipherMode, sm4DecryptBytes, sm4Encrypt } from 'gmkitx';

// 1. 准备二进制输入：包含 NUL、非 ASCII 字节和普通字符。
const key = '0123456789abcdeffedcba9876543210';
const iv = '000102030405060708090a0b0c0d0e0f';
const binary = Uint8Array.of(0x00, 0xff, 0x80, 0x41);

// 2. SM4-CTR 加密：二进制输入不经过 UTF-8 转换。
const encrypted = sm4Encrypt(key, binary, { mode: CipherMode.CTR, iv });

// 3. SM4-CTR 解密：使用字节返回接口恢复原始数据。
const decrypted = sm4DecryptBytes(key, encrypted, { mode: CipherMode.CTR, iv });

// 4. 二进制断言：长度和每个字节都必须一致。
if (decrypted.length !== binary.length
  || decrypted.some((value, index) => value !== binary[index])) {
  throw new Error('SM4 binary round-trip failed');
}
```

`sm4Decrypt` 只用于应用层明确约定为 UTF-8 的明文。图片、压缩包、协议帧和任意二进制都使用 `sm4DecryptBytes`，不要先转成字符串再尝试还原。

## `SM4` 类

实例保存 key、mode、padding 和 IV/nonce；单次 `encrypt`/`decrypt` 的 options 会覆盖实例配置。它不保存消息进度，不是流式加密器，也不会生成或轮换 IV。

### 构造器、状态方法与运算方法

<!-- code-reference -->
```ts
new SM4(key: BytesLike, options?: {
  mode?: CipherModeType;
  padding?: PaddingModeType;
  iv?: BytesLike;
})

setIV(iv: BytesLike): void
getIV(): BytesLike | undefined
setMode(mode: CipherModeType): void
getMode(): CipherModeType
setPadding(padding: PaddingModeType): void
getPadding(): PaddingModeType

encrypt(data, options?: Partial<SM4Options>): SM4CipherResult
decrypt(encryptedData, options?: Partial<SM4DecryptOptions>): string
decryptBytes(encryptedData, options?: Partial<SM4DecryptOptions>): Uint8Array
```

<ApiTable label="SM4 实例状态" min-width="62rem">

| 成员 | 解决的问题 | 何时校验 | 返回值或状态变化 |
|:--|:--|:--|:--|
| 构造器 | 保存一组常用配置 | 实际加解密时校验 key/IV；默认 ECB + PKCS7 | 新实例 |
| `setIV` | 替换 IV/nonce | 实际加解密时校验长度 | `void` |
| `setMode` | 替换模式 | 实际加解密时校验运行时值 | `void` |
| `setPadding` | 替换填充 | 实际加解密时校验运行时值 | `void` |
| `getIV/getMode/getPadding` | 读取当前配置 | 不做密码运算 | 当前保存值 |
| `encrypt/decrypt/decryptBytes` | 合并实例配置和本次覆盖项 | 每次调用校验 | 与同名函数一致 |

</ApiTable>

构造器和 setter 不复制传入的 `Uint8Array`。如果调用方随后修改同一个字节数组，实例下一次运算会看到修改后的内容；长期保存配置时不要在外部继续改写这些数组。

### 七个工厂方法

<!-- code-reference -->
```ts
SM4.ECB(key, padding = PaddingMode.PKCS7): SM4
SM4.CBC(key, iv, padding = PaddingMode.PKCS7): SM4
SM4.CTR(key, iv): SM4
SM4.CFB(key, iv): SM4
SM4.OFB(key, iv): SM4
SM4.GCM(key, iv): SM4
SM4.CCM(key, nonce): SM4
```

CTR、CFB、OFB、GCM、CCM 工厂把 padding 保存为 `NONE`；运行时这些模式本来也会忽略 padding。工厂不会验证 IV 或 nonce，第一次运算时才验证。

<!-- code-sample id="api-typescript-sm4-13" steps="创建实例|SM4-GCM 加密|SM4-GCM 解密|成功断言" -->
```ts
import { SM4, getRandomBytes } from 'gmkitx';

// 1. 创建实例：为本次 GCM 加密生成新的 12 字节 nonce。
const cipher = SM4.GCM(
  '0123456789abcdeffedcba9876543210',
  getRandomBytes(12),
);
const message = 'order=GMKIT-DEMO-0001&amount=88.00';
const aad = 'tenant=demo;schema=1';

// 2. SM4-GCM 加密：实例保存 key、mode 和 nonce，本次调用传入 AAD。
const encrypted = cipher.encrypt(message, { aad });

// 3. SM4-GCM 解密：使用同一实例和相同 AAD 恢复明文。
const decrypted = cipher.decrypt(encrypted, { aad });

// 4. 成功断言：解密结果必须等于订单原文。
if (decrypted !== message) {
  throw new Error('SM4 class round-trip failed');
}
```

这个实例只适合一次 GCM 加密和对应解密。若继续用同一 key 加密下一条消息，必须先 `setIV(getRandomBytes(12))`；并发任务不要共享可变实例。

## 失败处理速查

<ApiTable label="SM4 失败行为" min-width="70rem">

| 场景 | 行为 | 典型原因 |
|:--|:--|:--|
| key / IV / nonce 解析失败 | 抛出 `Error` | Hex 非法、长度不符、遗漏 IV |
| mode / padding / 编码枚举非法 | 抛出 `Error` | JavaScript 运行时绕过 TypeScript 类型 |
| ECB/CBC + NONE 长度不对齐 | 抛出 `Error` | 明文或密文不是 16 字节倍数 |
| PKCS7 解密失败 | 抛出 `Error` | key/IV 错误、密文损坏、填充不合法 |
| AEAD 缺少 tag | 抛出 `Error` | 只传密文，没有结果对象或 `options.tag` |
| AEAD tag 长度不合法 | 抛出 `Error` | GCM 不在 12–16；CCM 不是 4–16 偶数 |
| AEAD 认证不通过 | 抛出 `Error`，不返回明文 | key、nonce、AAD、密文或 tag 不一致 |
| 文本解码不适合业务数据 | 改用 `sm4DecryptBytes` | 明文本来是任意二进制 |

</ApiTable>

解密函数不用 `false` 表示失败。特别是 GCM/CCM，必须把异常当作整条消息不可接受，不能忽略认证错误后继续处理任何明文。

## 安全使用清单

- key 必须由安全随机源产生并存放在合适的密钥管理系统中，示例固定 key 只用于测试。
- GCM、CCM、CTR、OFB 的 nonce/IV 在相同 key 下不可重复；CBC IV 应随机且不可预测。
- AAD 不加密，适合放租户、版本、消息类型等必须绑定但可以公开的字段。
- tag 必须和密文、nonce、AAD 一起进入协议，不要截断到双方未明确约定的长度。
- 不要依赖默认 ECB；每次调用明确写出 mode。
- 不要把 ZERO padding 用于任意二进制，也不要把“解密未抛错”当作 CBC/CTR 密文可信的证明。
- 本实现运行在 JavaScript/JIT 环境，不承诺所有运算严格恒时；高风险密钥场景还应评估运行环境和侧信道边界。

## 本页覆盖的公共 API

- 根函数：`sm4Encrypt`、`sm4Decrypt`、`sm4DecryptBytes`。
- 根类：`SM4`，包括构造器、九个实例状态/运算方法和七个静态工厂。
- 选项与结果：`SM4Options`、`SM4DecryptOptions`、`SM4CipherResult`。
- 兼容类型别名：`SM4GCMResult`、`SM4CCMResult`、`SM4AEADResult`。
- 命名空间：`sm4.encrypt`、`sm4.decrypt`、`sm4.decryptBytes`、`sm4.SM4`。

## 可执行案例

下面的测试源码覆盖 GCM 结果对象、Base64 编码、文本往返和 tag 篡改失败。站点检查会确认引用区域存在，文档示例任务会执行同一文件。

::: details 查看测试源码
<!-- code-sample id="api-typescript-sm4-14" steps="准备输入|SM4-GCM 加密|加密结果断言|SM4-GCM 解密|失败断言" -->
```js
<!-- @include: ../../../examples/node/public-api-manual.mjs#ts-sm4-example -->
```
:::

## 相关页面

- [跨语言 SM4 模式、填充与字段约定](/algorithms/SM4.html)
- [TypeScript 公共编码与随机数 API](./common.html)
- [Java SM4 API](/manual/java/api/sm4.html)
