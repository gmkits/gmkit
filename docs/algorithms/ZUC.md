---
title: ZUC 祖冲之序列密码算法
icon: stream
order: 4
author: mumu
date: 2025-11-23
category:
  - 国密算法
  - 流密码
tag:
  - ZUC
  - 祖冲之
  - 流密码
  - LTE加密
---

# ZUC 祖冲之序列密码算法

## 概述

ZUC（祖冲之算法）是中国自主设计的流密码算法，以中国古代数学家祖冲之命名。ZUC-128 被 3GPP 采纳为 4G LTE 国际标准的第三组加密和完整性算法（128-EEA3 和 128-EIA3），广泛应用于移动通信领域。

### 标准依据

- **GM/T 0001-2012**: ZUC 序列密码算法
- **3GPP TS 35.221**: ZUC-128 加密算法（128-EEA3）
- **3GPP TS 35.222**: ZUC-128 完整性算法（128-EIA3）

> **实现范围**: GMKitX 当前实现 ZUC-128；ZUC-256（GM/T 0001.1-2023）暂未覆盖。

### 主要特性

- **国际标准**: 被 3GPP 采纳为 LTE 国际标准，应用于全球移动通信网络
- **流密码设计**: 序列密码设计，适合实时流数据加密
- **双功能**: 支持加密（EEA3）和完整性保护（EIA3）
- **移动优化**: 专为移动通信场景设计和优化
- **安全性**: 128 位密钥，抗已知攻击方式

### 性能与安全权衡

ZUC 作为流密码，与分组密码（如 SM4、AES）有不同的特点：
- **加密速度**: 流密码通常比分组密码快，因为不需要分块和填充
- **实时性**: 适合流式数据加密，无需等待完整数据块
- **硬件支持**: 
  - 在支持 ZUC 硬件加速的国产芯片上性能优异
  - 在通用芯片上为纯软件实现，性能取决于实现质量
- **应用场景**: 主要用于移动通信，一般应用中 SM4 更常用

::: tip 流密码 vs 分组密码
流密码（如 ZUC）适合实时流数据加密，速度快但状态管理复杂；分组密码（如 SM4）适合块数据加密，使用更灵活。选择时应根据具体应用场景决定。
:::

## 快速开始

### 基本加密解密

```typescript
import { zucEncrypt, zucDecrypt } from 'gmkitx';

// 密钥和初始化向量（各 128 位）
const key = '0123456789abcdeffedcba9876543210'; // 32 个十六进制字符
const iv = 'fedcba98765432100123456789abcdef';  // 32 个十六进制字符

// 加密
const plaintext = 'Hello, ZUC!';
const ciphertext = zucEncrypt(key, iv, plaintext);

// 解密（ZUC 是流密码，加密和解密使用相同操作）
const decrypted = zucDecrypt(key, iv, ciphertext);
console.log(decrypted === plaintext); // true
```

### 使用命名空间

```typescript
import { zuc } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

const ciphertext = zuc.encrypt(key, iv, 'Hello, ZUC!');
const plaintext = zuc.decrypt(key, iv, ciphertext);
```

##  ZUC-128 流加密

ZUC 是同步流密码，通过生成密钥流与明文异或实现加密（加解密为同一操作）。

### 函数式 API

```typescript
import { zucEncrypt, zucDecrypt } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';
const plaintext = 'Confidential Message';

// 加密
const ciphertext = zucEncrypt(key, iv, plaintext);

// 解密（对密文执行相同操作即可解密）
const decrypted = zucDecrypt(key, iv, ciphertext);
```

### 面向对象 API

```typescript
import { ZUC } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

// 创建 ZUC 实例
const zuc = new ZUC(key, iv);

// 加密
const ciphertext = zuc.encrypt('Hello, ZUC!');

// 解密时需使用相同 key/iv
const plaintext = zuc.decrypt(ciphertext);
```

### 多种输入输出格式

```typescript
import { zucEncrypt, zucDecrypt, OutputFormat } from 'gmkitx';

// 输入字符串，输出十六进制（默认）
const hexCipher = zucEncrypt(key, iv, 'Hello', {
  outputFormat: OutputFormat.HEX
});

// 输入字符串，输出 Base64
const base64Cipher = zucEncrypt(key, iv, 'Hello', {
  outputFormat: OutputFormat.BASE64
});

// 解密时自动识别 hex/base64
const plain1 = zucDecrypt(key, iv, hexCipher);
const plain2 = zucDecrypt(key, iv, base64Cipher);

// 输入字节数组
const bytesInput = new Uint8Array([72, 101, 108, 108, 111]);
const encrypted = zucEncrypt(key, iv, bytesInput);
```

## 🔒 完整性算法（128-EIA3）

EIA3 是 3GPP LTE/5G 的完整性算法，使用 `COUNT/BEARER/DIRECTION` 作为参数。

### 生成 MAC-I

```typescript
import { eia3 } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const count = 0x398a59b4;
const bearer = 0x1a;
const direction = 0; // 0=上行, 1=下行
const message = 'Important Message';

// 生成 32 位 MAC-I
const mac = eia3(key, count, bearer, direction, message);
console.log('MAC-I:', mac); // 8 个十六进制字符
```

> **提示**: 通用业务场景如需消息认证，通常更推荐 HMAC-SM3；EIA3 主要面向 3GPP 协议。

## 🔑 密钥流生成

ZUC 的核心功能是生成密钥流，加密只是将密钥流与明文异或。

### 生成指定长度的密钥流

```typescript
import { zucKeystream } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

// 生成 16 字节（128 位）的密钥流
const words = Math.ceil(16 / 4); // length 参数是 32 位字数量
const keystream = zucKeystream(key, iv, words);
console.log('密钥流:', keystream); // 32 个十六进制字符

// 手动异或实现加密
function manualEncrypt(plaintext: string, key: string, iv: string): string {
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const words = Math.ceil(plaintextBytes.length / 4);
  const keystreamBytes = hexToBytes(zucKeystream(key, iv, words)).slice(0, plaintextBytes.length);
  
  const cipherBytes = new Uint8Array(plaintextBytes.length);
  for (let i = 0; i < plaintextBytes.length; i++) {
    cipherBytes[i] = plaintextBytes[i] ^ keystreamBytes[i];
  }
  
  return bytesToHex(cipherBytes);
}
```

##  完整 API 参考

### 加密解密

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `zucEncrypt(key, iv, plaintext, options?)` | ZUC 加密 | `string` |
| `zucDecrypt(key, iv, ciphertext, options?)` | ZUC 解密 | `string` |

### 完整性保护（3GPP）

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `eea3(key, count, bearer, direction, length)` | 生成 EEA3 密钥流 | `string` |
| `eia3(key, count, bearer, direction, message)` | 生成 EIA3 MAC-I（32 位） | `string` |

### 密钥流生成

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `zucKeystream(key, iv, length)` | 生成指定长度的密钥流（length 为 32 位字数量） | `string` |

### 类 API

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `new ZUC(key, iv)` | 创建 ZUC 实例 | `ZUC` |
| `encrypt(plaintext, options?)` | 加密 | `string \| Uint8Array` |
| `decrypt(ciphertext, options?)` | 解密 | `string \| Uint8Array` |
| `keystream(length)` | 生成密钥流（length 为 32 位字数量） | `string` |

### 选项参数

```typescript
interface ZUCOptions {
  outputFormat?: 'hex' | 'base64';  // 输出格式
}
```

##  使用场景

### 1. 移动通信加密（4G/5G）

3GPP 场景请使用 EEA3/EIA3 辅助函数（COUNT/BEARER/DIRECTION 由协议提供）：

```typescript
import { eea3, eia3 } from 'gmkitx';

const key = '00112233445566778899aabbccddeeff';
const count = 0x398a59b4;
const bearer = 0x1a;
const direction = 0; // 0=上行, 1=下行

const messageBytes = new TextEncoder().encode('LTE payload');
const bitLen = messageBytes.length * 8;

// EEA3：生成密钥流（按需 XOR 明文）
const keystreamHex = eea3(key, count, bearer, direction, bitLen);

// EIA3：生成完整性标签
const mac = eia3(key, count, bearer, direction, messageBytes);
```

### 2. 数据流加密

ZUC 的 `encrypt/decrypt` 每次调用都会从 IV 起始，**不适合**直接对分片重复调用。  
如需分块处理，可为每块使用独立 IV，或自行维护密钥流偏移（使用 `zucKeystream` 生成并 XOR）。

### 3. 消息完整性保护

ZUC 加密本身不提供认证，通用场景建议配合 HMAC-SM3：

```typescript
import { zucEncrypt, zucDecrypt, hmac } from 'gmkitx';

// 同时提供加密和完整性保护
class SecureMessage {
  static send(key: string, message: string) {
    const iv = generateRandomIV();
    const ciphertext = zucEncrypt(key, iv, message);
    const mac = hmac(key, ciphertext); // HMAC-SM3
    return { ciphertext, mac, iv };
  }
  
  static receive(key: string, packet: any): string | null {
    const { ciphertext, mac, iv } = packet;
    const calculated = hmac(key, ciphertext);
    if (calculated !== mac) {
      console.error('MAC 验证失败，消息可能被篡改');
      return null;
    }
    return zucDecrypt(key, iv, ciphertext);
  }
}
```

### 4. IoT 设备通信

```typescript
import { zucEncrypt, zucDecrypt } from 'gmkitx';

// IoT 设备间加密通信
class IoTDevice {
  private readonly deviceKey: string;
  private counter: number = 0;
  
  constructor(deviceId: string, masterKey: string) {
    // 从主密钥派生设备密钥
    this.deviceKey = this.deriveDeviceKey(deviceId, masterKey);
  }
  
  // 发送加密消息
  sendMessage(data: any, targetDevice: string): string {
    const message = JSON.stringify(data);
    const iv = this.generateIV(this.counter++);
    
    return zucEncrypt(this.deviceKey, iv, message);
  }
  
  // 接收加密消息
  receiveMessage(encrypted: string, counter: number): any {
    const iv = this.generateIV(counter);
    const decrypted = zucDecrypt(this.deviceKey, iv, encrypted);
    
    return JSON.parse(decrypted);
  }
  
  private deriveDeviceKey(deviceId: string, masterKey: string): string {
    // 简单的密钥派生（实际应使用 KDF）
    return sm3Digest(masterKey + deviceId).substring(0, 32);
  }
  
  private generateIV(counter: number): string {
    // 使用计数器作为 IV 的一部分
    return counter.toString(16).padStart(32, '0');
  }
}
```

##  高级用法

### 密钥派生

```typescript
import { sm3Digest } from 'gmkitx';

// 从主密钥派生会话密钥
function deriveSessionKey(
  masterKey: string,
  sessionId: string,
  timestamp: number
): string {
  const data = `${masterKey}:${sessionId}:${timestamp}`;
  const hash = sm3Digest(data);
  return hash.substring(0, 32); // 128 位密钥
}

// 使用
const masterKey = 'master-secret-key';
const sessionKey = deriveSessionKey(masterKey, 'session-123', Date.now());
```

### IV 管理

```typescript
import { randomBytes } from 'crypto';

// 生成随机 IV
function generateRandomIV(): string {
  return randomBytes(16).toString('hex');
}

// 从序列号生成 IV（用于有序消息）
function generateSequentialIV(sequenceNumber: number): string {
  return sequenceNumber.toString(16).padStart(32, '0');
}

// 从时间戳生成 IV
function generateTimestampIV(timestamp: number): string {
  const timestampHex = timestamp.toString(16).padStart(16, '0');
  const randomHex = randomBytes(8).toString('hex');
  return timestampHex + randomHex;
}
```

### 批量加密

```typescript
import { zucEncrypt } from 'gmkitx';

// 批量加密多条消息
function encryptBatch(
  messages: string[],
  key: string
): Array<{ ciphertext: string; iv: string }> {
  return messages.map(message => {
    const iv = generateRandomIV();
    const ciphertext = zucEncrypt(key, iv, message);
    return { ciphertext, iv };
  });
}

// 使用
const key = '0123456789abcdeffedcba9876543210';
const messages = ['msg1', 'msg2', 'msg3'];
const encrypted = encryptBatch(messages, key);
```

##  注意事项

1. **密钥长度**: ZUC 密钥必须是 128 位（32 个十六进制字符）
2. **IV 长度**: 初始化向量必须是 128 位（32 个十六进制字符）
3. **IV 唯一性**: 
   - 对于同一个密钥，绝对不能重复使用相同的 IV
   - IV 重复使用会导致严重的安全漏洞
4. **流密码特性**: 
   - ZUC 是流密码，加密和解密操作相同
   - 必须使用相同的密钥和 IV 才能正确解密
5. **同步性**: ZUC 是同步流密码，必须从头开始处理数据
6. **密钥保密**: 密钥必须妥善保管，泄露将导致所有加密数据不安全
7. **完整性**: ZUC 加密不提供完整性保护，应配合 HMAC-SM3 或 EIA3 使用
8. **分块处理**: `encrypt/decrypt` 每次从 IV 起始，分片需独立 IV 或自行维护密钥流偏移
9. **二进制数据**: `zucDecrypt` 会按 UTF-8 解码字符串，二进制场景请用密钥流 XOR 自行处理

##  常见问题

### Q: ZUC 和 SM4 有什么区别？

A: 
- **ZUC** 是流密码，逐字节加密，不需要填充，速度快
- **SM4** 是分组密码，按 16 字节块加密，需要填充
- ZUC 更适合实时数据流，SM4 更适合批量数据
- ZUC 主要用于移动通信，SM4 用途更广泛

### Q: 为什么 IV 不能重复使用？

A: ZUC 是流密码，相同的密钥和 IV 会产生相同的密钥流。如果重复使用，攻击者可以通过分析两个密文的异或值来推断明文。这是流密码的常见漏洞。

### Q: EIA3 和 HMAC-SM3 有什么区别？

A: 
- **EIA3**: 3GPP 协议定义的完整性算法，参数包含 COUNT/BEARER/DIRECTION
- **HMAC-SM3**: 通用消息认证码，接口更简单，适合业务系统
- 两者都需要密钥，但使用场景不同，需按协议选择

### Q: 可以用 ZUC 加密大文件吗？

A: 可以，但需要注意：
- ZUC 是流密码，理论上可以加密任意长度的数据
- 实际应用中，应分块处理大文件
- 每个文件或会话应使用不同的 IV

### Q: ZUC 在 4G/5G 中如何使用？

A: ZUC 作为 128-EEA3 和 128-EIA3 算法在 LTE/5G 中使用：
- 128-EEA3：用于用户数据和信令的加密
- 128-EIA3：用于信令的完整性保护
- IV 由帧序号、无线承载标识和方向组成

##  性能特点

### 优势

- ✅ 流密码设计，加密速度快
- ✅ 不需要填充，适合任意长度数据
- ✅ 内存占用小
- ✅ 适合硬件实现
- ✅ 延迟低，适合实时通信

### 性能基准

在现代硬件上的性能参考：

| 操作 | 吞吐量 |
|------|--------|
| 密钥流生成 | ~500 MB/s |
| 加密/解密 | ~400 MB/s |
| MAC 生成 | ~300 MB/s |

> 注: 实际性能取决于硬件配置和运行环境

##  相关资源

- [GM/T 0001-2012 ZUC 标准](http://www.gmbz.org.cn/)
- [3GPP TS 35.221 - 128-EEA3](https://www.3gpp.org/DynaReport/35221.htm)
- [3GPP TS 35.222 - 128-EIA3](https://www.3gpp.org/DynaReport/35222.htm)
- [流密码基础](https://en.wikipedia.org/wiki/Stream_cipher)

##  相关算法

- [SM2 - 椭圆曲线公钥密码算法](./SM2.md)
- [SM3 - 密码杂凑算法](./SM3.md)
- [SM4 - 分组密码算法](./SM4.md)
