---
title: SM3 密码杂凑算法
icon: fingerprint
order: 2
author: GMKitX Team
date: 2024-11-22
category:
  - 国密算法
  - 哈希算法
tag:
  - SM3
  - 哈希
  - 摘要算法
  - 消息认证
---

# SM3 密码杂凑算法

## 📖 概述

SM3 是中国国家密码管理局于 2010 年 12 月 17 日发布的密码杂凑（哈希）算法，用于替代 MD5、SHA-1 等国际算法。SM3 算法输出 256 位（32 字节）的哈希值，具有抗碰撞、抗原像攻击等安全特性。

### 标准依据

- **GM/T 0004-2012**: SM3 密码杂凑算法
- **ISO/IEC 10118-3:2018**: 已被收录为国际标准

### 主要特性

- ✅ **高安全性**: 256 位输出，抗碰撞能力强
- ✅ **高性能**: 纯 TypeScript 实现，速度快
- ✅ **流式处理**: 支持分块更新，适合大文件
- ✅ **多种输出**: 支持 hex、base64、字节数组等格式
- ✅ **标准兼容**: 与主流实现（OpenSSL、Hutool等）完全兼容

## 🚀 快速开始

### 基本用法

```typescript
import { sm3Digest } from 'gmkitx';

// 计算字符串的 SM3 哈希值
const hash = sm3Digest('Hello, SM3!');
console.log(hash); // 十六进制字符串，64位（32字节）

// 计算数字的哈希
const numHash = sm3Digest(12345);

// 计算对象的哈希（自动转为JSON字符串）
const objHash = sm3Digest({ name: '张三', age: 30 });
```

### 使用命名空间

```typescript
import { sm3 } from 'gmkitx';

const hash = sm3.digest('Hello, SM3!');
```

## 📤 输出格式

SM3 支持多种输出格式：

### 十六进制输出（默认）

```typescript
import { sm3Digest, OutputFormat } from 'gmkitx';

const hash = sm3Digest('Hello', {
  format: OutputFormat.HEX
});
// 输出: "66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0"
```

### Base64 输出

```typescript
const hash = sm3Digest('Hello', {
  format: OutputFormat.BASE64
});
// 输出: "Zsfw9GLu7dnR8tRr3BDk4kFnxIdc8veiKX2gK49LqOA="
```

### 字节数组输出

```typescript
const hash = sm3Digest('Hello', {
  format: OutputFormat.BYTES
});
// 输出: Uint8Array(32) [102, 199, 240, 244, ...]
```

## 🔄 流式处理

对于大文件或需要分块处理的场景，可以使用流式 API：

### 基本流式处理

```typescript
import { SM3 } from 'gmkitx';

const sm3 = new SM3();

// 分块更新数据
sm3.update('第一部分数据');
sm3.update('第二部分数据');
sm3.update('第三部分数据');

// 获取最终哈希值
const hash = sm3.digest();
```

### 处理大文件

```typescript
import { SM3 } from 'gmkitx';
import fs from 'fs';

const sm3 = new SM3();
const stream = fs.createReadStream('large-file.dat');

stream.on('data', (chunk) => {
  sm3.update(chunk);
});

stream.on('end', () => {
  const hash = sm3.digest();
  console.log('文件哈希:', hash);
});
```

### Node.js 文件哈希示例

```typescript
import { SM3 } from 'gmkitx';
import { readFileSync } from 'fs';

function hashFile(filePath: string): string {
  const data = readFileSync(filePath);
  return sm3Digest(data);
}

const fileHash = hashFile('./document.pdf');
```

## 🎯 面向对象 API

```typescript
import { SM3, OutputFormat } from 'gmkitx';

// 创建实例
const sm3 = new SM3();

// 更新数据（可多次调用）
sm3.update('part1');
sm3.update('part2');

// 获取哈希值（十六进制）
const hexHash = sm3.digest();

// 获取哈希值（Base64）
const base64Hash = sm3.digest({ format: OutputFormat.BASE64 });

// 获取哈希值（字节数组）
const bytesHash = sm3.digest({ format: OutputFormat.BYTES });

// 重置状态，可以重新使用
sm3.reset();
sm3.update('new data');
const newHash = sm3.digest();
```

## 📋 完整 API 参考

### 函数式 API

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `sm3Digest(data, options?)` | 计算 SM3 哈希值 | `string \| Uint8Array` |
| `sm3(data)` | 计算 SM3 哈希值（简写） | `string` |

### 类 API

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `new SM3()` | 创建 SM3 实例 | `SM3` |
| `update(data)` | 更新数据 | `void` |
| `digest(options?)` | 获取哈希值 | `string \| Uint8Array` |
| `reset()` | 重置状态 | `void` |

### 选项参数

```typescript
interface DigestOptions {
  format?: 'hex' | 'base64' | 'bytes';  // 输出格式
}
```

## 💡 使用场景

### 1. 数据完整性校验

```typescript
import { sm3Digest } from 'gmkitx';

// 发送方计算哈希
const data = '重要数据';
const hash = sm3Digest(data);
sendData(data, hash);

// 接收方验证
const receivedData = receiveData();
const receivedHash = receiveHash();
const calculatedHash = sm3Digest(receivedData);

if (calculatedHash === receivedHash) {
  console.log('数据完整，未被篡改');
} else {
  console.log('数据已被篡改！');
}
```

### 2. 密码存储

```typescript
import { sm3Digest } from 'gmkitx';

// 存储密码时先哈希
function hashPassword(password: string, salt: string): string {
  return sm3Digest(password + salt);
}

// 注册
const salt = generateRandomSalt();
const hashedPassword = hashPassword('userPassword', salt);
saveToDatabase(username, hashedPassword, salt);

// 登录验证
const storedHash = getFromDatabase(username);
const storedSalt = getSaltFromDatabase(username);
const inputHash = hashPassword(inputPassword, storedSalt);

if (inputHash === storedHash) {
  console.log('密码正确');
}
```

### 3. 数字签名的消息摘要

```typescript
import { sm3Digest, sm2Sign } from 'gmkitx';

// SM2 签名前通常先计算消息摘要
const message = '合同内容...';
const digest = sm3Digest(message);
const signature = sm2Sign(privateKey, digest);
```

### 4. 区块链哈希

```typescript
import { sm3Digest } from 'gmkitx';

interface Block {
  index: number;
  timestamp: number;
  data: string;
  previousHash: string;
  nonce: number;
}

function calculateBlockHash(block: Block): string {
  const blockString = JSON.stringify(block);
  return sm3Digest(blockString);
}

function mineBlock(block: Block, difficulty: number): string {
  const target = '0'.repeat(difficulty);
  
  while (true) {
    block.nonce++;
    const hash = calculateBlockHash(block);
    
    if (hash.startsWith(target)) {
      return hash;
    }
  }
}
```

### 5. 内容去重

```typescript
import { sm3Digest } from 'gmkitx';

const contentHashMap = new Map<string, string>();

function isDuplicate(content: string): boolean {
  const hash = sm3Digest(content);
  
  if (contentHashMap.has(hash)) {
    return true; // 重复内容
  }
  
  contentHashMap.set(hash, content);
  return false;
}
```

## 🔧 高级用法

### HMAC-SM3（密钥哈希）

虽然 gmkitx 不直接提供 HMAC-SM3，但可以手动实现：

```typescript
import { sm3Digest } from 'gmkitx';

function hmacSM3(key: string, message: string): string {
  const blockSize = 64; // SM3 块大小 512位/8 = 64字节
  
  // 如果密钥长度超过块大小，先哈希
  if (key.length > blockSize) {
    key = sm3Digest(key);
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
  const innerHash = sm3Digest(ipad + message);
  return sm3Digest(opad + innerHash);
}

// 使用
const hmac = hmacSM3('secret-key', 'message');
```

### 计算文件指纹

```typescript
import { SM3 } from 'gmkitx';

interface FileFingerprint {
  hash: string;
  size: number;
  chunkCount: number;
}

function calculateFileFingerprint(
  fileData: Uint8Array,
  chunkSize: number = 1024 * 1024 // 1MB
): FileFingerprint {
  const sm3 = new SM3();
  let chunkCount = 0;
  
  for (let i = 0; i < fileData.length; i += chunkSize) {
    const chunk = fileData.slice(i, i + chunkSize);
    sm3.update(chunk);
    chunkCount++;
  }
  
  return {
    hash: sm3.digest(),
    size: fileData.length,
    chunkCount
  };
}
```

### 批量哈希计算

```typescript
import { sm3Digest } from 'gmkitx';

// 并行计算多个哈希值
function batchHash(items: string[]): Map<string, string> {
  const results = new Map<string, string>();
  
  for (const item of items) {
    results.set(item, sm3Digest(item));
  }
  
  return results;
}

// 使用
const items = ['item1', 'item2', 'item3'];
const hashes = batchHash(items);
```

## ⚙️ 性能优化

### 1. 重用实例

```typescript
import { SM3 } from 'gmkitx';

// 创建实例并重用
const sm3 = new SM3();

function hashMultipleMessages(messages: string[]): string[] {
  return messages.map(msg => {
    sm3.reset(); // 重置状态
    sm3.update(msg);
    return sm3.digest();
  });
}
```

### 2. 流式处理大数据

```typescript
// ✅ 推荐：流式处理
const sm3 = new SM3();
for (const chunk of largeData) {
  sm3.update(chunk);
}
const hash = sm3.digest();

// ❌ 不推荐：一次性处理
const hash = sm3Digest(largeDataAsString); // 可能导致内存问题
```

## ⚠️ 注意事项

1. **哈希不可逆**: SM3 是单向函数，无法从哈希值还原原始数据
2. **雪崩效应**: 输入微小变化会导致输出完全不同
3. **固定长度**: 无论输入多大，输出始终是 256 位（32 字节）
4. **编码一致性**: 确保输入数据编码一致（UTF-8）
5. **不要用于加密**: SM3 是哈希算法，不是加密算法
6. **盐值**: 存储密码时务必加盐（salt）

## 🔍 常见问题

### Q: SM3 和 SHA-256 有什么区别？

A: SM3 和 SHA-256 都输出 256 位哈希值，但：
- SM3 是中国国家标准
- SM3 的内部结构和设计不同
- 两者不兼容，对相同输入产生不同的哈希值
- 安全强度相当

### Q: 如何验证 SM3 实现的正确性？

A: 可以使用官方测试向量验证：
```typescript
// GM/T 0004-2012 标准测试向量
const testVector = 'abc';
const expectedHash = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
const actualHash = sm3Digest(testVector);
console.log(actualHash === expectedHash); // true
```

### Q: 可以用 SM3 加密数据吗？

A: 不可以。SM3 是哈希算法，不是加密算法。哈希是单向的，无法解密。如需加密，请使用 SM4 或 SM2。

### Q: 如何处理二进制数据？

A: SM3 支持多种输入格式：
```typescript
// 字符串
sm3Digest('text');

// 字节数组
sm3Digest(new Uint8Array([1, 2, 3]));

// Buffer (Node.js)
sm3Digest(Buffer.from('data'));
```

## 🎯 性能基准

在现代硬件上的性能参考（仅供参考）：

| 数据大小 | 处理时间 |
|---------|---------|
| 1 KB | < 1 ms |
| 1 MB | ~10 ms |
| 10 MB | ~100 ms |
| 100 MB | ~1 s |

> 注: 实际性能取决于硬件配置和运行环境

## 📚 相关资源

- [SM3 标准文档](http://www.gmbz.org.cn/main/viewfile/2018011001400692565.html)
- [ISO/IEC 10118-3:2018](https://www.iso.org/standard/67116.html)
- [密码杂凑算法基础](https://en.wikipedia.org/wiki/Cryptographic_hash_function)

## 🔗 相关算法

- [SM2 - 椭圆曲线公钥密码算法](./SM2.md)
- [SM4 - 分组密码算法](./SM4.md)
- [SHA - 国际标准哈希算法](./SHA.md)
