---
title: SM2 椭圆曲线公钥密码算法
description: 说明 SM2 的身份摘要 Z、签名语义、密文格式、密钥交换和双语言协议差异。
icon: key
order: 1
category: [算法]
tag: [SM2, 加密, 签名, 密钥交换]
---

# SM2 椭圆曲线公钥密码算法

SM2 同时覆盖签名、公钥加密和密钥交换。GMKit 的 Java 与 TypeScript 包固定使用标准 SM2 曲线；算法名称相同并不代表身份、签名格式、密文排列或长度单位可以省略。

<div class="doc-path-grid doc-path-grid-compact">
  <a class="doc-path-card" href="/manual/typescript/api/sm2.html">
    <span class="doc-path-label">gmkitx</span>
    <strong>TypeScript SM2 API</strong>
    <small>函数、选项、SM2 类、返回值、失败断言和密钥交换案例。</small>
  </a>
  <a class="doc-path-card" href="/manual/java/api/sm2.html">
    <span class="doc-path-label">cn.gmkit:gmkit</span>
    <strong>Java SM2 API</strong>
    <small>实例与静态入口、全部重载、Builder、格式工具和互操作测试。</small>
  </a>
</div>

## 协议必须固定的字段

<ApiTable label="SM2 跨语言协议字段" min-width="70rem">

| 字段 | 当前选择范围 | 未固定时的结果 |
|:--|:--|:--|
| 用户标识 | 非空 UTF-8 `userId`；默认 `1234567812345678` | 双方计算出不同 Z，验签返回 false |
| 签名结构 | 64 字节 raw `r \|\| s` 或 canonical DER | 同一签名会因解析方式不同而失败 |
| 签名外层编码 | 原始字节、Hex 或 Base64 | 把 Base64 当 Hex 会在数学验签前失败 |
| 密文排列 | C1C3C2 或 C1C2C3 | C2/C3 位置错误，解密或完整性校验失败 |
| 公钥点编码 | 65 字节非压缩点或 33 字节压缩点 | 不支持该点格式的对端无法导入公钥 |
| 文本编码 | UTF-8，二进制直接传字节 | 消息字节不同，签名、密文和 KDF 结果不同 |
| 协议版本 | 在载荷或外层消息中记录 | 无法安全区分旧 no-Z 数据与标准数据 |

</ApiTable>

私钥是 1 到曲线阶减 1 的标量，通常表示为 32 字节或 64 个 Hex 字符。非压缩公钥为 `04 || x || y`，压缩公钥为 `02/03 || x`。公钥压缩只改变点编码，不改变密钥本身。

## 签名中的 Z 不能省略

标准 SM2 签名先计算：

```text
Z = SM3(ENTL || ID || a || b || xG || yG || xA || yA)
e = SM3(Z || M)
```

`ID`、消息字节和公钥都会进入最终摘要。默认身份只是兼容值，不应代替业务协议中的身份定义。

<ApiTable label="SM2 三种签名输入语义" min-width="68rem">

| 路径 | e 的来源 | 协议定位 | 互操作边界 |
|:--|:--|:--|:--|
| 标准 SM2 | `SM3(Z || M)` | 默认且推荐 | GMKit Java、GMKit TypeScript 与 BC 标准路径可互验 |
| 旧 no-Z 兼容 | `SM3(M)` | 仅迁移已存在的非标准协议 | 只有双方显式采用同一旧语义时才可能成功；BC 标准验签应失败 |
| 预计算 e | 调用方直接传入 32 字节摘要 | 高级协议入口 | 调用方负责 Z、消息规范化和摘要来源；不能与 no-Z 混为一类 |

</ApiTable>

TypeScript 的 `skipZComputation`，以及 Java 的同名 Builder 选项、`signWithoutZ`、`verifyWithoutZ`、`computeEWithoutZ` 均为弃用的旧协议兼容入口。Bouncy Castle 1.83 的 `SM2Signer` 没有公开的跳过 Z 选项；no-Z 签名不是性能优化，也不是“另一种标准模式”。

当前版本中，省略 `userId` 或传空字符串都会回落到默认身份。Java `GM_2023_USER_ID` 的值为空字符串，因此会被 Builder 同样映射到旧默认身份，不能表示独立的空 ID，现已标记弃用。

## 加密载荷

SM2 加密含随机临时标量，相同公钥和明文每次应产生不同密文。接收方至少需要知道密文排列和外层编码；原始密文还必须包含合法 C1 点、32 字节 C3 和非空 C2。

<ApiTable label="SM2 加密双语言差异" min-width="66rem">

| 项目 | TypeScript | Java | 跨语言建议 |
|:--|:--|:--|:--|
| 默认排列 | 加密 C1C3C2；未指定解密时会尝试兼容排列 | C1C3C2 | 协议仍显式写 C1C3C2，不依赖试错 |
| 字符串输出 | 默认 Hex，可选 Base64 | 通过 `encryptHex` / `encryptBase64` 明确选择 | schema 固定一个编码 |
| 二进制解密 | `sm2DecryptBytes` | `decrypt` 返回 `byte[]` | 任意二进制不要经过 UTF-8 文本入口 |
| DER 密文 | 可识别 canonical DER 输入 | `SM2Ciphertexts` 负责转换与解析 | 明确标记 raw 或 DER，不按首字节长期猜测 |

</ApiTable>

C3 不匹配、点编码无效、DER 非最短编码或尾随数据都属于失败，不能返回部分明文。SM2 不适合直接加密大文件；常见做法是用认证加密处理业务载荷，再由 SM2 保护随机会话密钥。

## 密钥交换不是普通 ECDH

双方都需要静态密钥、临时密钥、身份和角色，并应校验确认标签。派生长度的单位是两端最容易写错的差异：

<ApiTable label="SM2 密钥交换协议字段" min-width="66rem">

| 字段 | TypeScript | Java | 协议要求 |
|:--|:--|:--|:--|
| 派生长度 | `keyLength`，单位 byte，默认 16 | `keyBits`，单位 bit，默认 128 | 例如 32 字节应分别传 32 与 256 |
| 角色 | `isInitiator` | `initiator` | 两端角色必须相反且固定 |
| 身份 | `userId`、`peerUserId` | `selfId`、`peerId` | 固定 UTF-8 字节与双方顺序 |
| 确认 | 返回 `s1`、`s2` | 返回 `s1`、`s2`，另有响应方确认入口 | 规定标签方向、编码和校验时机 |

</ApiTable>

## 验收重点

- 标准 GMKit 签名可由 BC 1.83 验证，BC 标准签名也可由 GMKit 验证。
- 同一消息使用不同身份时必须验签失败。
- no-Z 签名只能在 GMKit 同配置旧路径下成功，BC 标准验签必须失败。
- 修改消息、签名、密文 C3 或公钥点后必须失败。
- 固定向量用于验证确定性字段；随机签名和随机密文只检查互操作与篡改拒绝，不比较完整字面值。

## 验证依据

- [GM/T 0009 实现边界](/standards/GMT-0009-COMPLIANCE)
- [GM/T 0009 快速参考](/standards/GMT-0009-快速参考)
- [共享互操作向量](/standards/interop-vectors)
- [TypeScript SM2 API 的可执行案例](/manual/typescript/api/sm2.html#可执行案例)
- [Java SM2 API 的 BC 互操作与 no-z 边界](/manual/java/api/sm2.html#标准-z、旧-no-z-与预计算-e)
