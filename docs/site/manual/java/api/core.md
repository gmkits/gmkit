---
title: Java 核心公共 API
description: 逐项说明 Java 编码、字节、Provider、安全上下文、格式枚举、消息和公共异常。
pageInfo: false
contributors: false
editLink: false
icon: toolbox
order: 1
category:
  - API 说明书
  - Java
tag:
  - 编码
  - Provider
  - SecureRandom
  - 异常
---

# Java 核心公共 API

`cn.gmkit.core` 是 Java 各算法共享的基础层，包含 18 个公共顶层类型：严格编码、字节数组、文本、Bouncy Castle Provider、安全上下文、格式枚举、双语消息和统一运行时异常。

这些类型负责公共边界，不替代算法自己的长度和安全校验。例如 `HexCodec` 能把任意偶数长度 Hex 解码为字节，但 SM4 入口仍会把 key 限定为 16 字节。

::: tip 本页适用范围
以下签名和行为按 `cn.gmkit:gmkit:0.10.1` 说明。Java 最低版本为 8。示例使用 JUnit 5 断言；普通应用可换成自己的测试框架。
:::

::: tip 先确定传输字段
新协议请先按 [Java core 使用手册](/manual/java/core.html) 固定 UTF-8、Hex/Base64、随机源和异常映射。本页用于逐成员查阅；自动识别只在兼容区说明。
:::

## 导入

<!-- code-reference -->
```java
import cn.gmkit.core.Base64Codec;
import cn.gmkit.core.BcProviders;
import cn.gmkit.core.ByteEncodings;
import cn.gmkit.core.Bytes;
import cn.gmkit.core.Checks;
import cn.gmkit.core.GmSecurityContext;
import cn.gmkit.core.GmSecurityContexts;
import cn.gmkit.core.GmkitException;
import cn.gmkit.core.HexCodec;
import cn.gmkit.core.InputFormat;
import cn.gmkit.core.Messages;
import cn.gmkit.core.OutputFormat;
import cn.gmkit.core.SM2CipherMode;
import cn.gmkit.core.SM2SignatureFormat;
import cn.gmkit.core.SM2SignatureInputFormat;
import cn.gmkit.core.SM4CipherMode;
import cn.gmkit.core.SM4Padding;
import cn.gmkit.core.Texts;
```

## `HexCodec`

### 完整公开签名

<!-- code-reference -->
```java
public static byte[] decodeStrict(String input, String label)
public static String encode(byte[] input)
public static boolean isHex(String input)
public static String normalize(String input)
public static String normalize(String input, String label)
```

<ApiTable label="HexCodec 成员" min-width="72rem">

| 方法 | 用途 | 返回值 | 失败或边界 |
|:--|:--|:--|:--|
| `decodeStrict` | 解码协议 Hex 字段 | 新 `byte[]` | null/空白、去前缀后为空、奇数长度或非 Hex 时抛 `GmkitException` |
| `encode` | 把字节写成协议文本 | 不带前缀的小写 Hex | input 为 null 时抛 `GmkitException` |
| `isHex` | 只判断字符集合 | `boolean` | null/空串为 false；奇数长度也可能为 true；不接受 `0x` |
| `normalize(input)` | 使用默认错误标签清理输入 | 清理后的文本 | null/空白/只有前缀时抛错 |
| `normalize(input, label)` | 使用业务字段名清理输入 | 清理后的文本 | 同上；label 只进入消息 |

</ApiTable>

`normalize` 会移除字符串中所有 `Character.isWhitespace` 识别的空白，并去掉开头的 `0x`/`0X`；它不转小写，也不检查剩余字符是不是 Hex。完整解码使用 `decodeStrict`。

<!-- code-sample id="api-java-core-03" steps="清理 Hex 文本|清理结果断言|严格 Hex 解码|Hex 往返断言|非法输入断言" -->
```java
// 1. 清理 Hex 文本：移除空白和 0x 前缀，但保留字母大小写。
String normalized = HexCodec.normalize(" 0xAA BB ", "payload");

// 2. 清理结果断言：normalize 不负责改成小写。
if (!"AABB".equals(normalized)) {
    throw new IllegalStateException("Hex normalization mismatch");
}

// 3. 严格 Hex 解码：确认字符合法且长度为偶数。
byte[] bytes = HexCodec.decodeStrict(normalized, "payload");

// 4. Hex 往返断言：encode 固定返回小写文本。
if (!"aabb".equals(HexCodec.encode(bytes))) {
    throw new IllegalStateException("Hex round-trip mismatch");
}

// 5. 非法输入断言：奇数长度 Hex 必须抛出 GmkitException。
org.junit.jupiter.api.Assertions.assertThrows(
    GmkitException.class,
    () -> HexCodec.decodeStrict("abc", "payload"));
```

不要先用 `isHex` 代替 `decodeStrict`：`isHex("abc")` 为 true，但严格解码会因为长度为奇数而失败。

## `Base64Codec`

### 完整公开签名

<!-- code-reference -->
```java
public static byte[] decode(String input, String label)
public static String encode(byte[] input)
public static boolean isBase64(String input)
public static boolean looksLikeBase64(String input)
```

`isBase64` 当前直接调用 `looksLikeBase64`，两者返回完全相同。后者名字强调它是无分配的格式探测，不是解码结果。

<ApiTable label="Base64Codec 规则" min-width="70rem">

| 行为 | `decode` | `encode` | `isBase64` / `looksLikeBase64` |
|:--|:--|:--|:--|
| 标准字符表 | 只接受 RFC 4648 `+`、`/` | 只生成标准 Base64 | 只接受标准字符表 |
| 尾部填充 | 允许规范 `=`，也允许完全省略 | 始终生成规范 `=` | 总长度必须是 4 的倍数 |
| 空白 | 只裁剪首尾空白，内部空白非法 | 不生成空白 | 只裁剪首尾空白 |
| pad bits | 必须为 0 | 规范生成 | 必须为 0 |
| 空输入 | 抛 `GmkitException` | 空数组返回空字符串 | false |
| Base64URL | 拒绝 `-`、`_` | 不生成 | false |

</ApiTable>

<!-- code-sample id="api-java-core-05" steps="Base64 解码|解码结果断言|语法探测断言|Base64 编码断言|非规范输入断言" -->
```java
// 1. Base64 解码：允许省略尾部 padding。
byte[] bytes = Base64Codec.decode("AP+AQQ", "payload");

// 2. 解码结果断言：原始字节必须等于 00 ff 80 41。
if (!"00ff8041".equals(HexCodec.encode(bytes))) {
    throw new IllegalStateException("unpadded Base64 mismatch");
}

// 3. 语法探测断言：格式探测仍要求四字符对齐。
if (Base64Codec.isBase64("AP+AQQ")) {
    throw new IllegalStateException("format probe must remain four-character aligned");
}

// 4. Base64 编码断言：输出必须恢复规范 padding。
if (!"AP+AQQ==".equals(Base64Codec.encode(bytes))) {
    throw new IllegalStateException("canonical Base64 output mismatch");
}

// 5. 非规范输入断言：pad bits 非零时必须抛错。
org.junit.jupiter.api.Assertions.assertThrows(
    GmkitException.class,
    () -> Base64Codec.decode("QR==", "payload"));
```

`QR==` 的未使用 pad bits 非零，因此会被拒绝。严格规范化避免两个不同文本静默解码为同一字节。

## `ByteEncodings`

### 完整公开签名

<!-- code-reference -->
```java
public static String encode(byte[] input, OutputFormat outputFormat)
public static byte[] decode(
    String input,
    InputFormat inputFormat,
    String label)
```

<ApiTable label="ByteEncodings 成员" min-width="70rem">

| 方法 | 默认值 | 精确语义 |
|:--|:--|:--|
| `encode` | outputFormat 为 null 时 `HEX` | 委托 `HexCodec` 或 `Base64Codec`；input 为 null 时抛错 |
| `decode` | 新代码必须传 `HEX` 或 `BASE64` | 显式委托相应 codec；`null` 是已发布兼容行为，不是新协议的格式值 |

</ApiTable>

<!-- code-sample id="api-java-core-07" steps="Base64 解码|Hex 编码|转换结果断言|非法输入断言" -->
```java
// 1. Base64 解码：显式声明协议字段的输入格式。
byte[] bytes = ByteEncodings.decode(
    "AP+AQQ==",
    InputFormat.BASE64,
    "payload");

// 2. Hex 编码：把相同原始字节写成另一种协议文本。
String hex = ByteEncodings.encode(bytes, OutputFormat.HEX);

// 3. 转换结果断言：输出必须等于预期的小写 Hex。
if (!"00ff8041".equals(hex)) {
    throw new IllegalStateException("encoding mismatch");
}

// 4. 非法输入断言：显式 Hex 输入的字符数为奇数时必须抛错。
org.junit.jupiter.api.Assertions.assertThrows(
    GmkitException.class,
    () -> ByteEncodings.decode("abc", InputFormat.HEX, "payload"));
```

## `Texts`

### 完整公开签名

<!-- code-reference -->
```java
public static final Charset UTF_8

public static byte[] utf8(String input)
public static String utf8(byte[] input)
public static byte[] bytes(String input, Charset charset)
public static String text(byte[] input, Charset charset)
```

<ApiTable label="Texts 成员" min-width="66rem">

| 方法 | charset 为 null 时 | 返回与错误 |
|:--|:--|:--|
| `utf8(String)` | 固定 UTF-8 | 新字节数组；input null 抛 `GmkitException` |
| `utf8(byte[])` | 固定 UTF-8 | 新字符串；input null 抛 `GmkitException` |
| `bytes(String, Charset)` | UTF-8 | 按显式 charset 编码 |
| `text(byte[], Charset)` | UTF-8 | 按显式 charset 解码 |

</ApiTable>

JDK 字符串解码会按 Charset 默认替换策略处理无法映射的字节；任意二进制不要经过 `Texts.utf8(byte[])`。图片、压缩包、密钥和密文保留为 `byte[]`。

<!-- code-sample id="api-java-core-09" steps="UTF-8 编码|编码结果断言|UTF-8 解码断言" -->
```java
// 1. UTF-8 编码：将中文和 emoji 转换为原始字节。
byte[] utf8 = Texts.utf8("国密🔐");

// 2. 编码结果断言：字节序列必须与标准 UTF-8 一致。
if (!"e59bbde5af86f09f9490".equals(HexCodec.encode(utf8))) {
    throw new IllegalStateException("UTF-8 encoding mismatch");
}

// 3. UTF-8 解码断言：原始字节必须恢复同一字符串。
if (!"国密🔐".equals(Texts.utf8(utf8))) {
    throw new IllegalStateException("UTF-8 round-trip mismatch");
}
```

## `Bytes`

### 完整公开签名

<!-- code-reference -->
```java
public static byte[] clone(byte[] input)
public static byte[] requireNonNull(byte[] input, String label)
public static byte[] requireNonEmpty(byte[] input, String label)
public static byte[] requireLength(byte[] input, int expectedLength, String label)
public static byte[] concat(byte[]... arrays)
public static boolean constantTimeEquals(byte[] left, byte[] right)
public static byte[] copyOfRange(byte[] input, int from, int to)
```

<ApiTable label="Bytes 成员" min-width="72rem">

| 方法 | 返回值 / 副作用 | null、长度和范围行为 |
|:--|:--|:--|
| `clone` | 新数组 | input 为 null 时返回 null |
| `requireNonNull` | 返回原数组，不复制 | null 抛 `GmkitException` |
| `requireNonEmpty` | 返回原数组，不复制 | null 或零长度抛 `GmkitException` |
| `requireLength` | 返回原数组，不复制 | null 或长度不等于 expectedLength 时抛 `GmkitException` |
| `concat` | 新数组 | null 元素被跳过；总长度超 `Integer.MAX_VALUE` 抛 `GmkitException` |
| `constantTimeEquals` | `boolean`，不修改输入 | 任一 null 或长度不同为 false；两个空数组为 true |
| `copyOfRange` | 新数组 | 直接遵循 `Arrays.copyOfRange`，to 超过源长度时尾部补零 |

</ApiTable>

`concat((byte[][]) null)` 会因 varargs 数组本身为 null 抛 `NullPointerException`；只有数组中的 null 元素会被跳过。`copyOfRange` 还可能抛出 JDK 的 `NullPointerException`、`IllegalArgumentException` 或 `ArrayIndexOutOfBoundsException`。

<!-- code-sample id="api-java-core-11" steps="拼接字节|拼接结果断言|范围复制|范围结果断言|常量时间比较断言" -->
```java
// 1. 拼接字节：null 元素被跳过，其他数组保持原顺序。
byte[] first = new byte[] {0x00, (byte) 0xff};
byte[] second = new byte[] {0x41};
byte[] merged = Bytes.concat(first, null, second);

// 2. 拼接结果断言：输出必须等于 00 ff 41。
if (!"00ff41".equals(HexCodec.encode(merged))) {
    throw new IllegalStateException("byte concat mismatch");
}

// 3. 范围复制：超出源数组的尾部按 JDK 规则补零。
byte[] padded = Bytes.copyOfRange(new byte[] {1, 2}, 1, 4);

// 4. 范围结果断言：结果必须等于 02 00 00。
org.junit.jupiter.api.Assertions.assertArrayEquals(
    new byte[] {2, 0, 0},
    padded);

// 5. 常量时间比较断言：相同的等长字节数组必须返回 true。
org.junit.jupiter.api.Assertions.assertTrue(
    Bytes.constantTimeEquals(
        HexCodec.decodeStrict("aabb", "left"),
        HexCodec.decodeStrict("aabb", "right")));
```

`constantTimeEquals` 对等长数组扫描全部字节，但 JVM、JIT 和硬件仍不提供绝对恒时保证。外部 MAC/tag 先校验固定长度，再调用比较。

## `Checks`

### 完整公开签名

<!-- code-reference -->
```java
public static <T> T requireNonNull(T value, String label)
public static String requireNonBlank(String value, String label)
public static <T> T defaultIfNull(T value, T defaultValue)
public static byte[] requireNonEmpty(byte[] value, String label)
public static boolean hasBytes(byte[] value)
```

<ApiTable label="Checks 成员" min-width="68rem">

| 方法 | 成功返回 | 失败行为 |
|:--|:--|:--|
| `requireNonNull` | 原对象 | null 抛 `GmkitException` |
| `requireNonBlank` | `String.trim()` 后的字符串 | null 或 trim 后为空抛 `GmkitException` |
| `defaultIfNull` | 非 null 原值，否则 defaultValue | 两者都为 null 时返回 null |
| `requireNonEmpty` | 原 byte[] | null 或空数组抛 `GmkitException` |
| `hasBytes` | 非 null 且长度大于 0 时 true | 不抛错 |

</ApiTable>

这些方法统一基础参数语义，不校验算法长度、编码或熵。`requireNonBlank` 使用 Java 8 `String.trim()` 的定义，不等同于所有 Unicode 空白的完整判断。

## `BcProviders`

### 完整公开签名

<!-- code-reference -->
```java
public static Provider create()
public static Provider getIfPresent()
public static Provider defaultProvider()
public static Provider ensureRegistered()
public static Provider registerIfNeeded(Provider provider)
```

<ApiTable label="Bouncy Castle Provider 管理" min-width="72rem">

| 方法 | 是否修改 JVM 全局 Provider 列表 | 返回值 |
|:--|:--:|:--|
| `create` | 否 | 每次创建新的 `BouncyCastleProvider` |
| `getIfPresent` | 否 | 已注册的名为 `BC` 的 Provider；没有时 null |
| `defaultProvider` | 否 | 已注册 BC；没有时返回新建但未注册的实例 |
| `ensureRegistered` | 是 | 双重检查后按需注册 BC，并返回可用实例 |
| `registerIfNeeded` | 可能 | 按 provider name 查找；同名已存在时返回已有实例，否则注册传入实例 |

</ApiTable>

`registerIfNeeded` 返回值可能不是传入对象，因为 JVM 已有同名 Provider 时以已注册实例为准。Provider 注册改变整个 JVM，可能受安全策略限制并抛 `SecurityException`。

容器、应用服务器和有统一安全基线的进程应由启动层管理 Provider。库内部运算通常也可以直接向 JCA/BC API 传一个未全局注册的 Provider 实例。

<!-- code-sample id="api-java-core-14" steps="创建隔离 Provider|Provider 名称断言|默认 Provider 断言" -->
```java
// 1. 创建隔离 Provider：不修改 JVM 全局 Provider 列表。
Provider isolated = BcProviders.create();

// 2. Provider 名称断言：Bouncy Castle 的名称必须为 BC。
if (!"BC".equals(isolated.getName())) {
    throw new IllegalStateException("unexpected Provider");
}

// 3. 默认 Provider 断言：已注册或临时创建的实例必须可用。
if (BcProviders.getIfPresent() == null
    && BcProviders.defaultProvider() == null) {
    throw new IllegalStateException("default Provider unavailable");
}
```

## `GmSecurityContext`

### 完整公开成员

<!-- code-reference -->
```java
public static GmSecurityContext.Builder builder()
public Provider provider()
public SecureRandom secureRandom()
public boolean registerProvider()

public static final class Builder {
    public Builder provider(Provider provider)
    public Builder secureRandom(SecureRandom secureRandom)
    public Builder registerProvider(boolean registerProvider)
    public GmSecurityContext build()
}
```

<ApiTable label="GmSecurityContext 默认值与状态" min-width="72rem">

| 项目 | 默认值 | 说明 |
|:--|:--|:--|
| provider | `BcProviders.defaultProvider()` | 在 `build()` 时解析；传 null 也回落默认值 |
| secureRandom | `new SecureRandom()` | 在 `build()` 时创建；传 null 也回落新实例 |
| registerProvider | `true` | 只有调用 `provider()` 时才执行按需全局注册 |
| 对象可变性 | context 字段不可变 | Provider 和 SecureRandom 对象本身仍有状态；getter 返回保存引用 |

</ApiTable>

Builder setter 都返回同一 Builder，可链式调用。`build()` 后继续修改 Builder 不影响已构建 context。

<!-- code-sample id="api-java-core-16" steps="准备依赖|构建安全上下文|上下文断言" -->
```java
// 1. 准备依赖：创建未注册 Provider 和 SecureRandom 实例。
Provider provider = BcProviders.create();
SecureRandom random = new SecureRandom();

// 2. 构建安全上下文：保存依赖并禁止全局注册。
GmSecurityContext context = GmSecurityContext.builder()
    .provider(provider)
    .secureRandom(random)
    .registerProvider(false)
    .build();

// 3. 上下文断言：getter 必须返回同一对象引用和注册策略。
if (context.provider() != provider
    || context.secureRandom() != random
    || context.registerProvider()) {
    throw new IllegalStateException("security context mismatch");
}
```

生产 `SecureRandom` 应由可信 JDK/Provider 或平台安全模块提供。测试中的确定性实现不得进入生产配置。

## `GmSecurityContexts`

### 完整公开签名

<!-- code-reference -->
```java
public static GmSecurityContext defaults()
public static GmSecurityContext withProvider(Provider provider)
public static GmSecurityContext withProviderAndRandom(
    Provider provider,
    SecureRandom secureRandom)
public static GmSecurityContext withSecureRandom(SecureRandom secureRandom)
```

<ApiTable label="GmSecurityContexts 工厂" min-width="72rem">

| 工厂 | Provider | SecureRandom | 自动注册 |
|:--|:--|:--|:--:|
| `defaults` | 类初始化时取得的默认 BC | 同一默认 context 保存的实例 | 是 |
| `withProvider` | 调用方提供；null 时回落默认 BC | 新 `SecureRandom` | 否 |
| `withProviderAndRandom` | 调用方提供；null 时回落默认 BC | 调用方提供；null 时新建 | 否 |
| `withSecureRandom` | 默认 BC | 调用方提供；null 时新建 | 是 |

</ApiTable>

`defaults()` 每次返回同一个 context，而其他三个工厂每次构建新 context。默认 context 内的 `SecureRandom` 也是共享引用；需要隔离的测试或租户配置应显式构建上下文。

## 格式枚举

### `InputFormat` 与 `OutputFormat`

<!-- code-reference -->
```java
enum InputFormat  { HEX, BASE64 }
enum OutputFormat { HEX, BASE64 }
```

两者名称相同但类型不同：输入枚举交给解码方法，输出枚举交给编码方法。null 的含义由具体 API 决定，不能一概视为自动识别。

### SM2 枚举

<!-- code-reference -->
```java
enum SM2CipherMode {
    C1C3C2,
    C1C2C3;
    public SM2Engine.Mode toBcMode();
}

enum SM2SignatureFormat {
    RAW,
    DER
}

enum SM2SignatureInputFormat {
    RAW,
    DER,
    AUTO
}
```

<ApiTable label="SM2 格式枚举" min-width="66rem">

| 类型 | 成员 | 用途 |
|:--|:--|:--|
| `SM2CipherMode` | `C1C3C2`, `C1C2C3` | 控制原始密文的 C1/C2/C3 排列；`toBcMode` 返回 BC 对应枚举 |
| `SM2SignatureFormat` | `RAW`, `DER` | 控制签名输出；RAW 固定 64 字节 r||s |
| `SM2SignatureInputFormat` | `RAW`, `DER`, `AUTO` | 控制验签输入解析；协议明确时不要依赖 AUTO |

</ApiTable>

### SM4 枚举

<!-- code-reference -->
```java
enum SM4CipherMode {
    ECB, CBC, CTR, CFB, OFB, GCM, CCM;
    public boolean isStreamLike();
}

enum SM4Padding {
    PKCS7, NONE, ZERO
}
```

`isStreamLike()` 对 CTR、CFB、OFB、GCM、CCM 返回 true，对 ECB、CBC 返回 false。这里的 “stream-like” 表示不需要分组填充，不代表模式带完整性；只有 GCM/CCM 是 AEAD。

`SM4Padding.ZERO` 解密会移除尾部零字节，不能用于需要无损恢复任意二进制的协议。

## `GmkitException`

<!-- code-reference -->
```java
public class GmkitException extends RuntimeException {
    public GmkitException(String message)
    public GmkitException(String message, Throwable cause)
}
```

GMKit 的参数、编码、加解密和签名包装错误优先使用这个非受检异常。验签对“格式有效但数学上不匹配”通常返回 false；格式、key 或 Provider 配置非法仍可能抛异常。

不是所有错误都会被包装：`Arrays.copyOfRange` 的范围异常、Provider 全局注册的 `SecurityException`、内存错误等 JDK 异常可能直接传播。业务不要通过解析 message 判断错误类型。

<!-- code-sample id="api-java-core-22" steps="触发编码错误|诊断信息断言" -->
```java
// 1. 触发编码错误：严格 Hex 解码必须拒绝非 Hex 文本。
try {
    HexCodec.decodeStrict("not-hex", "payload");
    throw new IllegalStateException("invalid Hex was accepted");
} catch (GmkitException ex) {
    // 2. 诊断信息断言：包装异常必须保留可读消息。
    if (ex.getMessage() == null) {
        throw new IllegalStateException("missing diagnostic message", ex);
    }
}
```

## `Messages`

`Messages` 构造中文在前、英文在后的诊断文本，格式通常为 `中文 / English`。应用一般不直接调用，但它是公共类型，因此所有方法如下。

<ApiTable label="Messages 公共方法" min-width="78rem">

| 签名 | 生成的消息用途 |
|:--|:--|
| `bilingual(String zh, String en)` | 直接拼接一条双语消息 |
| `nullValue(String label)` | 参数为 null |
| `emptyValue(String label)` | byte[] 等内容为空 |
| `blankValue(String label)` | trim 后字符串为空 |
| `invalidHexEven(String label)` | Hex 不是偶数长度 |
| `invalidHex(String label)` | 含非 Hex 字符 |
| `invalidBase64(String label)` | Base64 字符、长度、填充或 pad bits 非法 |
| `invalidHexOrBase64(String label)` | 自动识别失败 |
| `invalidBlankInput(String label)` | codec 输入 null 或空白 |
| `expectedLength(String label, int expectedLength, int actualLength)` | 定长字节字段不匹配 |
| `multipleOf(String label, int blockSize)` | 长度不是 blockSize 整数倍 |
| `positiveValue(String label)` | 数值不为正 |
| `sm2EncryptionFailed()` | SM2 加密包装失败 |
| `sm2DecryptionFailed()` | SM2 解密包装失败 |
| `sm2SigningFailed()` | SM2 签名包装失败 |
| `sm2InitiatorConfirmationTagRequired()` | 密钥交换发起方缺少确认标签 |
| `sm2UserIdTooLong()` | SM2 user ID 超过 16-bit ENTL 可表示范围 |
| `invalidSm2Signature()` | 签名既不是合法 RAW 也不是合法 DER |
| `invalidSm2DerSignature()` | DER 不是预期的 SEQUENCE `{r,s}` |
| `invalidSm2RawSignatureLength(int expectedLength)` | RAW 签名长度错误 |
| `invalidSm2RawSignatureEncoding()` | RAW→DER 转换失败 |

</ApiTable>

这些字符串用于人读诊断，不是稳定机器协议：标点、措辞和语言可能调整。日志可以保留异常类型与操作上下文，但不要拼入私钥、完整明文或密钥材料。

## 失败处理速查

<ApiTable label="Java core 失败行为" min-width="72rem">

| API 家族 | 主要失败类型 | 容易忽略的边界 |
|:--|:--|:--|
| Hex/Base64 | `GmkitException` | Hex normalize 保留大小写；Base64 decode 与格式探测的无填充规则不同 |
| `ByteEncodings` | `GmkitException` | null InputFormat 表示自动识别；null OutputFormat 表示 Hex |
| `Texts` / `Checks` | `GmkitException` | 文本解码可能替换非法序列；校验成功返回原引用 |
| `Bytes` | `GmkitException` 或 JDK 范围异常 | null concat 元素跳过；copyOfRange 可补零 |
| Provider | `SecurityException` 等 JDK 异常 | 全局注册影响整个 JVM；同名 Provider 返回已有实例 |
| 安全上下文 | 通常构建不抛错 | null 配置会回落默认；Provider 注册延迟到 `provider()` |

</ApiTable>

## 本页覆盖的公共 API

- 编码：`HexCodec`、`Base64Codec`、`ByteEncodings`、`InputFormat`、`OutputFormat`。
- 字节与文本：`Bytes`、`Checks`、`Texts`。
- Provider 与随机源：`BcProviders`、`GmSecurityContext`、`GmSecurityContext.Builder`、`GmSecurityContexts`。
- 算法格式：`SM2CipherMode`、`SM2SignatureFormat`、`SM2SignatureInputFormat`、`SM4CipherMode`、`SM4Padding`。
- 异常与消息：`GmkitException`、`Messages`。

## 兼容成员

<details>
<summary>只在读取没有格式字段的历史数据时展开</summary>

<!-- code-reference -->
```java
public static byte[] ByteEncodings.decodeAuto(String input, String label)
```

`decode(..., null, ...)` 与 `decodeAuto(...)` 都先判断 Hex，再判断 Base64。`"abc"` 会被识别为 Hex 候选，然后因为字符数为奇数抛出 `GmkitException`；实现不会再回退 Base64。迁移完成后应把格式写入协议字段并传 `InputFormat.HEX` 或 `InputFormat.BASE64`，详见[旧系统迁移](/manual/migration.html#密文和签名自动识别)。

</details>

## 可执行案例

下面的 JUnit 区域覆盖显式 Base64 解码、Hex 输出和非法 Hex 异常。Java 主包测试会编译并执行同一源码。

::: details 查看测试源码
<!-- code-sample id="api-java-core-23" steps="Base64 解码|Hex 编码断言|非法输入断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit/src/test/java/cn/gmkit/PublicApiManualExamplesTest.java#java-core-example -->
```
:::

## 相关页面

- [跨语言编码、错误与安全约定](/api/common.html)
- [Java API 首页](/api/java/)
- [Java SM2 API](./sm2.html)
- [Java SM4 API](./sm4.html)
