---
title: Java 与 TypeScript 跨语言接入
description: 固定 GMKit 0.10.1 双语言协议中的消息字节、SM2、SM4-GCM、编码和版本字段。
pageInfo: false
contributors: false
editLink: false
icon: arrows-left-right
category: [使用手册, 互操作]
tag: [Java, TypeScript, 协议]
---

# Java 与 TypeScript 跨语言接入

跨语言问题通常不是算法不同，而是两端对字符串、签名结构、密文排列或外层编码的解释不同。本章固定一套可落库的协议；TypeScript 和 Java 都不依赖自动识别或省略默认值。

## 统一业务数据

```text
message:     order=GMKIT-DEMO-0001&amount=88.00
tampered:    order=GMKIT-DEMO-0001&amount=99.00
userId:      merchant@gmkit.cn
recipientId: warehouse@gmkit.cn
aad:         tenant=demo;schema=1
binary:      00 ff 80 41
```

所有文本先按 UTF-8 得到字节。标准向量继续使用标准原始输入，例如 SM3 的 `abc`，不替换为业务文本。

## 协议总表

<ApiTable label="跨语言协议字段" min-width="74rem">

| 项目 | 固定值 | TypeScript | Java |
|:--|:--|:--|:--|
| 文本 | UTF-8 | `string` 或 `stringToBytes` | `StandardCharsets.UTF_8` / `Texts.bytes` |
| 二进制外层 | Base64 | `OutputFormat.BASE64` / `InputFormat.BASE64` | `Base64Codec.encode/decode` |
| key、IV、nonce 字符串 | 明确 Hex | 对应参数使用 Hex 字符串 | `HexCodec.decodeStrict` 后传 `byte[]` |
| SM2 签名 | `SM3(Z || M)`、非空 ID、DER、Base64 | `signatureFormat: 'der'` | `SM2SignatureFormat.DER` |
| SM2 密文 | C1C3C2、Base64 | `SM2CipherMode.C1C3C2` | `SM2CipherMode.C1C3C2` |
| SM4-GCM | 12-byte nonce、AAD、16-byte tag | ciphertext/tag Base64 | ciphertext/tag Base64 |
| schema | 整数 `1` | 只接受已实现版本 | 只接受已实现版本 |

</ApiTable>

## 消息签名对象

签名对象不签 JSON 文本，而是签明确的 `message` UTF-8 字节。若业务必须签 JSON，应先独立制定 JSON 规范化规则；普通对象序列化的字段顺序和空白不能作为签名协议。

```json
{
  "schema": 1,
  "algorithm": "SM2-SM3",
  "messageEncoding": "utf-8",
  "userId": "merchant@gmkit.cn",
  "signatureFormat": "der",
  "signatureEncoding": "base64",
  "signature": "..."
}
```

发送端：

1. 对 `message` 的 UTF-8 字节执行标准 SM2 签名。
2. `userId` 使用非空 UTF-8 文本 `merchant@gmkit.cn`。
3. 签名结构输出 DER，再以 Base64 写入字段。

接收端：

1. 拒绝未知 `schema`、算法、签名结构或编码。
2. Base64 解码得到 DER 字节。
3. 使用同一个 `userId` 和原始消息字节验签。
4. 验签为 `false` 时拒绝消息，不回退到 RAW、其他 ID 或 no-Z。

可执行调用见 [TypeScript SM2 手册](/manual/typescript/sm2.html#签名、验签、加密和解密) 和 [Java SM2 手册](/manual/java/sm2.html#完整流程)。

## SM2 加密对象

SM2 只用于小体积数据或会话 key：

```json
{
  "schema": 1,
  "algorithm": "SM2",
  "cipherMode": "C1C3C2",
  "ciphertextEncoding": "base64",
  "ciphertext": "..."
}
```

接收端固定按 C1C3C2 和 Base64 解码。解密失败时不尝试 C1C2C3；需要读取历史排列的系统应先在 schema 中显式区分，迁移方法见[旧系统迁移](/manual/migration.html#密文和签名自动识别)。

## SM4-GCM 认证加密对象

```json
{
  "schema": 1,
  "algorithm": "SM4-GCM",
  "keyId": "tenant-demo-sm4-2026-01",
  "nonceHex": "000102030405060708090a0b",
  "aadEncoding": "utf-8",
  "aad": "tenant=demo;schema=1",
  "ciphertextEncoding": "base64",
  "ciphertext": "...",
  "tagEncoding": "base64",
  "tag": "...",
  "tagLengthBytes": 16
}
```

key 本身不进入载荷，只保存 `keyId`。固定 nonce 只用于测试；生产端在同一 key 下为每条消息分配从未使用过的 12 字节 nonce。

AAD 的字节内容必须一致。示例 AAD 字段顺序固定为 `tenant=demo;schema=1`；改成 `schema=1;tenant=demo` 虽然语义相似，但认证一定失败。

可执行调用见 [TypeScript SM4 手册](/manual/typescript/sm4.html#sm4-gcm-文本和二进制) 和 [Java SM4 手册](/manual/java/sm4.html#sm4-gcm-完整流程)。

## ZUC/EEA3/EIA3 字段

只有电信协议要求时定义这些字段：

```json
{
  "schema": 1,
  "algorithm": "EEA3+EIA3",
  "count": 965368244,
  "bearer": 21,
  "direction": 1,
  "bitLength": 296,
  "ciphertextEncoding": "base64",
  "ciphertext": "...",
  "macIHex": "........"
}
```

`bitLength` 是有效 bit 数，不是 Base64 字符数或 byte 数。两端使用相同 COUNT、BEARER、DIRECTION 和 bit 顺序。详细边界见 [TypeScript ZUC 手册](/manual/typescript/zuc.html) 与 [Java ZUC 手册](/manual/java/zuc.html)。

## 错误处理

<ApiTable label="跨语言失败处理" min-width="72rem">

| 失败 | 接收端行为 | 禁止的回退 |
|:--|:--|:--|
| schema 未知 | 拒绝消息 | 按最新已知字段猜测 |
| Base64/Hex 非法 | 返回输入格式错误 | 自动尝试另一编码 |
| SM2 验签失败 | 拒绝签名 | 更换 userId、RAW/DER 或 no-Z 重试 |
| SM2 解密失败 | 拒绝密文 | 自动改用 C1C2C3 |
| GCM 认证失败 | 丢弃全部输出 | 忽略 tag 或返回部分明文 |
| EIA3 不匹配 | 拒绝协议消息 | 只保留 EEA3 解密结果 |

</ApiTable>

## 上线前双向矩阵

至少覆盖以下四组：

- TypeScript 产生，Java 验签/解密。
- Java 产生，TypeScript 验签/解密。
- 两端分别修改消息、userId、AAD、tag 后必须失败。
- 两端拒绝未知 schema、错误编码和超出长度的输入。

仓库共享向量由 `vectors/interop-vectors.json` 驱动 TypeScript 与 Java 测试；标准与第三方证据见[互操作向量](/standards/interop-vectors.html)。
