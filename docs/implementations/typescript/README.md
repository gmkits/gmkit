---
title: TypeScript 实现
icon: code
order: 1
author: GMKitX Team
date: 2024-11-22
category:
  - 实现
  - TypeScript
tag:
  - TypeScript
  - JavaScript
  - Node.js
  - 浏览器
---

# TypeScript / JavaScript 实现

## 📦 GMKitX - TypeScript 版本

GMKitX 是国密算法的纯 TypeScript 实现，支持 Node.js 和浏览器环境。

### 特性

- ✅ 纯 TypeScript 编写，无需 native 依赖
- ✅ 同构设计，前后端通用
- ✅ 完整的类型定义
- ✅ Tree-shaking 友好
- ✅ 支持 ES Module、CommonJS、UMD

### 安装

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

### 快速示例

```typescript
import { sm2Encrypt, sm3Digest, sm4Encrypt } from 'gmkitx';

// SM2 加密
const { publicKey, privateKey } = generateKeyPair();
const encrypted = sm2Encrypt(publicKey, 'Hello');

// SM3 哈希
const hash = sm3Digest('Hello World');

// SM4 对称加密
const ciphertext = sm4Encrypt(key, 'Secret', { mode: 'CBC' });
```

### 详细文档

- [快速开始](/guide/getting-started)
- [SM2 算法文档](/algorithms/SM2)
- [SM3 算法文档](/algorithms/SM3)
- [SM4 算法文档](/algorithms/SM4)
- [ZUC 算法文档](/algorithms/ZUC)

## 🔗 其他 JavaScript 库

### gm-crypto

另一个流行的国密算法 JavaScript 实现。

**特点：**
- 轻量级
- 支持浏览器和 Node.js

**链接：** [GitHub](https://github.com/byte-fe/gm-crypto)

### sm-crypto

专注于 SM2/SM3/SM4 的 JavaScript 库。

**特点：**
- API 简洁
- 文档完善

**链接：** [GitHub](https://github.com/JuneAndGreen/sm-crypto)

## 🌐 Web Crypto API 集成

对于需要与 Web Crypto API 配合使用的场景：

```typescript
import { sm3Digest } from 'gmkitx';

// 国密哈希
const sm3Hash = sm3Digest(data);

// 国际标准哈希（浏览器原生）
const sha256Hash = await crypto.subtle.digest('SHA-256', data);
```

## 📊 性能特点

JavaScript 实现为纯软件实现，性能特点：

- **Node.js**：依赖 V8 引擎优化，性能较好
- **浏览器**：受 JavaScript 引擎限制，性能中等
- **无硬件加速**：无法利用 CPU 密码指令

::: tip 性能优化建议
- 使用 WebAssembly 版本可显著提升性能
- 大数据量处理考虑使用 Worker 线程
- 生产环境建议使用压缩和 Tree-shaking
:::

## 🔧 开发工具链

### 构建工具支持

- ✅ Webpack
- ✅ Vite
- ✅ Rollup
- ✅ esbuild

### 框架集成

- ✅ React
- ✅ Vue
- ✅ Angular
- ✅ Express / Koa (Node.js)

### TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## 📱 移动端支持

### React Native

```bash
npm install gmkitx
```

可直接在 React Native 中使用，无需额外配置。

### 微信小程序

需要配置允许的域名和网络请求权限。

### uni-app

完全兼容，可在多端使用。

## 🔐 安全性说明

- ✅ 纯 JavaScript 实现，代码透明
- ✅ 无需信任 native 二进制库
- ⚠️ 运行时性能受 JavaScript 引擎限制
- ⚠️ 需注意浏览器环境的密钥安全存储

## 📚 相关资源

- [GitHub 仓库](https://github.com/CherryRum/gmkit)
- [NPM 包](https://www.npmjs.com/package/gmkitx)
- [API 文档](/algorithms/SM2)
- [性能测试](/performance/PERFORMANCE)
