---
home: true
icon: home
title: GMKitX
heroImage: /logo.svg
heroText: GMKitX
tagline: 国密算法与国际标准的全场景 TypeScript 解决方案
actions:
  - text: 快速开始 💡
    link: /guide/getting-started
    type: primary
  - text: 算法文档 📚
    link: /algorithms/SM2
    type: secondary

features:
  - title: 全栈覆盖
    icon: laptop-code
    details: 一套代码无缝运行于 Node.js (>= 18) 与浏览器环境，无需 polyfill
  - title: 双重范式
    icon: code
    details: 既支持现代的纯函数式（Functional）调用，也保留了传统的面向对象（OOP）封装
  - title: 按需加载
    icon: tree
    details: 支持 Tree-shaking，你可以只导入 sm2，而不必引入整个库
  - title: 类型安全
    icon: shield-alt
    details: 内建完整的 .d.ts 类型定义，编码即文档
  - title: 标准对齐
    icon: check
    details: 严格遵循 GM/T 系列国密标准文档，兼容 OpenSSL 等主流实现的密文格式
  - title: 高性能
    icon: rocket
    details: 纯 TypeScript 实现，性能优化，适用于各种生产环境

copyright: false
footer: Apache-2.0 Licensed | Copyright © 2024-present GMKitX
---

## ✨ 核心特性

`gmkitx` 是一套纯 **TypeScript** 实现的密码学工具集。它不仅严格复现了 **SM2 / SM3 / SM4 / ZUC** 等国密标准，还集成了 **SHA** 系列国际算法。

设计的初衷很简单：提供一套**同构**（Isomorphic）的代码库，让开发者在**服务端**和 **现代浏览器** 前端，都能使用完全一致的 API 进行加密、解密、签名与哈希运算。

## 🚀 快速安装

:::code-tabs#shell

@tab npm

```bash
npm install gmkitx
```

@tab pnpm

```bash
pnpm add gmkitx
```

@tab yarn

```bash
yarn add gmkitx
```

:::

## ⚡ 快速示例

### 函数式编程（推荐）

适合现代前端开发，利于 Tree-shaking，代码更简洁。

```typescript
import {
  digest,       // SM3
  sm4Encrypt,   // SM4
  sm4Decrypt,
  sm2Encrypt,   // SM2
  sm2Decrypt,
  generateKeyPair,
  CipherMode,
  PaddingMode
} from 'gmkitx';

// 1. SM3 摘要
const hash = digest('Hello, SM3!');

// 2. SM4 对称加密 (CBC模式)
const key = '0123456789abcdeffedcba9876543210'; // 128位密钥
const iv  = 'fedcba98765432100123456789abcdef'; // 初始化向量

const ciphertext = sm4Encrypt(key, '我的机密数据', {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv,
});

// 3. SM2 非对称加密
const { publicKey, privateKey } = generateKeyPair();
const encData = sm2Encrypt(publicKey, 'Hello, SM2!');
const decData = sm2Decrypt(privateKey, encData);
```

### 命名空间导入

结构清晰，适合大型项目统一管理加密模块。

```typescript
import { sm2, sm3, sm4, sha } from 'gmkitx';

// 统一入口调用
const hash = sm3.digest('Hello');
const sig  = sm2.sign(privateKey, 'Message');
const verified = sm2.verify(publicKey, 'Message', sig);

// SHA 国际标准
const sha512Hash = sha.sha512('Hello World');
```

## 📚 支持的算法

### 国密算法

- **SM2** - 椭圆曲线公钥密码算法（加密、解密、签名、验签）
- **SM3** - 密码杂凑算法（哈希）
- **SM4** - 分组密码算法（对称加密，支持多种模式）
- **ZUC** - 祖冲之序列密码算法（流加密）

### 国际标准算法

- **SHA** - SHA-1, SHA-224, SHA-256, SHA-384, SHA-512 系列哈希算法

## 🌟 开始探索

- [快速开始指南](/guide/getting-started) - 了解如何使用 GMKitX
- [关于国密算法](/guide/about-guomi) - **信创化、特殊领域应用与性能差异详解** 🔥
- [SM2 算法文档](/algorithms/SM2) - 椭圆曲线公钥密码
- [SM3 算法文档](/algorithms/SM3) - 密码杂凑算法
- [SM4 算法文档](/algorithms/SM4) - 分组密码算法
- [Java 实现推荐](/implementations/java/) - Java 版本的国密算法库
- [性能测试](/performance/PERFORMANCE) - 查看性能基准测试结果
