---
title: SHA 系列密码杂凑算法
icon: hash
order: 5
author: GMKitX Team
date: 2024-11-22
category:
  - 国际算法
  - 哈希算法
tag:
  - SHA
  - SHA-256
  - SHA-512
  - 哈希
  - 国际标准
---

# SHA 系列密码杂凑算法

## 📖 概述

SHA（Secure Hash Algorithm，安全散列算法）是由美国国家安全局（NSA）设计、美国国家标准与技术研究院（NIST）发布的一系列密码散列函数。gmkitx 集成了完整的 SHA-2 和 SHA-3 系列算法，为国密算法提供国际标准的补充。

### 支持的算法

#### SHA-2 系列
- **SHA-224**: 224 位输出
- **SHA-256**: 256 位输出（最常用）
- **SHA-384**: 384 位输出
- **SHA-512**: 512 位输出
- **SHA-512/224**: 512 位算法，224 位输出
- **SHA-512/256**: 512 位算法，256 位输出

#### SHA-3 系列（Keccak）
- **SHA3-224**: 224 位输出
- **SHA3-256**: 256 位输出
- **SHA3-384**: 384 位输出
- **SHA3-512**: 512 位输出

### 主要特性

- ✅ **国际标准**: NIST 和 ISO 标准算法
- ✅ **全系列支持**: SHA-2 和 SHA-3 全覆盖
- ✅ **高性能**: 基于 @noble/hashes 优化实现
- ✅ **多种输出**: 支持 hex、base64、字节数组
- ✅ **广泛应用**: 区块链、证书、签名等场景

## 🚀 快速开始

### 基本用法

```typescript
import { sha256, sha512, sha3_256 } from 'gmkitx';

// SHA-256
const hash256 = sha256('Hello, World!');
console.log(hash256); // 64 个十六进制字符

// SHA-512
const hash512 = sha512('Hello, World!');
console.log(hash512); // 128 个十六进制字符

// SHA3-256
const hash3 = sha3_256('Hello, World!');
console.log(hash3); // 64 个十六进制字符
```

### 使用命名空间

```typescript
import { sha } from 'gmkitx';

// 访问所有 SHA 算法
const hash256 = sha.sha256('data');
const hash512 = sha.sha512('data');
const hash3 = sha.sha3_256('data');
```

## 📚 SHA-2 系列

SHA-2 系列是目前最广泛使用的哈希算法，包括多种输出长度的变体。

### SHA-256（推荐）

最常用的 SHA-2 算法，256 位输出。

```typescript
import { sha256 } from 'gmkitx';

// 基本用法
const hash = sha256('Hello, SHA-256!');

// 计算文件哈希
import { readFileSync } from 'fs';
const fileData = readFileSync('document.pdf');
const fileHash = sha256(fileData);

// 多种输出格式
import { sha256, OutputFormat } from 'gmkitx';

const hexHash = sha256('data', { format: OutputFormat.HEX });
const base64Hash = sha256('data', { format: OutputFormat.BASE64 });
const bytesHash = sha256('data', { format: OutputFormat.BYTES });
```

### SHA-512

512 位输出，提供更高的安全强度。

```typescript
import { sha512 } from 'gmkitx';

const hash = sha512('Hello, SHA-512!');
console.log(hash.length); // 128 个十六进制字符
```

### SHA-224

224 位输出，是 SHA-256 的截断版本。

```typescript
import { sha224 } from 'gmkitx';

const hash = sha224('Hello, SHA-224!');
console.log(hash.length); // 56 个十六进制字符
```

### SHA-384

384 位输出，是 SHA-512 的截断版本。

```typescript
import { sha384 } from 'gmkitx';

const hash = sha384('Hello, SHA-384!');
console.log(hash.length); // 96 个十六进制字符
```

### SHA-512/224 和 SHA-512/256

使用 SHA-512 的内部结构，但输出更短的哈希值。

```typescript
import { sha512_224, sha512_256 } from 'gmkitx';

// SHA-512/224: 使用 512 位算法，输出 224 位
const hash224 = sha512_224('data');

// SHA-512/256: 使用 512 位算法，输出 256 位
const hash256 = sha512_256('data');
```

## 🔷 SHA-3 系列（Keccak）

SHA-3 是最新的 SHA 标准，基于 Keccak 算法，提供与 SHA-2 不同的安全设计。

### SHA3-256

```typescript
import { sha3_256 } from 'gmkitx';

const hash = sha3_256('Hello, SHA-3!');
```

### SHA3-512

```typescript
import { sha3_512 } from 'gmkitx';

const hash = sha3_512('Hello, SHA-3!');
```

### SHA3-224

```typescript
import { sha3_224 } from 'gmkitx';

const hash = sha3_224('Hello, SHA-3!');
```

### SHA3-384

```typescript
import { sha3_384 } from 'gmkitx';

const hash = sha3_384('Hello, SHA-3!');
```

## 📋 完整 API 参考

### SHA-2 系列

| 函数 | 输出长度 | 说明 |
|------|----------|------|
| `sha224(data, options?)` | 224 位 (28 字节) | SHA-2 224 位版本 |
| `sha256(data, options?)` | 256 位 (32 字节) | SHA-2 256 位版本（推荐） |
| `sha384(data, options?)` | 384 位 (48 字节) | SHA-2 384 位版本 |
| `sha512(data, options?)` | 512 位 (64 字节) | SHA-2 512 位版本 |
| `sha512_224(data, options?)` | 224 位 (28 字节) | SHA-512 算法，224 位输出 |
| `sha512_256(data, options?)` | 256 位 (32 字节) | SHA-512 算法，256 位输出 |

### SHA-3 系列

| 函数 | 输出长度 | 说明 |
|------|----------|------|
| `sha3_224(data, options?)` | 224 位 (28 字节) | SHA-3 224 位版本 |
| `sha3_256(data, options?)` | 256 位 (32 字节) | SHA-3 256 位版本 |
| `sha3_384(data, options?)` | 384 位 (48 字节) | SHA-3 384 位版本 |
| `sha3_512(data, options?)` | 512 位 (64 字节) | SHA-3 512 位版本 |

### 选项参数

```typescript
interface HashOptions {
  format?: 'hex' | 'base64' | 'bytes';  // 输出格式，默认 hex
}
```

## 💡 使用场景

### 1. 数据完整性校验

```typescript
import { sha256 } from 'gmkitx';

// 软件包完整性验证
function verifyPackageIntegrity(
  fileData: Buffer,
  expectedHash: string
): boolean {
  const actualHash = sha256(fileData);
  return actualHash === expectedHash;
}

// 使用
const packageData = readFileSync('package.tar.gz');
const expectedHash = 'a3c5f8...'; // 官方提供的哈希值
const isValid = verifyPackageIntegrity(packageData, expectedHash);
```

### 2. 密码存储

```typescript
import { sha256 } from 'gmkitx';
import { randomBytes } from 'crypto';

// 密码哈希（带盐）
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = sha256(password + salt);
  return { hash, salt };
}

// 验证密码
function verifyPassword(
  password: string,
  storedHash: string,
  salt: string
): boolean {
  const hash = sha256(password + salt);
  return hash === storedHash;
}

// 使用
const { hash, salt } = hashPassword('user-password');
// 存储 hash 和 salt 到数据库

// 登录验证
const isValid = verifyPassword('user-input', hash, salt);
```

> ⚠️ **注意**: 对于密码哈希，实际应用中应使用专门的密码哈希函数（如 bcrypt、scrypt、Argon2）而非直接使用 SHA。

### 3. 数字签名的消息摘要

```typescript
import { sha256, sm2Sign } from 'gmkitx';

// 对大消息进行签名时，先计算哈希
function signLargeMessage(message: string, privateKey: string): string {
  // 先计算消息的 SHA-256 哈希
  const digest = sha256(message);
  
  // 对哈希值进行签名
  return sm2Sign(privateKey, digest);
}

// 验证签名
function verifyLargeMessageSignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  const digest = sha256(message);
  return sm2Verify(publicKey, digest, signature);
}
```

### 4. 区块链和 Merkle 树

```typescript
import { sha256 } from 'gmkitx';

// 简单的区块链实现
interface Block {
  index: number;
  timestamp: number;
  data: string;
  previousHash: string;
  hash: string;
  nonce: number;
}

function calculateBlockHash(block: Omit<Block, 'hash'>): string {
  const blockString = JSON.stringify(block);
  return sha256(blockString);
}

function mineBlock(block: Omit<Block, 'hash' | 'nonce'>, difficulty: number): Block {
  let nonce = 0;
  const target = '0'.repeat(difficulty);
  
  while (true) {
    const testBlock = { ...block, nonce };
    const hash = calculateBlockHash(testBlock);
    
    if (hash.startsWith(target)) {
      return { ...testBlock, hash };
    }
    nonce++;
  }
}

// Merkle 树根计算
function calculateMerkleRoot(transactions: string[]): string {
  if (transactions.length === 0) return sha256('');
  if (transactions.length === 1) return sha256(transactions[0]);
  
  const hashes = transactions.map(tx => sha256(tx));
  
  while (hashes.length > 1) {
    const newHashes: string[] = [];
    
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left; // 如果是奇数个，最后一个重复
      newHashes.push(sha256(left + right));
    }
    
    hashes.splice(0, hashes.length, ...newHashes);
  }
  
  return hashes[0];
}
```

### 5. 内容去重和缓存

```typescript
import { sha256 } from 'gmkitx';

// 基于内容的缓存系统
class ContentCache {
  private cache = new Map<string, any>();
  
  // 存储内容，使用哈希作为键
  set(content: string, value: any): string {
    const hash = sha256(content);
    this.cache.set(hash, value);
    return hash;
  }
  
  // 根据哈希获取内容
  get(hash: string): any {
    return this.cache.get(hash);
  }
  
  // 检查内容是否存在
  has(content: string): boolean {
    const hash = sha256(content);
    return this.cache.has(hash);
  }
  
  // 内容去重
  deduplicate(contents: string[]): string[] {
    const seen = new Set<string>();
    return contents.filter(content => {
      const hash = sha256(content);
      if (seen.has(hash)) {
        return false;
      }
      seen.add(hash);
      return true;
    });
  }
}
```

### 6. Git 风格的对象存储

```typescript
import { sha256 } from 'gmkitx';

// 类似 Git 的对象存储系统
class ObjectStore {
  private objects = new Map<string, any>();
  
  // 存储对象，返回哈希值
  store(type: string, content: any): string {
    const data = JSON.stringify({ type, content });
    const hash = sha256(data);
    this.objects.set(hash, { type, content });
    return hash;
  }
  
  // 根据哈希获取对象
  get(hash: string): any {
    return this.objects.get(hash);
  }
  
  // 存储文件树
  storeTree(files: Record<string, string>): string {
    const tree = Object.entries(files).map(([name, content]) => {
      const blobHash = this.store('blob', content);
      return { name, hash: blobHash };
    });
    
    return this.store('tree', tree);
  }
}
```

### 7. 数据指纹和重复检测

```typescript
import { sha256 } from 'gmkitx';

// 文件指纹系统
class FileFingerprint {
  // 计算文件指纹
  static calculate(fileData: Buffer): {
    sha256: string;
    size: number;
    timestamp: number;
  } {
    return {
      sha256: sha256(fileData),
      size: fileData.length,
      timestamp: Date.now()
    };
  }
  
  // 检测重复文件
  static findDuplicates(files: Array<{ path: string; data: Buffer }>) {
    const fingerprints = new Map<string, string[]>();
    
    for (const file of files) {
      const hash = sha256(file.data);
      
      if (!fingerprints.has(hash)) {
        fingerprints.set(hash, []);
      }
      
      fingerprints.get(hash)!.push(file.path);
    }
    
    // 返回所有重复文件组
    return Array.from(fingerprints.entries())
      .filter(([_, paths]) => paths.length > 1)
      .map(([hash, paths]) => ({ hash, paths }));
  }
}
```

## 🔧 高级用法

### HMAC（密钥哈希消息认证码）

```typescript
import { sha256 } from 'gmkitx';

// 简单的 HMAC-SHA256 实现
function hmacSHA256(key: string, message: string): string {
  const blockSize = 64; // SHA-256 块大小
  
  // 如果密钥长度超过块大小，先哈希
  if (key.length > blockSize) {
    key = sha256(key);
  }
  
  // 填充密钥到块大小
  const paddedKey = key.padEnd(blockSize, '\x00');
  
  // 生成 ipad 和 opad
  const ipad = paddedKey.split('').map(c => 
    String.fromCharCode(c.charCodeAt(0) ^ 0x36)
  ).join('');
  
  const opad = paddedKey.split('').map(c => 
    String.fromCharCode(c.charCodeAt(0) ^ 0x5c)
  ).join('');
  
  // HMAC = H(opad || H(ipad || message))
  const innerHash = sha256(ipad + message);
  return sha256(opad + innerHash);
}

// 使用
const hmac = hmacSHA256('secret-key', 'message');
```

> 💡 **提示**: 实际应用中建议使用 @noble/hashes 提供的 HMAC 实现。

### 比较不同 SHA 算法

```typescript
import { sha256, sha512, sha3_256, sha3_512 } from 'gmkitx';

const data = 'Compare SHA algorithms';

console.log('SHA-256:  ', sha256(data));
console.log('SHA-512:  ', sha512(data));
console.log('SHA3-256: ', sha3_256(data));
console.log('SHA3-512: ', sha3_512(data));

// 输出长度比较
console.log('SHA-256 length:  ', sha256(data).length);   // 64
console.log('SHA-512 length:  ', sha512(data).length);   // 128
console.log('SHA3-256 length: ', sha3_256(data).length); // 64
console.log('SHA3-512 length: ', sha3_512(data).length); // 128
```

### 性能测试

```typescript
import { sha256, sha512, sha3_256, sm3Digest } from 'gmkitx';

function benchmark(name: string, fn: () => void, iterations: number = 10000) {
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const duration = Date.now() - start;
  console.log(`${name}: ${duration}ms (${iterations} iterations)`);
}

const testData = 'Test data for benchmarking';

benchmark('SHA-256', () => sha256(testData));
benchmark('SHA-512', () => sha512(testData));
benchmark('SHA3-256', () => sha3_256(testData));
benchmark('SM3', () => sm3Digest(testData));
```

## 🔄 SHA vs SM3 对比

| 特性 | SHA-256 | SHA-512 | SHA3-256 | SM3 |
|------|---------|---------|----------|-----|
| 输出长度 | 256 位 | 512 位 | 256 位 | 256 位 |
| 标准组织 | NIST | NIST | NIST | 国密局 |
| 设计结构 | Merkle-Damgård | Merkle-Damgård | Keccak (海绵结构) | Merkle-Damgård |
| 国际认可 | ✅ | ✅ | ✅ | 部分 |
| 中国标准 | ❌ | ❌ | ❌ | ✅ |
| 应用场景 | 通用 | 高安全需求 | 新系统 | 国密要求系统 |

### 何时选择 SHA？

- ✅ 需要与国际系统对接
- ✅ 区块链和加密货币应用
- ✅ TLS/SSL 证书
- ✅ OAuth、JWT 等标准协议
- ✅ Git、Docker 等工具生态

### 何时选择 SM3？

- ✅ 符合中国密码法要求
- ✅ 政府和金融行业应用
- ✅ 信创系统
- ✅ 需要国密合规的场景

## ⚠️ 注意事项

1. **哈希不可逆**: SHA 是单向函数，无法从哈希值还原原始数据
2. **碰撞抗性**: 理论上不同输入可能产生相同哈希（碰撞），但实际极难发生
3. **雪崩效应**: 输入微小变化会导致输出完全不同
4. **固定长度**: 每个算法输出长度固定，与输入长度无关
5. **不是加密**: 哈希算法不能用于加密，只能用于摘要和完整性校验
6. **选择合适算法**: 
   - 一般场景: SHA-256
   - 高安全需求: SHA-512 或 SHA3-512
   - 兼容性: SHA-256（最广泛支持）
7. **密码哈希**: 不要直接用 SHA 存储密码，应使用专门的密码哈希函数

## 🔍 常见问题

### Q: SHA-256 和 SHA3-256 哪个更安全？

A: 两者安全强度相当，但设计不同：
- SHA-256 基于 Merkle-Damgård 结构，经过长期验证
- SHA3-256 基于 Keccak（海绵结构），设计更现代
- SHA3 系列抗长度扩展攻击
- 选择建议：SHA-256（兼容性好），SHA3-256（新系统）

### Q: 可以用 SHA 加密数据吗？

A: 不可以。SHA 是哈希算法，不是加密算法：
- 哈希是单向的，无法解密
- 加密是双向的，可以解密
- 需要加密请使用 SM4、SM2 或 AES

### Q: 为什么 SHA-1 不安全？

A: SHA-1 已被证明存在实际可行的碰撞攻击，不应再使用。gmkitx 不提供 SHA-1，请使用 SHA-256 或更高版本。

### Q: 如何选择 SHA 算法？

A: 选择建议：
- **SHA-256**: 最常用，兼容性最好，推荐
- **SHA-512**: 64位系统上可能更快，高安全需求
- **SHA3-256**: 需要抗长度扩展攻击
- **SHA-224/384**: 特定协议要求时使用

## 🎯 性能比较

不同 SHA 算法的相对性能（仅供参考）：

| 算法 | 相对速度 | 输出长度 | 推荐场景 |
|------|---------|----------|----------|
| SHA-224 | ★★★★☆ | 224 位 | 兼容性需求 |
| SHA-256 | ★★★★★ | 256 位 | **推荐，通用** |
| SHA-384 | ★★★☆☆ | 384 位 | 高安全需求 |
| SHA-512 | ★★★☆☆ | 512 位 | 高安全需求 |
| SHA3-256 | ★★★★☆ | 256 位 | 新系统 |
| SHA3-512 | ★★★☆☆ | 512 位 | 高安全需求 |

> 注: 性能取决于数据大小、硬件架构等因素

## 📚 相关资源

- [NIST FIPS 180-4 (SHA-2)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf)
- [NIST FIPS 202 (SHA-3)](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf)
- [SHA-2 Wikipedia](https://en.wikipedia.org/wiki/SHA-2)
- [SHA-3 Wikipedia](https://en.wikipedia.org/wiki/SHA-3)

## 🔗 相关算法

- [SM3 - 国密密码杂凑算法](./SM3.md)
- [SM2 - 椭圆曲线公钥密码算法](./SM2.md)
