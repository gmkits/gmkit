# SMKit

<div align="center">

[![npm version](https://img.shields.io/npm/v/smkit.svg?style=flat-square)](https://www.npmjs.com/package/smkit)
[![npm downloads](https://img.shields.io/npm/dm/smkit.svg?style=flat-square)](https://www.npmjs.com/package/smkit)
[![License](https://img.shields.io/npm/l/smkit.svg?style=flat-square)](https://github.com/linyuliu/smkit/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

**中国国密算法（SM2、SM3、SM4、ZUC）和国际标准算法（SHA-256、SHA-384、SHA-512）的 TypeScript 实现**

[简体中文](./README.md) | [English](./README.en.md)

</div>

---

## 📑 目录

- [什么是 SMKit？](#什么是-smkit)
- [为什么选择 SMKit？](#为什么选择-smkit)
- [特性](#特性)
- [快速开始](#快速开始)
  - [安装](#安装)
  - [5 分钟上手](#5-分钟上手)
- [在线演示](#在线演示)
- [使用指南](#使用指南)
- [算法对比](#算法对比)
- [API 文档](#api-参考)
- [常见问题](#常见问题)
- [文档](#文档)

---

## 什么是 SMKit？

SMKit 是一个功能完整的国密算法工具库，让您在前端和 Node.js 环境中轻松使用中国商用密码算法（国密算法）。

**国密算法是什么？**
国密算法是由中国国家密码管理局制定的商用密码标准，包括 SM2（非对称加密）、SM3（哈希算法）、SM4（对称加密）和 ZUC（流密码）等。这些算法在金融、政务、电信等领域被广泛应用，特别是在需要符合中国信息安全法规的场景中。

**SMKit 能做什么？**
- 🔐 **数据加密**: 使用 SM2 或 SM4 加密敏感数据
- ✍️ **数字签名**: 使用 SM2 对数据进行签名和验证
- 🔑 **密钥交换**: 安全地在双方之间协商共享密钥
- 🎲 **哈希计算**: 使用 SM3 或 SHA 系列算法生成数据摘要
- 📡 **流加密**: 使用 ZUC 算法进行高速数据加密

---

## 为什么选择 SMKit？

### 与其他国密库的对比

| 特性 | SMKit                  | 其他库 |
|------|------------------------|--------|
| **类型支持** | ✅ 完整的 TypeScript 类型定义  | ⚠️ 部分库缺少类型 |
| **模块化** | ✅ 支持 Tree-shaking，按需加载 | ⚠️ 通常需要加载整个库 |
| **双 API 设计** | ✅ 函数式 + 面向对象           | ❌ 通常只有一种 |
| **国际标准** | ✅ 同时支持国密和 SHA 系列       | ⚠️ 大多只支持国密 |
| **浏览器兼容** | ✅ 支持 UMD 直接引入          | ⚠️ 部分只支持 Node.js |
| **文档完善度** | ✅ 中英文详细文档 + 示例         | ⚠️ 文档通常较简略 |
| **依赖管理** | ✅ 2 个生产依赖            | ⚠️ 依赖通常较多 |
| **维护状态** | ✅ 持续维护更新               | ⚠️ 部分已停止维护 |

### 核心优势

- **生产就绪**: 通过 267+ 单元测试，覆盖核心功能和常见使用场景
- **标准合规**: 严格遵循 GM/T 国家标准（GM/T 0003-2012、GM/T 0004-2012 等）
- **易于集成**: 提供详细的 [Hutool 集成指南](./docs/HUTOOL-INTEGRATION.zh-CN.md)，轻松对接 Java 后端
- **开发体验**: 清晰的错误提示、完整的文档、丰富的示例代码

---

## 特性

- **✨ 纯粹性**: 核心国密算法使用纯 TypeScript 实现，国际算法基于 @noble/hashes 高性能库
- **⚡ 高性能**: 内部数据处理使用 `Uint8Array` 提升性能
- **🔧 现代化**: 使用 TypeScript 编写，提供一流的类型支持，ES 模块优先，兼容 CommonJS
- **🌐 同构性**: 在 Node.js 和现代浏览器中无缝运行
- **🎨 灵活性**: 支持多种输出格式（hex、base64），适应不同使用场景
- **📚 国际标准**: 除国密算法外，还支持 SHA 系列哈希算法

---

## 快速开始

### 安装

```bash
# 使用 npm
npm install smkit

# 使用 yarn
yarn add smkit

# 使用 pnpm
pnpm add smkit
```

### 5 分钟上手

选择您熟悉的模块格式开始使用：

#### **方式 1: ES Module（推荐 ⭐）**

适用于现代前端项目（Vue、React、Angular 等）和 Node.js (>= 18)

```typescript
import { digest, sm4Encrypt, generateKeyPair } from 'smkit';

// 1. 哈希计算 - 最简单的入门
const hash = digest('Hello, SM3!');
console.log('哈希值:', hash);

// 2. 对称加密 - 加密敏感数据
const key = '0123456789abcdeffedcba9876543210'; // 128 位密钥
const encrypted = sm4Encrypt(key, '我的密码');
console.log('加密后:', encrypted);

// 3. 非对称加密 - 生成密钥对
const keyPair = generateKeyPair();
console.log('公钥:', keyPair.publicKey);
console.log('私钥:', keyPair.privateKey);
```

#### **方式 2: CommonJS**

适用于传统 Node.js 项目

```javascript
const { digest, sm4Encrypt, generateKeyPair } = require('smkit');

// 使用方法与 ES Module 相同
const hash = digest('Hello, SM3!');
```

#### **方式 3: UMD（浏览器直接引入）**

适用于不使用构建工具的项目

```html
<!DOCTYPE html>
<html>
<head>
  <title>SMKit 快速开始</title>
</head>
<body>
  <script src="https://unpkg.com/smkit@latest/dist/smkit.umd.js"></script>
  <script>
    // 通过全局对象 SMKit 访问所有功能
    const hash = SMKit.digest('Hello, World!');
    console.log('哈希值:', hash);
    
    // 加密示例
    const key = '0123456789abcdeffedcba9876543210';
    const encrypted = SMKit.sm4Encrypt(key, '秘密信息');
    console.log('加密后:', encrypted);
  </script>
</body>
</html>
```

### 完整示例：实现一个简单的加密通信

```typescript
import { generateKeyPair, sm2Encrypt, sm2Decrypt, sign, verify } from 'smkit';

// 场景：Alice 要发送加密消息给 Bob

// 1. Bob 生成密钥对（公钥可以公开，私钥必须保密）
const bobKeyPair = generateKeyPair();

// 2. Alice 使用 Bob 的公钥加密消息
const message = '这是一条秘密消息';
const encrypted = sm2Encrypt(bobKeyPair.publicKey, message);
console.log('加密后的消息:', encrypted);

// 3. Bob 使用自己的私钥解密消息
const decrypted = sm2Decrypt(bobKeyPair.privateKey, encrypted);
console.log('解密后的消息:', decrypted); // 输出: '这是一条秘密消息'

// 4. Alice 对消息进行签名（证明消息确实来自 Alice）
const aliceKeyPair = generateKeyPair();
const signature = sign(aliceKeyPair.privateKey, message);

// 5. Bob 验证签名（确认消息来源）
const isValid = verify(aliceKeyPair.publicKey, message, signature);
console.log('签名验证:', isValid ? '✅ 通过' : '❌ 失败');
```

---

## 在线演示

想快速体验 SMKit？我们提供了两种交互式演示页面：

### Vue 3 现代化演示（推荐）

基于 Vue 3 + TypeScript 的现代化 Web 应用，提供更好的用户体验：

```bash
# 克隆仓库
git clone https://github.com/linyuliu/smkit.git
cd smkit

# 安装依赖
npm install
cd demo-vue && npm install

# 启动 Vue 演示
npm run dev
```

功能特点：
- 🔐 **信创国密算法**: SM2、SM3、SM4 完整测试
- 🌐 **国际标准算法**: AES、RSA、SHA（即将推出）
- 🛠️ **实用工具**: 密钥生成、格式转换、签名验证
- 📱 响应式设计，支持移动端
- 🎨 现代化 UI，流畅的用户体验

[查看 Vue 演示说明](./demo-vue/README.md)

### H5 简单演示

传统 HTML5 演示页面：

```bash
# 启动演示
npm run demo
```

在浏览器中访问演示页面，可以：
- ✅ 测试 SM3 哈希计算
- ✅ 测试 SM4 加密解密
- ✅ 测试 SM2 密钥生成、签名和验签

[查看 H5 演示说明](./demo/README.md)

---

## 算法对比

### 国密算法 vs 国际标准算法

了解不同算法的特点和适用场景，帮助您选择最合适的方案：

| 特性 | SM2 | RSA | SM3 | SHA-256 | SM4 | AES |
|------|-----|-----|-----|---------|-----|-----|
| **类型** | 非对称加密 | 非对称加密 | 哈希算法 | 哈希算法 | 对称加密 | 对称加密 |
| **密钥长度** | 256 位 | 2048-4096 位 | - | - | 128 位 | 128/192/256 位 |
| **性能特点** | ECC 256 位 | RSA 2048+ 位 | 快速 | 快速 | 快速 | 快速 |
| **安全级别** | 256 位 | 2048+ 位 | 256 位 | 256 位 | 128 位 | 128/192/256 位 |
| **标准** | GM/T 0003 | PKCS#1 | GM/T 0004 | FIPS 180-4 | GM/T 0002 | FIPS 197 |
| **合规性** | ✅ 中国信创 | ✅ 国际通用 | ✅ 中国信创 | ✅ 国际通用 | ✅ 中国信创 | ✅ 国际通用 |

### 各算法的典型应用场景

#### **SM2 - 非对称加密**
```typescript
// 适用场景
✅ 数字签名（合同、文档认证）
✅ 密钥交换（建立安全通信）
✅ 加密小量数据（如密钥、密码）
❌ 不适合加密大文件（性能低）

// 典型用例
const keyPair = generateKeyPair();
const signature = sign(keyPair.privateKey, '重要合同内容');
```

#### **SM3 - 哈希算法**
```typescript
// 适用场景
✅ 数据完整性校验
✅ 密码存储（加盐哈希）
✅ 数字指纹生成
✅ 区块链应用

// 典型用例
const hash = digest('用户密码' + '随机盐值');
// 存储 hash 而不是明文密码
```

#### **SM4 - 对称加密**
```typescript
// 适用场景
✅ 大量数据加密（文件、数据库）
✅ 实时通信加密
✅ 存储加密
✅ 高性能要求场景

// 典型用例
const key = '0123456789abcdeffedcba9876543210';
const encrypted = sm4Encrypt(key, '大量敏感数据...');
```

#### **ZUC - 流密码**
```typescript
// 适用场景
✅ 移动通信（4G/5G LTE）
✅ 实时视频/音频加密
✅ 低延迟加密需求
✅ 硬件实现优化

// 典型用例
const keystream = zucEncrypt(key, iv, '实时数据流');
```

### 如何选择算法？

**🔒 需要加密数据？**
- 小量数据（< 100 字节）：使用 **SM2**
- 大量数据（> 100 字节）：使用 **SM4**
- 实时流数据：使用 **ZUC**

**✍️ 需要数字签名？**
- 使用 **SM2** 的 `sign()` 和 `verify()` 函数

**🔑 需要验证数据完整性？**
- 使用 **SM3** 或 **SHA-256**

**🤝 需要密钥交换？**
- 使用 **SM2** 的 `keyExchange()` 函数

---

## 使用指南

### 输出格式配置

SMKit 支持灵活的输出格式配置，所有加密和哈希函数都支持以下格式：

- **hex**（十六进制）：默认格式，易于阅读和调试
- **base64**：更紧凑的格式，节省约 25% 空间，适合网络传输

```typescript
import { digest, OutputFormat } from 'smkit';

// 十六进制格式（默认）
const hexHash = digest('Hello, World!');
console.log(hexHash); // "9b71d224bd62f3..."

// Base64 格式
const base64Hash = digest('Hello, World!', { outputFormat: OutputFormat.BASE64 });
console.log(base64Hash); // "m3HSJLLy83h..."
```

详细使用指南请参阅 [国际标准算法使用指南](./docs/INTERNATIONAL-ALGORITHMS.zh-CN.md)

### 函数式 API

#### SM3 哈希算法

```typescript
import { digest, hmac, OutputFormat } from 'smkit';

// 计算哈希（默认 hex 格式）
const hash = digest('Hello, SM3!');
console.log(hash); // 小写十六进制字符串（64 个字符）

// Base64 格式输出
const base64Hash = digest('Hello, SM3!', { outputFormat: OutputFormat.BASE64 });
console.log(base64Hash);

// HMAC
const mac = hmac('secret-key', 'data to authenticate');
console.log(mac); // 小写十六进制字符串（64 个字符）

// HMAC with Base64 output
const base64Mac = hmac('secret-key', 'data', { outputFormat: OutputFormat.BASE64 });
```

#### SHA 哈希算法（国际标准）

SMKit 还提供高性能的 SHA 系列哈希算法：

```typescript
import { sha256, sha384, sha512, hmacSha256, OutputFormat } from 'smkit';

// SHA-256
const hash256 = sha256('Hello, World!');
console.log(hash256); // 十六进制，64 个字符

// SHA-256 with Base64 output
const hash256Base64 = sha256('Hello, World!', { outputFormat: OutputFormat.BASE64 });

// SHA-384
const hash384 = sha384('Hello, World!'); // 96 个字符

// SHA-512
const hash512 = sha512('Hello, World!'); // 128 个字符

// HMAC-SHA256
const mac = hmacSha256('secret-key', 'message');
console.log(mac);
```

详细文档请参阅 [国际标准算法使用指南](./docs/INTERNATIONAL-ALGORITHMS.zh-CN.md)

#### SM4 分组密码

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode, PaddingMode } from 'smkit';

const key = '0123456789abcdeffedcba9876543210'; // 128 位密钥（32 个十六进制字符）
const plaintext = 'Hello, SM4!';

// ECB 模式（电码本模式）
const encrypted = sm4Encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
const decrypted = sm4Decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });

// CBC 模式（分组链接模式）
const iv = 'fedcba98765432100123456789abcdef'; // 128 位 IV（32 个十六进制字符）
const encryptedCBC = sm4Encrypt(key, plaintext, { mode: CipherMode.CBC, padding: PaddingMode.PKCS7, iv });
const decryptedCBC = sm4Decrypt(key, encryptedCBC, { mode: CipherMode.CBC, padding: PaddingMode.PKCS7, iv });

// CTR 模式（计数器模式）- 流密码模式，无需填充
const counter = '00000000000000000000000000000000'; // 128 位计数器/随机数
const encryptedCTR = sm4Encrypt(key, plaintext, { mode: CipherMode.CTR, iv: counter });
const decryptedCTR = sm4Decrypt(key, encryptedCTR, { mode: CipherMode.CTR, iv: counter });

// CFB 模式（密文反馈模式）- 流密码模式，无需填充
const encryptedCFB = sm4Encrypt(key, plaintext, { mode: CipherMode.CFB, iv });
const decryptedCFB = sm4Decrypt(key, encryptedCFB, { mode: CipherMode.CFB, iv });

// OFB 模式（输出反馈模式）- 流密码模式，无需填充
const encryptedOFB = sm4Encrypt(key, plaintext, { mode: CipherMode.OFB, iv });
const decryptedOFB = sm4Decrypt(key, encryptedOFB, { mode: CipherMode.OFB, iv });

// GCM 模式（伽罗瓦/计数器模式）- 认证加密模式
const gcmIv = '000000000000000000000000'; // 96 位 IV（24 个十六进制字符，GCM 专用）
const aad = 'Additional Authenticated Data'; // 可选的额外认证数据
const gcmResult = sm4Encrypt(key, plaintext, { mode: CipherMode.GCM, iv: gcmIv, aad });
console.log(gcmResult); // { ciphertext: '...', tag: '...' }
const decryptedGCM = sm4Decrypt(key, gcmResult, { mode: CipherMode.GCM, iv: gcmIv, aad });
```

#### SM2 椭圆曲线密码

```typescript
import { generateKeyPair, getPublicKeyFromPrivateKey, sm2Encrypt, sm2Decrypt, sign, verify, SM2CipherMode } from 'smkit';

// 生成密钥对（使用 @noble/curves 提供的安全随机数生成）
const keyPair = generateKeyPair();
console.log(keyPair.publicKey);  // 十六进制字符串，04 开头的非压缩格式
console.log(keyPair.privateKey); // 十六进制字符串，32 字节

// 从私钥派生公钥
const publicKey = getPublicKeyFromPrivateKey(keyPair.privateKey);

// 加密/解密
const plaintext = 'Hello, SM2!';
// 支持两种密文模式：C1C3C2（默认）和 C1C2C3
const encrypted = sm2Encrypt(keyPair.publicKey, plaintext, SM2CipherMode.C1C3C2);

// 解密支持自动格式检测（可选择不指定模式）
// 根据密文首字节自动识别：
// - 0x30: ASN.1 格式
// - 0x04: C1 为非压缩点格式
// - 0x02/0x03: C1 为压缩点格式
const decrypted = sm2Decrypt(keyPair.privateKey, encrypted); // 自动检测模式

// 也可以明确指定模式以提高性能
const decryptedWithMode = sm2Decrypt(keyPair.privateKey, encrypted, SM2CipherMode.C1C3C2);

// 签名/验证（使用 SM3 哈希和 Z 值计算）
const data = 'Message to sign';
const signature = sign(keyPair.privateKey, data);
const isValid = verify(keyPair.publicKey, data, signature);
console.log(isValid); // true

// DER 编码签名（ASN.1 DER 格式）
const signatureDER = sign(keyPair.privateKey, data, { der: true });
const isValidDER = verify(keyPair.publicKey, data, signatureDER, { der: true });

// 自定义用户 ID（默认为 '1234567812345678'）
const signatureCustom = sign(keyPair.privateKey, data, { userId: 'user@example.com' });
const isValidCustom = verify(keyPair.publicKey, data, signatureCustom, { userId: 'user@example.com' });

// 自动识别输入格式
// 支持：
// - 十六进制字符串（带或不带 0x 前缀）
// - 大写或小写十六进制
// - 压缩或非压缩公钥格式
// - DER 编码或原始格式签名
const privateKeyWith0x = '0x' + keyPair.privateKey;
const publicKeyUpper = keyPair.publicKey.toUpperCase();
const sig = sign(privateKeyWith0x, 'test');
const valid = verify(publicKeyUpper, 'test', sig); // 自动识别格式

// 支持 Uint8Array 输入
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
const encryptedBinary = sm2Encrypt(keyPair.publicKey, binaryData);
const signatureBinary = sign(keyPair.privateKey, binaryData);

// SM2 密钥交换（基于 GM/T 0003.3-2012 及 GM/T 0009-2023）
import { keyExchange } from 'smkit';

// 假设 Alice 和 Bob 需要协商共享密钥
const aliceKeyPair = generateKeyPair();
const bobKeyPair = generateKeyPair();

// 第一步：生成临时密钥对
const aliceTempKeyPair = generateKeyPair();
const bobTempKeyPair = generateKeyPair();

// 第二步：Alice 作为发起方执行密钥交换
const aliceResult = keyExchange({
  privateKey: aliceKeyPair.privateKey,
  tempPrivateKey: aliceTempKeyPair.privateKey,
  peerPublicKey: bobKeyPair.publicKey,
  peerTempPublicKey: bobTempKeyPair.publicKey,
  isInitiator: true,
  keyLength: 16, // 派生 16 字节（128 位）密钥
});

// 第三步：Bob 作为响应方执行密钥交换
const bobResult = keyExchange({
  privateKey: bobKeyPair.privateKey,
  tempPrivateKey: bobTempKeyPair.privateKey,
  peerPublicKey: aliceKeyPair.publicKey,
  peerTempPublicKey: aliceTempKeyPair.publicKey,
  isInitiator: false,
  keyLength: 16,
});

// Alice 和 Bob 得到相同的共享密钥
console.log(aliceResult.sharedKey === bobResult.sharedKey); // true
```

#### ZUC 流密码算法

```typescript
import { zucEncrypt, zucDecrypt, zucKeystream, eea3, eia3 } from 'smkit';

const key = '00112233445566778899aabbccddeeff'; // 128 位密钥（32 个十六进制字符）
const iv = 'ffeeddccbbaa99887766554433221100';  // 128 位 IV（32 个十六进制字符）
const plaintext = 'Hello, ZUC!';

// 加密
const ciphertext = zucEncrypt(key, iv, plaintext);
console.log(ciphertext); // 十六进制字符串

// 解密
const decrypted = zucDecrypt(key, iv, ciphertext);
console.log(decrypted); // 'Hello, ZUC!'

// 生成密钥流（用于高级应用）
const keystream = zucKeystream(key, iv, 4); // 生成 4 个 32 位字（16 字节）
console.log(keystream); // 十六进制字符串

// EEA3 - 3GPP LTE 加密算法（基于 ZUC-128）
const count = 0x12345678;    // 32 位计数器
const bearer = 5;             // 5 位承载身份（0-31）
const direction = 0;          // 1 位方向（0=上行，1=下行）
const length = 256;           // 密钥流比特长度

const eea3Keystream = eea3(key, count, bearer, direction, length);
console.log(eea3Keystream); // 用于加密的密钥流

// EIA3 - 3GPP LTE 完整性算法（基于 ZUC-128）
const message = 'Message to authenticate';
const mac = eia3(key, count, bearer, direction, message);
console.log(mac); // 32 位 MAC 值（8 个十六进制字符）

// 支持 Uint8Array 输入
const binaryKey = new Uint8Array(16).fill(0);
const binaryIv = new Uint8Array(16).fill(1);
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"

const encryptedBinary = zucEncrypt(binaryKey, binaryIv, binaryData);
const decryptedBinary = zucDecrypt(binaryKey, binaryIv, encryptedBinary);
console.log(decryptedBinary); // 'Hello'
```

### 面向对象 API

#### SM3 - 哈希操作

```typescript
import { SM3, OutputFormat } from 'smkit';

// 静态方法（默认 hex 格式）
const hash = SM3.digest('Hello, SM3!');
const mac = SM3.hmac('secret-key', 'data');

// 静态方法 with Base64 output
const base64Hash = SM3.digest('Hello, SM3!', { outputFormat: OutputFormat.BASE64 });

// 增量哈希
const sm3 = new SM3();
sm3.update('Hello, ').update('SM3!');
const result = sm3.digest();

// 增量哈希 with Base64 output
const sm3Base64 = new SM3(OutputFormat.BASE64);
sm3Base64.update('Hello, ').update('World!');
const base64Result = sm3Base64.digest();
```

#### SHA - 哈希算法（国际标准）

```typescript
import { SHA256, SHA384, SHA512, OutputFormat } from 'smkit';

// SHA-256 静态方法
const hash = SHA256.digest('Hello, World!');
const base64Hash = SHA256.digest('Hello, World!', { outputFormat: OutputFormat.BASE64 });

// SHA-256 增量哈希
const sha = new SHA256();
sha.update('Hello, ').update('World!');
const result = sha.digest();

// 支持重置和重复使用
sha.reset();
sha.update('New data');
const hash2 = sha.digest();

// 设置输出格式
sha.setOutputFormat(OutputFormat.BASE64);
sha.update('test');
const base64Hash = sha.digest();

// SHA-384, SHA-512 使用方式相同
const sha384 = new SHA384();
const sha512 = new SHA512();
```

#### SM4 - 分组密码

```typescript
import { SM4, CipherMode, PaddingMode } from 'smkit';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

// 使用构造函数
const sm4 = new SM4(key, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
const encrypted = sm4.encrypt('Hello, SM4!');
const decrypted = sm4.decrypt(encrypted);

// 使用工厂方法
const sm4ecb = SM4.ECB(key);
const sm4cbc = SM4.CBC(key, iv);
const sm4ctr = SM4.CTR(key, '00000000000000000000000000000000');
const sm4cfb = SM4.CFB(key, iv);
const sm4ofb = SM4.OFB(key, iv);

// 配置设置
sm4.setMode(CipherMode.CBC);
sm4.setIV(iv);
sm4.setPadding(PaddingMode.PKCS7);
```

#### SM2 - 椭圆曲线密码

```typescript
import { SM2, SM2CipherMode } from 'smkit';

// 生成密钥对
const sm2 = SM2.generateKeyPair();

// 从现有密钥创建
const sm2FromPrivate = SM2.fromPrivateKey(privateKey);
const sm2FromPublic = SM2.fromPublicKey(publicKey);

// 加密/解密
const encrypted = sm2.encrypt('Hello, SM2!', SM2CipherMode.C1C3C2);
const decrypted = sm2.decrypt(encrypted, SM2CipherMode.C1C3C2);

// 签名/验证
const signature = sm2.sign('Message to sign');
const isValid = sm2.verify('Message to sign', signature);

// 密钥交换
const alice = SM2.generateKeyPair();
const bob = SM2.generateKeyPair();

// 双方各自生成临时密钥对
const aliceTemp = SM2.generateKeyPair();
const bobTemp = SM2.generateKeyPair();

// Alice 作为发起方执行密钥交换
const aliceResult = alice.keyExchange(
  bob.getPublicKey(),
  bobTemp.getPublicKey(),
  true, // Alice 是发起方
  { 
    tempPrivateKey: aliceTemp.getPrivateKey(),
    keyLength: 16 
  }
);

// Bob 作为响应方执行密钥交换
const bobResult = bob.keyExchange(
  alice.getPublicKey(),
  aliceTemp.getPublicKey(),
  false, // Bob 是响应方
  { 
    tempPrivateKey: bobTemp.getPrivateKey(),
    keyLength: 16 
  }
);

// 双方得到相同的共享密钥
console.log(aliceResult.sharedKey === bobResult.sharedKey); // true

// 自定义曲线参数
const curveParams = {
  p: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF',
  a: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC',
  b: '28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93',
  Gx: '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7',
  Gy: 'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0',
  n: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123',
};
const sm2Custom = SM2.generateKeyPair(curveParams);
```

#### ZUC - 流密码

```typescript
import { ZUC } from 'smkit';

const key = '00112233445566778899aabbccddeeff';
const iv = 'ffeeddccbbaa99887766554433221100';

// 使用构造函数
const zuc = new ZUC(key, iv);
const encrypted = zuc.encrypt('Hello, ZUC!');
const decrypted = zuc.decrypt(encrypted);

// 使用工厂方法
const zuc128 = ZUC.ZUC128(key, iv);

// 生成密钥流
const keystream = zuc.keystream(4); // 生成 4 个 32 位字

// 设置新的 IV
zuc.setIV('00000000000000000000000000000000');

// EEA3 静态方法（3GPP LTE 加密）
const eea3Keystream = ZUC.eea3(key, 0x12345678, 5, 0, 256);

// EIA3 静态方法（3GPP LTE 完整性）
const mac = ZUC.eia3(key, 0x12345678, 5, 0, 'Message to authenticate');
```


### 工具函数

```typescript
import { hexToBytes, bytesToHex, stringToBytes, bytesToString } from 'smkit';

// 在十六进制和字节之间转换
const bytes = hexToBytes('48656c6c6f');
const hex = bytesToHex(bytes);

// 在字符串和字节之间转换
const strBytes = stringToBytes('Hello');
const str = bytesToString(strBytes);
```

## 常量

### 密码模式
```typescript
import { CipherMode } from 'smkit';

// 分组密码模式
CipherMode.ECB  // 'ecb' - 电码本模式
CipherMode.CBC  // 'cbc' - 分组链接模式

// 流密码模式
CipherMode.CTR  // 'ctr' - 计数器模式
CipherMode.CFB  // 'cfb' - 密文反馈模式
CipherMode.OFB  // 'ofb' - 输出反馈模式

// 认证加密模式
CipherMode.GCM  // 'gcm' - 伽罗瓦/计数器模式（已实现）
```

**说明**：
- **ECB**: 不推荐用于生产环境，每个块独立加密
- **CBC**: 需要 IV，每个块与前一个密文块异或
- **CTR/CFB/OFB**: 流密码模式，不需要填充，需要 IV
- **GCM**: 认证加密，提供加密和认证，需要 12 字节 IV
- **CCM/XTS**: 规划中的特性，尚未在当前版本中提供

### 填充模式
```typescript
import { PaddingMode } from 'smkit';

PaddingMode.PKCS7  // 'pkcs7' - PKCS#7 填充（默认）
PaddingMode.NONE   // 'none' - 无填充
PaddingMode.ZERO   // 'zero' - 零填充
```

**说明**：
- **PKCS7**: 填充值为填充字节数（例如：填充 3 字节，则每个字节值为 0x03）
- **NONE**: 无填充，数据长度必须是 16 字节的倍数
- **ZERO**: 用零字节填充到 16 字节的倍数
- 流密码模式（CTR/CFB/OFB/GCM）不使用填充

### SM2 密文模式
```typescript
import { SM2CipherMode } from 'smkit';

SM2CipherMode.C1C3C2  // 'C1C3C2' (推荐)
SM2CipherMode.C1C2C3  // 'C1C2C3'
```

**说明**：
- SM2 解密支持自动格式检测，通过密文首字节判断格式：
  - **0x30**：ASN.1 DER 编码格式
  - **0x04**：C1 为非压缩点格式（04 + x + y），默认尝试 C1C3C2 模式
  - **0x02/0x03**：C1 为压缩点格式（02/03 + x），默认尝试 C1C3C2 模式
- 自动检测会在 C1C3C2 模式失败时自动尝试 C1C2C3 模式
- 为了性能考虑，建议在与其他系统集成时明确指定密文模式
- 对于加解密，对用户透明不一定是好事，知己知彼更有助于系统集成

### OID（对象标识符）
```typescript
import { OID } from 'smkit';

OID.SM2            // '1.2.156.10197.1.301' - SM2 椭圆曲线公钥密码算法
OID.SM2_SM3        // '1.2.156.10197.1.501' - SM2 签名（使用 SM3）
OID.SM3            // '1.2.156.10197.1.401' - SM3 哈希算法
OID.SM4            // '1.2.156.10197.1.104' - SM4 密码算法
OID.EC_PUBLIC_KEY  // '1.2.840.10045.2.1' - 标准 EC 公钥（OpenSSL 1.x 对 SM2 的错误标识）
```

**说明**：
- 1.2.156 是中国国家密码管理局的注册号
- 10197 是商用密码标识
- SM2 基于椭圆曲线（ECC），但使用中国自主注册的 OID 和参数
- 这些 OID 与国际标准的 ECC OID 不同，确保了商密算法的独立性

**⚠️ OpenSSL 版本兼容性**：
- **OpenSSL 1.x**：SM2 公钥被错误地标识为标准 EC 公钥（OID: `1.2.840.10045.2.1`）
- **OpenSSL 3.x**：SM2 公钥使用正确的国密标准 OID（`1.2.156.10197.1.301`）
- 如果您在解析证书时看到 OID `1.2.840.10045.2.1`，这表明证书是由 OpenSSL 1.x 生成的
- **建议**：使用 OpenSSL 3.x 生成证书以确保符合 GB/T 33560-2017 国密标准
- 本库遵循国密标准，使用正确的 OID `1.2.156.10197.1.301`

### 默认值
```typescript
import { DEFAULT_USER_ID } from 'smkit';

DEFAULT_USER_ID  // '1234567812345678' - SM2 签名的默认用户 ID（向后兼容）
                 // GM/T 0009-2023 推荐使用空字符串 ''
```

## API 参考

### SM3

**函数式 API:**
- `digest(data: string | Uint8Array): string` - 计算 SM3 哈希摘要
- `hmac(key: string | Uint8Array, data: string | Uint8Array): string` - 计算 SM3-HMAC

**面向对象 API:**
- `SM3.digest(data)` - 静态方法计算哈希
- `SM3.hmac(key, data)` - 静态方法计算 HMAC
- `new SM3()` - 创建增量哈希实例
  - `.update(data)` - 添加数据
  - `.digest()` - 完成并返回哈希
  - `.reset()` - 重置状态

### SM4

**函数式 API:**
- `sm4Encrypt(key: string, data: string | Uint8Array, options?: SM4Options): string` - 使用 SM4 加密数据
- `sm4Decrypt(key: string, encryptedData: string, options?: SM4Options): string` - 使用 SM4 解密数据

**SM4Options:**
- `mode?: CipherModeType` - 密码模式（默认：ECB）
- `padding?: PaddingModeType` - 填充方案（默认：PKCS7）
- `iv?: string` - CBC 模式的初始化向量（32 个十六进制字符）

**面向对象 API:**
- `new SM4(key, options?)` - 创建 SM4 实例
- `SM4.ECB(key, padding?)` - 创建 ECB 模式实例
- `SM4.CBC(key, iv, padding?)` - 创建 CBC 模式实例
- 实例方法：
  - `.encrypt(data)` - 加密数据
  - `.decrypt(encryptedData)` - 解密数据
  - `.setMode(mode)` / `.getMode()` - 设置/获取模式
  - `.setPadding(padding)` / `.getPadding()` - 设置/获取填充
  - `.setIV(iv)` / `.getIV()` - 设置/获取 IV

### SM2

**函数式 API:**

*密钥管理：*
- `generateKeyPair(compressed?: boolean): KeyPair` - 生成 SM2 密钥对
  - `compressed`: 是否使用压缩格式（**默认：false**）
- `getPublicKeyFromPrivateKey(privateKey: string, compressed?: boolean): string` - 从私钥派生公钥
  - `compressed`: 是否返回压缩格式（**默认：false**）
- `compressPublicKey(publicKey: string): string` - 压缩公钥（04->02/03）
- `decompressPublicKey(publicKey: string): string` - 解压公钥（02/03->04）

*加密解密：*
- `sm2Encrypt(publicKey: string, data: string | Uint8Array, mode?: SM2CipherModeType): string` - 使用 SM2 加密数据
  - `mode`: 密文模式（**默认：'C1C3C2'**）
- `sm2Decrypt(privateKey: string, encryptedData: string, mode?: SM2CipherModeType): string` - 使用 SM2 解密数据
  - `mode`: 密文模式（**默认：'C1C3C2'**）

*签名验签：*
- `sign(privateKey: string, data: string | Uint8Array, options?: SignOptions): string` - 使用 SM2 签名数据
- `verify(publicKey: string, data: string | Uint8Array, signature: string, options?: VerifyOptions): boolean` - 使用 SM2 验证签名

*密钥交换：*
- `keyExchange(params: SM2KeyExchangeParams): SM2KeyExchangeResult` - 执行 SM2 密钥交换协议

**SignOptions:**
- `der?: boolean` - 是否使用 DER 编码格式（**默认：false**，使用 Raw 格式）
- `userId?: string` - 签名用户 ID（**默认：'1234567812345678'**）
- `skipZComputation?: boolean` - 是否跳过 Z 值计算（**默认：false**）
- `curveParams?: SM2CurveParams` - 自定义椭圆曲线参数（**默认：使用 GM/T 0003-2012 标准参数，GM/T 0009-2023 继续沿用**）

**VerifyOptions:**
- `der?: boolean` - 签名是否为 DER 编码格式（**默认：false**）
- `userId?: string` - 验证用户 ID（**默认：'1234567812345678'**，必须与签名时一致）
- `skipZComputation?: boolean` - 是否跳过 Z 值计算（**默认：false**，必须与签名时一致）
- `curveParams?: SM2CurveParams` - 自定义椭圆曲线参数

**SM2KeyExchangeParams:**
- `privateKey: string` - 己方私钥（必需）
- `publicKey?: string` - 己方公钥（可选，不提供会从私钥派生）
- `userId?: string` - 己方用户 ID（**默认：'1234567812345678'**）
- `tempPrivateKey?: string` - 己方临时私钥（可选，不提供会自动生成）
- `peerPublicKey: string` - 对方公钥（必需）
- `peerTempPublicKey: string` - 对方临时公钥（必需）
- `peerUserId?: string` - 对方用户 ID（**默认：'1234567812345678'**）
- `isInitiator: boolean` - 是否为发起方（必需）
- `keyLength?: number` - 派生密钥字节长度（**默认：16**）

**SM2KeyExchangeResult:**
- `tempPublicKey: string` - 己方临时公钥
- `sharedKey: string` - 派生的共享密钥
- `s1?: string` - 己方确认哈希值（可选，用于相互认证）
- `s2?: string` - 对方确认哈希值（可选，用于相互认证）

**SM2CurveParams:**
- `p?: string` - 素数模数 p
- `a?: string` - 系数 a
- `b?: string` - 系数 b
- `Gx?: string` - 基点 x 坐标
- `Gy?: string` - 基点 y 坐标
- `n?: string` - 阶 n

**面向对象 API:**
- `SM2.generateKeyPair(curveParams?)` - 生成密钥对
- `SM2.fromPrivateKey(privateKey, curveParams?)` - 从私钥创建
- `SM2.fromPublicKey(publicKey, curveParams?)` - 从公钥创建
- 实例方法：
  - `.encrypt(data, mode?)` - 加密数据（**mode 默认：'C1C3C2'**）
  - `.decrypt(encryptedData, mode?)` - 解密数据（**mode 默认：'C1C3C2'**）
  - `.sign(data, options?)` - 签名数据
  - `.verify(data, signature, options?)` - 验证签名
  - `.keyExchange(peerPublicKey, peerTempPublicKey, isInitiator, options?)` - 执行密钥交换
  - `.getPublicKey()` / `.getPrivateKey()` - 获取密钥
  - `.setCurveParams(params)` / `.getCurveParams()` - 设置/获取曲线参数

### 工具函数

**数据转换:**
- `hexToBytes(hex: string): Uint8Array` - 将十六进制字符串转换为字节
- `bytesToHex(bytes: Uint8Array): string` - 将字节转换为小写十六进制字符串
- `stringToBytes(str: string): Uint8Array` - 将 UTF-8 字符串转换为字节
- `bytesToString(bytes: Uint8Array): string` - 将字节转换为 UTF-8 字符串
- `normalizeInput(data: string | Uint8Array): Uint8Array` - 将输入规范化为 Uint8Array

**位运算:**
- `xor(a: Uint8Array, b: Uint8Array): Uint8Array` - 对两个字节数组进行异或
- `rotl(value: number, shift: number): number` - 左旋转 32 位值

**ASN.1 编码工具:**
- `encodeSignature(r: string, s: string): Uint8Array` - 将 r、s 编码为 DER 格式签名
- `decodeSignature(derSignature: Uint8Array): { r: string; s: string }` - 解码 DER 格式签名
- `rawToDer(rawSignature: string): string` - 将原始签名（r||s）转换为 DER 格式
- `derToRaw(derSignature: string): string` - 将 DER 格式签名转换为原始格式（r||s）
- `asn1ToXml(data: Uint8Array): string` - 将 ASN.1 数据转换为 XML 格式（用于调试）
- `signatureToXml(signature: string): string` - 将签名转换为 XML 格式（用于调试）

## 数据格式约定

- **内部处理**: 所有二进制数据使用 `Uint8Array`
- **输入**: 接受 `string` 和 `Uint8Array` 类型。字符串按 UTF-8 解码
- **输出**: 二进制输出（密文、签名）编码为**小写十六进制字符串**
- **密钥**: 所有密钥使用**十六进制字符串**格式

## 架构

SMKit 采用模块化、分层的架构设计，便于扩展和维护：

```text
src/
├── crypto/          # 密码算法实现（按算法分类）
│   ├── sm2/        # SM2 椭圆曲线算法
│   ├── sm3/        # SM3 哈希算法
│   └── sm4/        # SM4 分组密码算法
├── core/           # 核心工具模块
├── types/          # 类型定义和常量
└── index.ts        # 统一导出接口
```

**设计原则**：
- **模块化**: 每个算法独立目录，职责清晰
- **Tree-shaking**: 只导入您需要的内容
- **双 API 设计**: 同时支持函数式和面向对象风格
- **易于扩展**: 新增算法只需添加新模块并导出
- **中文注释**: 核心代码包含详细的中文注释

详细架构说明请参阅 [架构文档](./docs/ARCHITECTURE.zh-CN.md)

## 从源码构建

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build

# 类型检查
npm run type-check
```

## 本地测试

想要快速测试各项功能？我们提供了完整的测试脚本：

```bash
# 运行交互式测试脚本（推荐）
npx tsx test-local.ts

# 运行完整测试套件
npm test
```

测试覆盖：
- ✅ SM3 哈希和 HMAC
- ✅ SM4 多种模式（ECB, CBC, CTR, CFB, OFB, GCM）
- ✅ SM2 密钥生成、加密解密、签名验签、密钥交换
- ✅ ZUC 加密解密、EEA3、EIA3

## 与 Hutool 后端对接

如果你需要在前端使用 SMKit 与后端 Hutool (Java) 进行国密算法对接，我们提供了完整的集成指南：

```bash
# 查看对接指南
cat docs/HUTOOL-INTEGRATION.zh-CN.md
```

指南包含：
- 数据格式对照表
- SM3/SM4/SM2 完整对接示例
- 常见问题解答
- 密钥格式转换方法

详细内容请参阅 [Hutool 集成指南](./docs/HUTOOL-INTEGRATION.zh-CN.md)

## 标准和参考

本库实现基于以下中国国家密码标准：

- **GM/T 0003-2012**: SM2 椭圆曲线公钥密码算法
- **GM/T 0004-2012**: SM3 密码杂凑算法
- **GM/T 0002-2012**: SM4 分组密码算法
- **GM/T 0001-2012**: ZUC 流密码算法
- **GM/T 0001.1-2023**: ZUC-256 流密码算法
- **GM/T 0009-2023**: SM2 密码算法使用规范（替代 GM/T 0009-2012）
- **GM/T 0006-2012**: 密码应用标识规范（OID 定义）
- **3GPP TS 35.221**: EEA3 和 EIA3 规范（基于 ZUC 的 LTE 加密与完整性算法）

### 标准演进说明

GMT 0009-2023 相比 GMT 0009-2012 的主要更新：

1. **默认用户 ID**: 推荐使用空字符串 `''` 代替 `'1234567812345678'`
   - 本库为保持向后兼容，默认仍使用 `'1234567812345678'`
   - 如需符合最新标准，可在签名/验签时显式指定 `userId: ''`

2. **密文模式**: 明确推荐使用 C1C3C2 模式（本库默认）

3. **公钥格式**: 明确推荐使用非压缩格式（04前缀，本库默认）

4. **安全增强**: 增强了密钥长度和参数验证的安全建议

## 许可证

Apache-2.0

## 注意

SMKit 已实现完整的 SM2、SM3、SM4 和 ZUC 算法，所有核心功能均已实现并可用于生产环境。通过了完整的单元测试覆盖，包括基础加密功能、边界情况和标准测试向量验证。

## 文档

更多文档请查看 [docs](./docs) 目录：

- [国际标准算法使用指南](./docs/INTERNATIONAL-ALGORITHMS.zh-CN.md) - SHA 系列算法、输出格式配置、AES/RSA 使用建议
- [Hutool 集成指南](./docs/HUTOOL-INTEGRATION.zh-CN.md) - 与 Java Hutool 后端对接
- [架构文档](./docs/ARCHITECTURE.zh-CN.md) - 项目架构设计
- [发布指南](./docs/PUBLISHING.md) - 如何发布新版本
- [性能测试](./docs/PERFORMANCE.md) - 性能基准测试结果
- [标准合规](./docs/GMT-0009-COMPLIANCE.md) - GMT 国密标准合规性

完整文档索引请查看 [docs/README.md](./docs/README.md)

---

## 常见问题

### 安装和使用问题

<details>
<summary><strong>❓ 如何在 TypeScript 项目中使用？</strong></summary>

SMKit 原生支持 TypeScript，无需额外配置：

```typescript
import { digest, sm4Encrypt, type KeyPair } from 'smkit';

// TypeScript 会自动提供类型提示和检查
const keyPair: KeyPair = generateKeyPair();
```

</details>

<details>
<summary><strong>❓ 浏览器中出现 "Module not found" 错误？</strong></summary>

如果使用 Vite、Webpack 等构建工具，确保配置正确：

**Vite 配置示例：**
```javascript
// vite.config.js
export default {
  optimizeDeps: {
    include: ['smkit']
  }
}
```

**或直接使用 UMD 版本：**
```html
<script src="https://unpkg.com/smkit@latest/dist/smkit.umd.js"></script>
```

</details>

<details>
<summary><strong>❓ Node.js 中出现 "Cannot find module" 错误？</strong></summary>

确保您的 Node.js 版本 >= 18.0.0：

```bash
node --version  # 应该 >= v18.0.0
```

如果使用 CommonJS，确保正确导入：
```javascript
const { digest } = require('smkit');
```

</details>

### 加密和解密问题

<details>
<summary><strong>❓ SM4 解密失败，返回乱码？</strong></summary>

**可能原因 1：加密和解密的参数不一致**

```typescript
// ❌ 错误示例
const encrypted = sm4Encrypt(key, data, { mode: CipherMode.CBC, iv });
const decrypted = sm4Decrypt(key, encrypted, { mode: CipherMode.ECB }); // 模式不一致！

// ✅ 正确示例
const encrypted = sm4Encrypt(key, data, { mode: CipherMode.CBC, iv });
const decrypted = sm4Decrypt(key, encrypted, { mode: CipherMode.CBC, iv }); // 参数一致
```

**可能原因 2：密钥格式错误**

```typescript
// ❌ 错误：密钥长度不是 32 个十六进制字符（128 位）
const key = '0123456789';

// ✅ 正确：必须是 32 个十六进制字符
const key = '0123456789abcdeffedcba9876543210';
```

</details>

<details>
<summary><strong>❓ SM2 加密后无法解密？</strong></summary>

**检查密文模式是否一致：**

```typescript
// ✅ 方式 1：加密和解密都指定相同模式
const encrypted = sm2Encrypt(publicKey, data, SM2CipherMode.C1C3C2);
const decrypted = sm2Decrypt(privateKey, encrypted, SM2CipherMode.C1C3C2);

// ✅ 方式 2：让解密自动检测模式
const encrypted = sm2Encrypt(publicKey, data, SM2CipherMode.C1C3C2);
const decrypted = sm2Decrypt(privateKey, encrypted); // 自动检测
```

**检查公钥私钥是否匹配：**

```typescript
// ✅ 正确：使用同一个密钥对
const keyPair = generateKeyPair();
const encrypted = sm2Encrypt(keyPair.publicKey, data);
const decrypted = sm2Decrypt(keyPair.privateKey, encrypted); // 使用对应的私钥
```

</details>

<details>
<summary><strong>❓ 签名验证总是返回 false？</strong></summary>

**可能原因 1：userId 不一致**

```typescript
// ❌ 错误：签名和验证的 userId 不同
const sig = sign(privateKey, data, { userId: 'alice@example.com' });
const valid = verify(publicKey, data, sig, { userId: 'bob@example.com' }); // userId 不同！

// ✅ 正确：userId 必须相同
const sig = sign(privateKey, data, { userId: 'alice@example.com' });
const valid = verify(publicKey, data, sig, { userId: 'alice@example.com' }); // userId 相同
```

**可能原因 2：数据被修改**

```typescript
const sig = sign(privateKey, 'original data');
const valid = verify(publicKey, 'modified data', sig); // ❌ 数据不同，验证失败
```

**可能原因 3：DER 格式不匹配**

```typescript
// ✅ 格式必须一致
const sig = sign(privateKey, data, { der: true });
const valid = verify(publicKey, data, sig, { der: true }); // der 参数必须相同
```

</details>

### 与其他系统对接问题

<details>
<summary><strong>❓ 如何与 Java 后端（Hutool）对接？</strong></summary>

我们提供了详细的对接指南：[Hutool 集成指南](./docs/HUTOOL-INTEGRATION.zh-CN.md)

**快速要点：**
1. 密文模式统一使用 `C1C3C2`
2. 公钥格式使用非压缩格式（04 开头）
3. 密钥使用十六进制字符串传输
4. userId 必须与后端保持一致

</details>

<details>
<summary><strong>❓ 如何与 OpenSSL 生成的密钥对接？</strong></summary>

**注意 OpenSSL 版本差异：**
- OpenSSL 1.x：SM2 公钥使用错误的 OID `1.2.840.10045.2.1`
- OpenSSL 3.x：使用正确的国密 OID `1.2.156.10197.1.301`

**建议使用 OpenSSL 3.x 生成密钥：**
```bash
# 生成 SM2 私钥
openssl ecparam -genkey -name SM2 -out private.pem

# 提取公钥
openssl ec -in private.pem -pubout -out public.pem
```

详细说明请查看 [OID 常量文档](#oid对象标识符)。

</details>

### 性能问题

<details>
<summary><strong>❓ 加密大文件很慢怎么办？</strong></summary>

**对于大文件（> 1MB）：**

1. **使用流式处理**（分块加密）：
```typescript
function encryptLargeFile(key: string, data: string, chunkSize = 1024 * 1024) {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    chunks.push(sm4Encrypt(key, chunk));
  }
  return chunks;
}
```

2. **使用混合加密**（SM2 + SM4）：
```typescript
// 1. 生成随机 SM4 密钥
const sm4Key = generateRandomKey(); // 自己实现随机密钥生成

// 2. 用 SM4 加密大文件
const encryptedData = sm4Encrypt(sm4Key, largeFileData);

// 3. 用 SM2 加密 SM4 密钥
const encryptedKey = sm2Encrypt(publicKey, sm4Key);

// 传输：{ encryptedData, encryptedKey }
```

</details>

<details>
<summary><strong>❓ 如何提高性能？</strong></summary>

**性能优化建议：**

1. **选择合适的算法**：
   - 大数据加密：使用 SM4（对称加密）而非 SM2
   - 流式数据：使用 ZUC
   
2. **选择合适的模式**：
   - ECB/CTR 模式比 CBC 略快
   - GCM 模式提供加密 + 认证，避免额外哈希计算

3. **减少重复操作**：
```typescript
// ❌ 不好：每次都创建新实例
for (let i = 0; i < 1000; i++) {
  const hash = digest(data[i]);
}

// ✅ 更好：复用实例
const sm3 = new SM3();
for (let i = 0; i < 1000; i++) {
  sm3.reset();
  sm3.update(data[i]);
  const hash = sm3.digest();
}
```

</details>

### 安全问题

<details>
<summary><strong>❓ 密钥应该如何存储？</strong></summary>

**⚠️ 安全建议：**

❌ **不要这样做：**
```typescript
// 永远不要硬编码密钥
const key = '0123456789abcdeffedcba9876543210';

// 不要在前端存储私钥
localStorage.setItem('privateKey', privateKey);
```

✅ **推荐做法：**

1. **私钥始终在服务端**：
```typescript
// 前端只存储公钥
const publicKey = await fetch('/api/public-key').then(r => r.text());

// 加密操作在前端
const encrypted = sm2Encrypt(publicKey, sensitiveData);

// 解密操作在服务端
await fetch('/api/decrypt', {
  method: 'POST',
  body: JSON.stringify({ encrypted })
});
```

2. **使用环境变量**（服务端）：
```typescript
// .env
SM4_KEY=0123456789abcdeffedcba9876543210

// 代码中
const key = process.env.SM4_KEY;
```

3. **使用密钥管理服务**（生产环境）：
   - AWS KMS
   - Azure Key Vault
   - HashiCorp Vault

</details>

<details>
<summary><strong>❓ 如何安全地传输密钥？</strong></summary>

**使用密钥交换协议：**

```typescript
// 双方协商密钥，而不是直接传输
const alice = generateKeyPair();
const bob = generateKeyPair();

// Alice 和 Bob 各自生成临时密钥
const aliceTemp = generateKeyPair();
const bobTemp = generateKeyPair();

// 通过公开信道交换公钥，协商出共享密钥
const aliceResult = keyExchange({
  privateKey: alice.privateKey,
  tempPrivateKey: aliceTemp.privateKey,
  peerPublicKey: bob.publicKey,
  peerTempPublicKey: bobTemp.publicKey,
  isInitiator: true,
  keyLength: 16
});

// Alice 和 Bob 得到相同的密钥，但从未在网络上传输
```

</details>

---

## 相关项目

- [sm-crypto-v2](https://github.com/Cubelrti/sm-crypto-v2) - 另一个优秀的 SM 算法实现
