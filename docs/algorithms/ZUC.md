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

ZUC（祖冲之算法）是中国自主设计的流密码算法，以中国古代数学家祖冲之命名。ZUC 算法被 3GPP 组织采纳为 4G LTE 国际标准的第三组加密和完整性算法（128-EEA3 和 128-EIA3），广泛应用于移动通信领域。

### 标准依据

- **GM/T 0001-2012**: ZUC 序列密码算法
- **3GPP TS 35.221**: ZUC-128 加密算法（128-EEA3）
- **3GPP TS 35.222**: ZUC-128 完整性算法（128-EIA3）

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

##  加密算法（128-EEA3）

ZUC 是同步流密码，通过生成密钥流与明文异或实现加密。

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

// 需要重新初始化实例才能解密
const zucDecryptor = new ZUC(key, iv);
const plaintext = zucDecryptor.decrypt(ciphertext);
```

### 多种输入输出格式

```typescript
import { zucEncrypt, OutputFormat } from 'gmkitx';

// 输入字符串，输出十六进制（默认）
const hexCipher = zucEncrypt(key, iv, 'Hello', {
  outputFormat: OutputFormat.HEX
});

// 输入字符串，输出 Base64
const base64Cipher = zucEncrypt(key, iv, 'Hello', {
  outputFormat: OutputFormat.BASE64
});

// 输入字符串，输出字节数组
const bytesCipher = zucEncrypt(key, iv, 'Hello', {
  outputFormat: OutputFormat.BYTES
});

// 输入字节数组
const bytesInput = new Uint8Array([72, 101, 108, 108, 111]);
const encrypted = zucEncrypt(key, iv, bytesInput);
```

## 🔒 完整性算法（128-EIA3）

ZUC 还提供消息认证码（MAC）功能，用于验证数据完整性。

### 生成 MAC

```typescript
import { zucMac } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';
const message = 'Important Message';

// 生成 32 位 MAC
const mac = zucMac(key, iv, message);
console.log('MAC:', mac); // 8 个十六进制字符
```

### 验证 MAC

```typescript
import { zucMac } from 'gmkitx';

// 发送方
const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';
const message = 'Important Message';
const mac = zucMac(key, iv, message);

// 将 message 和 mac 发送给接收方...

// 接收方
const receivedMessage = 'Important Message';
const receivedMac = mac;
const calculatedMac = zucMac(key, iv, receivedMessage);

if (calculatedMac === receivedMac) {
  console.log('✅ 消息完整，未被篡改');
} else {
  console.log('❌ 消息已被篡改！');
}
```

## 🔑 密钥流生成

ZUC 的核心功能是生成密钥流，加密只是将密钥流与明文异或。

### 生成指定长度的密钥流

```typescript
import { zucKeystream } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

// 生成 16 字节（128 位）的密钥流
const keystream = zucKeystream(key, iv, 16);
console.log('密钥流:', keystream); // 32 个十六进制字符

// 手动异或实现加密
function manualEncrypt(plaintext: string, key: string, iv: string): string {
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const keystreamBytes = hexToBytes(zucKeystream(key, iv, plaintextBytes.length));
  
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
| `zucEncrypt(key, iv, plaintext, options?)` | ZUC 加密 | `string \| Uint8Array` |
| `zucDecrypt(key, iv, ciphertext, options?)` | ZUC 解密 | `string \| Uint8Array` |

### 完整性保护

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `zucMac(key, iv, message, options?)` | 生成 MAC（32 位） | `string` |

### 密钥流生成

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `zucKeystream(key, iv, length)` | 生成指定长度的密钥流 | `string` |

### 类 API

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `new ZUC(key, iv)` | 创建 ZUC 实例 | `ZUC` |
| `encrypt(plaintext, options?)` | 加密 | `string \| Uint8Array` |
| `decrypt(ciphertext, options?)` | 解密 | `string \| Uint8Array` |
| `generateKeystream(length)` | 生成密钥流 | `Uint8Array` |

### 选项参数

```typescript
interface ZUCOptions {
  outputFormat?: 'hex' | 'base64' | 'bytes';  // 输出格式
}
```

##  使用场景

### 1. 移动通信加密（4G/5G）

```typescript
import { zucEncrypt, zucDecrypt } from 'gmkitx';

// 模拟 LTE 数据加密
class LTECipher {
  private readonly key: string;
  
  constructor(k: string) {
    this.key = k;
  }
  
  // 加密上行数据
  encryptUplink(data: string, count: number, bearer: number): string {
    const iv = this.generateIV(count, bearer, 0); // 0 = uplink
    return zucEncrypt(this.key, iv, data);
  }
  
  // 加密下行数据
  encryptDownlink(data: string, count: number, bearer: number): string {
    const iv = this.generateIV(count, bearer, 1); // 1 = downlink
    return zucEncrypt(this.key, iv, data);
  }
  
  // 根据 3GPP 标准生成 IV
  private generateIV(count: number, bearer: number, direction: number): string {
    // IV = COUNT || BEARER || DIRECTION || 0...0
    const countHex = count.toString(16).padStart(8, '0');
    const bearerBits = (bearer << 27) | (direction << 26);
    const ivSuffix = bearerBits.toString(16).padStart(24, '0');
    return countHex + ivSuffix;
  }
}
```

### 2. 数据流加密

```typescript
import { ZUC } from 'gmkitx';

// 流式数据加密
class StreamCipher {
  private zuc: ZUC;
  
  constructor(key: string, iv: string) {
    this.zuc = new ZUC(key, iv);
  }
  
  // 加密数据流
  encryptStream(dataChunks: string[]): string[] {
    return dataChunks.map(chunk => this.zuc.encrypt(chunk));
  }
  
  // 实时视频流加密
  encryptVideoFrame(frame: Uint8Array): Uint8Array {
    return this.zuc.encrypt(frame, {
      outputFormat: OutputFormat.BYTES
    }) as Uint8Array;
  }
}
```

### 3. 消息完整性保护

```typescript
import { zucEncrypt, zucMac } from 'gmkitx';

// 同时提供加密和完整性保护
class SecureMessage {
  static send(key: string, message: string) {
    const encIV = generateRandomIV();
    const macIV = generateRandomIV();
    
    // 加密消息
    const ciphertext = zucEncrypt(key, encIV, message);
    
    // 生成 MAC
    const mac = zucMac(key, macIV, ciphertext);
    
    return { ciphertext, mac, encIV, macIV };
  }
  
  static receive(key: string, packet: any): string | null {
    const { ciphertext, mac, encIV, macIV } = packet;
    
    // 验证 MAC
    const calculatedMac = zucMac(key, macIV, ciphertext);
    if (calculatedMac !== mac) {
      console.error('MAC 验证失败，消息可能被篡改');
      return null;
    }
    
    // 解密消息
    return zucDecrypt(key, encIV, ciphertext);
  }
}

// 使用
const key = '0123456789abcdeffedcba9876543210';
const packet = SecureMessage.send(key, 'Secret Message');
const decrypted = SecureMessage.receive(key, packet);
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

### 5. 文件加密

```typescript
import { zucEncrypt, zucDecrypt } from 'gmkitx';
import { readFileSync, writeFileSync } from 'fs';

// 文件加密工具
class FileEncryptor {
  static encryptFile(
    inputPath: string,
    outputPath: string,
    key: string
  ): void {
    const data = readFileSync(inputPath);
    const iv = generateRandomIV();
    
    // 加密文件内容
    const encrypted = zucEncrypt(key, iv, data, {
      outputFormat: OutputFormat.BASE64
    });
    
    // 保存 IV 和密文
    const output = JSON.stringify({ iv, encrypted });
    writeFileSync(outputPath, output);
  }
  
  static decryptFile(
    inputPath: string,
    outputPath: string,
    key: string
  ): void {
    const input = JSON.parse(readFileSync(inputPath, 'utf-8'));
    const { iv, encrypted } = input;
    
    // 解密文件内容
    const decrypted = zucDecrypt(key, iv, encrypted);
    writeFileSync(outputPath, decrypted);
  }
}

// 使用
const key = '0123456789abcdeffedcba9876543210';
FileEncryptor.encryptFile('document.pdf', 'document.enc', key);
FileEncryptor.decryptFile('document.enc', 'document_decrypted.pdf', key);
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
7. **完整性**: ZUC 加密不提供完整性保护，应配合 MAC 使用
8. **状态管理**: 使用类 API 时，加密后实例状态已改变，不能直接用于解密

##  常见问题

### Q: ZUC 和 SM4 有什么区别？

A: 
- **ZUC** 是流密码，逐字节加密，不需要填充，速度快
- **SM4** 是分组密码，按 16 字节块加密，需要填充
- ZUC 更适合实时数据流，SM4 更适合批量数据
- ZUC 主要用于移动通信，SM4 用途更广泛

### Q: 为什么 IV 不能重复使用？

A: ZUC 是流密码，相同的密钥和 IV 会产生相同的密钥流。如果重复使用，攻击者可以通过分析两个密文的异或值来推断明文。这是流密码的常见漏洞。

### Q: ZUC 的 MAC 功能和 SM3 哈希有什么区别？

A: 
- ZUC MAC 需要密钥，只有持有密钥的人才能生成和验证
- SM3 是公开哈希，任何人都能计算
- ZUC MAC 用于完整性保护和认证
- SM3 用于数据摘要和完整性校验

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
