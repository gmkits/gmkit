---
title: 国际标准算法使用指南
icon: globe
order: 8
author: mumu
date: 2025-11-23
category:
  - 开发指南
  - 国际算法
tag:
  - SHA
  - AES
  - RSA
  - 国际标准
---

# 国际标准算法使用指南

## 概述

GMKit 除了提供中国国密算法（SM2, SM3, SM4, ZUC）外，还支持国际标准的哈希算法（SHA-256, SHA-384, SHA-512, SHA-1），并为**所有算法**提供灵活的编码格式选项（hex 和 base64）。

## 输出格式配置

### 为什么需要多种输出格式？

- **Hex（十六进制）**：传统的加密库输出格式，易于阅读和调试，与其他密码学工具兼容性好
- **Base64**：更紧凑的表示方式，占用空间小 25%，特别适合网络传输和 JSON 序列化

### 统一的 API 设计

GMKit 采用参数配置方式而非函数名后缀方式，原因如下：

1. **API 简洁性**：避免函数名爆炸（如 `sm3Hex`, `sm3Base64` 等）
2. **向后兼容**：默认使用 hex 格式，保持与现有代码的兼容性
3. **类型安全**：使用 TypeScript 枚举提供编译时类型检查
4. **一致性**：函数式 API 和面向对象 API 都使用相同的配置方式

### 支持的算法

**所有算法都支持输出格式配置：**
- ✅ SM3 哈希算法
- ✅ SM4 分组密码算法
- ✅ SM2 椭圆曲线密码算法
- ✅ ZUC 流密码算法
- ✅ SHA 系列哈希算法（SHA-256/384/512/1）

**解密函数自动检测输入格式**：所有解密函数都能自动识别 hex 或 base64 格式的密文。

### 使用示例

#### SM3 哈希算法

```typescript
import { digest, hmac, OutputFormat } from 'gmkitx';

// 十六进制格式（默认）
const hexHash = digest('Hello, World!');
console.log(hexHash); // SM3 哈希值的十六进制表示（64 个字符）

// Base64 格式
const base64Hash = digest('Hello, World!', { outputFormat: OutputFormat.BASE64 });
console.log(base64Hash); // SM3 哈希值的 Base64 表示

// HMAC 也支持输出格式配置
const hexMac = hmac('key', 'data');
const base64Mac = hmac('key', 'data', { outputFormat: OutputFormat.BASE64 });
```

#### 面向对象 API

```typescript
import { SM3, OutputFormat } from 'gmkitx';

// 在构造时指定输出格式
const sm3 = new SM3(OutputFormat.BASE64);
sm3.update('Hello, ').update('World!');
const hash = sm3.digest();
console.log(hash); // Base64 格式

// 动态修改输出格式
sm3.setOutputFormat(OutputFormat.HEX);
sm3.update('test');
const hexHash = sm3.digest(); // Hex 格式

// 静态方法也支持
const hash2 = SM3.digest('test', { outputFormat: OutputFormat.BASE64 });
```

#### SM4 分组密码算法

```typescript
import { sm4Encrypt, sm4Decrypt, OutputFormat, CipherMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const plaintext = 'Hello, SM4!';

// 十六进制格式（默认）
const hexEncrypted = sm4Encrypt(key, plaintext);

// Base64 格式
const base64Encrypted = sm4Encrypt(key, plaintext, {
  outputFormat: OutputFormat.BASE64
});

// 解密时自动检测格式
const decrypted1 = sm4Decrypt(key, hexEncrypted);
const decrypted2 = sm4Decrypt(key, base64Encrypted);

// CBC 模式 with Base64
const iv = 'fedcba98765432100123456789abcdef';
const encrypted = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  iv,
  outputFormat: OutputFormat.BASE64
});
const decrypted = sm4Decrypt(key, encrypted, {
  mode: CipherMode.CBC,
  iv
});
```

**注意：PKCS7 填充与 Java PKCS5 的关系**

JavaScript 中的 PKCS7 填充等同于 Java 中的 PKCS5Padding：
- PKCS5 是 PKCS7 针对 8 字节块的特例
- 对于 16 字节块的算法（如 SM4、AES），只能使用 PKCS7
- 在与 Java 后端对接时，JavaScript 的 `PKCS7` 对应 Java 的 `PKCS5Padding`

#### SM2 椭圆曲线密码算法

```typescript
import { generateKeyPair, sm2Encrypt, sm2Decrypt, OutputFormat } from 'gmkitx';

const keyPair = generateKeyPair();
const plaintext = 'Hello, SM2!';

// 十六进制格式（默认）
const hexEncrypted = sm2Encrypt(keyPair.publicKey, plaintext);

// Base64 格式
const base64Encrypted = sm2Encrypt(keyPair.publicKey, plaintext, {
  outputFormat: OutputFormat.BASE64
});

// 解密时自动检测格式
const decrypted1 = sm2Decrypt(keyPair.privateKey, hexEncrypted);
const decrypted2 = sm2Decrypt(keyPair.privateKey, base64Encrypted);

// 向后兼容：仍支持旧的字符串模式参数
const encrypted = sm2Encrypt(keyPair.publicKey, plaintext, 'C1C3C2');
```

#### ZUC 流密码算法

```typescript
import { zucEncrypt, zucDecrypt, OutputFormat } from 'gmkitx';

const key = '00000000000000000000000000000000';
const iv = '00000000000000000000000000000000';
const plaintext = 'Hello, ZUC!';

// 十六进制格式（默认）
const hexEncrypted = zucEncrypt(key, iv, plaintext);

// Base64 格式
const base64Encrypted = zucEncrypt(key, iv, plaintext, {
  outputFormat: OutputFormat.BASE64
});

// 解密时自动检测格式
const decrypted1 = zucDecrypt(key, iv, hexEncrypted);
const decrypted2 = zucDecrypt(key, iv, base64Encrypted);
```

## SHA 哈希算法

### 支持的算法

GMKit 基于高性能的 `@noble/hashes` 库提供以下 SHA 算法：

- **SHA-256**: 256 位输出，最常用的哈希算法
- **SHA-384**: 384 位输出，SHA-512 的截断版本
- **SHA-512**: 512 位输出，安全性最高
- **SHA-1**: 160 位输出（已不推荐用于安全敏感场景）

### 函数式 API

```typescript
import { sha256, sha384, sha512, sha1, OutputFormat } from 'gmkitx';

// SHA-256
const hash256 = sha256('Hello, World!');
console.log(hash256); // 十六进制，64 个字符

const hash256Base64 = sha256('Hello, World!', { outputFormat: OutputFormat.BASE64 });
console.log(hash256Base64); // Base64 格式

// SHA-384
const hash384 = sha384('Hello, World!');
console.log(hash384); // 十六进制，96 个字符

// SHA-512
const hash512 = sha512('Hello, World!');
console.log(hash512); // 十六进制，128 个字符

// SHA-1（不推荐用于新项目）
const hash1 = sha1('Hello, World!');
console.log(hash1); // 十六进制，40 个字符
```

### HMAC-SHA

```typescript
import { hmacSha256, hmacSha384, hmacSha512, OutputFormat } from 'gmkitx';

// HMAC-SHA256
const mac256 = hmacSha256('secret-key', 'message');
console.log(mac256); // 十六进制

const mac256Base64 = hmacSha256('secret-key', 'message', { outputFormat: OutputFormat.BASE64 });
console.log(mac256Base64); // Base64 格式

// HMAC-SHA384
const mac384 = hmacSha384('secret-key', 'message');

// HMAC-SHA512
const mac512 = hmacSha512('secret-key', 'message');
```

### 面向对象 API

```typescript
import { SHA256, SHA384, SHA512, SHA1, OutputFormat } from 'gmkitx';

// SHA-256
const sha = new SHA256();
sha.update('Hello, ').update('World!');
const hash = sha.digest();

// 支持重置和重复使用
sha.reset();
sha.update('New data');
const hash2 = sha.digest();

// 设置输出格式
sha.setOutputFormat(OutputFormat.BASE64);
sha.update('test');
const base64Hash = sha.digest();

// 静态方法
const quickHash = SHA256.digest('data', { outputFormat: OutputFormat.BASE64 });

// SHA-384, SHA-512, SHA-1 使用方式相同
const sha384 = new SHA384();
const sha512 = new SHA512();
const sha1 = new SHA1();
```

## AES 和 RSA 算法

对于 AES 和 RSA 等国际标准的对称和非对称加密算法，我们建议使用浏览器和 Node.js 内置的 **Web Crypto API**，原因如下：

1. **性能优异**：原生实现，通常比纯 JavaScript 实现快 10-100 倍
2. **安全性高**：经过严格审计，硬件加速支持
3. **标准化**：W3C 标准，跨平台兼容
4. **功能完整**：支持多种算法、模式和密钥格式

### Web Crypto API 使用示例

#### AES 加密（浏览器和 Node.js 18+）

```typescript
// AES-GCM 加密
async function encryptAES(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // 生成随机 salt（推荐做法）
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // 从密码派生密钥
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // 生成随机 IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // 加密
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // 返回 salt + IV + 密文的 base64 编码
  const combined = new Uint8Array([...salt, ...iv, ...new Uint8Array(encrypted)]);
  return btoa(String.fromCharCode(...combined));
}

// AES-GCM 解密
async function decryptAES(ciphertext: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // 解码 base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const data = combined.slice(28);
  
  // 从密码派生密钥（使用存储的 salt）
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // 解密
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  return decoder.decode(decrypted);
}

// 使用示例
const encrypted = await encryptAES('Hello, AES!', 'my-password');
const decrypted = await decryptAES(encrypted, 'my-password');
console.log(decrypted); // 'Hello, AES!'
```

#### RSA 加密（浏览器和 Node.js 18+）

```typescript
// 生成 RSA 密钥对
async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true, // 可导出
    ['encrypt', 'decrypt']
  );
}

// RSA 加密
async function encryptRSA(plaintext: string, publicKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    data
  );
  
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

// RSA 解密
async function decryptRSA(ciphertext: string, privateKey: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    data
  );
  
  return decoder.decode(decrypted);
}

// 使用示例
const keyPair = await generateRSAKeyPair();
const encrypted = await encryptRSA('Hello, RSA!', keyPair.publicKey);
const decrypted = await decryptRSA(encrypted, keyPair.privateKey);
console.log(decrypted); // 'Hello, RSA!'
```

### Node.js crypto 模块

对于 Node.js 环境，也可以使用内置的 `crypto` 模块：

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// AES-256-GCM 加密
function encryptAES_Node(plaintext: string, key: Buffer): { encrypted: string, iv: string, tag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

// AES-256-GCM 解密
function decryptAES_Node(encrypted: string, key: Buffer, iv: string, tag: string): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

## 对比：GMKit 国密算法 vs Web Crypto API

| 特性 | GMKit 国密算法 | Web Crypto API |
|------|----------------|----------------|
| **算法** | SM2, SM3, SM4, ZUC | AES, RSA, ECDSA, SHA-2, etc. |
| **标准** | 中国密码行业标准 | 国际标准 (NIST, PKCS) |
| **实现** | 纯 TypeScript | 原生实现 |
| **性能** | 优秀（已优化） | 卓越（硬件加速） |
| **兼容性** | 浏览器 + Node.js | 浏览器 + Node.js 18+ |
| **使用场景** | 国密合规项目 | 通用加密需求 |
| **输出格式** | hex, base64 | ArrayBuffer（需手动编码） |

## 最佳实践

### 1. 选择正确的算法

- **国密合规项目**：使用 SM2, SM3, SM4, ZUC
- **国际项目/通用场景**：使用 SHA-256, AES-256-GCM, RSA-2048
- **混合场景**：可以同时使用两者

### 2. 选择输出格式

```typescript
// URL 安全：使用 base64url（需要额外处理）
const hash = digest('data', { outputFormat: OutputFormat.BASE64 })
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=/g, '');

// 存储到数据库：建议使用 base64（更紧凑）
const storedHash = digest('password', { outputFormat: OutputFormat.BASE64 });

// 日志和调试：使用 hex（更易读）
const logHash = digest('data'); // 默认 hex

// 与其他系统对接：查看对方要求的格式
```

### 3. 密钥管理

- **不要硬编码密钥**：使用环境变量或密钥管理服务
- **定期轮换密钥**：建立密钥轮换机制
- **使用强随机数**：GMKit 使用 `@noble/curves` 的安全随机数生成器

### 4. 错误处理

```typescript
try {
  const encrypted = sm4Encrypt(key, data, options);
  const hash = sha256(data);
} catch (error) {
  console.error('加密失败:', error);
  // 不要在错误信息中暴露敏感数据
}
```

## 性能建议

### 1. 批量处理

```typescript
// 不好：多次小数据哈希
const hashes = data.map(d => digest(d));

// 好：使用增量哈希
const sm3 = new SM3();
for (const d of data) {
  sm3.update(d);
}
const finalHash = sm3.digest();
```

### 2. 选择合适的算法

- **哈希**：SHA-256 和 SM3 性能相近，都很快
- **对称加密**：AES（Web Crypto）> SM4（GMKit）性能，但 SM4 足够快
- **非对称加密**：大数据用对称加密，只用非对称加密密钥

## 总结

GMKit 提供了灵活的输出格式支持和完整的国际标准哈希算法实现。对于 AES 和 RSA，建议使用 Web Crypto API 以获得最佳性能和安全性。选择合适的算法和配置，根据项目需求在国密算法和国际标准算法之间权衡。
