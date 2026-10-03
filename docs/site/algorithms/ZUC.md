---
title: ZUC 祖冲之序列密码算法
description: 说明 ZUC-128、128-EEA3、128-EIA3 及 byte、word、bit 长度单位。
icon: stream
order: 4
category: [算法]
tag: [ZUC, EEA3, EIA3]
---

# ZUC 祖冲之序列密码算法

GMKit 两端实现 ZUC-128 密钥流、3GPP 128-EEA3 机密性算法和 128-EIA3 完整性算法；当前不提供 ZUC-256。ZUC 相关接口同时使用 byte、32-bit word 和 bit 三种单位，协议中必须逐字段标明。

<div class="doc-path-grid doc-path-grid-compact">
  <a class="doc-path-card" href="/manual/typescript/api/zuc.html">
    <span class="doc-path-label">gmkitx</span>
    <strong>TypeScript ZUC API</strong>
    <small>高层函数、ZUC 类、ZUCState、长度单位和 EEA3/EIA3 案例。</small>
  </a>
  <a class="doc-path-card" href="/manual/java/api/zuc.html">
    <span class="doc-path-label">cn.gmkit:gmkit</span>
    <strong>Java ZUC API</strong>
    <small>ZUC、ZUCUtil、全部重载、字数组结果和参数失败行为。</small>
  </a>
</div>

## 长度单位不能互换

<ApiTable label="ZUC API 长度单位" min-width="74rem">

| 用途 | TypeScript | Java | 输入单位 | 返回形态 |
|:--|:--|:--|:--|:--|
| 字节密钥流 | `zucKeystream` | `keystream` / `keystreamHex` | byte | TS 固定返回 Hex；Java 可返回字节或 Hex |
| 32-bit 字密钥流 | `zucKeystreamWords` | `keystreamWords` / `keystreamWordsHex` | word | TS 高层返回 Hex；Java 可返回 `int[]` |
| 原始字数组 | `zucGenerateKeystream` | `keystreamWords` | word | `Uint32Array` / `int[]` |
| 通用流加密 | `zucEncrypt` / `zucDecryptBytes` | `encrypt` / `decrypt` | byte | 与输入相同的有效字节数 |
| 旧 EEA3 密钥流 | `eea3` | `eea3` | bit | 向上取整到 32-bit word 的 Hex |
| EEA3 消息加密 | `eea3Encrypt` | `eea3Encrypt` | bitLength | 末字节未使用低位清零 |
| EIA3 MAC-I | `eia3` | `eia3` | bitLength | 32-bit MAC-I，8 个 Hex 字符 |

</ApiTable>

例如“2 个 word”与“8 个 byte”都产生 8 字节密钥流，但参数值不同。不要根据返回 Hex 的字符数反推接口单位。

## 通用 ZUC 与 3GPP 入口

<ApiTable label="ZUC 与 EEA3 EIA3 协议字段" min-width="68rem">

| 路径 | 必需字段 | 认证能力 | 使用边界 |
|:--|:--|:--|:--|
| 通用 ZUC-128 | 16 字节 key、16 字节 IV、消息字节 | 无 | 同一 key/IV 只能使用一次 |
| 128-EEA3 | 16 字节 key、COUNT、BEARER、DIRECTION、bitLength、消息 | 无 | 只负责 3GPP 机密性 |
| 128-EIA3 | 16 字节 key、COUNT、BEARER、DIRECTION、bitLength、消息 | 32-bit MAC-I | 只负责 3GPP 完整性 |

</ApiTable>

COUNT 是 32-bit 整数，BEARER 范围为 0–31，DIRECTION 只能是 0 或 1。`bitLength` 不得超过输入字节承载的 bit 数。EEA3 与 EIA3 的 IV 构造和用途不同，不能自行复用或把 EIA3 当成通用 HMAC。

## 固定结果

<ApiTable label="ZUC 固定验证结果" min-width="70rem">

| 验证项 | 输入概要 | 期望结果 |
|:--|:--|:--|
| ZUC-128 密钥流 | 全零 16 字节 key、全零 16 字节 IV、前 8 字节 | `27bede74018082da` |
| 128-EEA3 | 3GPP TS 35.221 test set 2，800 bit | 完整密文记录在共享互操作向量 |
| 128-EIA3 | key `000102…0f`、COUNT `0x01234567`、BEARER `0x0a`、DIRECTION 0、64 bit | MAC-I `1b3d0f74` |

</ApiTable>

TypeScript 与 Java 使用同一份共享向量验证长 EEA3 输出，页面不再复制两份长常量。固定结果用于确认参数拼装和长度单位；普通 ZUC 往返只能证明使用了同一密钥流，不能证明具备篡改检测。

## 使用边界

- 通用 ZUC 加密不产生 tag，同一 key/IV 复用会泄露明文关系。
- 业务数据没有独立完整性协议时，优先评估 SM4-GCM/CCM。
- 字符串输入按 UTF-8；3GPP 报文应直接传字节和明确 bitLength。
- TypeScript `ZUCState` 是底层状态机，需要显式初始化；常规业务使用高层函数或 `ZUC` 类。
- 非整字节 EEA3 输出的末字节低位已清零，接收方仍应按 bitLength 解释消息。

## 验证依据

- [3GPP TS 35.221 - 128-EEA3](https://www.3gpp.org/DynaReport/35221.htm)
- [3GPP TS 35.222 - 128-EIA3](https://www.3gpp.org/DynaReport/35222.htm)
- [共享互操作向量](/standards/interop-vectors)
- [TypeScript ZUC 可执行案例](/manual/typescript/api/zuc.html#可执行案例)
- [Java ZUC 可执行案例](/manual/java/api/zuc.html#可执行案例)
