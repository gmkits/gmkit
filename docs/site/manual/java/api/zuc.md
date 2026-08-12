---
title: Java ZUC API
description: 逐项说明 ZUC-128 密钥流、加解密、128-EEA3、128-EIA3 及 byte、word、bit 长度单位。
pageInfo: false
contributors: false
editLink: false
icon: signal
order: 5
category:
  - API 说明书
  - Java
tag:
  - ZUC
  - EEA3
  - EIA3
---

# Java ZUC API

`ZUC` 与 `ZUCUtil` 提供 ZUC-128 密钥流、异或加解密、128-EEA3 机密性保护和 128-EIA3 完整性保护。两个类都是无状态静态入口，方法签名和结果一致；当前不支持 ZUC-256。

EEA3/EIA3 适用于明确规定这些参数和比特顺序的通信协议。普通业务若需要认证加密，优先使用 [SM4-GCM 或 SM4-CCM](./sm4.html)，不要自行把裸 ZUC 加密与另一套 MAC 拼接成新协议。

::: warning 最容易写错的是长度单位
`lengthBytes` 按字节计数，`lengthWords` 按 32-bit word 计数，`bitLength` 按 bit 计数。它们不能互换。
:::

::: tip 先按协议任务接入
密钥流、普通流加解密、EEA3/EIA3 和 bit 长度示例见 [Java ZUC 使用手册](/manual/java/zuc.html)。本页用于核对全部重载。
:::

## 导入、常量与入口

<!-- code-reference -->
```java
import cn.gmkit.core.Bytes;
import cn.gmkit.core.HexCodec;
import cn.gmkit.zuc.ZUC;
import cn.gmkit.zuc.ZUCUtil;

ZUC.KEY_LENGTH;       // 16 字节
ZUC.IV_LENGTH;        // 16 字节
ZUCUtil.KEY_LENGTH;   // 16 字节
ZUCUtil.IV_LENGTH;    // 16 字节
```

`ZUC` 和 `ZUCUtil` 都不能实例化。`ZUCUtil` 只把调用委托给 `ZUC`，适合希望命名方式与 `SM2Util`、`SM3Util`、`SM4Util` 一致的代码；无需为二者建立不同的配置。

<ApiTable label="ZUC 公共输入约定" min-width="60rem">

| 参数 | 类型 | 长度/范围 | 编码与含义 |
|:--|:--|:--|:--|
| `key` | `byte[]` | 恰好 16 字节 | ZUC-128 原始密钥；调用时会复制 |
| `keyHex` | `String` | 恰好 32 个 Hex 字符 | 不含 `0x`；大小写均可 |
| `iv` | `byte[]` | 恰好 16 字节 | 原始初始化向量；调用时会复制 |
| `ivHex` | `String` | 恰好 32 个 Hex 字符 | 不含 `0x`；大小写均可 |
| `count` | `int` | 任意 32-bit 位模式 | 按无符号 32 位协议字段解释 |
| `bearer` | `int` | `0..31` | 5-bit 承载标识 |
| `direction` | `int` | `0` 或 `1` | 协议方向位 |

</ApiTable>

## ZUC-128 密钥流

密钥流 API 用于协议实现、固定向量和已有 ZUC 线路兼容。不要把密钥流本身作为随机数、密钥派生结果或可公开 nonce。

### 完整签名

以下四个方法同时存在于 `ZUC` 和 `ZUCUtil`：

<!-- code-reference -->
```java
static byte[] keystream(byte[] key, byte[] iv, int lengthBytes);
static String keystreamHex(String keyHex, String ivHex, int lengthBytes);
static int[] keystreamWords(byte[] key, byte[] iv, int lengthWords);
static String keystreamWordsHex(String keyHex, String ivHex, int lengthWords);
```

<ApiTable label="ZUC 密钥流返回规则" min-width="62rem">

| 方法 | 长度参数 | 允许 0 | 返回值 | 长度关系 |
|:--|:--|:--:|:--|:--|
| `keystream` | `lengthBytes`，字节 | 是 | 新的 `byte[]` | 数组长度等于 `lengthBytes` |
| `keystreamHex` | `lengthBytes`，字节 | 是 | 小写 Hex | 字符数等于 `lengthBytes × 2` |
| `keystreamWords` | `lengthWords`，32-bit word | 是 | 新的 `int[]` | 数组长度等于 `lengthWords` |
| `keystreamWordsHex` | `lengthWords`，32-bit word | 是 | 每个 word 按大端拼接的小写 Hex | 字符数等于 `lengthWords × 8` |

</ApiTable>

Java 的 `int` 有符号，但 `keystreamWords` 中每个元素保存的是原样 32-bit 位模式。需要十进制展示时可用 `Integer.toUnsignedLong(word)`；跨语言序列化时按大端 4 字节写出，不要输出有符号十进制文本。

<!-- code-sample id="api-java-zuc-03" steps="准备固定向量|生成字节密钥流|字节向量断言|生成 word 密钥流|单位换算断言" -->
```java
// 1. 准备固定向量：ZUC-128 的 key 和 IV 都为 16 字节全零。
String zero = "00000000000000000000000000000000";

// 2. 生成字节密钥流：lengthBytes=8，结果为 16 个 Hex 字符。
String byBytes = ZUC.keystreamHex(zero, zero, 8);

// 3. 字节向量断言：前 8 字节必须匹配标准结果。
if (!"27bede74018082da".equals(byBytes)) {
    throw new IllegalStateException("ZUC byte-stream vector mismatch");
}

// 4. 生成 word 密钥流：lengthWords=2，同样产生 8 字节。
String byWords = ZUC.keystreamWordsHex(zero, zero, 2);

// 5. 单位换算断言：两种长度表示必须得到相同密钥流。
if (!byBytes.equals(byWords)) {
    throw new IllegalStateException("ZUC word-stream vector mismatch");
}
```

## 通用异或加解密

ZUC 是流密码，加密和解密都把输入与同一密钥流异或。相同 key 下绝不能复用 IV；这些方法也不产生认证标签，密文被修改时不会自动报错。

### 完整签名

以下六个方法同时存在于 `ZUC` 和 `ZUCUtil`：

<!-- code-reference -->
```java
static byte[] encrypt(byte[] key, byte[] iv, byte[] plaintext);
static byte[] decrypt(byte[] key, byte[] iv, byte[] ciphertext);

static String encryptHex(String keyHex, String ivHex, String plaintext);
static String encryptBase64(String keyHex, String ivHex, String plaintext);
static String decryptHexToUtf8(
    String keyHex, String ivHex, String ciphertextHex);
static String decryptBase64ToUtf8(
    String keyHex, String ivHex, String ciphertextBase64);
```

<ApiTable label="ZUC 加解密重载" min-width="66rem">

| 方法 | 数据输入 | 返回值 | 适用场景 |
|:--|:--|:--|:--|
| `encrypt` | 原始明文字节 | 等长的新密文字节数组 | 二进制协议 |
| `decrypt` | 原始密文字节 | 等长的新明文字节数组 | 二进制协议 |
| `encryptHex` | UTF-8 文本 | 小写 Hex 密文 | 文本输入、Hex 传输 |
| `encryptBase64` | UTF-8 文本 | 标准 Base64 密文 | 文本输入、JSON/HTTP 传输 |
| `decryptHexToUtf8` | Hex 密文 | UTF-8 文本 | 与 `encryptHex` 配对 |
| `decryptBase64ToUtf8` | Base64 密文 | UTF-8 文本 | 与 `encryptBase64` 配对 |

</ApiTable>

空消息合法，返回空数组或空字符串。`byte[]` API 不修改输入数组。`decrypt*ToUtf8` 只适合原文确实是 UTF-8 的情况；任意二进制内容应使用 `decrypt(byte[], ...)`。

<!-- code-sample id="api-java-zuc-05" steps="准备参数|ZUC 加密|ZUC 解密|往返断言" -->
```java
// 1. 准备参数：ZUC-128 使用 16 字节 key、16 字节 IV 和原始二进制明文。
byte[] key = HexCodec.decodeStrict(
        "000102030405060708090a0b0c0d0e0f", "ZUC key");
byte[] iv = HexCodec.decodeStrict(
        "101112131415161718191a1b1c1d1e1f", "ZUC IV");
byte[] plaintext = new byte[] {0x00, (byte) 0xff, (byte) 0x80, 0x41};

// 2. ZUC 加密：明文与密钥流异或，输出等长密文。
byte[] ciphertext = ZUC.encrypt(key, iv, plaintext);

// 3. ZUC 解密：相同 key/IV 再次生成密钥流并恢复明文。
byte[] recovered = ZUC.decrypt(key, iv, ciphertext);

// 4. 往返断言：解密结果的每个字节都必须与明文一致。
if (!java.util.Arrays.equals(plaintext, recovered)) {
    throw new IllegalStateException("ZUC binary round-trip failed");
}
```

## 128-EEA3

EEA3 处理带 `COUNT`、`BEARER` 和 `DIRECTION` 的消息机密性。协议以 bit 为单位时使用 `eea3Encrypt(..., bitLength)`；整字节消息可使用省略 `bitLength` 的重载。

### 完整签名

以下两个消息加密重载同时存在于 `ZUC` 和 `ZUCUtil`：

<!-- code-reference -->
```java
static byte[] eea3Encrypt(
    String keyHex,
    int count,
    int bearer,
    int direction,
    byte[] message,
    int bitLength);

static byte[] eea3Encrypt(
    String keyHex,
    int count,
    int bearer,
    int direction,
    byte[] message);
```

<ApiTable label="EEA3 方法区别" min-width="68rem">

| 方法 | 输入 | 返回值 | 边界行为 |
|:--|:--|:--|:--|
| `eea3Encrypt(..., bitLength)` | 消息字节和有效 bit 数 | `ceil(bitLength / 8)` 字节密文 | 最后一字节未使用的低位清零 |
| `eea3Encrypt(..., message)` | 完整字节消息 | 与消息等长的密文 | 等同 `bitLength = message.length × 8` |

</ApiTable>

`bitLength` 从消息首 bit 起算，每字节先处理最高位。

<!-- code-sample id="api-java-zuc-07" steps="准备 EEA3 消息|EEA3 加密|输出长度断言" -->
```java
// 1. 准备 EEA3 消息：8 字节输入按 64 bit 完整处理。
byte[] message = HexCodec.decodeStrict("5bad724710ba1c56", "EEA3 message");

// 2. EEA3 加密：使用 COUNT、BEARER 和 DIRECTION 生成协议密文。
byte[] encrypted = ZUC.eea3Encrypt(
        "000102030405060708090a0b0c0d0e0f",
        0x01234567,
        0x0a,
        0,
        message,
        64);

// 3. 输出长度断言：64 bit 消息必须产生 8 字节密文。
if (encrypted.length != 8) {
    throw new IllegalStateException("EEA3 output length mismatch");
}
```

## 128-EIA3

EIA3 为协议消息计算固定 32-bit MAC-I。它不是通用 HMAC 替代品；只有在对端协议明确规定 EIA3 的字段布局和 bit 顺序时使用。

### 完整签名

以下三个方法同时存在于 `ZUC` 和 `ZUCUtil`：

<!-- code-reference -->
```java
static String eia3(
    String keyHex,
    int count,
    int bearer,
    int direction,
    byte[] message);

static String eia3(
    String keyHex,
    int count,
    int bearer,
    int direction,
    byte[] message,
    int bitLength);

static String eia3(
    String keyHex,
    int count,
    int bearer,
    int direction,
    String message);
```

<ApiTable label="EIA3 重载规则" min-width="62rem">

| 重载 | 消息解释 | `bitLength` | 返回值 |
|:--|:--|:--|:--|
| `byte[]` | 原始消息字节 | 自动使用 `message.length × 8` | 8 个小写 Hex 字符 |
| `byte[], int` | 原始消息字节的前缀 | `0..message.length × 8` | 8 个小写 Hex 字符 |
| `String` | UTF-8 编码后的完整文本 | 自动使用全部 UTF-8 字节 | 8 个小写 Hex 字符 |

</ApiTable>

<!-- code-sample id="api-java-zuc-09" steps="计算 EIA3 完整性标签|固定向量断言|准备接收值|完整性校验" -->
```java
// 1. 计算 EIA3 完整性标签：使用固定协议字段和 64 bit 消息。
String mac = ZUC.eia3(
        "000102030405060708090a0b0c0d0e0f",
        0x01234567,
        0x0a,
        0,
        HexCodec.decodeStrict("5bad724710ba1c56", "EIA3 message"),
        64);

// 2. 固定向量断言：MAC-I 必须等于标准的 32-bit 结果。
if (!"1b3d0f74".equals(mac)) {
    throw new IllegalStateException("EIA3 vector mismatch");
}

// 3. 准备接收值：把计算值和外部 MAC-I 都解码为 4 字节。
byte[] expectedMac = HexCodec.decodeStrict(mac, "expected MAC-I");
byte[] receivedMac = HexCodec.decodeStrict("1b3d0f74", "received MAC-I");

// 4. 完整性校验：使用常量时间字节比较。
if (!Bytes.constantTimeEquals(expectedMac, receivedMac)) {
    throw new IllegalStateException("EIA3 verification failed");
}
```

## 失败行为

<ApiTable label="ZUC 参数错误" min-width="62rem">

| 情况 | 结果 |
|:--|:--|
| key/IV 为 `null`、Hex 非法或解码后不是 16 字节 | 抛出 `GmkitException` |
| 消息为 `null` | 抛出 `GmkitException`；空数组是合法消息 |
| `lengthBytes`、`lengthWords` 或 `bitLength` 为负数 | 抛出 `GmkitException` |
| `bitLength > message.length × 8` | 抛出 `GmkitException` |
| `bearer` 不在 `0..31` | 抛出 `GmkitException` |
| `direction` 不是 `0` 或 `1` | 抛出 `GmkitException` |
| 文本解密使用了错误 key/IV | 不一定抛错；裸流密码没有认证标签 |

</ApiTable>

错误 key、IV 或被篡改密文通常只会产生错误明文。需要检测篡改时必须使用协议规定的 EIA3，或改用带认证标签的加密模式。

## 跨语言数据

- TypeScript 的 `count` 是 `0..0xffffffff` 的 `number`；Java 用 `int` 保存相同 32-bit 位模式。例如 `0xa94059da` 在 Java 中显示为负数，但送入算法的位不变。
- TypeScript `zucGenerateKeystream` 返回 `Uint32Array`；Java `keystreamWords` 返回 `int[]`。两端落盘或传输时都按无符号大端 word 编码。
- EEA3/EIA3 的 `bitLength` 都从消息最高有效位开始。不要把 Java `byte` 的符号扩展当成协议位序。

## 可执行案例

JUnit 文档测试同时断言 8 字节固定密钥流和非法 key 的失败路径；标准测试还覆盖 EEA3 800-bit 向量与多个 EIA3 向量。

::: details 查看文档案例
<!-- code-sample id="api-java-zuc-10" steps="生成 ZUC 字节密钥流|固定向量断言|非法参数断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit/src/test/java/cn/gmkit/PublicApiManualExamplesTest.java#java-zuc-example -->
```
:::

运行测试：

```bash
cd packages/java
mvn -pl gmkit -Dtest=PublicApiManualExamplesTest,ZUCStandardVectorsTest,ZUCErrorHandlingTest test
```

## 公共项覆盖

本页覆盖 `ZUC`、`ZUCUtil` 两个公开顶层类型、四个长度常量，以及每个类型公开的 16 个静态方法。两个类没有实例状态，也不需要 `reset()` 或 `close()`。

## 兼容成员

<details>
<summary>只在维护旧 EEA3 密钥流调用时展开</summary>

<!-- code-reference -->
```java
static String eea3(
    String keyHex,
    int count,
    int bearer,
    int direction,
    int bitLength);
```

`ZUC.eea3` 与 `ZUCUtil.eea3` 不接收消息，只返回按 32-bit word 向上补齐的密钥流 Hex；0 bit 返回空字符串。它们不能代替加密动作。迁移时先确认旧调用消费的是密钥流还是密文，再改用 `eea3Encrypt`，详见[旧系统迁移](/manual/migration.html#旧-eea3-密钥流入口)。

</details>

## 相关页面

- [跨语言 ZUC、EEA3 与 EIA3 向量](/algorithms/ZUC.html)
- [Java 核心编码与常量时间比较](./core.html)
- [TypeScript ZUC API](/manual/typescript/api/zuc.html)
