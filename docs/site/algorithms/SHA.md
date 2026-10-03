---
title: SHA 系列密码杂凑算法
description: 说明 gmkitx 的 SHA-1、SHA-256、SHA-384、SHA-512、HMAC 和增量状态边界。
icon: fingerprint
order: 6
category: [算法]
tag: [SHA-1, SHA-256, SHA-384, SHA-512, HMAC]
---

# SHA 系列密码杂凑算法

`gmkitx` 提供 SHA-1、SHA-256、SHA-384、SHA-512，以及 HMAC-SHA-256/384/512。Java 主包没有 `cn.gmkit.sha` 封装，Java 项目应直接使用 JDK `MessageDigest` 和 `Mac`。

<div class="doc-path-grid doc-path-grid-compact">
  <a class="doc-path-card" href="/manual/typescript/api/sha.html">
    <span class="doc-path-label">gmkitx</span>
    <strong>TypeScript SHA API</strong>
    <small>一次性函数、四个增量类、HMAC、输出编码、状态和失败案例。</small>
  </a>
  <a class="doc-path-card" href="/api/java/">
    <span class="doc-path-label">Java 8+</span>
    <strong>Java API 范围</strong>
    <small>GMKit Java 不封装 SHA；应用直接使用 JDK MessageDigest 与 Mac。</small>
  </a>
</div>

## 算法选择

<ApiTable label="SHA 能力与选择边界" min-width="68rem">

| 算法 | gmkitx 一次性入口 | 增量类 | HMAC | 新协议定位 |
|:--|:--|:--|:--|:--|
| SHA-1 | `sha1` | `SHA1` | 不提供 | 已有碰撞攻击，只用于明确要求的旧协议 |
| SHA-256 | `sha256` | `SHA256` | `hmacSha256` | 通用摘要与 HMAC |
| SHA-384 | `sha384` | `SHA384` | `hmacSha384` | 需要更长摘要的既定协议 |
| SHA-512 | `sha512` | `SHA512` | `hmacSha512` | 需要更长摘要的既定协议 |

</ApiTable>

当前包不提供 SHA-224、SHA-3、HMAC-SHA-1 或 SHAKE。算法选择由外层协议决定，不应根据“输出越长越好”临时切换。

## 输入、输出和状态

- 一次性函数接收 UTF-8 字符串或原始 `Uint8Array`。
- Hex 是默认输出，Base64 通过 `SHAOptions.outputFormat` 选择。
- 四个增量类都支持 `update`、`digest`、`reset`、`setOutputFormat` 和 `getOutputFormat`。
- `digest()` 输出后自动建立新状态。连续调用两次 `digest()`，第二次得到的是空消息摘要，不是第一次结果的另一种编码。
- 不同异步任务不能共享同一个增量实例；chunk 的划分不应改变最终摘要。

## `abc` 固定结果

<ApiTable label="SHA abc 固定结果" min-width="72rem">

| 算法 | Hex 摘要 |
|:--|:--|
| SHA-1 | `a9993e364706816aba3e25717850c26c9cd0d89d` |
| SHA-256 | `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| SHA-384 | `cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7` |
| SHA-512 | `ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f` |

</ApiTable>

HMAC-SHA-256 的 RFC 4231 test case 1 使用 20 个 `0x0b` 字节作为 key、ASCII `Hi There` 作为消息，期望结果为 `b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7`。这里的 key 是原始字节，不是字符串 `"0b0b..."`。

## 使用边界

- SHA-1 不用于新签名、证书、文件去重安全边界或任何依赖抗碰撞性的设计。
- 普通 SHA 不适合存储用户密码；选择 Argon2id、scrypt、bcrypt 等专用方案。
- 普通摘要不能认证发送者。共享密钥协议使用 HMAC，并固定消息规范化和编码。
- HMAC key 使用随机字节或 KDF 输出；验证时按原始字节比较，不先转字符串。

## 验证依据

- FIPS PUB 180-4
- RFC 4231
- [TypeScript SHA 可执行案例](/manual/typescript/api/sha.html#可执行案例)
- Java 示例由 JDK 标准 Provider 执行，不属于 `cn.gmkit:gmkit` API
