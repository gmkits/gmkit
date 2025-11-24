<div align="center">


# GMKitX
**国密算法与国际标准的全场景 TypeScript 解决方案**

[![NPM Version](https://img.shields.io/npm/v/gmkitx?style=flat-square&color=3b82f6&label=npm)](https://www.npmjs.com/package/gmkitx)
[![License](https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/written%20in-TypeScript-blue?style=flat-square)](https://www.typescriptlang.org/)

[特性概览](#-核心特性) • [安装指南](#-安装与环境) • [快速上手](#-快速上手) • [API 参考](#-api-深度指南)


---

`gmkitx` 是一套纯 **TypeScript** 实现的密码学工具集。它不仅严格复现了 **SM2 / SM3 / SM4 / ZUC** 等国密标准，还集成了 **SHA** 系列国际算法。
设计的初衷很简单：提供一套**同构**（Isomorphic）的代码库，让开发者在**服务端**和 **现代浏览器** 前端，都能使用完全一致的 API 进行加密、解密、签名与哈希运算。
</div>

## ✨ 核心特性

我们推崇**极简**与**灵活**并存的工程理念：

* **全栈覆盖**：一套代码无缝运行于 **Node.js (>= 18)** 与浏览器环境，无需 polyfill。
* **双重范式**：既支持现代的 **纯函数式（Functional）** 调用，也保留了传统的 **面向对象（OOP）** 封装。
* **按需加载**：支持 Tree-shaking，你可以只导入 `sm2`，而不必引入整个库。
* **类型安全**：内建完整的 `.d.ts` 类型定义，编码即文档。
* **标准对齐**：严格遵循 GM/T 系列国密标准文档，兼容 OpenSSL 等主流实现的密文格式。

---

## 🚀 安装与环境

**环境要求**：Node.js **>= 18** 或任意支持 ES6+ 的现代浏览器。

```bash
# npm
npm install gmkitx

# pnpm (推荐)
pnpm add gmkitx

# yarn
yarn add gmkitx
````

-----

## ⚡ 快速上手

### 风格一：函数式编程（推荐）

适合现代前端开发，利于 Tree-shaking，代码更简洁。

```ts
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

### 风格二：命名空间导入

结构清晰，适合大型项目统一管理加密模块。

```ts
import { sm2, sm3, sm4, sha } from 'gmkitx';

// 统一入口调用
const hash = sm3.digest('Hello');
const sig  = sm2.sign(privateKey, 'Message');
const verified = sm2.verify(publicKey, 'Message', sig);

// SHA 国际标准
const sha512Hash = sha.sha512('Hello World');
```

### 风格三：浏览器脚本 (CDN)

通过 UMD 构建包，在 HTML 中直接使用全局变量 `GMKit`。

```html
<script src="[https://unpkg.com/gmkitx@latest/dist/index.global.js](https://unpkg.com/gmkitx@latest/dist/index.global.js)"></script>
<script>
  const { digest, sm4Encrypt } = GMKit;
  
  console.log('SM3 Hash:', digest('Browser Test'));
</script>
```

-----

## 📚 API 深度指南

### SM2（椭圆曲线公钥密码）
- 加/解密、签名/验签、密钥对生成；默认 `C1C3C2`，可切换 `C1C2C3`。
- Node/浏览器同构，面向对象与函数式并行。

```ts
import { SM2, SM2CipherMode } from 'gmkitx';

const sm2 = SM2.fromPrivateKey(privateKey);
const signature = sm2.sign('核心指令');
const verified = sm2.verify('核心指令', signature);

const cipher = sm2.encrypt('数据', SM2CipherMode.C1C3C2);
const plain = sm2.decrypt(cipher);
```

### SM3（消息摘要）
- 流式更新，Hex/Base64/Uint8Array 输出；与 SHA API 对齐。

```ts
import { SM3, OutputFormat } from 'gmkitx';

const sm3 = new SM3();
sm3.update('part-1');
sm3.update('part-2');

const hex = sm3.digest(); // 默认 Hex
const base64 = sm3.digest({ format: OutputFormat.BASE64 });
```

### SM4（分组密码）
- 支持 `ECB` | `CBC` | `CTR` | `CFB` | `OFB` | `GCM`，PKCS7/NoPadding 可选。

```ts
import { SM4, CipherMode, PaddingMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const sm4 = new SM4(key, { mode: CipherMode.GCM, padding: PaddingMode.NONE });

const { ciphertext, tag } = sm4.encrypt('敏感信息', { iv: '00112233445566778899aabbccddeeff' });
const decrypted = sm4.decrypt({ ciphertext, tag, iv: '00112233445566778899aabbccddeeff' });
```

### ZUC（祖冲之序列密码）
- 覆盖 128-EEA3（机密性）与 128-EIA3（完整性）；流式密钥流可复用。

```ts
import { zucEncrypt, zucKeystream } from 'gmkitx';

const cipher = zucEncrypt(key, iv, 'Hello ZUC');
const keystream = zucKeystream(key, iv, 32); // 32 bytes keystream
```

### SHA（国际标准摘要）
- SHA1/224/256/384/512 系列，API 与 SM3 一致，便于混合使用。

```ts
import { sha } from 'gmkitx';

const hash = sha.sha256('Hello World');
```

-----

## 🛠️ 工具箱 (Utils)

`gmkitx` 暴露了底层的数据处理函数，方便处理编码转换与 ASN.1 结构。

| 分类     | 函数                               | 说明               |
|:-------|:---------------------------------|:-----------------|
| **编码** | `hexToBytes`, `bytesToHex`       | Hex 字符串与字节数组互转   |
| **编码** | `base64ToBytes`, `bytesToBase64` | Base64 与字节数组互转   |
| **编码** | `stringToBytes`, `bytesToString` | UTF-8 字符串处理      |
| **运算** | `xor`, `rotl`                    | 异或与循环左移          |
| **格式** | `rawToDer`, `derToRaw`           | 签名的 RAW/DER 格式转换 |

-----
