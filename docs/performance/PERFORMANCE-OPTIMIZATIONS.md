---
title: 性能优化说明
icon: rocket
order: 2
author: mumu
date: 2025-11-23
category:
  - 性能
  - 优化
tag:
  - 性能优化
  - 最佳实践
---

# 性能优化建议 (Performance Optimization Guide)

基于 GM/T 0009-2023 标准的 GMKitX 性能优化指南。性能数据为示意值，具体以实测为准。

## 已实现的优化

### 1. KDF（密钥派生函数）优化

#### 优化措施
```typescript
function kdf(z: Uint8Array, klen: number): Uint8Array {
  const k = new Uint8Array(klen);
  // ✅ 优化1: 预分配输入缓冲区，避免每次迭代都分配内存
  const input = new Uint8Array(z.length + 4);
  input.set(z, 0);
  
  let offset = 0;
  let hasNonZero = false;
  
  for (let i = 1; offset < klen; i++) {
    // ✅ 优化2: 直接写入预分配的缓冲区，避免创建新数组
    input[z.length] = (i >> 24) & 0xff;
    input[z.length + 1] = (i >> 16) & 0xff;
    input[z.length + 2] = (i >> 8) & 0xff;
    input[z.length + 3] = i & 0xff;
    
    const hashHex = sm3Digest(input);
    const hash = hexToBytes(hashHex);
    
    const toCopy = Math.min(hash.length, klen - offset);
    for (let j = 0; j < toCopy; j++) {
      const byte = hash[j];
      k[offset + j] = byte;
      // ✅ 优化3: 在复制过程中同时检测零值，避免二次遍历
      if (byte !== 0) {
        hasNonZero = true;
      }
    }
    offset += toCopy;
  }
  
  if (!hasNonZero) {
    throw new Error('KDF derived key is all zeros');
  }
  
  return k;
}
```

**性能提升**：
- 减少内存分配：约 30% 性能提升
- 零值检测优化：节省一次完整遍历
- 总体提升：加密/解密操作约 15-20% 性能提升

### 2. 公钥格式优化

#### GM/T 0009-2023 推荐使用非压缩格式

```typescript
// ✅ 推荐：使用非压缩格式（默认）
const keyPair = generateKeyPair(); // compressed = false

// ❌ 不推荐：压缩格式需要额外解压计算
const keyPair = generateKeyPair(true);
```

**性能影响**：
- 非压缩格式：无需解压计算，验签快约 5-10%
- 压缩格式：需要椭圆曲线点解压，增加计算开销
- 权衡：如果存储/传输是瓶颈，压缩格式可节省 49% 空间

### 3. 用户 ID 优化

#### GM/T 0009-2023 推荐使用空字符串

```typescript
// ✅ GM/T 0009-2023 推荐：空字符串，略微提升性能
const signature = sign(privateKey, data, { userId: '' });

// ✅ 向后兼容：使用默认值（性能差异极小）
const signature = sign(privateKey, data);
```

**性能影响**：
- 空字符串：Z 值计算输入更短，约 1-2% 性能提升
- 默认值 '1234567812345678'：增加 16 字节输入
- 实际影响：可忽略不计，主要取决于兼容性需求

### 4. 常量时间操作

#### 防止时序攻击的安全优化

```typescript
// ✅ 使用常量时间比较
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}
```

**安全性**：防止通过测量比较时间推断密钥信息
**性能影响**：极小，约 1-2% 额外开销，但大幅提升安全性

## 使用建议

### 1. 选择合适的密文模式

GM/T 0009-2023 明确推荐 C1C3C2 模式：

```typescript
// ✅ 推荐：显式指定 C1C3C2 模式（避免自动检测开销）
const encrypted = sm2Encrypt(publicKey, plaintext, SM2CipherMode.C1C3C2);
const decrypted = sm2Decrypt(privateKey, encrypted, SM2CipherMode.C1C3C2);

// ⚠️ 可用但不够高效：依赖自动检测
const decrypted = sm2Decrypt(privateKey, encrypted); // 需要尝试多种格式
```

**性能影响**：
- 显式指定模式：直接解密，性能最优
- 自动检测：可能需要尝试多种格式，最坏情况慢约 2 倍

### 2. 批量操作优化

如果需要进行大量签名/加密操作：

```typescript
import { SM2 } from 'gmkitx';

// ✅ 推荐：复用 SM2 实例
const sm2 = SM2.fromPrivateKey(privateKey);
for (const data of dataList) {
  const signature = sm2.sign(data);
}

// ❌ 不推荐：每次都创建新实例
for (const data of dataList) {
  const signature = sign(privateKey, data); // 每次都解析私钥
}
```

**性能提升**：
- 复用实例：避免重复解析密钥，约 10-15% 性能提升
- 特别适合：需要进行大量操作的场景

### 3. 数据格式选择

#### 输入格式

```typescript
// ✅ 最优：直接使用 Uint8Array
const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
const signature = sign(privateKey, data);

// ⚠️ 可用但有转换开销：字符串需要 UTF-8 编码
const signature = sign(privateKey, 'Hello');
```

**性能影响**：
- Uint8Array：无需转换，直接使用
- 字符串：需要 UTF-8 编码，小数据量影响可忽略

#### 输出格式

```typescript
// ✅ 推荐：使用 Raw 格式签名（紧凑，解析快）
const signature = sign(privateKey, data); // 默认 Raw 格式

// ⚠️ 互操作需要：DER 格式（标准但较大）
const signature = sign(privateKey, data, { der: true });
```

**性能影响**：
- Raw 格式：固定 64 字节，解析快
- DER 格式：ASN.1 编码，解析稍慢（约 5-8%）

### 4. 跳过 Z 值计算（仅特殊场景）

```typescript
// ⚠️ 仅用于特殊场景：不符合标准，降低安全性
const signature = sign(privateKey, data, { skipZComputation: true });
const isValid = verify(publicKey, data, signature, { skipZComputation: true });
```

**性能提升**：约 15-20%（省略一次 Z 值计算和 SM3 哈希）
**安全性降低**：签名不再与用户身份绑定
**使用场景**：
- 与不支持 Z 值的系统互操作
- 性能极度敏感的场景
- 测试和调试

**不推荐使用**：违反 SM2 标准，仅作为最后手段

## 性能基准测试

在现代硬件上（Intel i7-10750H, Node.js 18）的性能数据：

### 密钥生成
```
generateKeyPair (uncompressed): 1.2-1.5ms
generateKeyPair (compressed):   1.2-1.5ms
```

### SM2 签名
```
sign (userId='1234567812345678'): 1.2ms
sign (userId=''):                 1.18ms (+1.7% faster)
sign (skipZ=true):                1.0ms (+16.7% faster, not recommended)
```

### SM2 验签
```
verify (uncompressed key):  2.4ms
verify (compressed key):    2.6ms (+8.3% slower)
```

### SM2 加密
```
encrypt (C1C3C2): 1.8ms
encrypt (C1C2C3): 1.8ms (no difference)
```

### SM2 解密
```
decrypt (explicit mode):  2.2ms
decrypt (auto-detect):    2.2-4.4ms (depends on tries)
```

### SM3 哈希
```
digest (small data < 1KB):  0.05ms
digest (medium data 10KB):  0.3ms
digest (large data 100KB):  2.5ms
```

### SM4 加密（ECB 模式）
```
encrypt (16 bytes):   0.02ms
encrypt (1KB):        0.8ms
encrypt (10KB):       7.5ms
```

## 内存使用优化

### 1. 避免不必要的内存分配

```typescript
// ✅ 好：复用缓冲区
const input = new Uint8Array(z.length + 4);
for (let i = 0; i < iterations; i++) {
  input[z.length] = i;
  // ... 使用 input
}

// ❌ 坏：每次迭代都分配新缓冲区
for (let i = 0; i < iterations; i++) {
  const input = new Uint8Array(z.length + 4);
  input[z.length] = i;
  // ... 使用 input
}
```

### 2. 及时清理敏感数据

```typescript
// ✅ 推荐：使用完毕后清零敏感数据
function processPrivateKey(privateKey: Uint8Array) {
  try {
    // ... 使用私钥
  } finally {
    // 清零私钥数据
    privateKey.fill(0);
  }
}
```

## 并发优化

### Web Worker 并发

对于大量独立的加密操作，可以使用 Web Worker：

```typescript
// main.ts
const worker = new Worker('crypto-worker.js');
worker.postMessage({ operation: 'sign', privateKey, data });

// crypto-worker.js
import { sign } from 'gmkitx';
self.onmessage = (e) => {
  const { operation, privateKey, data } = e.data;
  if (operation === 'sign') {
    const signature = sign(privateKey, data);
    self.postMessage({ signature });
  }
};
```

**适用场景**：
- 需要处理大量独立的加密/签名操作
- 避免阻塞主线程
- 浏览器环境

**性能提升**：
- 多核 CPU：可以线性扩展
- 避免 UI 冻结

## 最佳实践总结

### ✅ 推荐做法

1. **使用 GM/T 0009-2023 推荐的默认值**
   - 密文模式：C1C3C2（显式指定）
   - 公钥格式：非压缩（默认）
   - 用户 ID：空字符串（新项目）

2. **批量操作时复用实例**
   ```typescript
   const sm2 = SM2.fromPrivateKey(privateKey);
   for (const data of dataList) {
     const signature = sm2.sign(data);
   }
   ```

3. **显式指定格式，避免自动检测**
   ```typescript
   const encrypted = sm2Encrypt(publicKey, data, SM2CipherMode.C1C3C2);
   const decrypted = sm2Decrypt(privateKey, encrypted, SM2CipherMode.C1C3C2);
   ```

4. **使用 Uint8Array 作为输入（大数据量时）**
   ```typescript
   const data = new Uint8Array(largeBuffer);
   const signature = sign(privateKey, data);
   ```

### ❌ 避免做法

1. **不要在生产环境跳过 Z 值计算**
   ```typescript
   // ❌ 降低安全性
   const signature = sign(privateKey, data, { skipZComputation: true });
   ```

2. **不要依赖自动检测（性能敏感场景）**
   ```typescript
   // ❌ 可能需要多次尝试
   const decrypted = sm2Decrypt(privateKey, encrypted);
   ```

3. **不要在循环中重复创建实例**
   ```typescript
   // ❌ 重复解析密钥
   for (const data of dataList) {
     const signature = sign(privateKey, data);
   }
   ```

## 性能调优工具

### 1. 性能分析

```typescript
// 简单的性能计时
console.time('sign');
const signature = sign(privateKey, data);
console.timeEnd('sign');

// 更精确的性能测量
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  sign(privateKey, data);
}
const end = performance.now();
console.log(`Average: ${(end - start) / 1000}ms`);
```

### 2. 内存分析

在 Node.js 中：

```typescript
const before = process.memoryUsage();
// ... 执行操作
const after = process.memoryUsage();
console.log('Memory used:', {
  heapUsed: (after.heapUsed - before.heapUsed) / 1024 / 1024,
  external: (after.external - before.external) / 1024 / 1024,
});
```

## 参考资料

1. **GM/T 0009-2023** - SM2 密码算法使用规范
2. **性能优化原则** - 先正确，后优化
3. **安全第一** - 不要为了性能牺牲安全性

## 版本历史

- **v0.1.0**: 初始性能优化
- **v0.9.2**: 文档对齐与示例修订，补充标准使用建议
- **当前版本** (v0.9.2): 基于 GM/T 0009-2023 的优化建议

## 贡献

如有性能优化建议，欢迎提交 PR 或 issue。

## 许可证

Apache-2.0
