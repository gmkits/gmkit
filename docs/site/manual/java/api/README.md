---
title: Java API 说明书
description: 按 core、SM2、SM3、SM4、ZUC、SM9 和混合加密查阅 GMKit Java 的公开类型及成员。
pageInfo: false
contributors: false
editLink: false
icon: coffee
category:
  - API 说明书
  - Java
tag:
  - Java
  - Maven
  - API
---

# Java API 说明书

GMKit Java 当前版本为 `0.10.1`，由主包 `cn.gmkit:gmkit` 和独立 SM9 包 `cn.gmkit:gmkit-sm9` 组成。本说明书覆盖公开顶层类型、构造器、方法重载、Builder 字段、默认值、异常和资源生命周期。当前类型数量由构建产物生成：<ApiPackageSummary package-id="java" />。

第一次接入先按 [Java 使用手册](/manual/java/) 完成安装、自检、成功与失败案例；需要核对某个方法的参数、重载或异常时，再从下方目录进入对应 API 页。应用代码只使用发布 JAR 中的 public 类型，不依赖 package-private 实现。

::: warning 使用前先确认安全边界
当前发布包尚未完成独立第三方安全审计。固定向量和自动测试用于发现实现偏差，不能替代密码产品认证、协议评审、密钥管理或目标运行环境的安全评估。
:::

## Maven 依赖

### 主包

主包提供 core、SM2、SM3、SM4、ZUC 和 SM2 + SM4 混合加密，最低支持 Java 8：

```xml
<dependency>
  <groupId>cn.gmkit</groupId>
  <artifactId>gmkit</artifactId>
  <version>0.10.1</version>
</dependency>
```

### SM9 独立包

只有使用 SM9 时才增加下面的依赖：

```xml
<dependency>
  <groupId>cn.gmkit</groupId>
  <artifactId>gmkit-sm9</artifactId>
  <version>0.10.1</version>
</dependency>
```

`gmkit-sm9` 通过 JNI 调用随聚合 JAR 分发的 GmSSL 本地动态库。应用启动时必须检查 `SM9.isAvailable()`；平台、IBE 长度限制和句柄关闭规则见 [Java SM9 API](./sm9.html)。

<ApiTable label="Java 制品选择" min-width="62rem">

| 制品 | 包 | 能力 | 额外运行条件 |
|:--|:--|:--|:--|
| `cn.gmkit:gmkit` | `cn.gmkit.core/sm2/sm3/sm4/zuc/integration` | 主体算法和公共工具 | Bouncy Castle 依赖随 Maven 解析 |
| `cn.gmkit:gmkit-sm9` | `cn.gmkit.sm9` | SM9 签名、IBE、PEM | 当前操作系统和 CPU 必须有配套的本地动态库 |

</ApiTable>

## 30 秒确认安装正确

<!-- code-sample id="api-java-index-01" steps="计算摘要|固定向量断言" -->
```java
import cn.gmkit.sm3.SM3Util;

// 1. 计算摘要：使用标准输入 abc 计算 SM3。
String expected =
        "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0";
String actual = SM3Util.digestHex("abc");

// 2. 固定向量断言：摘要必须与标准结果完全一致。
if (!expected.equals(actual)) {
    throw new IllegalStateException("SM3 vector mismatch: " + actual);
}
```

这个固定向量同时检查 Maven 依赖、Provider、UTF-8 文本路径和 Hex 输出，不使用随机数。随后按 [Java 快速入门](/guide/java.html) 完成 SM2 身份签名、SM4-GCM 解密和篡改失败测试。

## 实例式与静态式入口

SM2、SM3、SM4 同时提供实例类和 `*Util` 静态类；ZUC 的两个公开类都是静态入口。

<ApiTable label="Java 算法入口选择" min-width="68rem">

| 需求 | 推荐入口 | 原因 |
|:--|:--|:--|
| 固定 `GmSecurityContext` | `new SM2(context)`、`new SM4(context)` | 实例持续使用指定 Provider 和随机源 |
| 简单一次性操作 | `SM2Util`、`SM3Util`、`SM4Util` | 调用短，不维护业务对象 |
| 代码风格统一为实例 | `SM2`、`SM3`、`SM4` | `SM3` 实例仍是无状态入口 |
| ZUC/EEA3/EIA3 | `ZUC` 或 `ZUCUtil` | 两者均为同语义静态方法 |
| SM9 一次性签名/IBE | `SM9` 门面 | 自动管理一次性签名上下文 |
| SM9 流式签名 | `SM9Signature` | 支持分块 `update`，必须关闭 |

</ApiTable>

<!-- code-sample id="api-java-index-02" steps="创建实例式入口，并分别计算同一条消息的摘要|入口一致性断言" -->
```java
import cn.gmkit.sm3.SM3;
import cn.gmkit.sm3.SM3Util;

// 1. 创建实例式入口，并分别计算同一条消息的摘要。
SM3 sm3 = new SM3();
String byInstance = sm3.digestHex("abc");
String byUtility = SM3Util.digestHex("abc");

// 2. 入口一致性断言：实例式与静态式结果必须相同。
if (!byInstance.equals(byUtility)) {
    throw new IllegalStateException("SM3 entry points disagree");
}
```

`SM2` 和 `SM4` 保存安全上下文但不保存某次密码运算状态；`SM3` 无状态；SM9 的密钥和签名上下文持有 native 句柄。可变上下文不要跨线程共享，SM9 句柄始终用 try-with-resources。

## API 目录

<div class="doc-path-grid">
  <a class="doc-path-card" href="./core.html">
    <span class="doc-path-label">18 个公开类型</span>
    <strong>核心类型与工具</strong>
    <small>Hex/Base64、字节、文本、Provider、安全上下文、格式枚举与异常。</small>
  </a>
  <a class="doc-path-card" href="./sm2.html">
    <span class="doc-path-label">10 个公开类型</span>
    <strong>SM2</strong>
    <small>密钥、加解密、标准 Z 签名、旧 no-Z、格式转换和密钥交换。</small>
  </a>
  <a class="doc-path-card" href="./sm3.html">
    <span class="doc-path-label">2 个公开类型</span>
    <strong>SM3</strong>
    <small>一次性摘要、HMAC、字符串重载和 Hex/Base64 输出。</small>
  </a>
  <a class="doc-path-card" href="./sm4.html">
    <span class="doc-path-label">4 个公开类型</span>
    <strong>SM4</strong>
    <small>七种模式、padding、Builder、GCM/CCM、tag 和结果对象。</small>
  </a>
  <a class="doc-path-card" href="./zuc.html">
    <span class="doc-path-label">2 个公开类型</span>
    <strong>ZUC</strong>
    <small>ZUC-128、byte/word/bit 长度、EEA3 和 EIA3。</small>
  </a>
  <a class="doc-path-card" href="./sm9.html">
    <span class="doc-path-label">8 个公开类型</span>
    <strong>SM9</strong>
    <small>五平台诊断、KGC/用户私钥、签名、IBE、PEM 和句柄生命周期。</small>
  </a>
  <a class="doc-path-card" href="./integration.html">
    <span class="doc-path-label">2 个公开类型</span>
    <strong>SM2 + SM4 混合加密</strong>
    <small>随机会话 key、默认 GCM、载荷字段、篡改失败和序列化边界。</small>
  </a>
</div>

上面七页覆盖当前公开顶层类型。需要按类名或方法名核对时，可查看各页末尾的“公共项覆盖”，或进入本次构建生成的 Javadoc 签名索引。

## 输入、返回与失败总则

<ApiTable label="Java API 总体约定" min-width="72rem">

| 情况 | 约定 | 例外或下一步 |
|:--|:--|:--|
| 无 `Charset` 的字符串消息 | UTF-8 | key、密文等字符串按参数声明的 Hex/Base64 处理 |
| 原始二进制 | `byte[]` | 不要经过 `String` 中转 |
| Hex 输出 | 小写、不含 `0x` | Base64 输出采用标准字母表和填充 |
| 数组值对象 | 通常防御性复制 | 仍应尽快清除不再需要的敏感副本 |
| 普通验签不匹配 | 返回 `false` | `null`、编码或密钥参数非法可能抛异常 |
| AEAD 认证失败 | 抛 `GmkitException` | 不返回未认证明文 |
| 主包参数/密码操作失败 | `GmkitException` | 底层 cause 按具体方法保留 |
| SM9 参数、PEM、句柄失败 | `SM9Exception` | 平台或加载失败为其子类 `SM9UnsupportedPlatformException` |

</ApiTable>

自动识别通常优先 Hex，但不是稳定协议。跨服务载荷必须固定算法、mode、padding、编码、IV/nonce、AAD、tag、SM2 密文排列、签名格式和 schema 版本。

## 安全上下文

`GmSecurityContext` 把 Bouncy Castle Provider、`SecureRandom` 和是否注册 Provider 的策略放在同一个对象中：

<!-- code-sample id="api-java-index-03" steps="创建安全上下文|创建 SM2 实例|上下文断言" -->
```java
import cn.gmkit.core.GmSecurityContext;
import cn.gmkit.sm2.SM2;
import java.security.SecureRandom;

// 1. 创建安全上下文：显式注入随机源并禁止修改全局 Provider 列表。
GmSecurityContext context = GmSecurityContext.builder()
        .secureRandom(new SecureRandom())
        .registerProvider(false)
        .build();

// 2. 创建 SM2 实例：后续密码运算复用同一上下文。
SM2 sm2 = new SM2(context);

// 3. 上下文断言：实例必须持有调用方提供的对象。
if (sm2.securityContext() != context) {
    throw new IllegalStateException("security context mismatch");
}
```

`registerProvider(true)` 会修改 JVM 全局 Provider 列表。容器或已有安全策略的应用应由自身统一管理 Provider；构造器、Builder 和辅助工厂的精确优先级见 [Java 核心 API](./core.html#gmsecuritycontext)。

## 错误处理示例

<!-- code-sample id="api-java-index-04" steps="准备输入|SM2 签名|SM2 验签|篡改断言" -->
```java
import cn.gmkit.core.GmkitException;
import cn.gmkit.sm2.SM2KeyPair;
import cn.gmkit.sm2.SM2SignOptions;
import cn.gmkit.sm2.SM2Util;
import cn.gmkit.sm2.SM2VerifyOptions;

// 1. 准备输入：正常订单与金额被修改的接收消息分别保存。
SM2KeyPair keys = SM2Util.generateKeyPair();
String message = "order=GMKIT-DEMO-0001&amount=88.00";
String received = "order=GMKIT-DEMO-0001&amount=99.00";
String userId = "merchant@gmkit.cn";

// 2. SM2 签名：签名端固定 userId。
String signature = SM2Util.signHex(
        keys.privateKey(),
        message,
        SM2SignOptions.builder().userId(userId).build());

// 3. SM2 验签：合法但不匹配的消息返回 false，非法输入才抛错。
boolean verified;
try {
    verified = SM2Util.verify(
            keys.publicKey(),
            received,
            signature,
            SM2VerifyOptions.builder().userId(userId).build());
} catch (GmkitException invalidInput) {
    // 编码、密钥或参数非法；不要把敏感输入写进日志。
    throw new IllegalStateException("invalid SM2 verification input", invalidInput);
}

// 4. 篡改断言：金额变化后不得验证成功。
if (verified) {
    throw new IllegalStateException("tampered order must not verify");
}
```

算法页会给出更精确的失败边界。例如 SM4-GCM 的 tag 不匹配一定抛异常，SM2 合法输入验签不通过返回 `false`，SM9 `verify` 的 native 非成功码也返回 `false`。

## 运行仓库中的文档案例

主包说明书案例：

```bash
cd packages/java
mvn -pl gmkit -Dtest=PublicApiManualExamplesTest test
```

SM9 的普通 Maven 测试在本机没有动态库时会跳过 native 案例；强制构建并执行 GmSSL 固定向量与 JNI 测试使用：

```powershell
./scripts/sm9-native.ps1 -Test
```

## 已发布版本签名

本说明书解释用途、约束和案例。需要核对历史 Maven 制品的逐成员签名时，从 [已发布版本签名索引](/api/#已发布版本签名索引) 选择与依赖相同的版本。

## 接下来

- [Java 快速入门](/guide/java.html)：完成固定向量、签名和认证加密闭环
- [跨语言公共约定](/api/common.html)：统一编码、错误和安全边界
- [常见问题与故障排查](/guide/troubleshooting.html)
- [安全边界](/guide/security.html)
