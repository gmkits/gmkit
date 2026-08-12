---
title: Java SM9 使用手册
description: 使用 GMKit Java 0.10.1 检查平台，管理 KGC、身份密钥、签名、IBE、PEM 和本地句柄。
pageInfo: false
contributors: false
editLink: false
icon: shield-keyhole
category: [使用手册, Java]
tag: [SM9, IBE, PEM]
---

# Java SM9 使用手册

SM9 位于独立制品 `cn.gmkit:gmkit-sm9:0.10.1`，依赖随 JAR 分发的本地动态库。0.10.1 提供签名/验签和基于身份的加密（IBE），不提供 SM9 密钥交换。

在采用 SM9 前，先确认对端实现、密钥生成中心（KGC）职责、主密钥保管、身份编码、支持平台和合规要求。不能只因为 API 可调用就省略协议设计。

## 支持平台与启动检查

0.10.1 构建流水线覆盖：

<ApiTable label="SM9 本地动态库平台" min-width="62rem">

| 平台标识 | 操作系统 | CPU |
|:--|:--|:--|
| `linux-x86_64` | Linux | x86-64 |
| `linux-aarch64` | Linux | AArch64 |
| `darwin-x86_64` | macOS | Intel x86-64 |
| `darwin-aarch64` | macOS | Apple Silicon |
| `windows-x86_64` | Windows | x86-64 |

</ApiTable>

应用启动时按顺序记录：

1. `SM9.nativePlatform()`：当前运行环境映射的平台标识，不支持时为 `unsupported`。
2. `SM9.nativeVersion()`：JNI bridge 版本标识。
3. `SM9.isAvailable()`：依赖库和 bridge 是否已成功加载。
4. `SM9.nativeLoadErrorMessage()`：不可用时的诊断；可用时为 `null`。

`isAvailable() == false` 时不要调用生成密钥、签名或加密方法。普通文档 CI 只验证平台诊断和不可用时的明确失败边界；不会把跳过 native 的测试报告为 SM9 运行成功。五平台 Action 通过 `-Dgmkit.sm9.requireNative=true` 强制执行签名、验签、IBE、PEM 和资源生命周期测试。

## 四种密钥角色

<ApiTable label="SM9 密钥角色" min-width="72rem">

| 对象 | 私密性 | 由谁持有 | 用途 |
|:--|:--|:--|:--|
| 签名主私钥 | 最高机密 | KGC | 派生用户签名私钥 |
| 签名主公钥 | 可分发 | 验签方 | 配合签名者 ID 验证签名 |
| 加密主私钥 | 最高机密 | KGC | 派生用户 IBE 解密私钥 |
| 加密主公钥 | 可分发 | 发送方 | 配合接收者 ID 加密 |
| 用户签名私钥 | 机密、绑定 ID | 签名者 | 生成签名 |
| 用户解密私钥 | 机密、绑定 ID | 接收者 | 解开投递给该 ID 的 IBE 密文 |

</ApiTable>

公开主密钥和主私钥在 Java 中使用同一个句柄类型表示，是因为它们来自不同导入/生成路径；这不表示主私钥可以分发。

## 端到端样例

下面的测试包含平台检查、KGC 派生、加密 PEM、重新导入、签名验签、错误身份、IBE、255 字节上限和流式签名。所有本地句柄均由 try-with-resources 关闭。

<!-- code-sample id="manual-java-sm9" steps="检查平台|准备参数|生成签名 KGC 主密钥|派生签名身份私钥|导入签名材料|SM9 签名|SM9 验签|验签失败断言|生成加密 KGC 主密钥|导入加密材料|SM9 IBE 加密|SM9 IBE 解密|身份失败断言|长度失败断言|流式 SM9 签名" -->
```java
<!-- @include: ../../../../packages/java/gmkit-sm9/src/test/java/cn/gmkit/sm9/ManualJavaSm9UserGuideTest.java#manual-java-sm9 -->
```

## 签名与流式签名

- `SM9.sign`/`SM9.verify` 为一次性门面，内部创建并关闭 `SM9Signature`。
- `SM9Signature(true)` 是签名上下文，`SM9Signature(false)` 是验签上下文。
- `update(byte[])` 或 `update(data, offset, length)` 可分块输入。
- `sign` 输出 DER 编码的签名。
- 身份或消息不匹配时验签返回 `false`；空参数、关闭后的句柄或本地调用错误抛 `SM9Exception`。
- 同一个上下文不能并发处理两条消息；需要重用时先 `reset(doSign)`，并保证前一操作已结束。

## IBE 明文限制

`SM9.encrypt` 的单次明文必须为 1–255 字节。这个入口适合会话 key、短令牌和协议规定的小字段，不适合文件或业务报文。

大数据流程：

1. 生成随机 SM4 key 和唯一 GCM nonce。
2. 使用 SM4-GCM 加密业务数据并保存 AAD、ciphertext、tag。
3. 使用 SM9 IBE 保护短 SM4 会话 key。
4. 接收方以身份私钥恢复会话 key，再完成 GCM 认证解密。

GMKit 0.10.1 没有公开 SM9 + SM4 组合载荷类型；应用必须定义带 schema 版本的协议。

## PEM

<ApiTable label="SM9 PEM 操作" min-width="72rem">

| 材料 | 导出 | 导入 | 保护 |
|:--|:--|:--|:--|
| 签名/加密主私钥 | `exportEncryptedMasterKeyInfoPem` | `importEncryptedMasterKeyInfoPem` | 口令加密 |
| 签名/加密主公钥 | `exportPublicMasterKeyPem` | `importPublicMasterKeyPem` | 公开材料，不使用口令 |
| 用户签名/解密私钥 | `exportEncryptedPrivateKeyInfoPem` | `importEncryptedPrivateKeyInfoPem` | 口令加密，导入时还要传绑定 ID |

</ApiTable>

文件路径是宿主文件系统路径。服务端应设置最小文件权限；PEM 口令来自秘密管理系统，不写入源码、命令历史和日志。导入用户私钥时传入的 ID 必须与派生时一致。

## 资源关闭

以下类型都实现 `AutoCloseable`：

- `SM9SignMasterKey`
- `SM9EncMasterKey`
- `SM9SignKey`
- `SM9EncKey`
- `SM9Signature`

`close()` 可重复调用；关闭后继续使用会抛 `SM9Exception`。不要依赖 GC 或 finalizer 释放本地句柄。

## 标准证据

SM9 Native Action 的验证顺序固定为：

1. 锁定 GmSSL commit `d655c06b3a6b0fe8cff900f293bf0e5aac6eb0a2`。
2. 执行 GmSSL `sm9test.c` 对应的 `ctest ... -R ^sm9$`，覆盖 `ks/ds/ke/de` 固定派生向量。
3. 运行 Java/JNI 的签名、错误身份、篡改、IBE、PEM和本手册测试。
4. 在 Linux x86-64/AArch64、macOS Intel/Apple Silicon、Windows x86-64 上分别构建和测试本地产物。

随机签名和随机 IBE 密文只验证可验签、可解密和篡改失败，不冒充固定国标向量。

完整句柄成员、异常和诊断入口见 [Java SM9 API](/manual/java/api/sm9.html)。
