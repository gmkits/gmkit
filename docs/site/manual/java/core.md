---
title: Java 核心类型与错误
description: 明确 GMKit Java 0.10.1 的编码、字节、Provider、安全上下文和异常边界。
pageInfo: false
contributors: false
editLink: false
icon: binary
category: [使用手册, Java]
tag: [编码, Provider, SecureRandom]
---

# Java 核心类型与错误

Java 密码 API 处理 `byte[]`。`String` 重载只是把文本按某个 `Charset` 转为字节；协议 key、IV、密文和签名不能混用文本编码与二进制编码。

## 可执行案例

<!-- code-sample id="manual-java-core" steps="准备二进制|编码二进制|显式解码|UTF-8 往返|比较失败断言|非法输入断言|创建安全上下文" -->
```java
<!-- @include: ../../../../packages/java/gmkit/src/test/java/cn/gmkit/ManualJavaCoreTest.java#manual-java-core -->
```

## 数据类型

<ApiTable label="Java 数据规则" min-width="66rem">

| 数据 | Java 类型 | 字符串解释 |
|:--|:--|:--|
| 订单、身份、AAD | `String` 或预先编码的 `byte[]` | 手册显式使用 `StandardCharsets.UTF_8` |
| 文件、图片、协议帧 | `byte[]` | 不经过 `String` |
| key、IV、nonce、公私钥 | API 指定的 `byte[]` 或 Hex `String` | Hex 使用 `HexCodec.decodeStrict` |
| ciphertext、signature、tag | `byte[]`；传输时 Hex/Base64 | 接收端使用明确 codec 还原 |

</ApiTable>

`Texts.bytes(text, null)` 和 `Texts.text(bytes, null)` 在 0.10.1 中回落到 UTF-8。主手册仍显式传 `StandardCharsets.UTF_8`，使代码审查能直接看出协议字符集。

## 编码入口

<ApiTable label="Java 编码入口" min-width="68rem">

| API | 行为 | 失败 |
|:--|:--|:--|
| `HexCodec.decodeStrict(value, label)` | 接受可选 `0x` 和空白，要求去除后为偶数长度 Hex | 抛 `GmkitException` |
| `HexCodec.encode(bytes)` | 输出小写 Hex | `null` 抛 `GmkitException` |
| `Base64Codec.decode(value, label)` | 校验 RFC 4648 字符、填充和 pad bits | 抛 `GmkitException` |
| `Base64Codec.encode(bytes)` | 输出标准 Base64 | `null` 抛 `GmkitException` |
| `ByteEncodings.decode(value, format, label)` | 按 `HEX` 或 `BASE64` 显式解码 | 格式或内容非法时抛错 |
| `ByteEncodings.encode(bytes, format)` | 按 `HEX` 或 `BASE64` 编码 | `format = null` 时使用 Hex |

</ApiTable>

主手册不传 `format = null`。新 schema 必须携带 `HEX` 或 `BASE64`，接收端按该枚举解码；没有格式字段的历史数据见[旧系统迁移](/manual/migration.html#密文和签名自动识别)。

## 数组所有权

`byte[]` 是可变对象。0.10.1 的选项和结果对象对公开 getter 使用防御性拷贝；调用方仍应：

- 不在加密调用进行时修改传入数组；
- 不把可变 key 数组跨请求共享给会改写它的代码；
- 在业务允许时清零临时 key 副本；
- 通过 `Bytes.constantTimeEquals` 比较已解码的 MAC/tag。

## 安全上下文

`GmSecurityContext` 保存三个值：`Provider`、`SecureRandom` 和 `registerProvider`。Builder 的确切默认值是：

- Provider：`BcProviders.defaultProvider()`；
- 随机源：新的 `SecureRandom()`；
- `registerProvider`：`true`。

设置 `registerProvider(false)` 后，`context.provider()` 直接返回指定实例，不调用 `Security.addProvider`。这适合应用服务器与测试；算法通过 Provider 实例执行，不要求它出现在全局列表。

## 失败语义

<ApiTable label="Java 失败边界" min-width="72rem">

| 操作 | 结果 | 说明 |
|:--|:--|:--|
| SM2 签名不匹配 | `verify(...)` 返回 `false` | 已解码的签名字节结构非法也会返回 `false` |
| SM2 字符串签名的 Base64 非法 | 抛 `GmkitException` | 主手册先显式 Base64 解码，再把字节交给验签 |
| SM2 公钥、参数或密文非法 | 抛 `GmkitException` | 不返回部分结果 |
| SM4-GCM/CCM 认证失败 | 抛 `GmkitException` | 丢弃输出 |
| SM2 密钥交换确认失败 | 0.10.1 由 BC 抛 `IllegalStateException` | 在协议边界按协商失败处理 |
| SM9 平台或本地调用失败 | SM9 专用异常/诊断结果 | 见 SM9 手册 |

</ApiTable>

应用层可以统一捕获密码失败，但不应把 key、明文、完整签名或内部异常堆栈返回给对端。

完整类型与方法见 [Java core API](/manual/java/api/core.html)。
