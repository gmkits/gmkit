---
title: TypeScript ZUC 使用手册
description: 使用 gmkitx 0.10.1 完成 ZUC-128 密钥流、流加解密、EEA3 和 EIA3。
pageInfo: false
contributors: false
editLink: false
icon: signal
category: [使用手册, TypeScript]
tag: [ZUC, EEA3, EIA3]
---

# TypeScript ZUC 使用手册

只有对端协议明确要求 ZUC-128、EEA3 或 EIA3 时才使用本章。普通业务数据需要认证加密时使用 SM4-GCM。

ZUC 是流密码：加密和解密都是明文/密文与同一密钥流异或。相同 key 和 IV 重复使用会泄漏两条消息的关系；`zucEncrypt` 本身也不检测篡改。

## 三种长度单位

<ApiTable label="ZUC 长度单位" min-width="66rem">

| 入口/参数 | 单位 | 返回 |
|:--|:--|:--|
| `zucKeystream(key, iv, length)` | byte | 固定小写 Hex，字符数为 `length × 2` |
| `zucKeystreamWords(key, iv, length)` | 32-bit word | 固定小写 Hex，字符数为 `length × 8` |
| `eea3Encrypt(..., bitLength)` | bit | 末字节未使用 bit 清零的 Hex 密文 |
| `eia3(..., bitLength)` | bit | 8 个 Hex 字符的 32-bit MAC-I |

</ApiTable>

不要把 `2 words` 写成 `2 bytes`，也不要把协议中的 `bitLength` 改成缓冲区字节数。

## 密钥流、加解密、EEA3 和 EIA3

<!-- code-sample id="manual-ts-zuc" steps="准备参数|生成密钥流|ZUC 加密|ZUC 解密|EEA3 机密性运算|EEA3 解密|EIA3 完整性校验|篡改断言|非法参数断言" -->
```js
<!-- @include: ../../examples/node/manual-typescript-zuc.mjs#manual-ts-zuc -->
```

### 参数

<ApiTable label="ZUC 与 LTE 参数" min-width="70rem">

| 参数 | 长度/范围 | 说明 |
|:--|:--|:--|
| `key` | 16 字节 | ZUC-128 key；字符串为 32 个 Hex 字符 |
| `iv` | 16 字节 | 普通 ZUC IV；字符串为 32 个 Hex 字符 |
| `count` | 无符号 32-bit 整数 | LTE 帧相关计数值 |
| `bearer` | 0–31 | 5-bit 承载标识 |
| `direction` | `0` 或 `1` | 协议方向位 |
| `message` | UTF-8 字符串或原始字节 | 电信协议通常使用 `Uint8Array` |
| `bitLength` | `0 ≤ bitLength ≤ message.length × 8` | 省略时处理全部字节 |

</ApiTable>

`eea3Encrypt` 已构造 EEA3 所需 IV 并对消息执行机密性运算。只返回 word 对齐密钥流的旧入口不进入新代码，迁移时见[旧系统迁移](/manual/migration.html#旧-eea3-密钥流入口)。

## 普通 ZUC 流的传输字段

使用 `zucEncrypt`/`zucDecryptBytes` 时，至少保存算法版本、key 标识、IV、ciphertext 和编码。key 不能随消息传输。

普通 ZUC 加密不提供认证。若协议未定义独立完整性机制，攻击者可以翻转密文 bit 并使对应明文 bit 翻转。EIA3 是 LTE 协议的 32-bit 完整性算法，不应脱离协议字段直接当作通用业务 MAC。

## EEA3/EIA3 接入检查

- `count`、`bearer`、`direction` 从同一协议上下文取得。
- 发出方和接收方对 bit 顺序、末字节有效 bit 数的解释一致。
- EEA3 负责机密性，EIA3 负责完整性；只做 EEA3 不会检测篡改。
- 比较 MAC-I 时先解码为 4 字节，再使用 `constantTimeEqual`。
- key、COUNT 或方向字段复用规则遵循上层 3GPP 协议，不能由示例自行发明。

完整函数、`ZUC` 类和 `ZUCState` 见 [TypeScript ZUC API](/manual/typescript/api/zuc.html)。
