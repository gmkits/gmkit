---
title: SM2 椭圆曲线公钥密码算法
icon: key
order: 1
author: GMKitX Team
date: 2024-11-22
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

## 📖 概述

SM2 是中国国家密码管理局于 2010 年 12 月 17 日发布的椭圆曲线公钥密码算法，基于 256 位椭圆曲线。SM2 算法包含数字签名、密钥交换和公钥加密等功能，可以替代 RSA、DSA、ECDSA、DH 等国际算法。

### 标准依据

- **GM/T 0003-2012**: SM2 椭圆曲线公钥密码算法
- **GM/T 0009-2023**: SM2 密码算法使用规范（替代 GM/T 0009-2012）

### 主要特性

- ✅ **高安全性**: 基于 256 位椭圆曲线，安全强度高于 RSA-2048
- ✅ **高性能**: 运算速度快，适合移动设备和嵌入式系统
- ✅ **多功能**: 支持加密、签名、密钥交换
- ✅ **标准化**: 符合国家标准，与主流实现兼容

## 🚀 快速开始

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

## 🔐 加密与解密

SM2 支持非对称加密，使用公钥加密、私钥解密。

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

支持多种输出格式：

```typescript
import { sm2Encrypt, OutputFormat } from 'gmkitx';

// 十六进制输出（默认）
const hexCipher = sm2Encrypt(publicKey, plaintext, {
  outputFormat: OutputFormat.HEX
});

// Base64 输出
const base64Cipher = sm2Encrypt(publicKey, plaintext, {
  outputFormat: OutputFormat.BASE64
});
```

## ✍️ 数字签名

SM2 支持数字签名和验签功能，确保数据完整性和来源可信。

### 基本签名

```typescript
import { sm2Sign, sm2Verify } from 'gmkitx';

const { publicKey, privateKey } = generateKeyPair();
const message = '重要消息';

// 签名
const signature = sm2Sign(privateKey, message);

// 验签
const isValid = sm2Verify(publicKey, message, signature);
console.log('签名有效:', isValid);
```

### 带用户 ID 的签名

SM2 签名支持用户标识符（User ID）：

```typescript
import { sm2Sign, sm2Verify, DEFAULT_USER_ID } from 'gmkitx';

const userId = '1234567812345678'; // 自定义用户ID

// 使用自定义用户ID签名
const signature = sm2Sign(privateKey, message, {
  userId: userId
});

// 验签时也需要提供相同的用户ID
const isValid = sm2Verify(publicKey, message, signature, {
  userId: userId
});
```

> **注意**: 如果不指定 userId，将使用默认值 `DEFAULT_USER_ID = '1234567812345678'`

### 签名格式

支持两种签名格式：

```typescript
import { sm2Sign, SignatureFormat } from 'gmkitx';

// DER 格式（默认，ASN.1编码）
const derSig = sm2Sign(privateKey, message, {
  format: SignatureFormat.DER
});

// RAW 格式（r || s，128位十六进制）
const rawSig = sm2Sign(privateKey, message, {
  format: SignatureFormat.RAW
});
```

## 🔄 密钥交换

SM2 支持 ECDH 密钥交换协议，用于在不安全信道上协商共享密钥。

```typescript
import { sm2KeyExchange } from 'gmkitx';

// Alice 和 Bob 各自生成密钥对
const aliceKeyPair = generateKeyPair();
const bobKeyPair = generateKeyPair();

// Alice 使用 Bob 的公钥计算共享密钥
const aliceSharedKey = sm2KeyExchange(
  aliceKeyPair.privateKey,
  bobKeyPair.publicKey
);

// Bob 使用 Alice 的公钥计算共享密钥
const bobSharedKey = sm2KeyExchange(
  bobKeyPair.privateKey,
  aliceKeyPair.publicKey
);

// 双方得到相同的共享密钥
console.log(aliceSharedKey === bobSharedKey); // true
```

## 🎯 面向对象 API

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

## 📋 完整 API 参考

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
| `sm2Sign(privateKey, message, options?)` | SM2 签名 | `string` |
| `sm2Verify(publicKey, message, signature, options?)` | SM2 验签 | `boolean` |

### 密钥交换

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `sm2KeyExchange(privateKey, publicKey)` | SM2 密钥交换 | `string` |

## 🔧 高级用法

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
const signatures = messages.map(msg => sm2Sign(privateKey, msg));

// 批量验签
const results = messages.map((msg, i) => 
  sm2Verify(publicKey, msg, signatures[i])
);
```

## ⚠️ 注意事项

1. **私钥安全**: 私钥必须妥善保管，泄露将导致安全风险
2. **密钥长度**: SM2 私钥固定为 256 位（64 位十六进制）
3. **公钥格式**: 
   - 非压缩格式: 04 开头，130 位十六进制（65 字节）
   - 压缩格式: 02 或 03 开头，66 位十六进制（33 字节）
4. **用户 ID**: 签名时使用的用户 ID 在验签时必须保持一致
5. **密文模式**: 加密和解密时的密文模式必须匹配
6. **编码格式**: 确保输入输出编码格式一致（hex/base64）

## 🔍 常见问题

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

## 📚 相关资源

- [SM2 标准文档](http://www.gmbz.org.cn/main/viewfile/2018011001400692565.html)
- [GM/T 0009-2023 使用规范](http://www.gmbz.org.cn/)
- [椭圆曲线密码学基础](https://en.wikipedia.org/wiki/Elliptic-curve_cryptography)

## 🔗 相关算法

- [SM3 - 密码杂凑算法](./SM3.md)
- [SM4 - 分组密码算法](./SM4.md)
