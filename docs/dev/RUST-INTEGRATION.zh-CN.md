---
title: Rust 对接指南
icon: code
order: 6
author: mumu
date: 2025-12-27
category:
  - 开发指南
  - 集成
tag:
  - Rust
  - libsm
  - 对接其他语言
---

# Rust 语言对接指南

本页介绍 Rust 语言与 gmkitx 的互通方案。

## 推荐库

### libsm

[libsm](https://github.com/citahub/libsm) 是 Rust 生态中成熟的国密算法实现库，由 CITA 团队开发维护。

### 安装

在 `Cargo.toml` 中添加依赖：

```toml
[dependencies]
libsm = "0.5"
hex = "0.4"
```

## 数据约定

| 项目       | 约定                      | 备注                     |
|----------|-------------------------|------------------------|
| SM2 公钥   | 非压缩 04+X+Y（130 hex）     | 与 gmkitx 保持一致           |
| SM2 私钥   | 64 hex                  | 32字节私钥                 |
| SM2 密文模式 | C1C3C2（默认）、C1C2C3       | libsm 默认使用 C1C3C2      |
| SM4 密钥   | 32 hex（128bit）          | 16字节密钥                 |
| SM4 填充   | PKCS7 或 NoPadding       | 根据模式选择                 |
| 传输编码     | UTF-8 + 小写 hex          | 保持编码一致                 |

## 模式与填充详解

### SM2 密文模式

SM2 加密后的密文由三部分组成：
- **C1**：椭圆曲线点（65字节，非压缩格式）
- **C2**：密文数据（与明文等长）
- **C3**：摘要值（32字节，SM3哈希）

两种排列模式：
- **C1C3C2**：gmkitx 默认模式，国密标准推荐格式
- **C1C2C3**：部分旧版实现使用，需显式指定

::: warning 重要
对接时必须确保双方使用相同的密文模式，否则无法正确解密！
:::

### SM4 填充模式

SM4 是分组密码，块大小为 16 字节。当明文长度不是 16 的倍数时需要填充：

- **PKCS7**：标准填充，自动添加 1-16 字节填充数据
  - 示例：明文 11 字节，填充 5 个 0x05
- **NoPadding**：无填充，要求明文已对齐 16 字节，或用于流模式
  - 注意：需要手动处理填充和去填充

::: tip 推荐
ECB/CBC 模式推荐使用 PKCS7 填充，可自动处理任意长度明文。
:::

## SM2 对接示例

::: code-tabs#sm2

@tab gmkitx
```typescript
import { 
  generateKeyPair, 
  sm2Encrypt, 
  sm2Decrypt, 
  sign, 
  verify,
  SM2CipherMode 
} from 'gmkitx';

// 生成密钥对
const keyPair = generateKeyPair();
console.log('公钥:', keyPair.publicKey);
console.log('私钥:', keyPair.privateKey);

// 加密
const plaintext = 'Hello, SM2!';
const ciphertext = sm2Encrypt(
  keyPair.publicKey, 
  plaintext, 
  SM2CipherMode.C1C3C2
);
console.log('密文:', ciphertext);

// 解密
const decrypted = sm2Decrypt(
  keyPair.privateKey, 
  ciphertext, 
  SM2CipherMode.C1C3C2
);
console.log('明文:', decrypted);

// 签名
const message = 'Important message';
const signature = sign(keyPair.privateKey, message);
console.log('签名:', signature);

// 验签
const isValid = verify(keyPair.publicKey, message, signature);
console.log('验签结果:', isValid);
```

@tab Rust (libsm)
```rust
use libsm::sm2::ecc::EccCtx;
use libsm::sm2::signature::{Pubkey, Seckey};
use hex;

fn main() {
    // 创建椭圆曲线上下文
    let ctx = EccCtx::new();
    
    // 生成密钥对
    let (pk, sk) = ctx.new_keypair();
    
    // 序列化为十六进制
    let pk_bytes = pk.bytes_less_safe();
    let sk_bytes = sk.bytes_less_safe();
    
    println!("公钥: {}", hex::encode(pk_bytes));
    println!("私钥: {}", hex::encode(sk_bytes));
}
```

### 加密/解密

```rust
use libsm::sm2::encrypt::{DecryptCtx, EncryptCtx};
use hex;

fn main() {
    let ctx = EccCtx::new();
    let (pk, sk) = ctx.new_keypair();
    
    // 加密
    let plaintext = b"Hello, SM2!";
    // libsm 默认输出 C1C2C3 顺序
    let encrypt_ctx = EncryptCtx::new(plaintext.len(), pk.clone());
    let ciphertext = encrypt_ctx.encrypt(plaintext).unwrap();
    
    println!("密文: {}", hex::encode(&ciphertext));
    
    // 解密
    let decrypt_ctx = DecryptCtx::new(plaintext.len(), sk);
    let decrypted = decrypt_ctx.decrypt(&ciphertext).unwrap();
    
    println!("明文: {}", String::from_utf8(decrypted).unwrap());
}
```

### 签名/验签

```rust
use libsm::sm2::signature::{SigCtx, Signature};
use hex;

fn main() {
    let ctx = EccCtx::new();
    let (pk, sk) = ctx.new_keypair();
    
    // 签名
    let message = b"Important message";
    let sig_ctx = SigCtx::new();
    let signature = sig_ctx.sign(message, &sk, &pk);
    
    println!("签名: {}", hex::encode(&signature.der_encode()));
    
    // 验签
    let is_valid = sig_ctx.verify(message, &pk, &signature);
    println!("验签结果: {}", is_valid);
}
```
:::

## SM3 对接示例

::: code-tabs#sm3

@tab gmkitx
```typescript
import { digest, hmac, SM3 } from 'gmkitx';

// 计算 SM3 摘要
const hash = digest('Hello, SM3!');
console.log('SM3摘要:', hash);

// HMAC-SM3
const mac = hmac('secret-key', 'message');
console.log('HMAC-SM3:', mac);

// 增量哈希
const sm3 = new SM3();
sm3.update('Hello, ');
sm3.update('World!');
const result = sm3.digest();
console.log('增量哈希:', result);
```

@tab Rust (libsm)
```rust
use libsm::sm3::hash::Sm3Hash;
use hex;

fn main() {
    let data = b"Hello, SM3!";
    
    // 计算 SM3 摘要
    let mut hasher = Sm3Hash::new(data);
    let hash = hasher.get_hash();
    
    println!("SM3摘要: {}", hex::encode(&hash));
}
```
:::

## SM4 对接示例

::: code-tabs#sm4

@tab gmkitx
```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode, PaddingMode, SM4 } from 'gmkitx';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';
const plaintext = 'Hello, SM4!';

// ECB 模式
const cipherECB = sm4Encrypt(key, plaintext, {
  mode: CipherMode.ECB,
  padding: PaddingMode.PKCS7
});
console.log('ECB密文:', cipherECB);

const plainECB = sm4Decrypt(key, cipherECB, {
  mode: CipherMode.ECB,
  padding: PaddingMode.PKCS7
});
console.log('ECB明文:', plainECB);

// CBC 模式
const cipherCBC = sm4Encrypt(key, plaintext, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv
});
console.log('CBC密文:', cipherCBC);

const plainCBC = sm4Decrypt(key, cipherCBC, {
  mode: CipherMode.CBC,
  padding: PaddingMode.PKCS7,
  iv
});
console.log('CBC明文:', plainCBC);
```

@tab Rust (libsm)
```rust
use libsm::sm4::cipher::Sm4Cipher;
use hex;

fn pkcs7_pad(data: &[u8]) -> Vec<u8> {
    let pad = 16 - (data.len() % 16);
    let mut out = data.to_vec();
    out.extend(std::iter::repeat(pad as u8).take(pad));
    out
}

fn pkcs7_unpad(data: &[u8]) -> Vec<u8> {
    let pad = *data.last().unwrap() as usize;
    data[..data.len() - pad].to_vec()
}

fn main() {
    // 密钥（16字节）
    let key = hex::decode("0123456789abcdeffedcba9876543210").unwrap();
    let plaintext = b"Hello, SM4!";
    
    // ECB 加密（手动 PKCS7 填充）
    let cipher = Sm4Cipher::new(&key).unwrap();
    let padded = pkcs7_pad(plaintext);
    let mut ciphertext = Vec::new();
    for block in padded.chunks(16) {
        let enc = cipher.encrypt(block).unwrap();
        ciphertext.extend_from_slice(&enc);
    }
    
    println!("密文: {}", hex::encode(&ciphertext));
    
    // ECB 解密
    let mut plain_padded = Vec::new();
    for block in ciphertext.chunks(16) {
        let dec = cipher.decrypt(block).unwrap();
        plain_padded.extend_from_slice(&dec);
    }
    let decrypted = pkcs7_unpad(&plain_padded);
    
    println!("明文: {}", String::from_utf8(decrypted).unwrap());
}
```

### CBC 模式

```rust
use libsm::sm4::cipher_mode::{CipherMode, Sm4CipherMode};
use hex;

fn main() {
    let key = hex::decode("0123456789abcdeffedcba9876543210").unwrap();
    let iv = hex::decode("fedcba98765432100123456789abcdef").unwrap();
    let plaintext = b"Hello, SM4 CBC!";
    
    // CBC 模式内部自动使用 PKCS7 填充
    let cipher = Sm4CipherMode::new(&key, CipherMode::Cbc).unwrap();
    let ciphertext = cipher.encrypt(&[], plaintext, &iv).unwrap();
    
    println!("密文: {}", hex::encode(&ciphertext));
    
    // CBC 解密
    let decrypted = cipher.decrypt(&[], &ciphertext, &iv).unwrap();
    
    println!("明文: {}", String::from_utf8(decrypted).unwrap());
}
```
:::

## 互操作性测试

```rust
use serde::Deserialize;
use serde_json::Value;
use std::fs;

use hex;
use libsm::sm2::encrypt::{DecryptCtx, EncryptCtx};
use libsm::sm2::signature::SigCtx;
use libsm::sm3::hash::Sm3Hash;
use libsm::sm4::cipher::Sm4Cipher;
use libsm::sm4::cipher_mode::{CipherMode, Sm4CipherMode};

#[derive(Debug, Deserialize)]
struct Defaults {
    sm4KeyHex: String,
    sm4IvHex: String,
    sm2PublicKeyHex: String,
    sm2PrivateKeyHex: String,
}

#[derive(Debug, Deserialize)]
struct TestVector {
    id: String,
    algo: String,
    op: String,
    mode: Option<String>,
    padding: Option<String>,
    input: String,
    keyHex: Option<String>,
    ivHex: Option<String>,
    publicKeyHex: Option<String>,
    privateKeyHex: Option<String>,
    expected: Value,
}

#[derive(Debug, Deserialize)]
struct TestVectors {
    defaults: Defaults,
    cases: Vec<TestVector>,
}

fn pkcs7_pad(data: &[u8]) -> Vec<u8> {
    let pad = 16 - (data.len() % 16);
    let mut out = data.to_vec();
    out.extend(std::iter::repeat(pad as u8).take(pad));
    out
}

fn pkcs7_unpad(data: &[u8]) -> Vec<u8> {
    let pad = *data.last().unwrap() as usize;
    data[..data.len() - pad].to_vec()
}

// libsm 默认输出 C1C2C3，按需转换为 C1C3C2
fn c1c2c3_to_c1c3c2(cipher: &[u8]) -> Vec<u8> {
    let c1_len = 65;
    let c3_len = 32;
    let c2_len = cipher.len() - c1_len - c3_len;
    let c1 = &cipher[..c1_len];
    let c2 = &cipher[c1_len..c1_len + c2_len];
    let c3 = &cipher[c1_len + c2_len..];
    [c1, c3, c2].concat()
}

fn c1c3c2_to_c1c2c3(cipher: &[u8]) -> Vec<u8> {
    let c1_len = 65;
    let c3_len = 32;
    let c2_len = cipher.len() - c1_len - c3_len;
    let c1 = &cipher[..c1_len];
    let c3 = &cipher[c1_len..c1_len + c3_len];
    let c2 = &cipher[c1_len + c3_len..];
    [c1, c2, c3].concat()
}

fn main() {
    // 读取测试向量
    let data = fs::read_to_string("test/vectors/interop.json")
        .expect("Unable to read file");
    let vectors: TestVectors = serde_json::from_str(&data)
        .expect("Unable to parse JSON");
    
    // 运行测试
    for tc in vectors.cases.iter() {
        match tc.algo.as_str() {
            "SM3" => test_sm3(tc),
            "SM4" => test_sm4(tc, &vectors.defaults),
            "SM2" => test_sm2(tc, &vectors.defaults),
            _ => {}
        }
    }
}

fn test_sm3(tc: &TestVector) {
    let mut hasher = Sm3Hash::new(tc.input.as_bytes());
    let hash = hasher.get_hash();
    let actual = hex::encode(&hash);
    let expected = tc.expected.get("hex").and_then(|v| v.as_str()).unwrap_or("");
    
    if actual == expected {
        println!("✓ {} passed", tc.id);
    } else {
        println!("✗ {} failed", tc.id);
    }
}

fn test_sm4(tc: &TestVector, defaults: &Defaults) {
    let key_hex = tc.keyHex.as_deref().unwrap_or(&defaults.sm4KeyHex);
    let key = hex::decode(key_hex).unwrap();
    let input = tc.input.as_bytes();

    let mode = tc.mode.as_deref().unwrap_or("ECB");
    let padding = tc.padding.as_deref().unwrap_or("PKCS7");

    let (ciphertext, plain) = if mode == "ECB" {
        let cipher = Sm4Cipher::new(&key).unwrap();
        let padded = if padding == "PKCS7" {
            pkcs7_pad(input)
        } else {
            input.to_vec()
        };
        let mut ct = Vec::new();
        for block in padded.chunks(16) {
            let enc = cipher.encrypt(block).unwrap();
            ct.extend_from_slice(&enc);
        }
        let mut pt = Vec::new();
        for block in ct.chunks(16) {
            let dec = cipher.decrypt(block).unwrap();
            pt.extend_from_slice(&dec);
        }
        let pt = if padding == "PKCS7" { pkcs7_unpad(&pt) } else { pt };
        (ct, pt)
    } else if mode == "CBC" {
        let iv_hex = tc.ivHex.as_deref().unwrap_or(&defaults.sm4IvHex);
        let iv = hex::decode(iv_hex).unwrap();
        let cipher = Sm4CipherMode::new(&key, CipherMode::Cbc).unwrap();
        let ct = cipher.encrypt(&[], input, &iv).unwrap();
        let pt = cipher.decrypt(&[], &ct, &iv).unwrap();
        (ct, pt)
    } else {
        println!("! {} skipped (mode {})", tc.id, mode);
        return;
    };

    if let Some(expected_hex) = tc.expected.get("cipherHex").and_then(|v| v.as_str()) {
        if hex::encode(&ciphertext) != expected_hex {
            println!("✗ {} failed", tc.id);
            return;
        }
    }

    if plain == input {
        println!("✓ {} passed", tc.id);
    } else {
        println!("✗ {} failed", tc.id);
    }
}

fn test_sm2(tc: &TestVector, defaults: &Defaults) {
    let pri_hex = tc.privateKeyHex.as_deref().unwrap_or(&defaults.sm2PrivateKeyHex);
    let pub_hex = tc.publicKeyHex.as_deref().unwrap_or(&defaults.sm2PublicKeyHex);
    let pri_bytes = hex::decode(pri_hex).unwrap();
    let pub_bytes = hex::decode(pub_hex).unwrap();

    let sig_ctx = SigCtx::new();
    let sk = sig_ctx.load_seckey(&pri_bytes).unwrap();
    let pk = sig_ctx.load_pubkey(&pub_bytes).unwrap();

    if tc.op == "encrypt" {
        let input = tc.input.as_bytes();
        let encrypt_ctx = EncryptCtx::new(input.len(), pk.clone());
        let cipher_c1c2c3 = encrypt_ctx.encrypt(input).unwrap();

        let cipher_for_mode = match tc.mode.as_deref() {
            Some("C1C3C2") => c1c2c3_to_c1c3c2(&cipher_c1c2c3),
            _ => cipher_c1c2c3.clone(),
        };

        let cipher_for_decrypt = match tc.mode.as_deref() {
            Some("C1C3C2") => c1c3c2_to_c1c2c3(&cipher_for_mode),
            _ => cipher_for_mode.clone(),
        };

        let decrypt_ctx = DecryptCtx::new(input.len(), sk.clone());
        let plain = decrypt_ctx.decrypt(&cipher_for_decrypt).unwrap();
        if plain == input {
            println!("✓ {} passed", tc.id);
        } else {
            println!("✗ {} failed", tc.id);
        }
        return;
    }

    if tc.op == "sign" {
        let msg = tc.input.as_bytes();
        let signature = sig_ctx.sign(msg, &sk, &pk);
        let ok = sig_ctx.verify(msg, &pk, &signature);
        if ok {
            println!("✓ {} passed", tc.id);
        } else {
            println!("✗ {} failed", tc.id);
        }
    }
}
```

## 性能优化

Rust 的性能优势可以通过以下方式充分发挥：

### 1. 零拷贝操作

```rust
use std::borrow::Cow;

fn encrypt_message(key: &[u8], plaintext: &[u8]) -> Vec<u8> {
    // 使用 Cow 避免不必要的拷贝
    let data: Cow<[u8]> = Cow::Borrowed(plaintext);
    // ... 加密逻辑
}
```

### 2. 并行处理

```rust
use rayon::prelude::*;

fn batch_encrypt(messages: Vec<Vec<u8>>, key: &[u8]) -> Vec<Vec<u8>> {
    messages.par_iter()
        .map(|msg| encrypt_message(key, msg))
        .collect()
}
```

### 3. 内存安全

```rust
use zeroize::Zeroize;

fn secure_key_handling() {
    let mut key = hex::decode("0123456789abcdeffedcba9876543210").unwrap();
    
    // 使用密钥...
    
    // 安全清除密钥
    key.zeroize();
}
```

## 注意事项

1. **所有权系统**：注意 Rust 的所有权和借用规则，避免不必要的克隆
2. **错误处理**：使用 `Result` 类型妥善处理加解密错误
3. **内存安全**：敏感数据（如私钥）使用后应安全清除
4. **并发安全**：多线程环境下注意密钥材料的共享方式
5. **类型转换**：注意字节数组、十六进制字符串之间的转换

## 其他 Rust 库

除了 libsm，还有其他选择：

- [sm-crypto](https://github.com/citahub/sm-crypto) - 另一个 CITA 维护的库
- [rust-crypto](https://github.com/DaGenix/rust-crypto) - 部分支持国密算法

选择建议：
- libsm 是最成熟和活跃的选择
- 考虑库的维护状态和社区支持
- 性能测试对比
- 与 gmkitx 的兼容性验证

## Cargo 功能特性

合理使用 Cargo 特性可以优化编译：

```toml
[dependencies]
libsm = { version = "0.5", features = ["sm2", "sm3", "sm4"] }

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

## 相关资源

- [libsm GitHub 仓库](https://github.com/citahub/libsm)
- [Rust 密码学最佳实践](https://docs.rs/crypto/)
- [互操作测试向量](/dev/INTEROP_VECTORS)
