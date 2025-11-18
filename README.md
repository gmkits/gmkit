

<div align="center">

[](https://www.npmjs.com/package/gmkitx)
[](https://www.npmjs.com/package/gmkitx)
[](https://github.com/CherryRum/gmkit/blob/main/LICENSE)
[](https://www.typescriptlang.org/)

**GMKit - 国密算法与国际标准算法库**

一个纯 TypeScript 实现的密码学工具集，内建支持：

* **国密算法**: **SM2、SM3、SM4、ZUC**
* **国际标准**: **SHA-1、SHA-256、SHA-384、SHA-512**

库提供统一的 API 体验，支持函数式、模块命名空间及面向对象调用。

</div>

-----

## ✨ 特性一览

* 📦 **算法集成**：SM2 / SM3 / SM4 / ZUC 国密算法与 SHA 系列（SHA-1 / 256 / 384 / 512）
* 🧩 **灵活导入**：支持命名空间、模块及具名函数导入（与源码结构一致）
* 🧠 **双 API 风格**：提供纯函数式调用与面向对象（Class）封装
* 🌐 **同构支持**：一套代码，同时运行于 Node.js（\>= 18）与现代浏览器
* 📚 **强类型支持**：完整的 TypeScript 类型定义
* 🧱 **CDN 友好**：提供 UMD 构建包，支持 `<script>` 标签引入（全局 `GMKit`）
* 🔒 **遵循标准**：严格对齐 GM/T 系列国密标准文档实现
-----

## 🚀 安装

```bash
# 使用 npm
npm install gmkitx

# 使用 pnpm
pnpm add gmkitx

# 使用 yarn
yarn add gmkitx
```

**Node.js** 版本要求：**\>= 18**

-----

## 🔰 快速开始（5 分钟上手）

### 1\. 函数式 API (推荐)

```ts
import {
  digest,
  sm4Encrypt,
  sm4Decrypt,
  generateKeyPair,
  sm2Encrypt,
  sm2Decrypt,
  sha256,
} from 'gmkitx';
import { CipherMode, PaddingMode } from 'gmkitx';

// SM3 哈希
const hash = digest('Hello, SM3!');
console.log('SM3:', hash);

// SM4 对称加密
const key = '0123456789abcdeffedcba9876543210'; // 128 位 hex 密钥
const plaintext = '我的密码';
const ciphertext = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv: 'fedcba98765432100123456789abcdef',
});
const decrypted = sm4Decrypt(key, ciphertext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv: 'fedcba98765432100123456789abcdef',
});

// SM2 非对称加密
const keyPair = generateKeyPair();
const enc = sm2Encrypt(keyPair.publicKey, 'Hello, SM2!');
const dec = sm2Decrypt(keyPair.privateKey, enc);

// SHA-256（国际标准）
const sha = sha256('Hello, SHA-256!');
```

### 2\. 模块命名空间导入

与源码中的模块导出结构一一对应：

```ts
import { sm2, sm3, sm4, zuc, sha } from 'gmkitx';

// SM3
const hash = sm3.digest('Hello');

// SM4
const encrypted = sm4.encrypt('0123456789abcdeffedcba9876543210', 'data');

// SM2
const kp = sm2.generateKeyPair();
const sig = sm2.sign(kp.privateKey, 'message');
const ok = sm2.verify(kp.publicKey, 'message', sig);

// ZUC
const zucCipher = zuc.encrypt('00112233445566778899aabbccddeeff', 'ffeeddccbbaa99887766554433221100', 'Hello');

// SHA 系列
const sha512 = sha.sha512('Hello');
```

命名空间里同时挂了函数和类，例如：`sm2.SM2`、`sm3.SM3`、`sha.SHA256` 等。

### 3\. 默认导入 (适合 UMD / 老项目)

```ts
import gmkit from 'gmkitx';

const hash = gmkit.digest('Hello');       // 等价于 sm3.digest
const sm4Encrypted = gmkit.sm4Encrypt(
  '0123456789abcdeffedcba9876543210',
  'data',
);
const sha256Hash = gmkit.sha256('Hello');
```

-----

## 🌐 浏览器直接使用 (UMD / CDN)

```html
<script src="https://unpkg.com/gmkitx@latest/dist/index.global.js"></script>
<script>
  // 全局命名空间：GMKit（对应默认导出）
  const hash = GMKit.digest('Hello, SM3!');
  const key = '0123456789abcdeffedcba9876543210';
  const encrypted = GMKit.sm4Encrypt(key, '前端加密');
  const decrypted = GMKit.sm4Decrypt(key, encrypted);
  console.log({ hash, encrypted, decrypted });
</script>
```

-----

## 🧠 API 概览

本库的导出围绕以下几类：

* **模块命名空间**：`sm2 / sm3 / sm4 / zuc / sha`
* **具名函数导出**：直观函数风格
* **面向对象类**：`SM2 / SM3 / SM4 / ZUC / SHA256 / SHA384 / SHA512 / SHA1`
* **常量和类型**：`CipherMode / PaddingMode / SM2CipherMode / OutputFormat / OID / DEFAULT_USER_ID` 等
* **工具函数**：字节 / 字符串 / hex / base64 转换、ASN.1 编解码等

下面是精简版的使用参考。

### SM3 (哈希算法)

```ts
import { digest, hmac, SM3, OutputFormat } from 'gmkitx';

// 函数式
const hash = digest('Hello, SM3!');
const mac = hmac('secret', 'data');

// Base64 输出
const hashBase64 = digest('Hello', { outputFormat: OutputFormat.BASE64 });

// 面向对象 + 增量哈希
const sm3 = new SM3();
sm3.update('Hello, ').update('World');
const result = sm3.digest();
```

### SHA 系列 (国际标准哈希)

```ts
import { sha256, sha384, sha512, sha1, SHA256, OutputFormat } from 'gmkitx';

// 函数式
const h256 = sha256('data');
const h512 = sha512('data');

// 面向对象
const sha = new SHA256(OutputFormat.BASE64);
sha.update('A').update('B');
const res = sha.digest();
```

### SM4 (分组对称密码)

```ts
import { sm4Encrypt, sm4Decrypt, SM4, CipherMode, PaddingMode } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

// 函数式
const cbcCipher = sm4Encrypt(key, 'Hello', {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv,
});
const cbcPlain = sm4Decrypt(key, cbcCipher, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv,
});

// 面向对象
const sm4 = new SM4(key, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
const cipher = sm4.encrypt('Hello, SM4');
const plain = sm4.decrypt(cipher);
```

### SM2 (椭圆曲线非对称密码)

```ts
import {
  generateKeyPair,
  getPublicKeyFromPrivateKey,
  sm2Encrypt,
  sm2Decrypt,
  sign,
  verify,
  SM2,
  SM2CipherMode,
} from 'gmkitx';

// 生成密钥对
const kp = generateKeyPair();

// 加密 / 解密
const enc = sm2Encrypt(kp.publicKey, 'Hello, SM2!', SM2CipherMode.C1C3C2);
const dec = sm2Decrypt(kp.privateKey, enc);

// 签名 / 验签
const sig = sign(kp.privateKey, 'message');
const ok = verify(kp.publicKey, 'message', sig);

// 面向对象
const sm2 = SM2.fromPrivateKey(kp.privateKey);
const sig2 = sm2.sign('hello');
const ok2 = sm2.verify('hello', sig2);
```

### ZUC (序列密码 / LTE 算法)

```ts
import {
  zucEncrypt,
  zucDecrypt,
  zucKeystream,
  eea3,
  eia3,
  ZUC,
} from 'gmkitx';

const key = '00112233445566778899aabbccddeeff';
const iv = 'ffeeddccbbaa99887766554433221100';

// 函数式
const c = zucEncrypt(key, iv, 'Hello, ZUC!');
const p = zucDecrypt(key, iv, c);

// 生成密钥流
const ks = zucKeystream(key, iv, 4);

// LTE EEA3 / EIA3
const count = 0x12345678;
const bearer = 5;
const direction = 0;
const len = 256;

const eeaStream = eea3(key, count, bearer, direction, len);
const mac = eia3(key, count, bearer, direction, 'msg');

// 面向对象
const zuc = new ZUC(key, iv);
const enc = zuc.encrypt('Hello');
const dec = zuc.decrypt(enc);
```

-----

## ⚙️ 常量与类型

```ts
import {
  CipherMode,
  PaddingMode,
  SM2CipherMode,
  OutputFormat,
  OID,
  DEFAULT_USER_ID,
} from 'gmkitx';
```

* `CipherMode`：`ECB` | `CBC` | `CTR` | `CFB` | `OFB` | `GCM`
* `PaddingMode`：`PKCS7` | `NONE` | `ZERO`
* `SM2CipherMode`：`C1C3C2` (推荐) | `C1C2C3`
* `OutputFormat`：`HEX` | `BASE64`
* `OID`：常用国密相关 OID 常量（SM2 / SM3 / SM4 等）
* `DEFAULT_USER_ID`：`'1234567812345678'`（SM2 签名默认 userId，兼容旧标准）

类型导出示例：

```ts
import type {
  KeyPair,
  SignOptions,
  VerifyOptions,
  SM2CurveParams,
  SM2KeyExchangeParams,
  SM2KeyExchangeResult,
  SM2EncryptOptions,
  SM4Options,
  SM4GCMResult,
  ZUCOptions,
  SHAOptions,
} from 'gmkitx';
```

-----

## 🧰 工具函数

```ts
import {
  hexToBytes,
  bytesToHex,
  base64ToBytes,
  bytesToBase64,
  stringToBytes,
  bytesToString,
  normalizeInput,
  xor,
  rotl,
  encodeSignature,
  decodeSignature,
  rawToDer,
  derToRaw,
  asn1ToXml,
  signatureToXml,
} from 'gmkitx';

// 编解码
const bytes = hexToBytes('48656c6c6f');
const hex = bytesToHex(bytes);
const b64 = bytesToBase64(bytes);
const text = bytesToString(bytes);

// ASN.1 / 签名处理
const der = rawToDer('...rs...');
const raw = derToRaw(der);
```

-----

## 📁 项目结构 & 构建

```bash
# 安装依赖
npm install

# 运行单元测试
npm test

# 构建库
npm run build

# 类型检查
npm run type-check
```

源码结构概览：

```text
src/
├── crypto/
│   ├── sm2/      # SM2 算法 + 类
│   ├── sm3/      # SM3 算法 + 类
│   ├── sm4/      # SM4 算法 + 类
│   └── zuc/      # ZUC 算法 + 类
├── crypto/sha/   # SHA 系列算法 + 类
├── core/         # 工具函数 / ASN.1
├── types/        # 常量与类型定义
└── index.ts      # 库的统一出口
```

-----

## 📄 许可证

本项目基于 **Apache-2.0** 许可证开源。
详见：[LICENSE](https://www.google.com/search?q=./LICENSE)
