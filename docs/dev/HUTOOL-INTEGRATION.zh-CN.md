---
title: Hutool 集成指南
icon: plug
order: 3
author: GMKitX Team
date: 2024-11-22
category:
  - 开发指南
  - 集成
tag:
  - Hutool
  - Java
  - 后端对接
  - 跨平台
---

# 与 Hutool 后端对接指南

本文档介绍如何在前端使用 GMKit 与后端 Hutool（Java）进行国密算法对接。

## Hutool 简介

[Hutool](https://hutool.cn/) 是一个 Java 工具类库，提供了丰富的国密算法支持。Hutool 的国密实现基于 Bouncy Castle 密码库。

## 核心概念

### 数据格式

GMKit 和 Hutool 在数据格式上需要保持一致：

| 数据类型 | GMKit 格式 | Hutool 格式 | 注意事项 |
|---------|-----------|------------|---------|
| 密钥 | 十六进制字符串（小写） | 十六进制字符串 | Hutool 可能返回大写，需要转换 |
| 明文 | UTF-8 字符串或 Uint8Array | UTF-8 字符串 | 编码保持一致 |
| 密文 | 十六进制字符串（小写） | 十六进制字符串或 Base64 | 需要统一格式 |
| 哈希 | 十六进制字符串（小写） | 十六进制字符串 | - |
| 签名 | 十六进制字符串（小写） | 十六进制字符串或 DER 编码 | 注意格式 |

## SM3 哈希算法对接

### Hutool 端（Java）

```java
import cn.hutool.crypto.digest.SM3;
import cn.hutool.core.util.HexUtil;

public class SM3Example {
    public static void main(String[] args) {
        SM3 sm3 = new SM3();
        
        // 计算哈希
        String data = "Hello, World!";
        byte[] hash = sm3.digest(data);
        String hashHex = HexUtil.encodeHexStr(hash);
        
        System.out.println("哈希值: " + hashHex);
    }
}
```

### GMKit 端（TypeScript/JavaScript）

```typescript
import { digest } from 'gmkitx';

const data = 'Hello, World!';
const hash = digest(data);

console.log('哈希值:', hash);

// 验证：与 Hutool 返回的哈希值对比
// 注意：Hutool 可能返回大写，需要转换为小写对比
const hutoolHash = 'XXXX...'; // 从后端获取
const isMatch = hash === hutoolHash.toLowerCase();
console.log('匹配:', isMatch);
```

### 注意事项

1. **字符编码**：确保前后端使用相同的字符编码（UTF-8）
2. **大小写**：GMKit 返回小写十六进制，Hutool 可能返回大写，需要转换
3. **HMAC**：Hutool 的 HMAC-SM3 实现与标准实现一致

## SM4 对称加密对接

### 核心参数对照

| 参数 | GMKit | Hutool | 说明 |
|-----|-------|--------|------|
| 密钥 | 32位十六进制 | 16字节或32位十六进制 | 128位密钥 |
| IV | 32位十六进制 | 16字节或32位十六进制 | CBC/CTR等模式需要 |
| 模式 | 'ecb', 'cbc', 'ctr'... | ECB, CBC, CTR... | 名称一致 |
| 填充 | 'pkcs7', 'none', 'zero' | PKCS5Padding, NoPadding | PKCS7 = PKCS5 |

### Hutool 端（Java）

```java
import cn.hutool.crypto.symmetric.SM4;
import cn.hutool.core.util.HexUtil;
import cn.hutool.crypto.Mode;
import cn.hutool.crypto.Padding;

public class SM4Example {
    public static void main(String[] args) {
        // ECB 模式
        String key = "0123456789abcdeffedcba9876543210";
        SM4 sm4 = new SM4(Mode.ECB, Padding.PKCS5Padding, HexUtil.decodeHex(key));
        
        String plaintext = "Hello, SM4!";
        byte[] encrypted = sm4.encrypt(plaintext);
        String encryptedHex = HexUtil.encodeHexStr(encrypted);
        
        System.out.println("密文: " + encryptedHex);
        
        // 解密
        byte[] decrypted = sm4.decrypt(HexUtil.decodeHex(encryptedHex));
        String decryptedStr = new String(decrypted);
        System.out.println("明文: " + decryptedStr);
        
        // CBC 模式
        String iv = "fedcba98765432100123456789abcdef";
        SM4 sm4cbc = new SM4(Mode.CBC, Padding.PKCS5Padding, 
                             HexUtil.decodeHex(key), 
                             HexUtil.decodeHex(iv));
        
        byte[] encryptedCBC = sm4cbc.encrypt(plaintext);
        String encryptedCBCHex = HexUtil.encodeHexStr(encryptedCBC);
        System.out.println("CBC密文: " + encryptedCBCHex);
    }
}
```

### GMKit 端（TypeScript/JavaScript）

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode, PaddingMode } from 'gmkitx';

// ECB 模式
const key = '0123456789abcdeffedcba9876543210';
const plaintext = 'Hello, SM4!';

const encrypted = sm4Encrypt(key, plaintext, {
  mode: CipherMode.ECB,
  padding: PaddingMode.PKCS7 // PKCS7 与 PKCS5 等价
});
console.log('密文:', encrypted);

// 与后端对接：发送密文给后端解密，或接收后端加密的密文并解密
const decrypted = sm4Decrypt(key, encrypted, {
  mode: CipherMode.ECB,
  padding: PaddingMode.PKCS7
});
console.log('明文:', decrypted);

// CBC 模式
const iv = 'fedcba98765432100123456789abcdef';
const encryptedCBC = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv
});
console.log('CBC密文:', encryptedCBC);

const decryptedCBC = sm4Decrypt(key, encryptedCBC, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv
});
console.log('CBC明文:', decryptedCBC);
```

### 注意事项

1. **填充模式**：Hutool 使用 PKCS5Padding，与 PKCS7Padding 等价（对于 16 字节块）
2. **IV**：CBC、CTR 等模式必须使用相同的 IV
3. **密钥长度**：SM4 固定使用 128 位（16 字节）密钥
4. **返回格式**：统一使用十六进制字符串传输

## SM2 非对称加密对接

SM2 是最复杂的部分，需要特别注意以下几点：

### 密钥格式

| 格式 | GMKit | Hutool | 转换 |
|-----|-------|--------|------|
| 公钥 | 非压缩（04前缀）130字符 | 可压缩可非压缩 | 保持一致 |
| 私钥 | 64位十六进制 | 32字节或64位十六进制 | 转换为十六进制 |

### 密文模式

| 模式 | GMKit | Hutool | 说明 |
|-----|-------|--------|------|
| C1C3C2 | 默认 | 推荐 | 国密标准推荐 |
| C1C2C3 | 支持 | 支持 | 旧标准 |

### Hutool 端（Java）

```java
import cn.hutool.crypto.asymmetric.SM2;
import cn.hutool.core.util.HexUtil;
import cn.hutool.crypto.SmUtil;

public class SM2Example {
    public static void main(String[] args) {
        // 生成密钥对
        SM2 sm2 = SmUtil.sm2();
        
        // 获取密钥（十六进制格式）
        String privateKeyHex = HexUtil.encodeHexStr(sm2.getPrivateKey().getEncoded());
        String publicKeyHex = HexUtil.encodeHexStr(sm2.getPublicKey().getEncoded());
        
        System.out.println("私钥: " + privateKeyHex);
        System.out.println("公钥: " + publicKeyHex);
        
        // 加密（C1C3C2 模式）
        String plaintext = "Hello, SM2!";
        byte[] encrypted = sm2.encrypt(plaintext.getBytes(), 
                                       cn.hutool.crypto.asymmetric.KeyType.PublicKey);
        String encryptedHex = HexUtil.encodeHexStr(encrypted);
        
        System.out.println("密文: " + encryptedHex);
        
        // 解密
        byte[] decrypted = sm2.decrypt(encrypted, 
                                       cn.hutool.crypto.asymmetric.KeyType.PrivateKey);
        String decryptedStr = new String(decrypted);
        System.out.println("明文: " + decryptedStr);
        
        // 签名
        byte[] signature = sm2.sign(plaintext.getBytes());
        String signatureHex = HexUtil.encodeHexStr(signature);
        System.out.println("签名: " + signatureHex);
        
        // 验签
        boolean verified = sm2.verify(plaintext.getBytes(), signature);
        System.out.println("验签结果: " + verified);
    }
}
```

### GMKit 端（TypeScript/JavaScript）

```typescript
import { 
  generateKeyPair, 
  sm2Encrypt, 
  sm2Decrypt,
  sign,
  verify,
  SM2CipherMode
} from 'gmkitx';

// 方案 1: 前端生成密钥对（不推荐生产环境）
const keyPair = generateKeyPair();
console.log('公钥:', keyPair.publicKey);
console.log('私钥:', keyPair.privateKey);

// 方案 2: 使用后端提供的密钥
const publicKey = '04...'; // 从后端获取的公钥（130字符，04开头）
const privateKey = '...';  // 从后端获取的私钥（64字符）

// 加密
const plaintext = 'Hello, SM2!';
const encrypted = sm2Encrypt(publicKey, plaintext, SM2CipherMode.C1C3C2);
console.log('密文:', encrypted);

// 解密
const decrypted = sm2Decrypt(privateKey, encrypted, SM2CipherMode.C1C3C2);
console.log('明文:', decrypted);

// 签名
const message = 'Message to sign';
const signature = sign(privateKey, message);
console.log('签名:', signature);

// 验签
const isValid = verify(publicKey, message, signature);
console.log('验签结果:', isValid);
```

### 注意事项

1. **密钥格式转换**：
   - Hutool 的公钥可能包含 ASN.1 头部，需要提取原始坐标
   - GMKit 使用 04 + X + Y 的非压缩格式（130个十六进制字符）
   
2. **密文模式**：
   - 默认都使用 C1C3C2 模式
   - 如果不匹配，会解密失败
   
3. **用户 ID**：
   - Hutool 默认用户 ID 可能不同
   - GMKit 默认为 '1234567812345678'
   - 签名验签时必须使用相同的用户 ID

4. **签名格式**：
   - Hutool 可能使用 DER 编码
   - GMKit 支持 Raw 和 DER 两种格式
   - 通过 `{ der: true }` 选项切换

## 完整对接示例

### 场景：前端加密，后端解密

#### 前端（GMKit）

```typescript
import { sm2Encrypt, SM2CipherMode } from 'gmkitx';

// 从后端获取公钥
const publicKey = '04...'; // 后端提供

// 加密敏感数据
const sensitiveData = 'user password or token';
const encrypted = sm2Encrypt(publicKey, sensitiveData, SM2CipherMode.C1C3C2);

// 发送密文给后端
fetch('/api/secure-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ encrypted })
});
```

#### 后端（Hutool）

```java
import cn.hutool.crypto.asymmetric.SM2;
import cn.hutool.core.util.HexUtil;

@PostMapping("/api/secure-data")
public String handleSecureData(@RequestBody Map<String, String> data) {
    String encryptedHex = data.get("encrypted");
    
    // 使用私钥解密
    SM2 sm2 = new SM2(privateKeyHex, null);
    byte[] decrypted = sm2.decrypt(
        HexUtil.decodeHex(encryptedHex), 
        KeyType.PrivateKey
    );
    
    String plaintext = new String(decrypted);
    // 处理明文数据...
    
    return "success";
}
```

### 场景：后端签名，前端验签

#### 后端（Hutool）

```java
import cn.hutool.crypto.asymmetric.SM2;
import cn.hutool.core.util.HexUtil;

@GetMapping("/api/data")
public Map<String, String> getData() {
    String data = "important data";
    
    SM2 sm2 = new SM2(privateKeyHex, publicKeyHex);
    byte[] signature = sm2.sign(data.getBytes());
    String signatureHex = HexUtil.encodeHexStr(signature);
    
    Map<String, String> response = new HashMap<>();
    response.put("data", data);
    response.put("signature", signatureHex);
    response.put("publicKey", publicKeyHex);
    
    return response;
}
```

#### 前端（GMKit）

```typescript
import { verify } from 'gmkitx';

// 从后端获取数据
const response = await fetch('/api/data').then(r => r.json());
const { data, signature, publicKey } = response;

// 验证签名
const isValid = verify(publicKey, data, signature);

if (isValid) {
  console.log('数据验证成功，可信任');
  // 使用数据...
} else {
  console.error('数据签名验证失败，可能被篡改');
}
```

## 常见问题

### 1. 加密结果不一致

**原因**：
- 密文模式不同（C1C3C2 vs C1C2C3）
- 随机数不同（SM2 加密包含随机性，每次结果不同）

**解决**：
- 统一使用 C1C3C2 模式
- 不要比较密文，而是比较解密后的明文

### 2. 签名验证失败

**原因**：
- 用户 ID 不一致
- 签名格式不同（Raw vs DER）
- 公钥格式不匹配

**解决**：
```typescript
// 使用相同的用户 ID
const userId = '1234567812345678';
const sig = sign(privateKey, data, { userId });
const valid = verify(publicKey, data, sig, { userId });

// 或使用 DER 格式
const sigDER = sign(privateKey, data, { der: true });
const validDER = verify(publicKey, data, sigDER, { der: true });
```

### 3. 密钥格式转换

**Hutool 公钥转 GMKit 格式**：

如果 Hutool 返回的公钥包含 ASN.1 头部，需要提取原始坐标：

```typescript
// Hutool 可能返回带头部的公钥
// 需要提取 04 + X + Y 部分（130个十六进制字符）
function extractRawPublicKey(hutoolPublicKey: string): string {
  // 查找 04 开头的位置
  const startIndex = hutoolPublicKey.indexOf('04');
  if (startIndex === -1) {
    throw new Error('Invalid public key format');
  }
  // 提取 130 个字符（1 + 64 + 64）
  return hutoolPublicKey.substring(startIndex, startIndex + 130);
}
```

### 4. Base64 与十六进制转换

如果后端使用 Base64 格式：

```typescript
function hexToBase64(hex: string): string {
  const bytes = hexToBytes(hex);
  return btoa(String.fromCharCode(...bytes));
}

function base64ToHex(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytesToHex(bytes);
}
```

## 测试工具

创建一个测试页面验证前后端对接：

```typescript
// test-hutool-integration.ts
import { sm2Encrypt, sm2Decrypt, sign, verify } from 'gmkitx';

async function testIntegration() {
  // 1. 从后端获取公钥
  const response = await fetch('/api/sm2/public-key');
  const { publicKey } = await response.json();
  
  // 2. 测试加密
  const plaintext = 'Test data';
  const encrypted = sm2Encrypt(publicKey, plaintext);
  
  // 3. 发送给后端解密
  const decryptResponse = await fetch('/api/sm2/decrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encrypted })
  });
  
  const { decrypted } = await decryptResponse.json();
  console.log('解密结果匹配:', decrypted === plaintext);
  
  // 4. 测试验签
  const signResponse = await fetch('/api/sm2/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: plaintext })
  });
  
  const { signature } = await signResponse.json();
  const isValid = verify(publicKey, plaintext, signature);
  console.log('签名验证结果:', isValid);
}
```

## 进一步阅读

- [GMKit API 文档](../README.md)
- [Hutool 官方文档](https://hutool.cn/docs/)
- [GMT-0009 合规性](../standards/GMT-0009-COMPLIANCE.md)
- [GMT-0009 快速参考](../standards/GMT-0009-快速参考.md)

## 技术支持

如果在对接过程中遇到问题，请：

1. 检查密钥格式是否一致
2. 确认加密模式和填充方式相同
3. 验证字符编码统一使用 UTF-8
4. 查看错误日志，确定具体失败原因
5. 提交 Issue 到 GitHub 仓库
