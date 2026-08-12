---
title: Java SM3 使用手册
description: 使用 GMKit Java 0.10.1 完成 SM3 摘要、HMAC、固定向量和 Charset 处理。
pageInfo: false
contributors: false
editLink: false
icon: fingerprint
category: [使用手册, Java]
tag: [SM3, HMAC, UTF-8]
---

# Java SM3 使用手册

使用 `SM3Util` 完成一次性摘要和 HMAC。摘要是公开内容指纹；HMAC 使用共享 key 认证消息。需要非对称身份认证时使用 SM2 签名。

## 摘要与 HMAC

<!-- code-sample id="manual-java-sm3" steps="准备参数|计算 SM3 摘要|比对文本与字节|计算 HMAC-SM3|HMAC 成功断言|篡改断言|非法输入断言" -->
```java
<!-- @include: ../../../../packages/java/gmkit/src/test/java/cn/gmkit/ManualJavaSm3Test.java#manual-java-sm3 -->
```

## 重载选择

<ApiTable label="SM3Util 输入输出" min-width="70rem">

| 需求 | 入口 | 字符集/编码 |
|:--|:--|:--|
| 任意二进制摘要 | `digest(byte[])` | 不做文本转换 |
| UTF-8 文本摘要 | `digest(String)` | 固定 UTF-8 |
| 指定文本编码 | `digest(String, Charset)` | 由调用方明确传入 |
| Hex/Base64 摘要 | `digestHex` / `digestBase64` | 输出编码明确 |
| HMAC 原始字节 | `hmac(byte[] key, ...)` | key 始终是原始字节 |
| HMAC Hex/Base64 | `hmacHex` / `hmacBase64` | 只改变输出表示 |

</ApiTable>

协议给出的 HMAC key 若是 Hex，先用 `HexCodec.decodeStrict` 得到字节。把 Hex 文本直接 `getBytes(UTF_8)` 会使用字符 `0`、`1` 的编码，结果与协议 key 不同。

## 验证 HMAC

接收端使用相同 key、相同消息字节和相同算法重新计算 HMAC，再调用 `Bytes.constantTimeEquals` 比较 `byte[]`。长度不同或内容不同返回 `false`。

HMAC 校验失败后拒绝消息。不要把普通 SM3 摘要当作 HMAC，也不要把 HMAC 当作密码存储算法。

## 状态与错误

Java 的 `SM3` 和 `SM3Util` 都是一次性无状态入口，没有 TypeScript 增量类的 `update/reset` 语义。大流的分块摘要需要调用 BC 流式接口或在应用层选择已有流式封装，本版本不要伪造不存在的 GMKit 增量 API。

`null` 输入、非法编码和底层摘要初始化问题抛 `GmkitException`。空 `byte[]` 是合法消息，可得到 SM3 空消息摘要。

全部 String、byte[]、Charset、Hex 和 Base64 重载见 [Java SM3 API](/manual/java/api/sm3.html)。
