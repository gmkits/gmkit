---
title: Java SM3 API
description: 逐项说明 SM3 与 SM3Util 的摘要、HMAC、字符编码、返回格式和失败行为。
pageInfo: false
contributors: false
editLink: false
icon: fingerprint
order: 3
category:
  - API 说明书
  - Java
tag:
  - SM3
  - HMAC
  - 摘要
---

# Java SM3 API

SM3 把任意长度消息映射为固定 256 bit（32 字节）摘要。`SM3` 提供无状态的实例方法，`SM3Util` 提供同语义的静态方法；两者都支持一次性摘要和 HMAC-SM3，不维护分块输入状态。

摘要只能判断内容是否一致，不能证明消息来自谁。需要共享密钥认证时使用 HMAC-SM3；需要数字签名时使用 [SM2](./sm2.html)。

::: tip 本页适用范围
以下签名和默认值按 `gmkit 0.10.1` 说明。字符串消息默认按 UTF-8 编码，不会自动识别为 Hex 或 Base64。
:::

::: tip 先运行完整案例
固定摘要、HMAC、字符集选择和金额篡改断言见 [Java SM3 使用手册](/manual/java/sm3.html)。
:::

## 导入与入口选择

<!-- code-reference -->
```java
import cn.gmkit.core.Bytes;
import cn.gmkit.core.HexCodec;
import cn.gmkit.sm3.SM3;
import cn.gmkit.sm3.SM3Util;
```

<ApiTable label="Java SM3 入口选择" min-width="52rem">

| 入口 | 调用形式 | 适用场景 | 状态 |
|:--|:--|:--|:--|
| `SM3` | `new SM3().digest(...)` | 代码希望与 `SM2`、`SM4` 的实例式入口保持一致 | 无状态，可复用 |
| `SM3Util` | `SM3Util.digest(...)` | 工具方法、表达式或已有静态调用风格 | 内部复用无状态实例 |

</ApiTable>

两个入口的结果、参数校验和异常行为相同。`SM3` 不是 TypeScript 版本那样的增量对象：它没有 `update()`、`reset()` 或 `close()`，也不会在调用间保存消息。

<!-- code-reference -->
```java
public static final int SM3.DIGEST_LENGTH = 32;
public static final int SM3Util.DIGEST_LENGTH = 32;

public SM3();
```

`DIGEST_LENGTH` 的单位是字节。构造器不分配外部资源，实例可在多个顺序调用中重复使用；类本身没有可变字段。

## 输入与输出约定

<ApiTable label="Java SM3 输入输出约定" min-width="55rem">

| 位置 | 类型 | 编码或长度 | 说明 |
|:--|:--|:--|:--|
| 消息 | `byte[]` | 原始字节 | 不复制输入之外的长期状态，空数组合法 |
| 消息 | `String` | 默认 UTF-8 | 空字符串合法，不解析 Hex/Base64 |
| HMAC key | `byte[]` | 原始密钥字节 | 必须非 `null`；空 key 在 API 层合法，但不应在业务协议中使用 |
| 摘要/HMAC | `byte[]` | 32 字节 | 每次调用返回新的数组 |
| Hex 输出 | `String` | 64 个小写 Hex 字符 | 无 `0x` 前缀 |
| Base64 输出 | `String` | 标准 Base64，通常 44 字符 | 保留 `=` 填充 |

</ApiTable>

字符编码属于摘要输入的一部分。同一段文字只有在发送方和接收方使用相同 `Charset` 时才会得到相同结果；协议字段已经是字节时应直接传 `byte[]`。

## 摘要 API

摘要适合固定向量校验、内容指纹和签名前的协议处理，不适合直接存储用户密码，也不能代替消息认证码。

### 完整重载

以下九个实例方法均存在；`SM3Util` 提供方法名、参数和返回值完全相同的 `static` 重载。

<!-- code-reference -->
```java
byte[] digest(byte[] data);
byte[] digest(String data);
byte[] digest(String data, Charset charset);

String digestHex(byte[] data);
String digestHex(String data);
String digestHex(String data, Charset charset);

String digestBase64(byte[] data);
String digestBase64(String data);
String digestBase64(String data, Charset charset);
```

<ApiTable label="Java SM3 摘要重载矩阵" min-width="64rem">

| 方法族 | `data` | `charset` | 返回值 | 用途 |
|:--|:--|:--|:--|:--|
| `digest(byte[])` | 原始字节，必填 | 无 | 新的 32 字节数组 | 二进制协议、文件块 |
| `digest(String)` | 文本，必填 | 固定 UTF-8 | 新的 32 字节数组 | 普通 Java 文本 |
| `digest(String, Charset)` | 文本，必填 | 可选；`null` 等同 UTF-8 | 新的 32 字节数组 | 明确兼容其他字符集 |
| `digestHex(...)` | 与对应 `digest` 相同 | 与对应 `digest` 相同 | 64 位小写 Hex | 日志、配置、文本协议 |
| `digestBase64(...)` | 与对应 `digest` 相同 | 与对应 `digest` 相同 | 标准 Base64 | JSON、HTTP 字段 |

</ApiTable>

<!-- code-sample id="api-java-sm3-04" steps="计算 SM3 摘要|固定向量断言|计算文本与字节摘要|输入等价断言" -->
```java
import cn.gmkit.sm3.SM3;
import cn.gmkit.sm3.SM3Util;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

String expected =
        "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0";

// 1. 计算 SM3 摘要：使用标准输入 abc 和默认 UTF-8。
String actual = SM3Util.digestHex("abc");

// 2. 固定向量断言：摘要必须与标准结果完全一致。
if (!expected.equals(actual)) {
    throw new IllegalStateException("SM3 vector mismatch");
}

// 3. 计算文本与字节摘要：显式构造等价的 UTF-8 输入。
SM3 sm3 = new SM3();
byte[] fromText = sm3.digest("abc");
byte[] fromBytes = sm3.digest("abc".getBytes(StandardCharsets.UTF_8));

// 4. 输入等价断言：字符串与 UTF-8 字节必须得到相同摘要。
if (!Arrays.equals(fromText, fromBytes)) {
    throw new IllegalStateException("SM3 UTF-8 mismatch");
}
```

## HMAC-SM3 API

HMAC-SM3 使用共享密钥认证消息内容。调用方负责安全生成、保存和轮换 key；字符串只用于消息，key 始终以 `byte[]` 传入，避免把 Hex key 与文本 key 混为一谈。

### 完整重载

以下九个实例方法同样在 `SM3Util` 中提供对应的 `static` 重载。

<!-- code-reference -->
```java
byte[] hmac(byte[] key, byte[] data);
byte[] hmac(byte[] key, String data);
byte[] hmac(byte[] key, String data, Charset charset);

String hmacHex(byte[] key, byte[] data);
String hmacHex(byte[] key, String data);
String hmacHex(byte[] key, String data, Charset charset);

String hmacBase64(byte[] key, byte[] data);
String hmacBase64(byte[] key, String data);
String hmacBase64(byte[] key, String data, Charset charset);
```

<ApiTable label="Java HMAC-SM3 参数" min-width="58rem">

| 参数 | 必填 | 默认值 | 单位/编码 | 说明 |
|:--|:--:|:--|:--|:--|
| `key` | 是 | 无 | 原始字节 | 不自动解析 Hex；Hex key 先用 `HexCodec.decodeStrict()` |
| `data` | 是 | 无 | 原始字节或文本 | `String` 重载默认 UTF-8 |
| `charset` | 否 | UTF-8 | Java `Charset` | 显式传 `null` 也回退到 UTF-8 |

</ApiTable>

返回格式与摘要方法一致：`hmac` 返回新的 32 字节数组，`hmacHex` 返回 64 位小写 Hex，`hmacBase64` 返回标准 Base64。

<!-- code-sample id="api-java-sm3-06" steps="准备认证输入|计算发送端和接收端 HMAC-SM3|成功断言|计算篡改消息 HMAC|失败断言" -->
```java
import cn.gmkit.core.Bytes;
import cn.gmkit.core.HexCodec;
import cn.gmkit.sm3.SM3Util;
import java.nio.charset.StandardCharsets;

// 1. 准备认证输入：正常订单与篡改金额使用同一 HMAC key。
byte[] key = "merchant-demo-key".getBytes(StandardCharsets.UTF_8);
String message = "order=GMKIT-DEMO-0001&amount=88.00";
String tampered = "order=GMKIT-DEMO-0001&amount=99.00";

// 2. 计算发送端和接收端 HMAC-SM3。
String expectedMac = SM3Util.hmacHex(key, message);
String receivedMac = SM3Util.hmacHex(key, message);

// 3. 成功断言：解码后使用常量时间字节比较。
if (!Bytes.constantTimeEquals(
        HexCodec.decodeStrict(expectedMac),
        HexCodec.decodeStrict(receivedMac))) {
    throw new IllegalStateException("HMAC-SM3 verification failed");
}

// 4. 计算篡改消息 HMAC：金额变化后重新计算认证值。
String tamperedMac = SM3Util.hmacHex(key, tampered);

// 5. 失败断言：篡改消息的认证值不得通过比较。
if (Bytes.constantTimeEquals(
        HexCodec.decodeStrict(expectedMac),
        HexCodec.decodeStrict(tamperedMac))) {
    throw new IllegalStateException("tampered order must not pass HMAC check");
}
```

库没有单独的 `verifyHmac` 方法。接收外部 MAC 时，应先按协议指定的 Hex/Base64 解码，确认结果恰好为 32 字节，再使用 `Bytes.constantTimeEquals()` 比较。

## 失败行为与边界

<ApiTable label="Java SM3 失败行为" min-width="58rem">

| 情况 | 结果 | 调用方处理 |
|:--|:--|:--|
| `data == null` | 抛出 `GmkitException` | 在协议边界区分“缺失”与“空消息” |
| `key == null` | 抛出 `GmkitException` | 不要用空引用表示默认 key |
| `charset == null` | 不报错，使用 UTF-8 | 若协议指定字符集，建议显式传常量 |
| 空消息 | 正常计算摘要或 HMAC | 由业务层决定是否允许 |
| 空 key | API 层接受 | 密钥强度和最短长度应由业务协议限制 |
| Provider 或算法初始化失败 | 抛出运行时异常 | 视为环境或依赖错误，不应降级为普通摘要 |

</ApiTable>

这两个公开类都不持有需要关闭的资源。一次调用失败不会留下待清理的摘要状态。

## 可执行案例

固定摘要和订单篡改断言均收录在 JUnit 文档测试中；页面示例与测试使用同一组输入。

::: details 查看固定向量测试
<!-- code-sample id="api-java-sm3-07" steps="计算 SM3 摘要|固定向量断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit/src/test/java/cn/gmkit/PublicApiManualExamplesTest.java#java-sm3-example -->
```
:::

::: details 查看 HMAC 篡改测试
<!-- code-sample id="api-java-sm3-08" steps="准备认证输入|计算 HMAC-SM3 并断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit/src/test/java/cn/gmkit/PublicApiManualExamplesTest.java#java-sm3-hmac-example -->
```
:::

运行测试：

```bash
cd packages/java
mvn -pl gmkit -Dtest=PublicApiManualExamplesTest test
```

## 公共项覆盖

本页覆盖 `SM3`、`SM3Util` 两个公开顶层类型，以及两个类型公开的 `DIGEST_LENGTH`、构造器和全部 18 组摘要/HMAC 方法。`SM3Support` 是包内实现，不属于公共 API。

## 相关页面

- [跨语言 SM3 固定向量](/algorithms/SM3.html)
- [核心编码、异常与常量时间比较](./core.html)
- [TypeScript SM3 API](/manual/typescript/api/sm3.html)
