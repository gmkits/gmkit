---
title: SHA 系列密码杂凑算法
icon: hash
order: 5
author: mumu
date: 2025-11-23
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

## 概述

SHA（Secure Hash Algorithm）是 NIST 发布的国际标准哈希族。`gmkitx` 基于 `@noble/hashes` 提供 SHA-2 系列（SHA-256 / SHA-384 / SHA-512）与兼容性用途的 SHA-1，作为 SM3 的互补选择。

### 支持的算法

- **SHA-256**：256 位输出，通用与兼容性最佳
- **SHA-384**：384 位输出，更高安全强度
- **SHA-512**：512 位输出，高安全/长寿命场景
- **SHA-1**：160 位输出，仅用于兼容旧系统（不推荐用于新应用）
- **HMAC**：HMAC-SHA256 / HMAC-SHA384 / HMAC-SHA512

### 主要特性

- 国际标准：SHA-2 全系列 + SHA-1 兼容
- 性能：纯 TypeScript，依托 `@noble/hashes`，在支持 SHA Extensions 的处理器上性能优异
- 多输出：`hex`（默认）与 `base64`
- 同构 API：Node 与浏览器一致

### 性能与安全权衡

SHA 系列算法在不同平台上的性能差异：
- **硬件加速**: 在 Intel/AMD 处理器上，SHA-256 可利用 SHA Extensions 指令集，性能提升 2-5 倍
- **算法选择**: SHA-256（256位）、SHA-384（384位）、SHA-512（512位）安全性递增，但计算量也递增
- **与 SM3 对比**: SHA-256 和 SM3 安全强度相当（256位），性能主要取决于硬件支持
  - 国际芯片: SHA-256 通常更快（硬件加速）
  - 国产芯片: SM3 通常更快（专用指令）
  - 纯软件实现: 性能相近

::: tip 算法选择建议
- 国际化应用或需要广泛兼容性：优先使用 SHA-256
- 国密合规要求：使用 SM3
- 需要更高安全强度：考虑 SHA-384 或 SHA-512
- 旧系统兼容：SHA-1（但不推荐用于新应用，已知安全漏洞）
:::

## 快速开始

```typescript
import { sha256, sha512, OutputFormat } from 'gmkitx';

const hex256 = sha256('Hello, World!'); // 64 字符 hex
const b64512 = sha512('Hello, World!', { format: OutputFormat.BASE64 });
```

命名空间等价用法：

```typescript
import { sha } from 'gmkitx';

const hash256 = sha.sha256('data');
const mac = sha.hmacSha256('key', 'data');
```

> 输入支持 `string | Uint8Array`；字符串按 UTF-8 处理。

##  支持的算法

### SHA-256（推荐）

```typescript
import { sha256, OutputFormat } from 'gmkitx';

const hex = sha256('payload');
const base64 = sha256('payload', { format: OutputFormat.BASE64 });
```

### SHA-384

```typescript
import { sha384 } from 'gmkitx';

const hash = sha384('payload'); // 96 字符 hex
```

### SHA-512

```typescript
import { sha512 } from 'gmkitx';

const hash = sha512('payload'); // 128 字符 hex
```

### SHA-1（兼容性用途）

```typescript
import { sha1 } from 'gmkitx';

const legacy = sha1('legacy payload'); // 40 字符 hex
```

##  HMAC 用法

```typescript
import { hmacSha256, hmacSha384, hmacSha512 } from 'gmkitx';

const payload = 'authenticated data';
const mac256 = hmacSha256('secret-key', payload);
const mac512 = hmacSha512('secret-key', payload);
```

## 🧪 测试向量示例

```typescript
import { sha256, sha512 } from 'gmkitx';

const testData = 'abc';
console.log('SHA-256:', sha256(testData)); // ba7816bf...
console.log('SHA-512:', sha512(testData)); // ddaf35a1...
```

## 📊 性能提示（示意）

| 算法 | 速度 (MB/s) | 适用场景 |
|:----|:-----------|:---------|
| SHA-256 | ★★★★☆ | 通用、兼容性最佳 |
| SHA-512 | ★★★☆☆ | 更高安全、长寿命场景 |
| SHA-384 | ★★★☆☆ | 兼顾性能与安全 |
| SM3 | ★★★☆☆ | 国密兼容，性能接近 SHA-256 |

> 速度受硬件/输入大小影响，请以实测为准。

## 🤔 常见问题

- **选哪种算法？** 优先 SHA-256；高安全/证书签名可用 SHA-384/512；仅兼容旧协议时使用 SHA-1。
- **输出格式怎么选？** 系统内部用 hex，跨语言接口或 header 传输可用 Base64。

## 📑 API 速览

| 函数 | 描述 | 输出长度 |
|:-----|:-----|:--------|
| `sha256(data, options?)` | 计算 SHA-256 哈希 | 256 位 (32 字节) |
| `sha384(data, options?)` | 计算 SHA-384 哈希 | 384 位 (48 字节) |
| `sha512(data, options?)` | 计算 SHA-512 哈希 | 512 位 (64 字节) |
| `sha1(data, options?)` | 计算 SHA-1 哈希（兼容用途） | 160 位 (20 字节) |
| `hmacSha256(key, data, options?)` | HMAC-SHA256 | 256 位 |
| `hmacSha384(key, data, options?)` | HMAC-SHA384 | 384 位 |
| `hmacSha512(key, data, options?)` | HMAC-SHA512 | 512 位 |
| `sha.sha256 / sha.sha384 / sha.sha512 / sha.sha1` | 命名空间调用 | 同上 |
