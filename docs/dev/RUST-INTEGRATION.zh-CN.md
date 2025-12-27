---
title: Rust 对接指南
icon: code
order: 5
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

## SM2 对接示例

### 密钥生成

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
    let encrypt_ctx = EncryptCtx::new(128, pk.clone());
    let ciphertext = encrypt_ctx.encrypt(plaintext).unwrap();
    
    println!("密文: {}", hex::encode(&ciphertext));
    
    // 解密
    let decrypt_ctx = DecryptCtx::new(128, sk);
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

## SM3 对接示例

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

## SM4 对接示例

### ECB 模式

```rust
use libsm::sm4::cipher_mode::Sm4CipherMode;
use hex;

fn main() {
    // 密钥（16字节）
    let key = hex::decode("0123456789abcdeffedcba9876543210").unwrap();
    let plaintext = b"Hello, SM4!";
    
    // ECB 加密
    let cipher = Sm4CipherMode::new(&key, cipher_mode::CipherMode::Ecb).unwrap();
    let ciphertext = cipher.encrypt(plaintext).unwrap();
    
    println!("密文: {}", hex::encode(&ciphertext));
    
    // ECB 解密
    let decrypted = cipher.decrypt(&ciphertext).unwrap();
    
    println!("明文: {}", String::from_utf8(decrypted).unwrap());
}
```

### CBC 模式

```rust
use libsm::sm4::cipher_mode::Sm4CipherMode;
use hex;

fn main() {
    let key = hex::decode("0123456789abcdeffedcba9876543210").unwrap();
    let iv = hex::decode("fedcba98765432100123456789abcdef").unwrap();
    let plaintext = b"Hello, SM4 CBC!";
    
    // CBC 加密
    let cipher = Sm4CipherMode::new(&key, cipher_mode::CipherMode::Cbc)
        .unwrap()
        .with_iv(&iv);
    let ciphertext = cipher.encrypt(plaintext).unwrap();
    
    println!("密文: {}", hex::encode(&ciphertext));
    
    // CBC 解密
    let decrypted = cipher.decrypt(&ciphertext).unwrap();
    
    println!("明文: {}", String::from_utf8(decrypted).unwrap());
}
```

## 互操作性测试

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use libsm::sm3::hash::Sm3Hash;
use hex;

#[derive(Debug, Deserialize)]
struct TestVector {
    id: String,
    algo: String,
    op: String,
    mode: Option<String>,
    input: String,
    expected: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct TestVectors {
    cases: Vec<TestVector>,
}

fn main() {
    // 读取测试向量
    let data = fs::read_to_string("test/vectors/interop.json")
        .expect("Unable to read file");
    let vectors: TestVectors = serde_json::from_str(&data)
        .expect("Unable to parse JSON");
    
    // 运行测试
    for tc in vectors.cases {
        match tc.algo.as_str() {
            "SM3" => test_sm3(&tc),
            "SM4" => test_sm4(&tc),
            "SM2" => test_sm2(&tc),
            _ => {}
        }
    }
}

fn test_sm3(tc: &TestVector) {
    let mut hasher = Sm3Hash::new(tc.input.as_bytes());
    let hash = hasher.get_hash();
    let actual = hex::encode(&hash);
    let expected = tc.expected.get("hex").unwrap();
    
    if &actual == expected {
        println!("✓ {} passed", tc.id);
    } else {
        println!("✗ {} failed", tc.id);
    }
}

fn test_sm4(tc: &TestVector) {
    // 实现 SM4 测试逻辑
}

fn test_sm2(tc: &TestVector) {
    // 实现 SM2 测试逻辑
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
