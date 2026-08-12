---
title: Java SM2 API
description: 逐项说明 Java SM2 的密钥、加解密、标准签名、旧 no-Z 兼容、预计算 e、格式转换和密钥交换。
pageInfo: false
contributors: false
editLink: false
icon: key
order: 2
category:
  - API 说明书
  - Java
tag:
  - SM2
  - 加密
  - 签名
  - 密钥交换
---

# Java SM2 API

`cn.gmkit.sm2` 提供实例式 `SM2`、静态式 `SM2Util`，以及签名选项、密文格式和密钥交换所需的值对象。SM2 适合身份签名、小数据加密和协议级密钥交换；文件或大消息应使用随机 SM4 会话 key 加密，再由 SM2 保护会话 key。

::: tip 先按标准路径接入
默认签名计算 `e = SM3(Z || M)`。请先按 [Java SM2 使用手册](/manual/java/sm2.html) 完成标准 Z 签名、C1C3C2 加解密和身份篡改测试；旧 no-Z 成员统一列在本页末尾。
:::

## 十个公开类型

<ApiTable label="Java SM2 类型分工" min-width="64rem">

| 类型 | 用途 | 普通业务是否直接使用 |
|:--|:--|:--:|
| `SM2` | 绑定安全上下文的实例式入口 | 是 |
| `SM2Util` | 同语义静态入口 | 是 |
| `SM2KeyPair` | Hex 公私钥结果 | 是 |
| `SM2SignOptions` | 签名输出格式、user ID、随机源 | 是 |
| `SM2VerifyOptions` | 验签输入格式和 user ID | 是 |
| `SM2Signatures` | RAW 与 DER 签名转换 | 对接格式时 |
| `SM2Ciphertext` | C1/C2/C3 分段值对象 | 分析密文时 |
| `SM2Ciphertexts` | raw、DER、GmSSL 风格密文转换 | 对接格式时 |
| `SM2KeyExchangeOptions` | 密钥交换角色、身份和输出位数 | 使用密钥交换时 |
| `SM2KeyExchangeResult` | 共享 key 与 S1/S2 确认标签 | 使用密钥交换时 |

</ApiTable>

## 常量、构造器和安全上下文

`SM2` 与 `SM2Util` 都公开以下常量：

<ApiTable label="Java SM2 常量" min-width="60rem">

| 常量 | 值 | 单位/含义 |
|:--|:--|:--|
| `DEFAULT_USER_ID` | `1234567812345678` | 16 个 ASCII 字节；未指定身份时的兼容默认值 |
| `CURVE_NAME` | `sm2p256v1` | Bouncy Castle 曲线名称 |
| `SM3_DIGEST_LENGTH` | `32` | Z、e、C3 的字节长度 |

</ApiTable>

<!-- code-reference -->
```java
public SM2();
public SM2(GmSecurityContext securityContext);
public GmSecurityContext securityContext();
```

`new SM2()` 使用默认安全上下文：加密和密钥生成使用它，签名还可从 `SM2SignOptions.securityContext()` 取得上下文。`new SM2(context)` 传入非 `null` 上下文后，该实例会固定使用它，并覆盖签名 options 中的上下文；传 `null` 等同默认构造。

每次加解密或签名都会创建新的底层对象，`SM2` 不保存消息状态，无需 `reset()` 或 `close()`。

## 密钥生成与公钥转换

### `SM2` 实例方法

<!-- code-reference -->
```java
SM2KeyPair generateKeyPair();
SM2KeyPair generateKeyPair(boolean compressedPublicKey);
String getPublicKeyFromPrivateKey(String privateKeyHex, boolean compressed);
String compressPublicKey(String publicKeyHex);
String decompressPublicKey(String publicKeyHex);
```

### `SM2Util` 静态方法

<!-- code-reference -->
```java
static SM2KeyPair generateKeyPair();
static SM2KeyPair generateKeyPair(boolean compressedPublicKey);
static SM2KeyPair generateKeyPair(GmSecurityContext securityContext);
static SM2KeyPair generateKeyPair(
    boolean compressedPublicKey,
    GmSecurityContext securityContext);

static String getPublicKeyFromPrivateKey(
    String privateKeyHex,
    boolean compressed);
static String compressPublicKey(String publicKeyHex);
static String decompressPublicKey(String publicKeyHex);
```

<ApiTable label="SM2 密钥格式" min-width="70rem">

| 值 | 生成结果 | 输入兼容 | 校验 |
|:--|:--|:--|:--|
| 私钥 | 32 字节、64 位小写 Hex | 较短合法标量会左侧补零；单个额外前导 `00` 可接受 | 必须在曲线标量范围内；签名还排除 `n-1` |
| 非压缩公钥 | `04 || x || y`，65 字节、130 位 Hex | 大小写 Hex 均可 | 必须是曲线上的非无穷点 |
| 压缩公钥 | `02/03 || x`，33 字节、66 位 Hex | 大小写 Hex 均可 | 解压时验证曲线点 |

</ApiTable>

`generateKeyPair()` 默认返回非压缩公钥。`generateKeyPair(true)` 返回压缩公钥；加密和验签都能读取压缩或非压缩格式。

### `SM2KeyPair`

<!-- code-reference -->
```java
public SM2KeyPair(String publicKey, String privateKey);
String publicKey();
String privateKey();
```

该构造器只是字符串容器，不会立即验证密钥。库生成的值符合上表格式；外部输入会在执行加密、解密或签名时校验。

<!-- code-sample id="api-java-sm2-05" steps="生成密钥对|派生公钥|派生结果断言|压缩公钥|解压公钥断言" -->
```java
// 1. 生成密钥对：默认返回非压缩公钥。
SM2 sm2 = new SM2();
SM2KeyPair keys = sm2.generateKeyPair();

// 2. 派生公钥：从私钥重新计算同一非压缩曲线点。
String derived = sm2.getPublicKeyFromPrivateKey(keys.privateKey(), false);

// 3. 派生结果断言：重新计算的公钥必须与密钥对一致。
if (!keys.publicKey().equals(derived)) {
    throw new IllegalStateException("SM2 public key derivation failed");
}

// 4. 压缩公钥：把非压缩曲线点转换为 33 字节格式。
String compressed = sm2.compressPublicKey(keys.publicKey());

// 5. 解压公钥断言：恢复后必须表示同一个曲线点。
if (!keys.publicKey().equals(sm2.decompressPublicKey(compressed))) {
    throw new IllegalStateException("SM2 public key conversion failed");
}
```

私钥属于敏感值，不要写入日志、异常消息或源码。`SM2KeyPair` 不会主动清除字符串内容。

## SM2 加密

SM2 加密具有随机性，同一公钥和明文的两次密文通常不同。默认排列是 `C1C3C2`；传入 `mode == null` 也回退到该值。Java 不会在解密失败后自动尝试另一种排列，协议应明确记录 `C1C3C2` 或 `C1C2C3`。

### `SM2` 全部加密重载

<!-- code-reference -->
```java
byte[] encrypt(String publicKeyHex, byte[] data);
byte[] encrypt(String publicKeyHex, String data);
byte[] encrypt(
    String publicKeyHex,
    String data,
    Charset charset,
    SM2CipherMode mode);
byte[] encrypt(
    String publicKeyHex,
    byte[] data,
    SM2CipherMode mode);

String encryptHex(String publicKeyHex, byte[] data);
String encryptHex(
    String publicKeyHex,
    String data,
    SM2CipherMode mode);
String encryptHex(
    String publicKeyHex,
    String data,
    Charset charset,
    SM2CipherMode mode);
String encryptHex(
    String publicKeyHex,
    byte[] data,
    SM2CipherMode mode);

String encryptBase64(String publicKeyHex, byte[] data);
String encryptBase64(
    String publicKeyHex,
    String data,
    SM2CipherMode mode);
String encryptBase64(
    String publicKeyHex,
    String data,
    Charset charset,
    SM2CipherMode mode);
String encryptBase64(
    String publicKeyHex,
    byte[] data,
    SM2CipherMode mode);
```

### `SM2Util` 全部加密重载

<!-- code-reference -->
```java
static byte[] encrypt(String publicKeyHex, byte[] data);
static byte[] encrypt(
    String publicKeyHex, byte[] data, SM2CipherMode mode);
static byte[] encrypt(
    String publicKeyHex,
    byte[] data,
    SM2CipherMode mode,
    GmSecurityContext securityContext);
static byte[] encrypt(String publicKeyHex, String data);
static byte[] encrypt(
    String publicKeyHex,
    String data,
    Charset charset,
    SM2CipherMode mode);

static String encryptHex(String publicKeyHex, byte[] data);
static String encryptHex(
    String publicKeyHex, byte[] data, SM2CipherMode mode);
static String encryptHex(
    String publicKeyHex,
    byte[] data,
    SM2CipherMode mode,
    GmSecurityContext securityContext);
static String encryptHex(
    String publicKeyHex, String data, SM2CipherMode mode);
static String encryptHex(
    String publicKeyHex,
    String data,
    Charset charset,
    SM2CipherMode mode);

static String encryptBase64(String publicKeyHex, byte[] data);
static String encryptBase64(
    String publicKeyHex, byte[] data, SM2CipherMode mode);
static String encryptBase64(
    String publicKeyHex,
    byte[] data,
    SM2CipherMode mode,
    GmSecurityContext securityContext);
static String encryptBase64(
    String publicKeyHex, String data, SM2CipherMode mode);
static String encryptBase64(
    String publicKeyHex,
    String data,
    Charset charset,
    SM2CipherMode mode);
```

<ApiTable label="SM2 加密参数和返回值" min-width="70rem">

| 位置 | 规则 | 失败行为 |
|:--|:--|:--|
| `publicKeyHex` | 33 字节压缩或 65 字节非压缩公钥 Hex | 编码、前缀或曲线点非法时抛 `GmkitException` |
| `data` | `byte[]` 为原始字节；`String` 默认 UTF-8 | `null` 或空消息都被拒绝 |
| `charset` | `null` 回退 UTF-8 | 字符编码后仍不得为空 |
| `mode` | `null`/省略为 `C1C3C2` | 与对端排列不一致会导致解密失败 |
| 返回 `byte[]` | raw `C1 || C3 || C2` 或 `C1 || C2 || C3` | 新数组 |
| `encryptHex` | 小写 Hex 密文 | 不含 `0x` |
| `encryptBase64` | 标准 Base64 密文 | 保留 `=` 填充 |

</ApiTable>

## SM2 解密

### `SM2` 与 `SM2Util` 的七个重载

下面七个签名同时存在于实例类和静态类；`SM2Util` 只多出 `static`：

<!-- code-reference -->
```java
byte[] decrypt(String privateKeyHex, byte[] ciphertext);
byte[] decrypt(
    String privateKeyHex,
    byte[] ciphertext,
    SM2CipherMode mode);
byte[] decrypt(String privateKeyHex, String ciphertext);
byte[] decrypt(
    String privateKeyHex,
    String ciphertext,
    SM2CipherMode mode);

String decryptToUtf8(
    String privateKeyHex,
    byte[] ciphertext,
    SM2CipherMode mode);
String decryptToUtf8(
    String privateKeyHex,
    String ciphertext,
    SM2CipherMode mode);
String decryptToString(
    String privateKeyHex,
    byte[] ciphertext,
    Charset charset,
    SM2CipherMode mode);
```

字符串密文先自动识别 Hex 或 Base64；若文本同时符合 Hex 形态，会优先按 Hex 处理。对外协议仍应固定一种编码，不要把自动识别当作协议协商。

`decrypt` 返回原始明文字节；`decryptToUtf8` 按 UTF-8 解码；`decryptToString` 的 `charset == null` 也回退 UTF-8。C1 曲线点、密文结构或 C3 完整性检查失败会抛 `GmkitException`，不会返回部分明文。

<!-- code-sample id="api-java-sm2-09" steps="准备二进制输入|SM2 加密|SM2 解密|往返断言" -->
```java
// 1. 准备二进制输入：包含 NUL、非 ASCII 字节和普通字符。
SM2 sm2 = new SM2();
SM2KeyPair keys = sm2.generateKeyPair();
byte[] binary = new byte[] {0x00, (byte) 0xff, (byte) 0x80, 0x41};

// 2. SM2 加密：公钥加密原始字节，密文使用 Base64 和 C1C3C2。
String ciphertext = sm2.encryptBase64(
        keys.publicKey(), binary, SM2CipherMode.C1C3C2);

// 3. SM2 解密：私钥按相同排列恢复原始字节。
byte[] recovered = sm2.decrypt(
        keys.privateKey(), ciphertext, SM2CipherMode.C1C3C2);

// 4. 往返断言：恢复的每个字节都必须与明文一致。
if (!java.util.Arrays.equals(binary, recovered)) {
    throw new IllegalStateException("SM2 binary round-trip failed");
}
```

## 标准 SM2 签名选项

### `SM2SignOptions`

<!-- code-reference -->
```java
static SM2SignOptions.Builder builder();

Builder signatureFormat(SM2SignatureFormat signatureFormat);
Builder userId(String userId);
Builder securityContext(GmSecurityContext securityContext);
SM2SignOptions build();

SM2SignatureFormat signatureFormat();
String userId();
GmSecurityContext securityContext();
```

<ApiTable label="SM2SignOptions 默认值" min-width="66rem">

| 字段 | 默认值 | `null`/空值行为 | 说明 |
|:--|:--|:--|:--|
| `signatureFormat` | `RAW` | `null` 回退 `RAW` | RAW 固定 64 字节；DER 长度可变 |
| `userId` | `DEFAULT_USER_ID` | `null` 或空字符串回退默认 ID | 以 UTF-8 参与 Z 计算，最长 8191 字节 |
| `securityContext` | 默认上下文 | `null` 回退默认上下文 | 决定签名随机源 |

</ApiTable>

### `SM2VerifyOptions`

<!-- code-reference -->
```java
static SM2VerifyOptions.Builder builder();

Builder signatureFormat(SM2SignatureInputFormat signatureFormat);
Builder userId(String userId);
SM2VerifyOptions build();

SM2SignatureInputFormat signatureFormat();
String userId();
```

验签格式默认 `AUTO`：64 字节输入按 RAW，符合 DER 形态的输入按 DER。显式设置 `RAW` 或 `DER` 更适合固定协议。`userId` 的默认、UTF-8 和长度规则与签名端相同；两端身份必须逐字节一致。

## 签名 API

### `SM2` 全部签名重载

<!-- code-reference -->
```java
byte[] sign(String privateKeyHex, byte[] message);
byte[] sign(
    String privateKeyHex,
    String message,
    SM2SignOptions options);
byte[] sign(
    String privateKeyHex,
    String message,
    Charset charset,
    SM2SignOptions options);
byte[] sign(
    String privateKeyHex,
    byte[] message,
    SM2SignOptions options);

String signHex(
    String privateKeyHex,
    byte[] message,
    SM2SignOptions options);
String signHex(
    String privateKeyHex,
    String message,
    SM2SignOptions options);
String signHex(
    String privateKeyHex,
    String message,
    Charset charset,
    SM2SignOptions options);

String signBase64(
    String privateKeyHex,
    byte[] message,
    SM2SignOptions options);
String signBase64(
    String privateKeyHex,
    String message,
    SM2SignOptions options);
String signBase64(
    String privateKeyHex,
    String message,
    Charset charset,
    SM2SignOptions options);
```

`SM2Util` 提供后九个带 options 的静态重载；它没有 `sign(privateKeyHex, byte[])` 简写。`options == null` 使用 RAW、默认 user ID、标准 Z 和默认安全上下文。字符串消息默认 UTF-8，显式 `charset == null` 也回退 UTF-8。空消息可以签名，`null` 消息会抛异常。

<!-- code-sample id="api-java-sm2-13" steps="准备输入|配置签名|配置验签|SM2 签名|SM2 验签|篡改断言" -->
```java
// 1. 准备输入：正常订单、篡改订单和签名身份分别保存。
SM2KeyPair keys = SM2Util.generateKeyPair();
String message = "order=GMKIT-DEMO-0001&amount=88.00";
String tampered = "order=GMKIT-DEMO-0001&amount=99.00";
String userId = "merchant@gmkit.cn";

// 2. 配置签名：内部格式固定为 DER，userId 参与 Z 值计算。
SM2SignOptions signOptions = SM2SignOptions.builder()
        .signatureFormat(SM2SignatureFormat.DER)
        .userId(userId)
        .build();

// 3. 配置验签：格式和 userId 必须与签名端一致。
SM2VerifyOptions verifyOptions = SM2VerifyOptions.builder()
        .signatureFormat(SM2SignatureInputFormat.DER)
        .userId(userId)
        .build();

// 4. SM2 签名：输出使用 Base64 文本编码。
String signature = SM2Util.signBase64(
        keys.privateKey(), message, signOptions);

// 5. SM2 验签：原消息必须验证成功。
if (!SM2Util.verify(keys.publicKey(), message, signature, verifyOptions)) {
    throw new IllegalStateException("SM2 signature verification failed");
}

// 6. 篡改断言：金额变化后必须验证失败。
if (SM2Util.verify(keys.publicKey(), tampered, signature, verifyOptions)) {
    throw new IllegalStateException("tampered order must not verify");
}
```

签名包含随机数，同一私钥、身份和消息的两次签名不要求字节相同。判断正确性应验签或使用固定随机源的标准向量，不要比较两次随机签名文本。

## 验签 API

### `SM2` 全部验签重载

<!-- code-reference -->
```java
boolean verify(
    String publicKeyHex,
    byte[] message,
    byte[] signature);
boolean verify(
    String publicKeyHex,
    byte[] message,
    byte[] signature,
    SM2VerifyOptions options);
boolean verify(
    String publicKeyHex,
    byte[] message,
    String signature,
    SM2VerifyOptions options);
boolean verify(
    String publicKeyHex,
    String message,
    byte[] signature,
    SM2VerifyOptions options);
boolean verify(
    String publicKeyHex,
    String message,
    Charset charset,
    byte[] signature,
    SM2VerifyOptions options);
boolean verify(
    String publicKeyHex,
    String message,
    String signature,
    SM2VerifyOptions options);
```

`SM2Util` 提供后五个带 options 的静态重载；它没有无 options 简写。字符串签名自动识别 Hex/Base64，解码后的 RAW/DER 解释由 `signatureFormat` 决定。

正常的签名不匹配、消息被修改、user ID 不同或已解码签名结构不成立时返回 `false`。`null`、非法公钥、字符串签名编码错误等输入校验问题可能抛 `GmkitException`；调用方应把“不可信输入无法解析”和“合法输入验签不通过”分开记录。

## Z 与预计算 e

SM2 的身份绑定通过 Z 完成：

```text
Z = SM3(ENTL || ID || a || b || xG || yG || xA || yA)
e = SM3(Z || M)
```

<ApiTable label="SM2 摘要路径" min-width="66rem">

| 路径 | `e` 的来源 | API | 定位 |
|:--|:--|:--|:--|
| 标准 SM2 | `SM3(Z || M)` | `sign` / `verify` | 默认路径；与 BC `SM2Signer` 互操作 |
| 预计算 e | 调用方直接提供字节 | `signDigest` / `verifyDigest` | 高级接口；调用方承担摘要协议正确性 |

</ApiTable>

### 高级签名完整签名

以下方法同时存在于 `SM2` 和 `SM2Util`：

<!-- code-reference -->
```java
byte[] signDigest(
    String privateKeyHex,
    byte[] eHash,
    SM2SignatureFormat signatureFormat);

boolean verifyDigest(
    String publicKeyHex,
    byte[] eHash,
    byte[] derSignature);

byte[] computeZ(String userId, String publicKeyHex);
byte[] computeE(
    String publicKeyHex,
    byte[] message,
    String userId,
    boolean skipZComputation);
byte[] computeE(
    String publicKeyHex,
    String message,
    Charset charset,
    String userId,
    boolean skipZComputation);
```

`SM2Util.signDigest` 另有尾部 `GmSecurityContext` 的四参数重载。`computeZ` 和 `computeE(..., false)` 都返回 32 字节。`computeE` 的布尔参数是 0.10.1 已发布签名，新调用必须传 `false`。`signDigest` 不强制 `eHash` 必须为 32 字节，`verifyDigest` 只接受 DER 签名；高级调用方必须自行固定 e 的长度、来源和签名格式。

## 签名格式工具 `SM2Signatures`

<!-- code-reference -->
```java
static byte[] normalizeToRequested(
    byte[] signature,
    SM2SignatureFormat format);
static byte[] normalizeToDer(
    byte[] signature,
    SM2SignatureInputFormat inputFormat);
static byte[] derToRaw(byte[] derSignature);
static byte[] rawToDer(byte[] rawSignature);
```

<ApiTable label="SM2 签名编码工具" min-width="70rem">

| 方法 | 输入 | 返回 | 注意事项 |
|:--|:--|:--|:--|
| `derToRaw` | ASN.1 DER `(r,s)` | 固定 64 字节 `r || s` | DER 或标量非法时抛异常 |
| `rawToDer` | 恰好 64 字节 `r || s` | ASN.1 DER | 长度或标量非法时抛异常 |
| `normalizeToRequested` | 约定为 DER 的签名 | RAW 或 DER | `format == DER` 时原样返回，不额外校验 |
| `normalizeToDer` | RAW、DER 或 AUTO | DER | 显式 `DER` 时原样返回；AUTO 按长度和前缀识别 |

</ApiTable>

对不可信 DER 做规范性验证时不要只调用“原样返回”的分支；使用 `derToRaw` 解析后再按需 `rawToDer`，或直接交给验签路径。

## 密文格式 `SM2Ciphertext` 与 `SM2Ciphertexts`

### `SM2Ciphertext`

<!-- code-reference -->
```java
public SM2Ciphertext(
    byte[] c1,
    byte[] c2,
    byte[] c3,
    SM2CipherMode mode);

byte[] c1();
byte[] c2();
byte[] c3();
SM2CipherMode mode();
```

构造器和三个数组 getter 都执行防御性复制，但构造器不验证分段长度或曲线点。需要验证外部密文时使用 `SM2Ciphertexts.parse()`：C1 应为 65 字节非压缩点，C3 应为 32 字节，C2 至少 1 字节。

### `SM2Ciphertexts`

<!-- code-reference -->
```java
static SM2Ciphertext parse(
    byte[] ciphertext,
    SM2CipherMode mode);
static byte[] encodeDer(
    byte[] ciphertext,
    SM2CipherMode mode);
static byte[] encodeAsn1(
    byte[] ciphertext,
    SM2CipherMode mode);
static byte[] decodeDer(
    byte[] derCiphertext,
    SM2CipherMode mode);
static byte[] decodeAsn1(
    byte[] asn1Ciphertext,
    SM2CipherMode mode);
static byte[] decodeAuto(
    byte[] ciphertext,
    SM2CipherMode mode);
```

<ApiTable label="SM2 密文格式转换" min-width="70rem">

| 方法 | 输入 | 输出 | 识别/校验 |
|:--|:--|:--|:--|
| `parse` | raw C1/C2/C3 | `SM2Ciphertext` | 校验最短长度、C1 曲线点和 C3 分段 |
| `encodeDer` | raw 密文 | 规范 DER SEQUENCE | x、y、C3、C2 顺序随 mode 固定 |
| `encodeAsn1` | raw 密文 | DER | `encodeDer` 的兼容名称 |
| `decodeDer` | DER SEQUENCE | raw 密文 | 拒绝非规范 DER、错误元素数、坐标和 C3 长度 |
| `decodeAsn1` | DER SEQUENCE | raw 密文 | `decodeDer` 的兼容名称 |
| `decodeAuto` | DER 或 raw | 规范化 raw | 可补回可恢复的 GmSSL 风格缺失 `0x04` 前缀 |

</ApiTable>

所有方法的 `mode == null` 都按 `C1C3C2`。自动识别只判断 DER 与 raw 外层形式，不推断 C2/C3 排列；mode 仍必须由协议提供。

## SM2 密钥交换

密钥交换同时使用双方静态密钥、双方一次性临时密钥、角色和身份。临时私钥不得跨会话复用，交换完成后应尽快从应用状态中清除。

### `SM2KeyExchangeOptions`

<!-- code-reference -->
```java
static SM2KeyExchangeOptions.Builder builder();

Builder initiator(boolean initiator);
Builder keyBits(int keyBits);
Builder selfId(String selfId);
Builder peerId(String peerId);
Builder confirmationTag(byte[] confirmationTag);
SM2KeyExchangeOptions build();

boolean initiator();
int keyBits();
String selfId();
String peerId();
byte[] confirmationTag();
```

<ApiTable label="SM2 密钥交换选项" min-width="70rem">

| 字段 | 默认值 | 约束 | 两端关系 |
|:--|:--|:--|:--|
| `initiator` | `false` | 布尔值 | 两端必须一真一假 |
| `keyBits` | `128` | 操作时要求正数；建议使用 8 的倍数 | 两端必须相同；Java 单位是 bit |
| `selfId` | 默认 user ID | `null`/空字符串回退默认；UTF-8 最长 8191 字节 | 等于对端的 `peerId` |
| `peerId` | 默认 user ID | 同上 | 等于对端的 `selfId` |
| `confirmationTag` | `null` | 数组防御性复制 | 发起方确认调用时必须传响应方 S1 |

</ApiTable>

TypeScript 的 `keyLength` 单位是 byte，Java `keyBits` 单位是 bit；例如 TypeScript `16` 对应 Java `128`。

### 交换方法

以下三个方法同时存在于 `SM2` 和 `SM2Util`：

<!-- code-reference -->
```java
byte[] keyExchange(
    String selfStaticPrivateKeyHex,
    String selfEphemeralPrivateKeyHex,
    String peerStaticPublicKeyHex,
    String peerEphemeralPublicKeyHex,
    SM2KeyExchangeOptions options);

SM2KeyExchangeResult keyExchangeWithConfirmation(
    String selfStaticPrivateKeyHex,
    String selfEphemeralPrivateKeyHex,
    String peerStaticPublicKeyHex,
    String peerEphemeralPublicKeyHex,
    SM2KeyExchangeOptions options);

boolean confirmResponder(
    byte[] expectedS2,
    byte[] confirmationTag);
```

四个密钥参数始终从“当前调用方”视角命名。发起方传自己的静态/临时私钥和响应方的静态/临时公钥；响应方反过来传。`options == null` 使用响应方角色和默认身份，正式协议不应依赖这个角色默认值。

### `SM2KeyExchangeResult`

<!-- code-reference -->
```java
public SM2KeyExchangeResult(byte[] key, byte[] s1, byte[] s2);

byte[] key();
byte[] s1();
byte[] s2();
boolean hasS1();
boolean hasS2();
String keyHex();
String keyBase64();
String s1Hex();
String s2Hex();
```

构造器和数组 getter 使用防御性复制。`hasS1()`/`hasS2()` 只在数组非空时返回 `true`，对应 Hex getter 在缺失时返回 `null`。构造器不主动验证 key 或标签；正常交换结果中共享 key 长度由 `keyBits` 决定，确认标签为 32 字节。

### 带确认标签的顺序

<!-- code-sample id="api-java-sm2-22" steps="生成长期与临时密钥|响应方计算|发起方计算|共享密钥断言|响应方确认" -->
```java
// 1. 生成长期与临时密钥：Alice 和 Bob 每方各有两组密钥。
SM2KeyPair aliceStatic = SM2Util.generateKeyPair(false);
SM2KeyPair aliceEphemeral = SM2Util.generateKeyPair(false);
SM2KeyPair bobStatic = SM2Util.generateKeyPair(false);
SM2KeyPair bobEphemeral = SM2Util.generateKeyPair(false);

// 2. 响应方计算：Bob 生成共享 key、S1 和 S2，并把 S1 发给 Alice。
SM2KeyExchangeResult bob = SM2Util.keyExchangeWithConfirmation(
        bobStatic.privateKey(),
        bobEphemeral.privateKey(),
        aliceStatic.publicKey(),
        aliceEphemeral.publicKey(),
        SM2KeyExchangeOptions.builder()
                .initiator(false)
                .keyBits(128)
                .selfId("warehouse@gmkit.cn")
                .peerId("merchant@gmkit.cn")
                .build());

// 3. 发起方计算：Alice 验证收到的 S1，并生成共享 key 和 S2。
SM2KeyExchangeResult alice = SM2Util.keyExchangeWithConfirmation(
        aliceStatic.privateKey(),
        aliceEphemeral.privateKey(),
        bobStatic.publicKey(),
        bobEphemeral.publicKey(),
        SM2KeyExchangeOptions.builder()
                .initiator(true)
                .keyBits(128)
                .selfId("merchant@gmkit.cn")
                .peerId("warehouse@gmkit.cn")
                .confirmationTag(bob.s1())
                .build());

// 4. 共享密钥断言：双方派生的 128-bit key 必须一致。
if (!java.util.Arrays.equals(alice.key(), bob.key())) {
    throw new IllegalStateException("SM2 shared key mismatch");
}

// 5. 响应方确认：Alice 返回 S2，Bob 使用常量时间比较完成确认。
if (!SM2Util.confirmResponder(bob.s2(), alice.s2())) {
    throw new IllegalStateException("SM2 responder confirmation failed");
}
```

发起方调用 `keyExchangeWithConfirmation` 时缺少 S1 会抛 `GmkitException`。`confirmResponder` 在任一标签为 `null` 或空数组时返回 `false`，其余情况使用常量时间比较。

## 失败行为速查

<ApiTable label="Java SM2 失败行为" min-width="72rem">

| 场景 | 结果 |
|:--|:--|
| 私钥、公钥、Hex/Base64、曲线点或密文结构非法 | 抛出 `GmkitException` |
| 加密明文为 `null` 或空 | 抛出 `GmkitException` |
| 解密 C3 校验失败或 mode 不匹配 | 抛出 `GmkitException`，不返回部分明文 |
| 签名消息为 `null` | 抛出 `GmkitException`；空消息合法 |
| 合法输入但消息、身份或签名不匹配 | `verify` 返回 `false` |
| 字节签名格式无法规范化 | 通常由 `verify` 转为 `false` |
| 字符串签名无法按 Hex/Base64 解码 | 抛出 `GmkitException` |
| user ID 的 UTF-8 长度达到 8192 字节 | 抛出 `GmkitException` |
| `keyBits <= 0` | 执行密钥交换时抛出 `GmkitException` |
| 发起方确认交换缺少响应方 S1 | 抛出 `GmkitException` |

</ApiTable>

## 可执行案例

JUnit 文档测试覆盖标准 Z 签名、正确消息和金额篡改；SM2 专项测试还覆盖 BC 双向互操作、user ID 不同、no-Z 边界、标准向量、密文格式和密钥交换确认。

::: details 查看标准签名文档案例
<!-- code-sample id="api-java-sm2-23" steps="准备输入|生成 SM2 密钥对|SM2 签名|SM2 验签|篡改断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit/src/test/java/cn/gmkit/PublicApiManualExamplesTest.java#java-sm2-example -->
```
:::

运行测试：

```bash
cd packages/java
mvn -pl gmkit -Dtest=PublicApiManualExamplesTest,SM2StandardVectorsTest,SM2BouncyCastleInteropTest,SM2UtilTest,SM2ContractsTest test
```

## 公共项覆盖

本页覆盖 `SM2`、`SM2Util`、`SM2KeyPair`、`SM2SignOptions`、`SM2VerifyOptions`、`SM2Signatures`、`SM2Ciphertext`、`SM2Ciphertexts`、`SM2KeyExchangeOptions`、`SM2KeyExchangeResult` 十个公开顶层类型及其全部公开成员。

## 兼容成员

<details>
<summary>只在维护 no-Z 或空身份旧协议时展开</summary>

`SM2.GM_2023_USER_ID` 与 `SM2Util.GM_2023_USER_ID` 均为空字符串且已弃用。0.10.1 的 Builder 会把空字符串重新映射为 `DEFAULT_USER_ID`，因此该常量不能表达独立的空身份。

<!-- code-reference -->
```java
@Deprecated SM2SignOptions.Builder skipZComputation(boolean skip);
@Deprecated boolean SM2SignOptions.skipZComputation();
@Deprecated SM2VerifyOptions.Builder skipZComputation(boolean skip);
@Deprecated boolean SM2VerifyOptions.skipZComputation();

@Deprecated byte[] signWithoutZ(
    String privateKeyHex,
    byte[] message,
    SM2SignatureFormat signatureFormat);
@Deprecated boolean verifyWithoutZ(
    String publicKeyHex,
    byte[] message,
    byte[] signature,
    SM2SignatureInputFormat signatureFormat);
@Deprecated byte[] computeEWithoutZ(byte[] message);
@Deprecated byte[] computeEWithoutZ(String message, Charset charset);
```

公开 `computeE` 还保留尾部 `boolean skipZComputation` 的已发布重载。传 `true` 或调用上述方法时，项目内部签名器计算 `e = SM3(M)`，不会调用 BC `SM2Signer`；BC 1.83 没有跳过 Z 的公开配置。项目测试锁定：标准签名可与 BC 双向互验，不同 user ID 必须失败，no-Z 签名不能通过 BC 标准验签。

这组成员不是性能优化，也不是预计算 `e`。迁移方案见[旧系统迁移](/manual/migration.html#sm2-no-z)。

</details>

## 相关页面

- [跨语言 SM2 协议与固定向量](/algorithms/SM2.html)
- [Java 核心格式、异常和安全上下文](./core.html)
- [Java SM2 + SM4 混合加密 API](./integration.html)
- [TypeScript SM2 API](/manual/typescript/api/sm2.html)
