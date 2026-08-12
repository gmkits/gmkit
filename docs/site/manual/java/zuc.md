---
title: Java ZUC 使用手册
description: 使用 GMKit Java 0.10.1 完成 ZUC-128 密钥流、流加解密、EEA3 和 EIA3。
pageInfo: false
contributors: false
editLink: false
icon: signal
category: [使用手册, Java]
tag: [ZUC, EEA3, EIA3]
---

# Java ZUC 使用手册

只有协议明确要求 ZUC-128、EEA3 或 EIA3 时使用本章。普通业务认证加密使用 SM4-GCM。

## 完整流程

<!-- code-sample id="manual-java-zuc" steps="准备参数|生成密钥流|ZUC 加密|ZUC 解密|EEA3 机密性运算|EEA3 解密|EIA3 完整性校验|篡改断言|非法参数断言" -->
```java
<!-- @include: ../../../../packages/java/gmkit/src/test/java/cn/gmkit/ManualJavaZucTest.java#manual-java-zuc -->
```

## 长度单位

<ApiTable label="Java ZUC 长度单位" min-width="68rem">

| 入口 | 长度参数 | 返回 |
|:--|:--|:--|
| `keystream` / `keystreamHex` | byte 数 | `byte[]` / 小写 Hex |
| `keystreamWords` / `keystreamWordsHex` | 32-bit word 数 | `int[]` / 小写 Hex |
| `eea3Encrypt(..., bitLength)` | 有效 bit 数 | 末字节无效低位清零的 `byte[]` |
| `eia3(..., bitLength)` | 参与认证的 bit 数 | 8 个 Hex 字符的 MAC-I |

</ApiTable>

Java `int` 是有符号类型，但 `keystreamWords` 中每个元素按无符号 32-bit word 解释。需要传输时用 `keystreamWordsHex`，不要把负数十进制字符串当协议值。

## LTE 参数

<ApiTable label="EEA3/EIA3 参数" min-width="68rem">

| 参数 | 边界 | 失败 |
|:--|:--|:--|
| key | 16 字节或 32 个 Hex 字符 | `GmkitException` |
| `count` | 32-bit bit pattern，Java 使用 `int` | 由上层协议管理递增/复用 |
| `bearer` | 0–31 | 越界抛错 |
| `direction` | 0 或 1 | 其他值抛错 |
| `message` | 非 null `byte[]` | null 抛错 |
| `bitLength` | 0 到 `message.length × 8` | 越界抛错 |

</ApiTable>

EEA3 只保护机密性，EIA3 提供 32-bit 完整性标签。只执行 EEA3 不会检测密文翻转。EIA3 是协议算法，不作为通用业务 HMAC 替代品。

已发布版本另有一个只返回 word 对齐密钥流的兼容入口。新调用对消息使用 `eea3Encrypt(...)`；旧入口签名和迁移判断见[旧系统迁移](/manual/migration.html#旧-eea3-密钥流入口)。

## 普通 ZUC 流

普通 `ZUC.encrypt/decrypt` 是对称异或运算。相同 key/IV 复用会泄漏消息关系，且没有认证 tag。协议必须另行规定 IV 唯一性和完整性机制。

全部静态方法、String 便利重载和参数约束见 [Java ZUC API](/manual/java/api/zuc.html)。
