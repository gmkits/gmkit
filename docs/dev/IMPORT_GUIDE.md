---
title: 导入方式指南
icon: download
order: 2
author: GMKitX Team
date: 2024-11-22
category:
  - 开发指南
  - 使用方法
tag:
  - 导入
  - ES Module
  - CommonJS
  - Tree-shaking
---

# GMKit 导入方式示例

GMKit 支持多种灵活的导入方式，满足不同场景的需求。

## 1. 算法模块导入（推荐）

这是最推荐的导入方式，可以清晰地组织代码，并且支持 tree-shaking。

```typescript
import { sm2, sm3, sm4, zuc } from 'gmkitx';

// 使用 SM2
const keyPair = sm2.generateKeyPair();
const encrypted = sm2.encrypt(keyPair.publicKey, 'Hello');
const decrypted = sm2.decrypt(keyPair.privateKey, encrypted);

// 使用 SM3
const hash = sm3.digest('Hello, World!');
const mac = sm3.hmac('secret', 'data');

// 使用 SM4
const key = '0123456789abcdeffedcba9876543210';
const cipher = sm4.encrypt(key, 'Hello', { mode: 'ecb', padding: 'pkcs7' });
const plain = sm4.decrypt(key, cipher, { mode: 'ecb', padding: 'pkcs7' });

// 使用 ZUC
const zucKey = '00112233445566778899aabbccddeeff';
const zucIv = 'ffeeddccbbaa99887766554433221100';
const zucCipher = zuc.encrypt(zucKey, zucIv, 'Hello');
const zucPlain = zuc.decrypt(zucKey, zucIv, zucCipher);
```

## 2. 具名函数导入（向后兼容）

这种方式导入特定的函数，适合只需要使用少量功能的场景。

```typescript
import { 
  generateKeyPair, 
  sm2Encrypt, 
  sm2Decrypt,
  digest,
  hmac,
  sm4Encrypt,
  sm4Decrypt,
  zucEncrypt,
  zucDecrypt,
  CipherMode,
  PaddingMode
} from 'gmkitx';

// 直接使用函数
const keyPair = generateKeyPair();
const encrypted = sm2Encrypt(keyPair.publicKey, 'Hello');
const hash = digest('Hello');
const cipher = sm4Encrypt(key, 'Hello', { 
  mode: CipherMode.ECB, 
  padding: PaddingMode.PKCS7 
});
```

## 3. 命名空间导入

适合需要在运行时动态选择算法的场景。

```typescript
import * as gmkitx from 'gmkitx';

// 通过命名空间访问
const keyPair = gmkit.sm2.generateKeyPair();
const hash = gmkit.sm3.digest('Hello');
const cipher = gmkit.sm4.encrypt(key, 'Hello', { mode: 'ecb' });
const zucCipher = gmkit.zuc.encrypt(zucKey, zucIv, 'Hello');

// 也可以访问具名导出
const hash2 = gmkit.digest('Hello');
const encrypted = gmkit.sm2Encrypt(keyPair.publicKey, 'Hello');
```

## 4. CommonJS 导入

在 Node.js 环境中使用 require 导入。

```javascript
// 导入算法模块
const { sm2, sm3, sm4, zuc } = require('gmkitx');

const keyPair = sm2.generateKeyPair();
const hash = sm3.digest('Hello');

// 或者导入具名函数
const { digest, sm4Encrypt } = require('gmkitx');
const hash2 = digest('Hello');
```

## 5. UMD（浏览器直接引入）

```html
<script src="https://unpkg.com/gmkitx@latest/dist/index.global.js"></script>
<script>
  // GMKit 会被注册为全局变量
  
  // 方式 1: 使用算法模块
  const keyPair = GMKit.sm2.generateKeyPair();
  const hash = GMKit.sm3.digest('Hello, World!');
  
  // 方式 2: 使用具名函数（通过 default 访问）
  const hash2 = GMKit.default.digest('Hello');
  const encrypted = GMKit.default.sm2Encrypt(keyPair.publicKey, 'Hello');
</script>
```

## 6. 动态导入

适合代码分割和按需加载的场景。

```typescript
// 只在需要时加载 SM2
async function useSM2() {
  const { sm2 } = await import('gmkit');
  const keyPair = sm2.generateKeyPair();
  return keyPair;
}

// 按需加载特定功能
async function hashData(data: string) {
  const { digest } = await import('gmkit');
  return digest(data);
}
```

## 模块结构说明

### sm2 模块
包含所有 SM2 椭圆曲线密码算法相关的函数和类：
- `generateKeyPair()` - 生成密钥对
- `getPublicKeyFromPrivateKey()` - 从私钥派生公钥
- `encrypt()` / `decrypt()` - 加密/解密
- `sign()` / `verify()` - 签名/验签
- `keyExchange()` - 密钥交换
- `SM2` - SM2 类（面向对象 API）

### sm3 模块
包含所有 SM3 哈希算法相关的函数和类：
- `digest()` - 计算哈希摘要
- `hmac()` - 计算 HMAC
- `SM3` - SM3 类（面向对象 API）

### sm4 模块
包含所有 SM4 分组密码算法相关的函数和类：
- `encrypt()` / `decrypt()` - 加密/解密
- `SM4` - SM4 类（面向对象 API）

### zuc 模块
包含所有 ZUC 流密码算法相关的函数：
- `encrypt()` / `decrypt()` - 加密/解密
- `getKeystream()` - 生成密钥流
- `eea3()` - EEA3 加密算法
- `eia3()` - EIA3 完整性算法
- `ZUCState` - ZUC 状态类

## 注意事项

1. **tree-shaking**: 使用 ES6 模块导入（`import`）可以实现 tree-shaking，只打包实际使用的代码。

2. **依赖关系**: 
   - SM2 内部使用 SM3 进行哈希计算
   - 导入 SM2 时会自动包含所需的 SM3 功能
   - 各个模块可以独立使用

3. **类型支持**: 所有导入方式都提供完整的 TypeScript 类型定义。

4. **向后兼容**: 现有的具名函数导入方式完全兼容，不会破坏现有代码。
