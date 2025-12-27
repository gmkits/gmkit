---
title: SM4 分组密码算法
icon: lock
order: 3
author: mumu
date: 2025-11-23
category:
  - 国密算法
  - 对称加密
tag:
  - SM4
  - 分组密码
  - 对称加密
  - 块加密
---

# SM4 分组密码算法

## 概述

SM4（原名 SMS4）是中国国家密码管理局于 2012 年 3 月 21 日发布的分组密码算法，用于替代 DES、AES 等国际算法。SM4 是一个对称加密算法，分组长度为 128 位（16 字节），密钥长度为 128 位（16 字节）。

### 标准依据

- **GM/T 0002-2012**: SM4 分组密码算法
- **GB/T 32907-2016**: 信息安全技术 SM4 分组密码算法（等同采用 GM/T 0002-2012）

### 主要特性

- **安全性**: 128 位密钥和分组长度，提供合理的安全强度
- **性能**: 纯 TypeScript 实现，性能取决于运行环境和硬件支持
- **多种模式**: 支持 ECB、CBC、CTR、CFB、OFB、GCM 六种分组模式
- **灵活填充**: 支持 PKCS7、PKCS5、Zero、NoPadding 等填充方式
- **标准兼容**: 与主流实现（OpenSSL、Hutool等）完全兼容

### 性能与安全权衡

SM4 与 AES-128 相似，都是 128 位密钥的分组密码：
- **安全强度**: SM4 和 AES-128 提供相当的安全强度
- **运算速度**: 性能主要取决于硬件支持
  - 在国际芯片上，AES 通常有硬件加速（AES-NI），可比纯软件 SM4 快 3-10 倍
  - 在国产芯片上，SM4 通常有专用加速指令，性能与 AES 相当或更优
  - 纯软件实现性能相近
- **模式选择影响性能**:
  - **ECB 模式**: 最快，但不安全，不推荐用于生产环境
  - **CBC 模式**: 安全且常用，但不能并行加密
  - **CTR/GCM 模式**: 可并行处理，性能好，GCM 还提供认证
  - **认证加密**: GCM 模式在提供加密的同时验证完整性，但比纯加密慢约 20-30%

::: warning 安全是有代价的
更安全的加密模式（如 GCM 认证加密）会比简单的 ECB 模式慢，这是保障数据安全的必要成本。选择加密模式时应根据实际安全需求和性能要求做出权衡。
:::

## 快速开始

### 基本加密解密

```typescript
import { sm4Encrypt, sm4Decrypt } from 'gmkitx';

// 密钥（128位，32个十六进制字符）
const key = '0123456789abcdeffedcba9876543210';

// 加密
const plaintext = 'Hello, SM4!';
const ciphertext = sm4Encrypt(key, plaintext);

// 解密
const decrypted = sm4Decrypt(key, ciphertext);
console.log(decrypted === plaintext); // true
```

### 使用命名空间

```typescript
import { sm4 } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const ciphertext = sm4.encrypt(key, 'Hello, SM4!');
const plaintext = sm4.decrypt(key, ciphertext);
```

##  分组模式

SM4 支持六种分组密码工作模式：

### ECB（电子密码本模式）

最简单的模式，每个明文块独立加密。**不推荐用于生产环境**。

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';

const ciphertext = sm4Encrypt(key, 'Hello, SM4!', {
  mode: CipherMode.ECB
});

const plaintext = sm4Decrypt(key, ciphertext, {
  mode: CipherMode.ECB
});
```

⚠️ **警告**: ECB 模式不安全，相同明文块会产生相同密文块，不应用于敏感数据。

### CBC（密码块链接模式）

最常用的模式，每个明文块与前一个密文块异或后再加密。**推荐使用**。

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef'; // 初始化向量（128位）

const ciphertext = sm4Encrypt(key, 'Hello, SM4!', {
  mode: CipherMode.CBC,
  iv: iv
});

const plaintext = sm4Decrypt(key, ciphertext, {
  mode: CipherMode.CBC,
  iv: iv
});
```

✅ **推荐**: CBC 模式安全可靠，适用于大多数场景。

### CTR（计数器模式）

将分组密码转换为流密码，支持并行加密和随机访问。

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef'; // 计数器初始值

const ciphertext = sm4Encrypt(key, 'Hello, SM4!', {
  mode: CipherMode.CTR,
  iv: iv
});

const plaintext = sm4Decrypt(key, ciphertext, {
  mode: CipherMode.CTR,
  iv: iv
});
```

✅ **优点**: 支持并行处理，不需要填充。

### CFB（密码反馈模式）

将分组密码转换为自同步流密码。

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

const ciphertext = sm4Encrypt(key, 'Hello, SM4!', {
  mode: CipherMode.CFB,
  iv: iv
});

const plaintext = sm4Decrypt(key, ciphertext, {
  mode: CipherMode.CFB,
  iv: iv
});
```

### OFB（输出反馈模式）

将分组密码转换为同步流密码。

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

const ciphertext = sm4Encrypt(key, 'Hello, SM4!', {
  mode: CipherMode.OFB,
  iv: iv
});

const plaintext = sm4Decrypt(key, ciphertext, {
  mode: CipherMode.OFB,
  iv: iv
});
```

### GCM（伽罗瓦/计数器模式）

认证加密模式，同时提供机密性和完整性保护。**强烈推荐用于敏感数据**。

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

// 加密（返回密文和认证标签）
const { ciphertext, tag } = sm4Encrypt(key, 'Hello, SM4!', {
  mode: CipherMode.GCM,
  iv: iv
});

// 解密（需要提供认证标签）
const plaintext = sm4Decrypt(key, ciphertext, {
  mode: CipherMode.GCM,
  iv: iv,
  tag: tag
});
```

✅ **强烈推荐**: GCM 模式提供认证加密（AEAD），防止密文被篡改。

## 📦 填充模式

对于非流密码模式（ECB、CBC），需要填充明文到块大小的整数倍。

### PKCS7 填充（推荐）

```typescript
import { sm4Encrypt, PaddingMode } from 'gmkitx';

const ciphertext = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,  // 默认
  iv: iv
});
```

### PKCS5 填充

```typescript
const ciphertext = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS5,
  iv: iv
});
```

### Zero 填充

```typescript
const ciphertext = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.ZERO,
  iv: iv
});
```

### 无填充

```typescript
// 仅当明文长度是 16 字节的整数倍时使用
const ciphertext = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.NONE,
  iv: iv
});
```

⚠️ **注意**: CTR、CFB、OFB、GCM 模式不需要填充。

## 📤 输出格式

SM4 支持多种输出格式：

### 十六进制输出（默认）

```typescript
import { sm4Encrypt, OutputFormat } from 'gmkitx';

const ciphertext = sm4Encrypt(key, plaintext, {
  outputFormat: OutputFormat.HEX
});
```

### Base64 输出

```typescript
const ciphertext = sm4Encrypt(key, plaintext, {
  outputFormat: OutputFormat.BASE64
});
```

### 字节数组输出

```typescript
const ciphertext = sm4Encrypt(key, plaintext, {
  outputFormat: OutputFormat.BYTES
});
```

##  面向对象 API

```typescript
import { SM4, CipherMode, PaddingMode } from 'gmkitx';

// 创建 SM4 实例
const sm4 = new SM4(key, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7
});

// 加密
const ciphertext = sm4.encrypt(plaintext, { iv: iv });

// 解密
const decrypted = sm4.decrypt(ciphertext, { iv: iv });

// 修改配置
sm4.setMode(CipherMode.GCM);
sm4.setPadding(PaddingMode.NONE);
```

##  完整 API 参考

### 函数式 API

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `sm4Encrypt(key, plaintext, options?)` | SM4 加密 | `string \| Uint8Array \| {ciphertext, tag}` |
| `sm4Decrypt(key, ciphertext, options?)` | SM4 解密 | `string \| Uint8Array` |

### 类 API

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `new SM4(key, options?)` | 创建 SM4 实例 | `SM4` |
| `encrypt(plaintext, options?)` | 加密 | `string \| Uint8Array \| {ciphertext, tag}` |
| `decrypt(ciphertext, options?)` | 解密 | `string \| Uint8Array` |
| `setMode(mode)` | 设置分组模式 | `void` |
| `setPadding(padding)` | 设置填充模式 | `void` |

### 选项参数

```typescript
interface SM4Options {
  mode?: CipherMode;          // 分组模式
  padding?: PaddingMode;      // 填充模式
  iv?: string;                // 初始化向量（除 ECB 外必需）
  tag?: string;               // 认证标签（GCM 解密时必需）
  outputFormat?: OutputFormat; // 输出格式
}
```

##  使用场景

### 1. 文件加密

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode } from 'gmkitx';
import { readFileSync, writeFileSync } from 'fs';

// 加密文件
function encryptFile(inputPath: string, outputPath: string, key: string) {
  const data = readFileSync(inputPath, 'utf-8');
  const iv = generateRandomIV(); // 生成随机 IV
  
  const ciphertext = sm4Encrypt(key, data, {
    mode: CipherMode.CBC,
    iv: iv
  });
  
  // 保存 IV 和密文
  writeFileSync(outputPath, JSON.stringify({ iv, ciphertext }));
}

// 解密文件
function decryptFile(inputPath: string, key: string): string {
  const { iv, ciphertext } = JSON.parse(readFileSync(inputPath, 'utf-8'));
  
  return sm4Decrypt(key, ciphertext, {
    mode: CipherMode.CBC,
    iv: iv
  });
}
```

### 2. 数据库字段加密

```typescript
import { sm4Encrypt, sm4Decrypt } from 'gmkitx';

class UserService {
  private readonly encryptionKey = process.env.ENCRYPTION_KEY!;
  
  // 加密敏感字段
  encryptSensitiveData(data: string): string {
    return sm4Encrypt(this.encryptionKey, data, {
      mode: CipherMode.GCM,
      iv: generateRandomIV()
    });
  }
  
  // 解密敏感字段
  decryptSensitiveData(encrypted: string): string {
    return sm4Decrypt(this.encryptionKey, encrypted, {
      mode: CipherMode.GCM
    });
  }
  
  // 保存用户数据
  async saveUser(user: User) {
    user.idCard = this.encryptSensitiveData(user.idCard);
    user.phone = this.encryptSensitiveData(user.phone);
    await database.save(user);
  }
}
```

### 3. API 请求加密

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode } from 'gmkitx';

// 客户端：加密请求数据
function encryptRequest(data: any, apiKey: string): string {
  const jsonData = JSON.stringify(data);
  const iv = generateRandomIV();
  
  const { ciphertext, tag } = sm4Encrypt(apiKey, jsonData, {
    mode: CipherMode.GCM,
    iv: iv
  });
  
  return JSON.stringify({ iv, ciphertext, tag });
}

// 服务端：解密请求数据
function decryptRequest(encrypted: string, apiKey: string): any {
  const { iv, ciphertext, tag } = JSON.parse(encrypted);
  
  const decrypted = sm4Decrypt(apiKey, ciphertext, {
    mode: CipherMode.GCM,
    iv: iv,
    tag: tag
  });
  
  return JSON.parse(decrypted);
}
```

### 4. 会话密钥加密

```typescript
import { sm4Encrypt, sm2Encrypt, generateKeyPair } from 'gmkitx';

// 混合加密：用 SM2 加密 SM4 密钥，用 SM4 加密数据
function hybridEncrypt(data: string, recipientPublicKey: string) {
  // 生成随机 SM4 密钥
  const sm4Key = generateRandomSM4Key();
  const iv = generateRandomIV();
  
  // 用 SM4 加密数据
  const encryptedData = sm4Encrypt(sm4Key, data, {
    mode: CipherMode.GCM,
    iv: iv
  });
  
  // 用 SM2 加密 SM4 密钥
  const encryptedKey = sm2Encrypt(recipientPublicKey, sm4Key);
  
  return { encryptedKey, encryptedData, iv };
}
```

### 5. 日志加密

```typescript
import { SM4, CipherMode } from 'gmkitx';

class EncryptedLogger {
  private sm4: SM4;
  
  constructor(key: string) {
    this.sm4 = new SM4(key, {
      mode: CipherMode.CBC
    });
  }
  
  log(message: string) {
    const iv = generateRandomIV();
    const encrypted = this.sm4.encrypt(message, { iv });
    
    // 写入加密日志
    fs.appendFileSync('encrypted.log', `${iv}:${encrypted}\n`);
  }
  
  readLogs(): string[] {
    const logs = fs.readFileSync('encrypted.log', 'utf-8').split('\n');
    
    return logs.map(line => {
      const [iv, encrypted] = line.split(':');
      return this.sm4.decrypt(encrypted, { iv });
    });
  }
}
```

##  高级用法

### 流式加密大文件

```typescript
import { SM4, CipherMode } from 'gmkitx';
import { createReadStream, createWriteStream } from 'fs';

function encryptLargeFile(inputPath: string, outputPath: string, key: string) {
  const sm4 = new SM4(key, { mode: CipherMode.CTR });
  const iv = generateRandomIV();
  
  const readStream = createReadStream(inputPath, { highWaterMark: 16 * 1024 });
  const writeStream = createWriteStream(outputPath);
  
  // 先写入 IV
  writeStream.write(iv + '\n');
  
  readStream.on('data', (chunk) => {
    const encrypted = sm4.encrypt(chunk, { iv });
    writeStream.write(encrypted);
  });
  
  readStream.on('end', () => {
    writeStream.end();
  });
}
```

### 密钥派生

```typescript
import { sm3Digest } from 'gmkitx';

// 从密码派生 SM4 密钥
function deriveKey(password: string, salt: string): string {
  // 简单的密钥派生（实际应使用 PBKDF2）
  const combined = password + salt;
  const hash = sm3Digest(combined);
  return hash.substring(0, 32); // 取前 128 位作为密钥
}

const password = 'user-password';
const salt = 'random-salt';
const key = deriveKey(password, salt);
```

### 批量加密

```typescript
import { SM4, CipherMode } from 'gmkitx';

function encryptBatch(items: string[], key: string): string[] {
  const sm4 = new SM4(key, { mode: CipherMode.CBC });
  
  return items.map(item => {
    const iv = generateRandomIV();
    return sm4.encrypt(item, { iv });
  });
}
```

##  密钥管理

### 密钥生成

```typescript
import { randomBytes } from 'crypto';

// 生成随机 SM4 密钥（128位）
function generateSM4Key(): string {
  return randomBytes(16).toString('hex');
}

// 生成随机 IV（128位）
function generateRandomIV(): string {
  return randomBytes(16).toString('hex');
}
```

### 密钥存储

```typescript
// ❌ 不要硬编码密钥
const key = '0123456789abcdeffedcba9876543210';

// ✅ 从环境变量读取
const key = process.env.SM4_KEY;

// ✅ 从密钥管理服务读取
const key = await keyManagementService.getKey('sm4-key-id');
```

##  注意事项

1. **密钥长度**: SM4 密钥必须是 128 位（32 个十六进制字符）
2. **IV 长度**: 初始化向量必须是 128 位（32 个十六进制字符）
3. **IV 唯一性**: 每次加密应使用不同的 IV，切勿重复使用
4. **密钥保密**: 密钥必须妥善保管，泄露将导致所有加密数据不安全
5. **模式选择**: 
   - 敏感数据推荐使用 GCM 模式
   - 一般数据使用 CBC 模式
   - 避免使用 ECB 模式
6. **填充攻击**: 使用 PKCS7 填充时注意 padding oracle 攻击
7. **认证**: 非 GCM 模式不提供完整性保护，考虑额外使用 MAC

##  常见问题

### Q: SM4 和 AES 有什么区别？

A: SM4 和 AES 都是对称分组密码，主要区别：
- SM4 是中国国家标准，AES 是国际标准
- SM4 密钥和分组长度固定为 128 位，AES 支持 128/192/256 位
- 两者内部结构不同，不兼容
- 安全强度相当

### Q: 为什么 ECB 模式不安全？

A: ECB 模式对相同的明文块总是产生相同的密文块，无法隐藏数据模式。攻击者可以通过分析密文模式获取信息。应使用 CBC 或 GCM 模式。

### Q: GCM 模式的 tag 是什么？

A: GCM 模式的 tag（认证标签）用于验证密文完整性。解密时必须验证 tag，如果 tag 不匹配说明密文被篡改，应拒绝解密。

### Q: 如何选择分组模式？

A: 推荐选择：
- **敏感数据**: GCM（提供认证加密）
- **一般数据**: CBC（最常用）
- **流式数据**: CTR（支持并行）
- **避免**: ECB（不安全）

### Q: 每次加密结果都不同吗？

A: 是的（除 ECB 模式外）。因为每次加密使用不同的随机 IV，即使明文相同，密文也不同。这是正常且必要的安全特性。

##  性能基准

在现代硬件上的性能参考（仅供参考）：

| 模式  | 1 MB 加密时间 | 1 MB 解密时间 |
|-----|-----------|-----------|
| ECB | ~15 ms    | ~15 ms    |
| CBC | ~20 ms    | ~20 ms    |
| CTR | ~18 ms    | ~18 ms    |
| GCM | ~25 ms    | ~25 ms    |

> 注: 实际性能取决于硬件配置和运行环境

##  相关资源

- [SM4 标准文档](http://www.gmbz.org.cn/main/viewfile/2018011001400692565.html)
- [GB/T 32907-2016](http://www.gb688.cn/bzgk/gb/newGbInfo?hcno=7803DE42D3BC5E80B0C3E5D8E873D56A)
- [分组密码工作模式](https://en.wikipedia.org/wiki/Block_cipher_mode_of_operation)

##  相关算法

- [SM2 - 椭圆曲线公钥密码算法](./SM2.md)
- [SM3 - 密码杂凑算法](./SM3.md)
- [ZUC - 祖冲之序列密码算法](./ZUC.md)
