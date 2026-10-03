---
title: Java SM9 API
description: 说明 Java SM9 平台诊断、句柄、签名、IBE、PEM、文件限制与资源关闭。
pageInfo: false
contributors: false
editLink: false
icon: id-card
order: 6
category:
  - API 说明书
  - Java
tag:
  - SM9
  - JNI
  - GmSSL
  - IBE
---

# Java SM9 API

`cn.gmkit:gmkit-sm9` 通过 JNI 调用随 JAR 分发的 GmSSL 本地动态库（native），支持签名/验签、基于身份的加解密、PEM 导入导出和流式签名上下文；不支持 SM9 密钥交换。

SM9 把身份字符串直接纳入密钥派生，适合已有 KGC、身份登记和主公钥分发体系的协议。采用前应确认对端实现、五个目标平台、身份规范化规则、KGC 隔离方式和合规要求；如果系统只有普通公私钥与证书体系，不能仅凭 API 可用就把它替换成 SM9。

::: tip 接入前先验证平台
请按 [Java SM9 使用手册](/manual/java/sm9.html) 依次完成平台诊断、KGC/用户密钥、签名、IBE、PEM 和资源关闭。随机签名与密文只做性质断言，固定标准证据单独列出。
:::

## 依赖与运行平台

SM9 位于独立制品，不包含在 `cn.gmkit:gmkit` 主包中：

```xml
<dependency>
  <groupId>cn.gmkit</groupId>
  <artifactId>gmkit-sm9</artifactId>
  <version>0.10.1</version>
</dependency>
```

运行时要求 Java 8 或更高版本。聚合 JAR 内置以下五个平台的 JNI bridge 与 GmSSL 动态库；其他操作系统或 CPU 组合会报告 `unsupported`：

<ApiTable label="SM9 内置平台" min-width="52rem">

| 平台标识 | 操作系统 | CPU |
|:--|:--|:--|
| `linux-x86_64` | Linux | x86-64 |
| `linux-aarch64` | Linux | ARM64 |
| `darwin-x86_64` | macOS | Intel x86-64 |
| `darwin-aarch64` | macOS | Apple Silicon |
| `windows-x86_64` | Windows | x86-64 |

</ApiTable>

## 八个公开类型

<ApiTable label="Java SM9 类型分工" min-width="68rem">

| 类型 | 保存的能力 | 是否需要关闭 |
|:--|:--|:--:|
| `SM9` | 可用性诊断和一次性门面方法 | 否 |
| `SM9SignMasterKey` | KGC 签名主密钥或可分发的签名主公钥 | 是 |
| `SM9SignKey` | 与身份派生关系对应的用户签名私钥 | 是 |
| `SM9Signature` | 可增量更新的签名/验签上下文 | 是 |
| `SM9EncMasterKey` | KGC 加密主密钥或可分发的加密主公钥 | 是 |
| `SM9EncKey` | 与身份绑定的用户解密私钥 | 是 |
| `SM9Exception` | 参数、句柄、PEM、I/O 或 native 操作失败 | 否 |
| `SM9UnsupportedPlatformException` | 平台不支持或动态库未能加载 | 否 |

</ApiTable>

## 启动诊断

<!-- code-reference -->
```java
SM9.isAvailable()
SM9.nativeVersion()
SM9.nativePlatform()
SM9.nativeLoadErrorMessage()
```

<ApiTable label="SM9 启动诊断" min-width="58rem">

| 方法 | 返回 |
|:--|:--|
| `isAvailable()` | native 是否成功加载 |
| `nativeVersion()` | bridge 基于的 GmSSL 版本标识；native 不可用时仍可读取 |
| `nativePlatform()` | 如 `linux-x86_64`；无法映射时为 `unsupported` |
| `nativeLoadErrorMessage()` | 已可用时为 null，否则为加载诊断 |

</ApiTable>

<!-- code-sample id="api-java-sm9-02" steps="检查本地动态库|诊断失败" -->
```java
// 1. 检查本地动态库：应用启动时确认当前平台可以加载 SM9。
if (!SM9.isAvailable()) {
    // 2. 诊断失败：记录平台和加载原因，但不记录任何密钥材料。
    throw new IllegalStateException(
        "SM9 unavailable on " + SM9.nativePlatform()
            + ": " + SM9.nativeLoadErrorMessage());
}
```

不要等到首个业务请求才发现 native 不可用。应用启动健康检查应记录平台标识和加载错误，但不要记录密钥、PEM 口令或用户私钥。诊断方法本身不会因为 native 缺失而抛错；生成密钥等实际操作会抛 `SM9UnsupportedPlatformException`。

## 门面方法

`SM9` 提供一次性操作：

<!-- code-reference -->
```java
SM9SignMasterKey generateSignMasterKey()
SM9EncMasterKey generateEncMasterKey()
SM9SignKey extractSignKey(SM9SignMasterKey master, String id)
SM9EncKey extractEncKey(SM9EncMasterKey master, String id)

byte[] sign(SM9SignKey signKey, byte[] data)
boolean verify(
    SM9SignMasterKey masterPublicKey,
    String id,
    byte[] data,
    byte[] signature)

byte[] encrypt(
    SM9EncMasterKey masterPublicKey,
    String id,
    byte[] plaintext)
byte[] decrypt(SM9EncKey encKey, byte[] ciphertext)
```

<ApiTable label="SM9 门面方法" min-width="72rem">

| 方法 | 输入 | 返回/失败语义 |
|:--|:--|:--|
| `generateSignMasterKey` | 无 | 新的签名主密钥句柄；native 不可用或生成失败时抛异常 |
| `generateEncMasterKey` | 无 | 新的加密主密钥句柄；native 不可用或生成失败时抛异常 |
| `extractSignKey` | 非空主密钥、非空白 ID | 新的用户签名私钥句柄 |
| `extractEncKey` | 非空主密钥、非空白 ID | 新的用户解密私钥句柄 |
| `sign` | 非空签名私钥、非 `null` 数据 | DER 签名；空消息合法 |
| `verify` | 主公钥、ID、数据、签名 | 数学验证通过为 `true`；签名、身份或消息不匹配为 `false` |
| `encrypt` | 加密主公钥、接收方 ID、1–255 字节明文 | DER 密文 |
| `decrypt` | 用户解密私钥、1–367 字节密文 | 原始明文字节 |

</ApiTable>

门面会为一次性签名/验签自动创建并关闭 `SM9Signature`，但传入的密钥对象仍由调用方关闭。门面不复制或接管密钥对象所有权。

## 签名密钥类型

### `SM9SignMasterKey`

<!-- code-reference -->
```java
static SM9SignMasterKey generate()
SM9SignKey extractKey(String id)
void exportEncryptedMasterKeyInfoPem(String password, String file)
static SM9SignMasterKey importEncryptedMasterKeyInfoPem(
    String password, String file)
void exportPublicMasterKeyPem(String file)
static SM9SignMasterKey importPublicMasterKeyPem(String file)
void close()
```

完整主密钥由 KGC 保存，用于派生用户签名私钥；只含公开部分的导入对象可分发给验签方，不能派生用户私钥。

### `SM9SignKey`

<!-- code-reference -->
```java
String getId()
void exportEncryptedPrivateKeyInfoPem(String password, String file)
static SM9SignKey importEncryptedPrivateKeyInfoPem(
    String password, String file, String id)
void close()
```

签名私钥 PEM 不携带可供应用校验的身份绑定信息。导入方法允许 `id` 为 null，此时 `getId()` 也返回 null；签名运算仍可执行，但验签方必须使用派生该私钥时的原始身份。应用应把身份与 PEM 作为同一条受保护记录保存，不能把 `id` 当作可任意替换的显示标签。

<ApiTable label="SM9 签名密钥权限" min-width="68rem">

| 对象来源 | 可派生用户私钥 | 可签名 | 可验签 | 可导出内容 |
|:--|:--:|:--:|:--:|:--|
| `SM9SignMasterKey.generate()` / 加密主密钥 PEM | 是 | 通过派生的 `SM9SignKey` | 是 | 加密主私钥 PEM、公开主密钥 PEM |
| `importPublicMasterKeyPem()` | 否 | 否 | 是 | 公开主密钥 PEM |
| `SM9SignKey` | 不适用 | 是 | 否 | 口令加密用户私钥 PEM |

</ApiTable>

## 签名示例

<!-- code-sample id="api-java-sm9-06" steps="准备身份与消息|创建 KGC 主密钥并派生身份签名私钥，句柄由 try-with-resources 关闭|SM9 签名|SM9 验签|失败断言" -->
```java
// 1. 准备身份与消息：正常订单和篡改金额分别保存为 UTF-8 字节。
byte[] data = "order=GMKIT-DEMO-0001&amount=88.00"
    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
byte[] tampered = "order=GMKIT-DEMO-0001&amount=99.00"
    .getBytes(java.nio.charset.StandardCharsets.UTF_8);
String id = "warehouse@gmkit.cn";

// 2. 创建 KGC 主密钥并派生身份签名私钥，句柄由 try-with-resources 关闭。
try (SM9SignMasterKey master = SM9.generateSignMasterKey();
     SM9SignKey userKey = SM9.extractSignKey(master, id)) {
    // 3. SM9 签名：使用与 id 绑定的用户私钥。
    byte[] signature = SM9.sign(userKey, data);

    // 4. SM9 验签：相同身份和原消息必须验证成功。
    if (!SM9.verify(master, id, data, signature)) {
        throw new IllegalStateException("SM9 verification failed");
    }

    // 5. 失败断言：身份或消息任一变化都必须验证失败。
    if (SM9.verify(master, "other@gmkit.cn", data, signature)
            || SM9.verify(master, id, tampered, signature)) {
        throw new IllegalStateException("SM9 accepted changed identity or message");
    }
}
```

签名、身份或消息不匹配时验签返回 `false`。`SM9Signature.verify` 将 native 返回码 `1` 解释为成功，其他返回码统一解释为 `false`，因此无法仅靠这个返回值区分签名不匹配、DER 解析失败与 GmSSL 报错。参数非法、句柄已关闭或上下文模式/状态错误会抛 `SM9Exception`；JVM 链接与内存错误不会包装为该异常。签名含随机性，不要把一次运行得到的签名字节写成固定标准向量。

## 加密密钥类型

### `SM9EncMasterKey`

<!-- code-reference -->
```java
static final int MAX_PLAINTEXT_SIZE  // 255

static SM9EncMasterKey generate()
SM9EncKey extractKey(String id)
byte[] encrypt(byte[] plaintext, String id)
void exportEncryptedMasterKeyInfoPem(String password, String file)
static SM9EncMasterKey importEncryptedMasterKeyInfoPem(
    String password, String file)
void exportPublicMasterKeyPem(String file)
static SM9EncMasterKey importPublicMasterKeyPem(String file)
void close()
```

完整主密钥由 KGC 保存并派生用户解密私钥；公开主密钥可分发给加密方，公开部分不能派生用户私钥。

### `SM9EncKey`

<!-- code-reference -->
```java
static final int MAX_CIPHERTEXT_SIZE  // 367

String getId()
byte[] decrypt(byte[] ciphertext)
void exportEncryptedPrivateKeyInfoPem(String password, String file)
static SM9EncKey importEncryptedPrivateKeyInfoPem(
    String password, String file, String id)
void close()
```

<ApiTable label="SM9 加密密钥权限" min-width="68rem">

| 对象来源 | 可派生用户私钥 | 可加密 | 可解密 | 可导出内容 |
|:--|:--:|:--:|:--:|:--|
| `SM9EncMasterKey.generate()` / 加密主密钥 PEM | 是 | 是 | 通过派生的 `SM9EncKey` | 加密主私钥 PEM、公开主密钥 PEM |
| `importPublicMasterKeyPem()` | 否 | 是 | 否 | 公开主密钥 PEM |
| `SM9EncKey` | 不适用 | 否 | 是 | 口令加密用户私钥 PEM |

</ApiTable>

SM9 单次明文必须为 1–255 字节；API 接收 `byte[]`，因此单位始终是实际字节数。若业务先把 `String` 转成 UTF-8，应检查编码后的数组长度，而不是 Java 字符数。DER 密文必须为 1–367 字节。更大数据应使用混合加密：随机生成 16 字节 SM4 会话 key，用 SM4-GCM 等认证加密处理正文，只用 SM9 保护会话 key。算法、接收方身份、nonce、AAD、tag 和载荷版本都必须随密文保存。

<!-- code-sample id="api-java-sm9-09" steps="准备接收方身份和不超过 255 字节的订单明文|创建 KGC 加密主密钥并派生接收方身份私钥|SM9 IBE 加密|SM9 IBE 解密|成功断言" -->
```java
// 1. 准备接收方身份和不超过 255 字节的订单明文。
byte[] plaintext =
    "order=GMKIT-DEMO-0001&amount=88.00"
        .getBytes(java.nio.charset.StandardCharsets.UTF_8);
String id = "warehouse@gmkit.cn";

// 2. 创建 KGC 加密主密钥并派生接收方身份私钥。
try (SM9EncMasterKey master = SM9.generateEncMasterKey();
     SM9EncKey userKey = SM9.extractEncKey(master, id)) {
    // 3. SM9 IBE 加密：使用主公钥能力和接收方身份保护明文。
    byte[] ciphertext = SM9.encrypt(master, id, plaintext);

    // 4. SM9 IBE 解密：使用身份私钥恢复原始订单字节。
    byte[] decrypted = SM9.decrypt(userKey, ciphertext);

    // 5. 成功断言：解密结果必须与原始明文一致。
    if (!java.util.Arrays.equals(plaintext, decrypted)) {
        throw new IllegalStateException("SM9 IBE round-trip failed");
    }
}
```

对 256 字节输入，API 会在进入 native 前抛 `SM9Exception`：

<!-- code-sample id="api-java-sm9-10" steps="创建 KGC 加密主密钥，句柄由 try-with-resources 关闭|构造超长输入|长度失败断言" -->
```java
// 1. 创建 KGC 加密主密钥，句柄由 try-with-resources 关闭。
try (SM9EncMasterKey master = SM9.generateEncMasterKey()) {
    // 2. 构造超长输入：比单次 IBE 上限多 1 字节。
    byte[] tooLong = new byte[SM9EncMasterKey.MAX_PLAINTEXT_SIZE + 1];

    // 3. 长度失败断言：256 字节明文必须在进入本地运算前被拒绝。
    try {
        SM9.encrypt(master, "warehouse@gmkit.cn", tooLong);
        throw new IllegalStateException("256-byte plaintext must fail");
    } catch (SM9Exception expected) {
        // 预期：SM9 IBE 只接受 1–255 字节。
    }
}
```

## 流式 `SM9Signature`

<!-- code-reference -->
```java
new SM9Signature(boolean doSign)
void reset(boolean doSign)
SM9Signature update(byte[] data)
SM9Signature update(byte[] data, int offset, int length)
byte[] sign(SM9SignKey signKey)
boolean verify(
    byte[] signature,
    SM9SignMasterKey masterPublicKey,
    String id)
void close()
```

`doSign=true` 初始化签名模式，false 初始化验签模式。`reset` 可在同一未关闭句柄上开始新操作；`update` 的零长度区间合法，越界区间抛异常。

<ApiTable label="SM9Signature 状态变化" min-width="68rem">

| 调用 | 前置条件 | 返回/后续状态 |
|:--|:--|:--|
| `new SM9Signature(true)` | native 可用 | 新签名上下文 |
| `new SM9Signature(false)` | native 可用 | 新验签上下文 |
| `update(data)` | `data != null` | 返回当前对象，可链式调用；空数组不改变状态 |
| `update(data, offset, length)` | 区间位于数组内 | 处理指定区间；`length == 0` 合法 |
| `sign(signKey)` | 签名模式、私钥未关闭 | 返回 DER 签名 |
| `verify(signature, master, id)` | 验签模式、主公钥未关闭 | 返回 `true`/`false` |
| `reset(doSign)` | 上下文未关闭 | 丢弃上一轮状态并选择新模式 |
| `close()` | 任意 | 释放句柄；重复调用安全 |

</ApiTable>

<!-- code-sample id="api-java-sm9-12" steps="准备分块消息|创建 KGC 密钥、身份私钥、签名上下文和验签上下文|流式签名|流式验签|成功断言" -->
```java
// 1. 准备分块消息：8192 字节分成两个 4096 字节片段。
byte[] data = new byte[8192];

// 2. 创建 KGC 密钥、身份私钥、签名上下文和验签上下文。
try (SM9SignMasterKey master = SM9.generateSignMasterKey();
     SM9SignKey userKey = master.extractKey("stream@example");
     SM9Signature signer = new SM9Signature(true);
     SM9Signature verifier = new SM9Signature(false)) {
    // 3. 流式签名：按顺序追加两个片段，再生成签名。
    signer.update(data, 0, 4096).update(data, 4096, 4096);
    byte[] signature = signer.sign(userKey);

    // 4. 流式验签：验签端追加完整消息并使用相同身份。
    verifier.update(data);

    // 5. 成功断言：分块签名必须验证成功。
    if (!verifier.verify(signature, master, "stream@example")) {
        throw new IllegalStateException("stream verification failed");
    }
}
```

进入 JNI 完成阶段的一次 `sign` 或 `verify` 后，如需继续使用同一对象，应先调用 `reset(...)`；验签返回 `false` 也一样。参数或已关闭密钥的前置校验失败尚未进入 JNI，此时保留累计消息，可以改用有效参数重试。上下文有 native 可变状态，不能跨线程并发使用；不同任务应各自创建上下文。

## PEM 与身份

- PEM 文件路径和口令必须非空白且不能包含 `\0`；I/O、口令或格式错误抛 `SM9Exception`。API 接受 `String` 路径，不接受 `Path` 重载。
- 主私钥和用户私钥只提供口令加密 PEM 导出；公开主密钥可独立导出。
- 用户 ID 使用 Java `String` 的 UTF-8 字节，首尾空格属于身份并会保留，全空白 ID 被拒绝；ID 的二进制长度单独传给 native，因此内嵌 `\0` 也会作为身份字节参与运算。
- `SM9SignKey` 导入时的 id 是可空元数据，签名过程不读取它；`SM9EncKey` 导入也暂不验证 id，但解密时必须持有原始非空白 id。PEM 本身不替应用维护“身份—私钥”映射。
- 不要把用户 ID、文件路径或口令自动 trim 后再调用，否则可能改变身份或目标文件。
- 生产口令不应硬编码在源码或日志中。

下面的测试式示例把 KGC 持有的主私钥留在生成端，只向验签端交付公开主密钥，同时把身份和用户私钥作为一条记录保存：

<!-- code-sample id="api-java-sm9-13" steps="准备 PEM 路径、身份、测试口令和订单消息|生成 KGC 签名主密钥，并派生身份私钥|导出 PEM|重新导入公开主密钥和口令加密身份私钥|SM9 签名|SM9 验签断言" -->
```java
// 1. 准备 PEM 路径、身份、测试口令和订单消息。
java.nio.file.Path directory = java.nio.file.Files.createTempDirectory("gmkit-sm9-");
java.nio.file.Path publicPem = directory.resolve("sign-master-public.pem");
java.nio.file.Path userPem = directory.resolve("warehouse-sign-key.pem");
String id = "warehouse@gmkit.cn";
String testPassword = "manual-test-only"; // 仅限测试；生产环境从密钥系统读取。
byte[] message = "order=GMKIT-DEMO-0001&amount=88.00"
    .getBytes(java.nio.charset.StandardCharsets.UTF_8);

// 2. 生成 KGC 签名主密钥，并派生身份私钥。
try (SM9SignMasterKey master = SM9.generateSignMasterKey();
     SM9SignKey userKey = master.extractKey(id)) {
    // 3. 导出 PEM：公开主密钥明文导出，身份私钥使用口令加密。
    master.exportPublicMasterKeyPem(publicPem.toString());
    userKey.exportEncryptedPrivateKeyInfoPem(testPassword, userPem.toString());
}

// 4. 重新导入公开主密钥和口令加密身份私钥。
try (SM9SignMasterKey verifierKey =
         SM9SignMasterKey.importPublicMasterKeyPem(publicPem.toString());
     SM9SignKey importedUserKey =
         SM9SignKey.importEncryptedPrivateKeyInfoPem(
             testPassword, userPem.toString(), id)) {
    // 5. SM9 签名：使用重新导入的身份私钥。
    byte[] signature = SM9.sign(importedUserKey, message);

    // 6. SM9 验签断言：导入的主公钥必须验证同一身份的签名。
    if (!SM9.verify(verifierKey, id, message, signature)) {
        throw new IllegalStateException("imported SM9 keys do not match");
    }
}
```

示例里的随机主密钥和随机签名没有固定字面值；断言验证的是 PEM 往返与身份绑定。实际测试应在 `finally` 中删除临时文件；业务代码还应采用受控目录、最小文件权限和明确的密钥销毁策略。

## 生命周期与异常

`SM9SignMasterKey`、`SM9SignKey`、`SM9EncMasterKey`、`SM9EncKey`、`SM9Signature` 都实现 `AutoCloseable`：

- 始终使用 try-with-resources。
- `close()` 可重复调用。
- close 后再次执行 native 操作抛 `SM9Exception`；`getId()` 仅返回 Java 元数据，关闭后仍可读取。
- 所有句柄对象均非并发安全，`close()` 不得与使用该句柄的任何操作并发执行，调用方负责同步或所有权转移。
- 先关闭子密钥还是主密钥没有隐式级联；每个对象都应独立关闭。

`extractKey()` 返回独立 native 句柄，关闭主密钥不会自动关闭已经派生的用户私钥，关闭用户私钥也不会关闭主密钥。不要依赖垃圾回收释放这些资源。

两个公开异常类型的签名如下：

<!-- code-reference -->
```java
public SM9Exception(String message);
public SM9Exception(String message, Throwable cause);

public SM9UnsupportedPlatformException(String message);
public SM9UnsupportedPlatformException(String message, Throwable cause);
```

`SM9UnsupportedPlatformException` 继承 `SM9Exception`，用于平台不在内置列表或本地库加载失败。其他参数、PEM、I/O、句柄与 native 操作问题使用 `SM9Exception`；两者都是非受检异常。

## 标准与发布证据

<ApiTable label="SM9 三层验证证据" min-width="72rem">

| 层级 | 实际执行内容 | 能证明什么 |
|:--|:--|:--|
| GmSSL 上游 | 固定版本 `sm9test.c` 的 `ks`、`ds`、`ke`、`de` 派生向量 | 底层 SM9 运算与固定向量一致 |
| Java/JNI | 正确与错误身份、消息篡改、IBE、长度上限、PEM、关闭后访问 | Java 参数、句柄和 native 桥接行为一致 |
| 聚合 JAR | 五个平台分别运行打包产物，检查平台选择、签名、IBE 与 Unicode PEM | 发布物确实带有并加载当前平台 runtime |

</ApiTable>

固定向量来自锁定提交的 [`tests/sm9test.c`](https://github.com/guanzhi/GmSSL/blob/d655c06b3a6b0fe8cff900f293bf0e5aac6eb0a2/tests/sm9test.c)。`SM9 Native` Action 在 Linux x86-64、Linux ARM64、macOS Intel、macOS Apple Silicon、Windows x86-64 五个 job 中，先执行 `ctest --output-on-failure --no-tests=error -R ^sm9$`，再执行强制要求 native 可用的 Java/JNI 测试；找不到测试或任一向量失败都会终止 job。

发布流水线还会把五个平台产物组装到同一个 JAR，再回到五个平台分别运行 `SM9PackagedRuntimeSmoke`。Java 生成的随机密钥、随机签名和随机密文只用于行为回归，不冒充固定标准向量。

## 可执行案例

第一段覆盖签名、错误身份、消息篡改、IBE 和 256 字节失败；第二段覆盖口令加密用户私钥与公开主密钥的 PEM 往返。两段都由需要本地动态库的 JUnit 测试执行。

::: details 查看测试源码
<!-- code-sample id="api-java-sm9-15" steps="准备身份与消息|创建 KGC 主密钥并派生身份私钥|SM9 签名|SM9 验签|身份失败断言|消息篡改断言|SM9 IBE 加密|SM9 IBE 解密|成功断言|长度失败断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit-sm9/src/test/java/cn/gmkit/sm9/SM9ManualExamplesTest.java#java-sm9-example -->
```

<!-- code-sample id="api-java-sm9-16" steps="准备身份、订单消息和临时 PEM 文件路径|生成 KGC 签名主密钥，并导出可分发的主公钥 PEM|派生身份私钥，并使用口令加密后写入 PEM|重新导入加密身份私钥，并用它签名订单消息|导入主公钥 PEM，使用相同身份完成验签|成功断言" -->
```java
<!-- @include: ../../../../../packages/java/gmkit-sm9/src/test/java/cn/gmkit/sm9/SM9KeyPemTest.java#java-sm9-pem-example -->
```
:::

普通 Maven 测试在本机没有可用动态库时会跳过需要 native 的案例；要强制执行本地 GmSSL 向量和 JNI 测试，使用仓库脚本：

```powershell
./scripts/sm9-native.ps1 -Test
```

脚本会编译锁定版本的 GmSSL 和 JNI bridge，再按“上游固定向量 → Java/JNI”的顺序运行。只执行 `mvn -pl gmkit-sm9 test` 不能替代这项验证，除非同时提供动态库并设置 `gmkit.sm9.requireNative=true`。

## 公共项覆盖

本页覆盖 `SM9`、`SM9SignMasterKey`、`SM9SignKey`、`SM9Signature`、`SM9EncMasterKey`、`SM9EncKey`、`SM9Exception`、`SM9UnsupportedPlatformException` 八个公开顶层类型及全部公开成员。内部 loader、bridge、参数检查和消息类不属于公共 API。

## 相关页面

- [SM9 平台与验证边界](/algorithms/SM9.html)
- [Java API 首页](/api/java/)
