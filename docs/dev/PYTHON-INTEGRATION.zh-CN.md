---
title: Python 对接指南
icon: code
order: 7
author: mumu
date: 2025-12-27
category:
  - 开发指南
  - 集成
tag:
  - Python
  - gmssl
  - 对接其他语言
---

# Python 语言对接指南

本页介绍 Python 语言与 gmkitx 的互通方案，提供简单易用的集成示例。

## 推荐库：gmssl

[gmssl](http://gmssl.org/) 是一个成熟的 Python 国密算法库，提供简洁的 API 和完整的功能支持。

### 安装

```bash
# 使用 pip 安装
pip install gmssl

# 使用 poetry
poetry add gmssl

# 使用 conda
conda install -c conda-forge gmssl
```

### 依赖配置

```python
# requirements.txt
gmssl>=3.2.1
```

```toml
# pyproject.toml
[tool.poetry.dependencies]
python = "^3.8"
gmssl = "^3.2.1"
```

## 数据约定

| 项目       | 约定                      | 备注                     |
|----------|-------------------------|------------------------|
| SM2 公钥   | 非压缩 04+X+Y（130 hex）     | 与 gmkitx 保持一致           |
| SM2 私钥   | 64 hex                  | 32字节私钥                 |
| SM2 密文模式 | C1C3C2（默认）、C1C2C3       | gmssl 默认使用 C1C3C2      |
| SM4 密钥   | 32 hex（128bit）          | 16字节密钥                 |
| SM4 填充   | PKCS7 或 NoPadding       | 根据模式选择                 |
| 传输编码     | UTF-8 + 小写 hex          | 保持编码一致                 |

## SM2 对接示例

### 密钥生成

```python
from gmssl import sm2
import secrets

def generate_keypair():
    """生成 SM2 密钥对"""
    # 生成32字节私钥
    private_key = secrets.token_hex(32)
    
    # 使用私钥创建 SM2 对象
    sm2_crypt = sm2.CryptSM2(
        private_key=private_key,
        public_key=''  # 从私钥自动推导
    )
    
    public_key = sm2_crypt.public_key
    
    return public_key, private_key

# 使用示例
public_key, private_key = generate_keypair()
print(f"公钥: {public_key}")
print(f"私钥: {private_key}")
```

### 加密/解密

```python
from gmssl import sm2

def sm2_encrypt_decrypt():
    """SM2 加密和解密示例"""
    # 初始化 SM2
    sm2_crypt = sm2.CryptSM2(
        private_key='228049e009de869baf9aba74f8f8c52e09cde1b52cafb0df7ab154ba4593743e',
        public_key='04a09455a450af78e7bc6b2f8c7f1e0e0ae698ec4d8bb58b3c4c8e0c6de0c38f39e3a8f3e7f3c5f8e7c3f8e7f3c5f8e7c3f8e7f3c5f8e7c3f8e7f3c5f'
    )
    
    # 加密
    plaintext = "Hello, SM2!"
    ciphertext = sm2_crypt.encrypt(plaintext.encode('utf-8'))
    print(f"密文: {ciphertext.hex()}")
    
    # 解密
    decrypted = sm2_crypt.decrypt(ciphertext)
    print(f"明文: {decrypted.decode('utf-8')}")

sm2_encrypt_decrypt()
```

### 签名/验签

```python
from gmssl import sm2
import hashlib

def sm2_sign_verify():
    """SM2 签名和验签示例"""
    # 初始化 SM2
    sm2_crypt = sm2.CryptSM2(
        private_key='228049e009de869baf9aba74f8f8c52e09cde1b52cafb0df7ab154ba4593743e',
        public_key='04a09455a450af78e7bc6b2f8c7f1e0e0ae698ec4d8bb58b3c4c8e0c6de0c38f39e3a8f3e7f3c5f8e7c3f8e7f3c5f8e7c3f8e7f3c5f8e7c3f8e7f3c5f'
    )
    
    # 签名
    message = "Important message"
    signature = sm2_crypt.sign(message.encode('utf-8'), random_hex='')
    print(f"签名: {signature.hex()}")
    
    # 验签
    is_valid = sm2_crypt.verify(signature, message.encode('utf-8'))
    print(f"验签结果: {is_valid}")

sm2_sign_verify()
```

## SM3 对接示例

```python
from gmssl import sm3

def sm3_hash():
    """SM3 哈希示例"""
    data = "Hello, SM3!"
    
    # 计算 SM3 摘要
    hash_value = sm3.sm3_hash(data.encode('utf-8'))
    print(f"SM3摘要: {hash_value}")

sm3_hash()
```

## SM4 对接示例

### ECB 模式

```python
from gmssl import sm4

def sm4_ecb():
    """SM4 ECB 模式示例"""
    # 密钥（16字节）
    key = bytes.fromhex('0123456789abcdeffedcba9876543210')
    plaintext = b'Hello, SM4!'
    
    # 创建 SM4 对象
    sm4_crypt = sm4.CryptSM4()
    sm4_crypt.set_key(key, sm4.SM4_ENCRYPT)
    
    # ECB 加密
    # 注意：需要手动填充到16字节的倍数
    padded = plaintext + b'\x00' * (16 - len(plaintext) % 16)
    ciphertext = sm4_crypt.crypt_ecb(padded)
    print(f"密文: {ciphertext.hex()}")
    
    # ECB 解密
    sm4_crypt.set_key(key, sm4.SM4_DECRYPT)
    decrypted = sm4_crypt.crypt_ecb(ciphertext)
    print(f"明文: {decrypted.rstrip(b'\\x00').decode('utf-8')}")

sm4_ecb()
```

### CBC 模式

```python
from gmssl import sm4

def sm4_cbc():
    """SM4 CBC 模式示例"""
    key = bytes.fromhex('0123456789abcdeffedcba9876543210')
    iv = bytes.fromhex('fedcba98765432100123456789abcdef')
    plaintext = b'Hello, SM4 CBC!'
    
    # 创建 SM4 对象
    sm4_crypt = sm4.CryptSM4()
    sm4_crypt.set_key(key, sm4.SM4_ENCRYPT)
    
    # CBC 加密
    padded = plaintext + b'\x00' * (16 - len(plaintext) % 16)
    ciphertext = sm4_crypt.crypt_cbc(iv, padded)
    print(f"密文: {ciphertext.hex()}")
    
    # CBC 解密
    sm4_crypt.set_key(key, sm4.SM4_DECRYPT)
    decrypted = sm4_crypt.crypt_cbc(iv, ciphertext)
    print(f"明文: {decrypted.rstrip(b'\\x00').decode('utf-8')}")

sm4_cbc()
```

## 互操作性测试

```python
import json
from gmssl import sm2, sm3, sm4

class InteropTest:
    """互操作性测试类"""
    
    def __init__(self, test_vectors_path):
        with open(test_vectors_path, 'r') as f:
            data = json.load(f)
            self.cases = data['cases']
            self.defaults = data['defaults']
    
    def run_tests(self):
        """运行所有测试"""
        for case in self.cases:
            algo = case['algo']
            if algo == 'SM3':
                self.test_sm3(case)
            elif algo == 'SM4':
                self.test_sm4(case)
            elif algo == 'SM2':
                self.test_sm2(case)
    
    def test_sm3(self, case):
        """测试 SM3"""
        input_data = case['input'].encode('utf-8')
        expected = case['expected']['hex']
        
        actual = sm3.sm3_hash(input_data)
        
        if actual == expected:
            print(f"✓ {case['id']} passed")
        else:
            print(f"✗ {case['id']} failed")
    
    def test_sm4(self, case):
        """测试 SM4"""
        # 实现 SM4 测试逻辑
        pass
    
    def test_sm2(self, case):
        """测试 SM2"""
        # 实现 SM2 测试逻辑
        pass

# 运行测试
test = InteropTest('test/vectors/interop.json')
test.run_tests()
```

## 高级用法

### 使用上下文管理器

```python
from gmssl import sm2
from contextlib import contextmanager

@contextmanager
def sm2_context(private_key, public_key):
    """SM2 上下文管理器"""
    sm2_crypt = sm2.CryptSM2(
        private_key=private_key,
        public_key=public_key
    )
    try:
        yield sm2_crypt
    finally:
        # 清理敏感数据
        del sm2_crypt

# 使用示例
with sm2_context(private_key, public_key) as sm2_crypt:
    ciphertext = sm2_crypt.encrypt(b"Secret data")
    # ... 使用完后自动清理
```

### 批量处理

```python
from gmssl import sm3
from concurrent.futures import ThreadPoolExecutor

def batch_hash(messages):
    """批量计算 SM3 哈希"""
    with ThreadPoolExecutor() as executor:
        results = executor.map(
            lambda msg: sm3.sm3_hash(msg.encode('utf-8')),
            messages
        )
    return list(results)

# 使用示例
messages = ["message1", "message2", "message3"]
hashes = batch_hash(messages)
for msg, hash_val in zip(messages, hashes):
    print(f"{msg}: {hash_val}")
```

### 类型提示

```python
from typing import Tuple, Optional
from gmssl import sm2

def encrypt_message(
    plaintext: str,
    public_key: str,
    encoding: str = 'utf-8'
) -> bytes:
    """
    加密消息
    
    Args:
        plaintext: 明文字符串
        public_key: 公钥（十六进制）
        encoding: 字符编码
    
    Returns:
        密文字节
    """
    sm2_crypt = sm2.CryptSM2(private_key='', public_key=public_key)
    return sm2_crypt.encrypt(plaintext.encode(encoding))

def decrypt_message(
    ciphertext: bytes,
    private_key: str,
    public_key: str,
    encoding: str = 'utf-8'
) -> str:
    """
    解密消息
    
    Args:
        ciphertext: 密文字节
        private_key: 私钥（十六进制）
        public_key: 公钥（十六进制）
        encoding: 字符编码
    
    Returns:
        明文字符串
    """
    sm2_crypt = sm2.CryptSM2(
        private_key=private_key,
        public_key=public_key
    )
    return sm2_crypt.decrypt(ciphertext).decode(encoding)
```

## 注意事项

1. **编码问题**：Python 3 中字符串和字节的区别，确保正确编解码
2. **填充方式**：SM4 需要手动处理填充，建议使用 PKCS7 标准
3. **密钥安全**：不要在代码中硬编码密钥，使用环境变量或密钥管理服务
4. **异常处理**：加解密操作可能失败，需要适当的异常处理
5. **性能考虑**：大量数据处理时考虑使用多线程或异步方式

## 其他 Python 库

除了 gmssl，还有其他选择：

- [python-sm2](https://github.com/duanhongyi/gmssl) - 另一个 SM2 实现
- [pycryptodome](https://github.com/Legrandin/pycryptodome) - 通用密码库，部分支持国密

选择建议：
- gmssl 是最成熟和易用的选择
- 考虑库的维护状态和文档质量
- 与 gmkitx 的兼容性验证

## 最佳实践

### 1. 配置管理

```python
from dataclasses import dataclass
import os

@dataclass
class CryptoConfig:
    """密码配置"""
    sm2_private_key: str
    sm2_public_key: str
    sm4_key: str
    
    @classmethod
    def from_env(cls):
        """从环境变量加载"""
        return cls(
            sm2_private_key=os.getenv('SM2_PRIVATE_KEY'),
            sm2_public_key=os.getenv('SM2_PUBLIC_KEY'),
            sm4_key=os.getenv('SM4_KEY')
        )
```

### 2. 错误处理

```python
from gmssl import sm2
from typing import Optional

def safe_encrypt(
    plaintext: str,
    public_key: str
) -> Optional[bytes]:
    """安全的加密函数"""
    try:
        sm2_crypt = sm2.CryptSM2(private_key='', public_key=public_key)
        return sm2_crypt.encrypt(plaintext.encode('utf-8'))
    except Exception as e:
        print(f"加密失败: {e}")
        return None
```

### 3. 单元测试

```python
import unittest
from gmssl import sm3

class TestSM3(unittest.TestCase):
    """SM3 单元测试"""
    
    def test_empty_string(self):
        """测试空字符串"""
        result = sm3.sm3_hash(b'')
        self.assertIsNotNone(result)
    
    def test_known_vector(self):
        """测试已知向量"""
        data = b'abc'
        expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0'
        result = sm3.sm3_hash(data)
        self.assertEqual(result, expected)

if __name__ == '__main__':
    unittest.main()
```

## 相关资源

- [gmssl 官方文档](http://gmssl.org/)
- [Python 密码学最佳实践](https://cryptography.io/en/latest/hazmat/)
- [互操作测试向量](/dev/INTEROP_VECTORS)
