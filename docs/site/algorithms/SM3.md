---
title: SM3 密码杂凑算法
description: 说明 SM3 摘要、HMAC、UTF-8、输出编码和双语言状态差异。
icon: fingerprint
order: 2
category: [算法]
tag: [SM3, HMAC, 摘要]
---

# SM3 密码杂凑算法

SM3 把任意长度字节序列映射为 256-bit 摘要。摘要不是加密，也不能单独证明发送者身份；需要共享密钥认证时使用 HMAC-SM3。

<div class="doc-path-grid doc-path-grid-compact">
  <a class="doc-path-card" href="/manual/typescript/api/sm3.html">
    <span class="doc-path-label">gmkitx</span>
    <strong>TypeScript SM3 API</strong>
    <small>一次性摘要、HMAC、输出编码、增量状态和 reset 行为。</small>
  </a>
  <a class="doc-path-card" href="/manual/java/api/sm3.html">
    <span class="doc-path-label">cn.gmkit:gmkit</span>
    <strong>Java SM3 API</strong>
    <small>实例与静态重载、String、Charset、Hex、Base64 和失败行为。</small>
  </a>
</div>

## 能力与双语言差异

<ApiTable label="SM3 双语言能力" min-width="68rem">

| 能力 | TypeScript | Java | 协议注意 |
|:--|:--|:--|:--|
| 一次性摘要 | `sm3Digest` | `SM3.digest*` / `SM3Util.digest*` | 字符串默认按 UTF-8 |
| HMAC-SM3 | `sm3Hmac` | `SM3.hmac*` / `SM3Util.hmac*` | key 的原始字节必须一致 |
| 增量摘要 | `SM3.update().digest()` | 当前主包没有公共增量状态机 | 分块边界不能进入协议结果 |
| Hex 输出 | 小写 64 字符，默认 | `digestHex` / `hmacHex` | 协议写明是否允许大小写 |
| Base64 输出 | 通过 outputFormat 选择 | `digestBase64` / `hmacBase64` | 使用标准 RFC 4648 字符表 |

</ApiTable>

Java 的 `SM3` 是无状态对象入口，`SM3Util` 是同语义静态入口；类名并不表示 Java 端可以持续 `update()`。TypeScript 的增量 `SM3` 在 `digest()` 后自动重置，异步任务不应共享同一个实例。

## 输入必须先变成确定字节

- 普通业务字符串按 UTF-8；文件块、协议帧和压缩数据直接传 `Uint8Array` 或 `byte[]`。
- Java 使用其他字符集时必须选择带 `Charset` 的重载；不能依赖 JVM 默认字符集。
- HMAC key 字符串同样按 UTF-8。协议给出 Hex key 时应先解码成原始字节，不能把 Hex 字面量当作口令。
- 空消息是合法摘要输入。业务协议是否允许空值，需要在调用 SM3 前单独判断。

## 固定结果

固定向量用于确认依赖、编码和输出格式；不会验证随机源或密钥管理。

<ApiTable label="SM3 固定结果" min-width="68rem">

| 用途 | 输入 | 期望 Hex |
|:--|:--|:--|
| SM3 摘要 | UTF-8 `abc` | `66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0` |
| SM3 空消息 | 零字节 | `1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b` |
| HMAC-SM3 | UTF-8 key `secret-key`，消息 `hmac-payload` | `b57fb50bbc8ad6f9b11129cf1ec67cf0c658f0d4b597ae3f05a64eaa4a22d312` |

</ApiTable>

同一个 `abc` 摘要的标准 Base64 为 `Zsfw9GLu7dnR8tRr3BDk4kFnxIdc8veiKX2gK49LqOA=`。TypeScript 与 Java API 页分别给出可直接运行的成功断言。

## 使用边界

- 用户密码存储不能只做一次 SM3；应采用带 salt 和成本参数的专用密码哈希。
- 不要构造 `SM3(secret || message)` 代替 HMAC。消息认证使用经过定义的 HMAC 结构。
- 普通摘要不提供机密性或来源认证。加密数据应使用认证加密，或按经过审查的协议组合加密与 MAC。
- HMAC key 应来自安全随机源或经过审查的 KDF，不使用短口令、订单号或时间戳。
- 验证 MAC 时比较原始字节，并使用 [敏感值比较](/api/common.html#敏感值比较) 中的约定。

## 验证依据

- GM/T 0004-2012 `abc` 固定向量
- [共享互操作向量](/standards/interop-vectors)
- [TypeScript SM3 可执行案例](/manual/typescript/api/sm3.html#可执行案例)
- [Java SM3 可执行案例](/manual/java/api/sm3.html#可执行案例)
