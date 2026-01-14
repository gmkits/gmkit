---
title: SM2 椭圆曲线公钥密码算法
icon: key
order: 1
author: mumu
date: 2025-11-23
category:
  - 国密算法
  - 椭圆曲线密码
tag:
  - SM2
  - 公钥加密
  - 数字签名
  - 密钥交换
---

# SM2 椭圆曲线公钥密码算法

## 概述

SM2 是中国国家密码管理局于 2010 年 12 月 17 日发布的椭圆曲线公钥密码算法，基于 256 位椭圆曲线。SM2 算法包含数字签名、密钥交换和公钥加密等功能，可以替代 RSA、DSA、ECDSA、DH 等国际算法。

### 标准依据

- **GM/T 0003-2012**: SM2 椭圆曲线公钥密码算法
- **GM/T 0009-2023**: SM2 密码算法使用规范（替代 GM/T 0009-2012）

### 主要特性

- **高安全性**: 基于 256 位椭圆曲线，安全强度相当于 RSA-3072
- **运算效率**: 相比 RSA，密钥更短、签名验签更快
- **多功能**: 支持加密、签名、密钥交换三大功能
- **标准化**: 符合国家标准，与主流实现兼容

### 性能与安全权衡

SM2 作为椭圆曲线密码算法，相比 RSA 有以下特点：
- **密钥长度**: SM2 256 位可提供与 RSA 3072 位相当的安全强度
- **运算速度**: 签名和验签速度通常优于 RSA，但具体性能取决于实现和硬件支持
- **加密效率**: 适合加密小数据量（如会话密钥），大数据建议使用对称加密
- **安全代价**: 所有非对称加密操作都比对称加密慢得多，这是保障安全的必要成本

::: tip 使用建议
在实际应用中，通常使用 SM2 加密对称密钥，再用对称算法（如 SM4）加密大量数据，这样既保证了安全性，又兼顾了性能。
:::

## 快速开始

### 密钥对生成

```typescript
import { generateKeyPair } from 'gmkitx';

// 生成非压缩格式密钥对（默认）
const { publicKey, privateKey } = generateKeyPair();
console.log('公钥:', publicKey);   // 130位十六进制字符串，04开头
console.log('私钥:', privateKey);  // 64位十六进制字符串

// 生成压缩格式密钥对
const compressed = generateKeyPair(true);
console.log('压缩公钥:', compressed.publicKey);  // 66位十六进制字符串，02或03开头
```

### 从私钥导出公钥

```typescript
import { getPublicKeyFromPrivateKey } from 'gmkitx';

const privateKey = '228049e009de869baf9aba74f8f8c52e09cde1b52cafb0df7ab154ba4593743e';

// 导出非压缩公钥
const publicKey = getPublicKeyFromPrivateKey(privateKey);

// 导出压缩公钥
const compressedPubKey = getPublicKeyFromPrivateKey(privateKey, true);
```

### 公钥压缩与解压

```typescript
import { compressPublicKey, decompressPublicKey } from 'gmkitx';

// 压缩公钥（130位 -> 66位）
const compressed = compressPublicKey(publicKey);

// 解压公钥（66位 -> 130位）
const uncompressed = decompressPublicKey(compressed);
```

## 加密与解密

SM2 支持非对称加密，使用公钥加密、私钥解密。

> 文本默认按 UTF-8 处理；如需加密二进制数据，请传入 `Uint8Array`。

### 基本用法

```typescript
import { sm2Encrypt, sm2Decrypt } from 'gmkitx';

const { publicKey, privateKey } = generateKeyPair();

// 加密
const plaintext = 'Hello, SM2!';
const ciphertext = sm2Encrypt(publicKey, plaintext);

// 解密
const decrypted = sm2Decrypt(privateKey, ciphertext);
console.log(decrypted === plaintext); // true
```

### 密文模式

SM2 支持两种密文排列模式：

- **C1C3C2** (推荐，默认): C1 || C3 || C2
- **C1C2C3**: C1 || C2 || C3

其中：
- C1: 椭圆曲线点（65字节）
- C2: 密文数据（与明文等长）
- C3: 哈希值（32字节，SM3摘要）

```typescript
import { sm2Encrypt, SM2CipherMode } from 'gmkitx';

// 使用 C1C3C2 模式（默认）
const cipher1 = sm2Encrypt(publicKey, plaintext, {
  mode: SM2CipherMode.C1C3C2
});

// 使用 C1C2C3 模式
const cipher2 = sm2Encrypt(publicKey, plaintext, {
  mode: SM2CipherMode.C1C2C3
});
```

### 输出格式

支持十六进制与 Base64 输出，解密端可自动识别输入格式：

```typescript
import { sm2Encrypt, sm2Decrypt, OutputFormat } from 'gmkitx';

// 十六进制输出（默认）
const hexCipher = sm2Encrypt(publicKey, plaintext, {
  outputFormat: OutputFormat.HEX
});

// Base64 输出
const base64Cipher = sm2Encrypt(publicKey, plaintext, {
  outputFormat: OutputFormat.BASE64
});

// 解密时自动检测 hex/base64
const plain1 = sm2Decrypt(privateKey, hexCipher);
const plain2 = sm2Decrypt(privateKey, base64Cipher);
```

## 数字签名

SM2 支持数字签名和验签功能，确保数据完整性和来源可信。

### 基本签名

```typescript
import { sign, verify } from 'gmkitx';

const { publicKey, privateKey } = generateKeyPair();
const message = '重要消息';

// 签名
const signature = sign(privateKey, message);

// 验签
const isValid = verify(publicKey, message, signature);
console.log('签名有效:', isValid);
```

> 签名/验签同样默认将字符串按 UTF-8 处理；二进制消息请使用 `Uint8Array`。

### 带用户 ID 的签名

SM2 签名支持用户标识符（User ID）。GM/T 0009-2023 推荐使用空字符串，GMKitX 为向后兼容保留默认值：

```typescript
import { sign, verify, DEFAULT_USER_ID } from 'gmkitx';

const userId = '1234567812345678'; // 自定义用户 ID

// 使用自定义 userId 签名
const signature = sign(privateKey, message, {
  userId
});

// 验签时也必须提供相同的 userId
const isValid = verify(publicKey, message, signature, {
  userId
});
```

> **注意**: 如果不指定 userId，将使用默认值 `DEFAULT_USER_ID = '1234567812345678'`。如需严格对齐 GM/T 0009-2023，请显式传入 `userId: ''`。

### 签名格式

支持 DER 与 Raw 两种签名格式（默认 Raw）：

```typescript
import { sign, verify } from 'gmkitx';

// DER 格式（ASN.1 编码）
const derSig = sign(privateKey, message, { der: true });

// Raw 格式（r || s，128 位十六进制）
const rawSig = sign(privateKey, message, { der: false });

// 验签会自动尝试识别 DER；如需明确指定：
const ok = verify(publicKey, message, derSig, { der: true });
```

## 密钥交换

SM2 密钥交换遵循 GM/T 0003.3/GM/T 0009 协议，包含长期密钥 + 临时密钥，支持相互认证与前向保密。

```typescript
import { generateKeyPair, keyExchange } from 'gmkitx';

// A/B 长期密钥对
const alice = generateKeyPair();
const bob = generateKeyPair();

// A/B 临时密钥对
const aliceTemp = generateKeyPair();
const bobTemp = generateKeyPair();

// A 先把临时公钥发给 B
const aliceTempPub = aliceTemp.publicKey;
const bobTempPub = bobTemp.publicKey;

// B 计算共享密钥，并返回自己的临时公钥
const resultB = keyExchange({
  privateKey: bob.privateKey,
  publicKey: bob.publicKey,
  tempPrivateKey: bobTemp.privateKey,
  peerPublicKey: alice.publicKey,
  peerTempPublicKey: aliceTempPub,
  isInitiator: false
});

// A 收到 B 的临时公钥后，完成协商
const resultA = keyExchange({
  privateKey: alice.privateKey,
  publicKey: alice.publicKey,
  tempPrivateKey: aliceTemp.privateKey,
  peerPublicKey: bob.publicKey,
  peerTempPublicKey: resultB.tempPublicKey,
  isInitiator: true
});

console.log(resultA.sharedKey === resultB.sharedKey); // true
```

## 面向对象 API

除了函数式 API，gmkitx 还提供了面向对象的 API：

```typescript
import { SM2 } from 'gmkitx';

// 从私钥创建实例
const sm2 = SM2.fromPrivateKey(privateKey);

// 加密
const ciphertext = sm2.encrypt('Hello, SM2!');

// 解密
const plaintext = sm2.decrypt(ciphertext);

// 签名
const signature = sm2.sign('Message');

// 验签
const isValid = sm2.verify('Message', signature);

// 获取公钥
const publicKey = sm2.getPublicKey();
```

## 完整 API 参考

### 密钥管理

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `generateKeyPair(compressed?: boolean)` | 生成 SM2 密钥对 | `KeyPair` |
| `getPublicKeyFromPrivateKey(privateKey, compressed?)` | 从私钥导出公钥 | `string` |
| `compressPublicKey(publicKey)` | 压缩公钥 | `string` |
| `decompressPublicKey(publicKey)` | 解压公钥 | `string` |

### 加密解密

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `sm2Encrypt(publicKey, plaintext, options?)` | SM2 加密 | `string` |
| `sm2Decrypt(privateKey, ciphertext, options?)` | SM2 解密 | `string` |

### 签名验签

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `sign(privateKey, message, options?)` | SM2 签名 | `string` |
| `verify(publicKey, message, signature, options?)` | SM2 验签 | `boolean` |

### 密钥交换

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `keyExchange(params)` | SM2 密钥交换 | `SM2KeyExchangeResult` |

## 高级用法

### 自定义曲线参数

虽然通常使用标准 SM2 曲线，但也支持自定义曲线参数：

```typescript
import { SM2 } from 'gmkitx';

const customParams = {
  p: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF',
  a: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC',
  b: '28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93',
  Gx: '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7',
  Gy: 'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0',
  n: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123'
};

// 使用自定义曲线参数（不推荐，除非有特殊需求）
```

### 批量操作

```typescript
// 批量生成密钥对
const keyPairs = Array.from({ length: 10 }, () => generateKeyPair());

// 批量签名
const signatures = messages.map(msg => sign(privateKey, msg));

// 批量验签
const results = messages.map((msg, i) => 
  verify(publicKey, msg, signatures[i])
);
```

## 注意事项

1. **私钥安全**: 私钥必须妥善保管，泄露将导致安全风险
2. **密钥长度**: SM2 私钥固定为 256 位（64 位十六进制）
3. **公钥格式**: 
   - 非压缩格式: 04 开头，130 位十六进制（65 字节）
   - 压缩格式: 02 或 03 开头，66 位十六进制（33 字节）
4. **用户 ID**: 签名/验签必须使用相同 userId；GM/T 0009-2023 推荐 `''`，库默认仍为 `DEFAULT_USER_ID`
5. **密文模式**: C1C3C2 与 C1C2C3 必须一致；必要时显式指定模式
6. **编码格式**: 输出为 hex/base64，解密端需匹配或使用自动识别
7. **ASN.1 密文**: 如密文以 `0x30` 开头，按 ASN.1 解析；与 Java/OpenSSL 互操作时常见
8. **签名输入**: 默认会计算 `SM3(Z || M)`，不要自行先哈希；如需签名哈希，请使用 `skipZComputation`
9. **大数据**: SM2 适合加密小数据；大数据请走 SM4 + SM2 混合加密

## 常见问题

### Q: SM2 和 RSA 有什么区别？

A: SM2 是基于椭圆曲线的算法，相比 RSA：
- 更短的密钥长度（256位 vs 2048位）
- 更快的运算速度
- 更少的存储和带宽需求
- 安全强度相当或更高

### Q: 如何选择密文模式？

A: 推荐使用 **C1C3C2** 模式（默认），这是 GM/T 0009-2023 标准推荐的模式。C1C2C3 模式主要用于兼容旧系统。

### Q: 公钥压缩有什么好处？

A: 压缩公钥可以节省存储空间和传输带宽（从 65 字节减少到 33 字节），但需要额外的计算来解压。对于存储和传输敏感的场景推荐使用。

### Q: 可以在浏览器中使用吗？

A: 是的，gmkitx 完全支持现代浏览器环境，不需要任何 polyfill。

## 相关资源

- [SM2 标准文档](http://www.gmbz.org.cn/main/viewfile/2018011001400692565.html)
- [GM/T 0009-2023 使用规范](http://www.gmbz.org.cn/)
- [椭圆曲线密码学基础](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography)

## 相关算法

- [SM3 - 密码杂凑算法](./SM3.md)
- [SM4 - 分组密码算法](./SM4.md)
