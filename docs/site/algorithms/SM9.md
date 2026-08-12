---
title: SM9 标识密码算法
description: 说明 Java SM9 的采用前提、身份与密钥角色、平台限制和标准验证证据。
icon: key
order: 5
category: [算法]
tag: [SM9, Java, JNI, GmSSL]
---

# SM9 标识密码算法

SM9 使用身份字符串参与密钥派生和密码运算。GMKit 当前只通过 Java 制品 `cn.gmkit:gmkit-sm9:0.10.1` 提供签名、验签、基于身份的加密（IBE）、PEM 和流式签名；底层由 JNI 调用随 JAR 分发的 GmSSL 本地动态库。`gmkitx` 不提供 SM9、WASM 占位或浏览器降级实现。

<div class="doc-path-grid doc-path-grid-compact">
  <a class="doc-path-card" href="/manual/java/api/sm9.html">
    <span class="doc-path-label">Java · gmkit-sm9</span>
    <strong>SM9 API 说明书</strong>
    <small>依赖、平台诊断、句柄、签名、IBE、PEM、文件路径、限制和可执行案例。</small>
  </a>
  <a class="doc-path-card" href="#验证证据">
    <span class="doc-path-label">GmSSL v3.1.1</span>
    <strong>标准对标证据</strong>
    <small>固定派生向量、Java/JNI 行为和五平台聚合 JAR 分三层验收。</small>
  </a>
</div>

## 采用前先回答五个问题

<ApiTable label="SM9 采用前提" min-width="72rem">

| 主题 | 项目必须明确的答案 | GMKit 不负责的部分 |
|:--|:--|:--|
| 对端协议 | 对端实现、身份字节、签名/密文/PEM 格式 | 不保证未测试实现自动互操作 |
| KGC | 主私钥生成、隔离、备份、轮换和审计 | 不提供 KGC 服务或 HSM 托管 |
| 身份体系 | 登记、派生、分发、注销和重新签发 | 不提供身份目录与吊销协议 |
| 部署平台 | OS/CPU、JAR 内 runtime、临时目录和加载策略 | 不提供纯 Java 回退 |
| 合规与运营 | 适用标准、准入要求、灾备和密钥职责分离 | 文档与测试不构成认证结论 |

</ApiTable>

SM9 的接入成本主要来自密钥基础设施、身份治理、对端生态和本地动态库运维。是否采用应依据协议要求和部署条件评估，不应只因 API 可以调用就引入。

## 身份与密钥角色

<ApiTable label="SM9 身份与密钥角色" min-width="70rem">

| 角色 | 是否保密 | 可以做什么 | 不可以做什么 |
|:--|:--:|:--|:--|
| KGC 主私钥 | 是 | 为身份派生用户私钥；导出时使用口令加密 PEM | 不能分发给普通验签方或加密方 |
| 公开主密钥 | 否 | 验证身份签名，或为指定身份执行 IBE 加密 | 不能派生用户私钥 |
| 身份绑定的用户私钥 | 是 | 执行该身份的签名或 IBE 解密 | 不能改绑到另一个身份 |
| 身份字符串 | 通常公开 | 参与派生、验签和加解密 | 不能在协议不同层随意 trim、改大小写或归一化 |

</ApiTable>

身份按 UTF-8 原样转换。首尾空格会进入身份字节，全空白身份会被拒绝；派生、验签和 IBE 两端必须使用完全相同的字节。中文、emoji 和非 BMP 字符由 Java/JNI 测试覆盖，业务协议仍应明确 Unicode 规范化策略。

## 功能和数据边界

<ApiTable label="SM9 功能与限制" min-width="70rem">

| 能力 | 当前行为 | 需要写入协议的内容 |
|:--|:--|:--|
| 签名 | DER 编码，含随机性 | 身份 UTF-8、消息字节、签名字段编码 |
| IBE | 单次明文 1–255 字节 | 接收身份、密文编码、载荷版本 |
| IBE 解密 | 接受的 DER 密文最多 367 字节 | 超限与解析失败的统一错误处理 |
| PEM | 私有材料只提供口令加密 PEM；公开主密钥使用公开 PEM | 口令策略、文件权限、路径编码和轮换 |
| 流式签名 | 多次 update 后 sign/verify，可 reset 复用 | 分块顺序；并发任务不共享上下文 |
| 密钥交换 | 当前不提供 | 不能从 IBE API 推断存在密钥交换协议 |

</ApiTable>

签名或加密结果含随机性，不应把一次随机输出写成固定标准向量。测试应检查成功、错误身份、篡改消息、篡改签名或密文，以及资源关闭后的失败行为。

## 大数据采用混合加密

IBE 的 255 字节上限适合保护短会话材料，不适合直接处理文件或长业务报文。大数据流程应明确分层：

1. 生成随机 16 字节 SM4 会话 key。
2. 使用 SM4-GCM 或 CCM 认证加密业务数据。
3. 使用接收方身份和 SM9 公开主密钥保护会话 key。
4. 在载荷中记录版本、身份、SM4 mode、nonce、AAD、ciphertext、tag 和 SM9 密文编码。

这里描述的是协议构成，不是稳定序列化格式。调用方需要定义字段顺序、长度、编码和升级规则。

## 受支持平台

单个 JAR 包含五组 runtime，启动时只解压和加载当前平台资源：

<ApiTable label="SM9 本地动态库平台" min-width="68rem">

| 平台标识 | GmSSL 动态库 | JNI 桥接库 |
|:--|:--|:--|
| `linux-x86_64` | `libgmssl.so.3` | `libgmkitsm9.so` |
| `linux-aarch64` | `libgmssl.so.3` | `libgmkitsm9.so` |
| `darwin-x86_64` | `libgmssl.3.dylib` | `libgmkitsm9.dylib` |
| `darwin-aarch64` | `libgmssl.3.dylib` | `libgmkitsm9.dylib` |
| `windows-x86_64` | `gmssl.dll` | `gmkitsm9.dll` |

</ApiTable>

其他 OS/CPU 组合返回不支持错误，不会自动改用纯 Java 或其他算法。正式环境应在启动阶段检查可用性、平台标识和加载错误；测试环境要求 SM9 时，`isAvailable() == false` 必须使测试失败，不能计为成功跳过。

## 句柄与 PEM 边界

- 主密钥、用户私钥和签名上下文持有 native handle，使用 try-with-resources；`close()` 可重复调用。
- 关闭后再次操作会抛 `SM9Exception`。不要把同一句柄交给多个都负责关闭它的组件。
- PEM 口令和路径按 UTF-8 处理；Windows native 使用宽字符文件 API。口令或路径包含 NUL 时拒绝。
- 公开主密钥可以分发，主私钥和用户私钥只能以受控方式保存；口令加密 PEM 不替代文件权限、密钥托管和审计。

## 验证证据

构建固定 GmSSL `v3.1.1` commit `d655c06b3a6b0fe8cff900f293bf0e5aac6eb0a2`。三层测试回答不同问题，不能互相替代：

<ApiTable label="SM9 三层验证证据" min-width="72rem">

| 层级 | 实际执行内容 | 能证明什么 | 不能证明什么 |
|:--|:--|:--|:--|
| GmSSL 固定向量 | 五个平台先运行上游 `sm9test.c` 的 `ks`、`ds`、`ke`、`de` 派生向量 | 锁定版本的底层 SM9 派生运算通过其固定结果 | 不能证明 Java 参数桥接或 JAR 打包正确 |
| Java/JNI 行为 | 签名、错误身份、篡改、IBE、1/255/256 字节边界、PEM、Unicode 与句柄关闭 | Java 参数到 native 的转换和失败语义 | 随机输出不能冒充固定国标向量 |
| 聚合 JAR | 五个平台使用同一发布 JAR，验证自动选平台、签名、IBE 和 Unicode PEM | 发布物包含并能加载对应 runtime | 不能替代业务 KGC、身份和合规评审 |

</ApiTable>

固定结果的可核查来源是锁定提交的 [`tests/sm9test.c`](https://github.com/guanzhi/GmSSL/blob/d655c06b3a6b0fe8cff900f293bf0e5aac6eb0a2/tests/sm9test.c)。Java 公共 API 不暴露原始 `ks/ke/ds/de` 内存结构，因此标准派生向量在 GmSSL 层执行，Java 层专门验证公开 API 行为和边界。

完整可运行案例与测试对应关系见 [Java SM9 API 说明书](/manual/java/api/sm9.html#可执行案例)。
