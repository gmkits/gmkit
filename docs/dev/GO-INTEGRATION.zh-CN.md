---
title: Go 对接指南
icon: code
order: 4
author: mumu
date: 2025-12-27
category:
  - 开发指南
  - 集成
tag:
  - Go
  - smgo
  - 对接其他语言
---

# Go 语言对接指南

本页介绍 Go 语言与 gmkitx 的互通方案。

## 推荐库：smgo

[smgo](https://github.com/ZZMarquis/gm) 是一个成熟的 Go 语言国密算法实现库，支持 SM2、SM3、SM4 等算法。

### 安装

```bash
go get -u github.com/ZZMarquis/gm
```

### 依赖配置

```go
// go.mod
module your-project

go 1.18

require (
    github.com/ZZMarquis/gm v1.3.2
)
```

## 数据约定

| 项目       | 约定                      | 备注                     |
|----------|-------------------------|------------------------|
| SM2 公钥   | 非压缩 04+X+Y（130 hex）     | 与 gmkitx 保持一致           |
| SM2 私钥   | 64 hex                  | 32字节私钥                 |
| SM2 密文模式 | C1C3C2（默认）、C1C2C3       | 需明确指定模式                |
| SM4 密钥   | 32 hex（128bit）          | 16字节密钥                 |
| SM4 填充   | PKCS7 或 NoPadding       | 与加密模式匹配                |
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

// 加密（C1C3C2模式）
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

@tab Go (smgo)
```go
package main

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "github.com/ZZMarquis/gm/sm2"
)

func main() {
    // 生成密钥对
    privateKey, publicKey, err := sm2.GenerateKey(rand.Reader)
    if err != nil {
        panic(err)
    }

    // 加密（C1C3C2模式）
    plaintext := []byte("Hello, SM2!")
    ciphertext, err := sm2.Encrypt(publicKey, plaintext, sm2.C1C3C2)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("密文: %s\n", hex.EncodeToString(ciphertext))
    
    // 解密
    decrypted, err := sm2.Decrypt(privateKey, ciphertext, sm2.C1C3C2)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("明文: %s\n", string(decrypted))
}
```
:::

### 签名/验签示例

::: code-tabs#sm2-sign

@tab gmkitx
```typescript
import { generateKeyPair, sign, verify } from 'gmkitx';

const keyPair = generateKeyPair();
const message = 'Important message';

// 签名
const signature = sign(keyPair.privateKey, message);
console.log('签名:', signature);

// 验签
const isValid = verify(keyPair.publicKey, message, signature);
console.log('验签结果:', isValid);
```

@tab Go (smgo)
```go
package main

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "github.com/ZZMarquis/gm/sm2"
)

func main() {
    // 生成密钥对
    privateKey, publicKey, err := sm2.GenerateKey(rand.Reader)
    if err != nil {
        panic(err)
    }
    message := []byte("Important message")
    
    // 签名
    signature, err := sm2.Sign(privateKey, nil, message)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("签名: %s\n", hex.EncodeToString(signature))
    
    // 验签
    // userId 传 nil 时使用默认 1234567812345678
    ok := sm2.Verify(publicKey, nil, message, signature)
    fmt.Printf("验签结果: %v\n", ok)
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

@tab Go (smgo)
```go
package main

import (
    "encoding/hex"
    "fmt"
    "github.com/ZZMarquis/gm/sm3"
)

func main() {
    data := []byte("Hello, SM3!")
    
    // 计算 SM3 摘要
    hash := sm3.Sm3Sum(data)
    
    fmt.Printf("SM3摘要: %s\n", hex.EncodeToString(hash))
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

@tab Go (smgo)
```go
// ECB 模式加密解密
package main

import (
    "encoding/hex"
    "fmt"
    "github.com/ZZMarquis/gm/sm4"
    "github.com/ZZMarquis/gm/util"
)

func main() {
    // 密钥（16字节）
    key, _ := hex.DecodeString("0123456789abcdeffedcba9876543210")
    plaintext := []byte("Hello, SM4!")
    
    // ECB 加密（手动 PKCS5/PKCS7 填充）
    padded := util.PKCS5Padding(plaintext, sm4.BlockSize)
    ciphertext, err := sm4.ECBEncrypt(key, padded)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("密文: %s\n", hex.EncodeToString(ciphertext))
    
    // ECB 解密
    decryptedPadded, err := sm4.ECBDecrypt(key, ciphertext)
    if err != nil {
        panic(err)
    }
    decrypted := util.PKCS5UnPadding(decryptedPadded)
    fmt.Printf("明文: %s\n", string(decrypted))
}
```

### CBC 模式

```go
package main

import (
    "encoding/hex"
    "fmt"
    "github.com/ZZMarquis/gm/sm4"
    "github.com/ZZMarquis/gm/util"
)

func main() {
    key, _ := hex.DecodeString("0123456789abcdeffedcba9876543210")
    iv, _ := hex.DecodeString("fedcba98765432100123456789abcdef")
    plaintext := []byte("Hello, SM4 CBC!")
    
    // CBC 加密（手动 PKCS5/PKCS7 填充）
    padded := util.PKCS5Padding(plaintext, sm4.BlockSize)
    ciphertext, err := sm4.CBCEncrypt(key, iv, padded)
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("密文: %s\n", hex.EncodeToString(ciphertext))
    
    // CBC 解密
    decryptedPadded, err := sm4.CBCDecrypt(key, iv, ciphertext)
    if err != nil {
        panic(err)
    }
    decrypted := util.PKCS5UnPadding(decryptedPadded)
    fmt.Printf("明文: %s\n", string(decrypted))
}
```
:::

## 互操作性测试

为确保 Go 实现与 gmkitx 的兼容性，建议使用统一的测试向量进行验证：

```go
package main

import (
    "encoding/hex"
    "encoding/json"
    "fmt"
    "os"
    "github.com/ZZMarquis/gm/sm2"
    "github.com/ZZMarquis/gm/sm3"
    "github.com/ZZMarquis/gm/sm4"
    "github.com/ZZMarquis/gm/util"
)

type TestVector struct {
    ID       string            `json:"id"`
    Algo     string            `json:"algo"`
    Op       string            `json:"op"`
    Mode     string            `json:"mode"`
    Input    string            `json:"input"`
    Padding  string            `json:"padding"`
    KeyHex   string            `json:"keyHex"`
    IvHex    string            `json:"ivHex"`
    PublicKeyHex  string       `json:"publicKeyHex"`
    PrivateKeyHex string       `json:"privateKeyHex"`
    Expected map[string]any    `json:"expected"`
}

type Defaults struct {
    Sm4KeyHex     string `json:"sm4KeyHex"`
    Sm4IvHex      string `json:"sm4IvHex"`
    Sm2PublicKeyHex  string `json:"sm2PublicKeyHex"`
    Sm2PrivateKeyHex string `json:"sm2PrivateKeyHex"`
}

type TestVectors struct {
    Defaults Defaults    `json:"defaults"`
    Cases    []TestVector `json:"cases"`
}

func main() {
    // 读取测试向量文件
    data, err := os.ReadFile("test/vectors/interop.json")
    if err != nil {
        panic(err)
    }
    
    var vectors TestVectors
    if err := json.Unmarshal(data, &vectors); err != nil {
        panic(err)
    }
    
    // 运行测试
    for _, tc := range vectors.Cases {
        switch tc.Algo {
        case "SM3":
            testSM3(tc)
        case "SM4":
            testSM4(tc, vectors.Defaults)
        case "SM2":
            testSM2(tc, vectors.Defaults)
        }
    }
}

func testSM3(tc TestVector) {
    // SM3 摘要对照 expected.hex
    hash := sm3.Sm3Sum([]byte(tc.Input))
    actual := hex.EncodeToString(hash)
    expected, _ := tc.Expected["hex"].(string)

    if actual == expected {
        fmt.Printf("✓ %s passed\n", tc.ID)
    } else {
        fmt.Printf("✗ %s failed\n", tc.ID)
    }
}

func testSM4(tc TestVector, defaults Defaults) {
    keyHex := tc.KeyHex
    if keyHex == "" {
        keyHex = defaults.Sm4KeyHex
    }
    key, _ := hex.DecodeString(keyHex)

    ivHex := tc.IvHex
    if ivHex == "" {
        ivHex = defaults.Sm4IvHex
    }
    iv, _ := hex.DecodeString(ivHex)

    // PKCS5Padding 等价 PKCS7（块大小 16）
    data := []byte(tc.Input)
    if tc.Padding == "PKCS7" {
        data = util.PKCS5Padding(data, sm4.BlockSize)
    }

    var cipher []byte
    var err error
    if tc.Mode == "ECB" {
        cipher, err = sm4.ECBEncrypt(key, data)
    } else if tc.Mode == "CBC" {
        cipher, err = sm4.CBCEncrypt(key, iv, data)
    } else {
        fmt.Printf("! %s skipped (mode %s)\n", tc.ID, tc.Mode)
        return
    }
    if err != nil {
        panic(err)
    }

    if expectedHex, ok := tc.Expected["cipherHex"].(string); ok {
        if hex.EncodeToString(cipher) != expectedHex {
            fmt.Printf("✗ %s failed\n", tc.ID)
            return
        }
    }

    var plainPadded []byte
    if tc.Mode == "ECB" {
        plainPadded, err = sm4.ECBDecrypt(key, cipher)
    } else {
        plainPadded, err = sm4.CBCDecrypt(key, iv, cipher)
    }
    if err != nil {
        panic(err)
    }
    if tc.Padding == "PKCS7" {
        plainPadded = util.PKCS5UnPadding(plainPadded)
    }

    if string(plainPadded) == tc.Input {
        fmt.Printf("✓ %s passed\n", tc.ID)
    } else {
        fmt.Printf("✗ %s failed\n", tc.ID)
    }
}

func testSM2(tc TestVector, defaults Defaults) {
    priHex := tc.PrivateKeyHex
    if priHex == "" {
        priHex = defaults.Sm2PrivateKeyHex
    }
    pubHex := tc.PublicKeyHex
    if pubHex == "" {
        pubHex = defaults.Sm2PublicKeyHex
    }

    priBytes, _ := hex.DecodeString(priHex)
    priv, _ := sm2.RawBytesToPrivateKey(priBytes)

    pubBytes, _ := hex.DecodeString(pubHex)
    if len(pubBytes) == 65 && pubBytes[0] == 0x04 {
        pubBytes = pubBytes[1:]
    }
    pub, _ := sm2.RawBytesToPublicKey(pubBytes)

    if tc.Op == "encrypt" {
        mode := sm2.C1C3C2
        if tc.Mode == "C1C2C3" {
            mode = sm2.C1C2C3
        }
        cipher, err := sm2.Encrypt(pub, []byte(tc.Input), mode)
        if err != nil {
            panic(err)
        }
        plain, err := sm2.Decrypt(priv, cipher, mode)
        if err != nil {
            panic(err)
        }
        if string(plain) == tc.Input {
            fmt.Printf("✓ %s passed\n", tc.ID)
        } else {
            fmt.Printf("✗ %s failed\n", tc.ID)
        }
        return
    }

    if tc.Op == "sign" {
        sig, err := sm2.Sign(priv, nil, []byte(tc.Input))
        if err != nil {
            panic(err)
        }
        ok := sm2.Verify(pub, nil, []byte(tc.Input), sig)
        if ok {
            fmt.Printf("✓ %s passed\n", tc.ID)
        } else {
            fmt.Printf("✗ %s failed\n", tc.ID)
        }
    }
}
```

## 注意事项

1. **密钥格式**：确保密钥和 IV 使用正确的十六进制编码
2. **密文模式**：SM2 加密时明确指定 C1C3C2 或 C1C2C3 模式
3. **填充方式**：SM4 加密时选择合适的填充方式（PKCS7 或 NoPadding）
4. **字符编码**：字符串数据统一使用 UTF-8 编码
5. **错误处理**：Go 的错误处理机制要妥善处理加解密错误

## 其他 Go 库

除了 smgo，还有其他 Go 国密算法库可供选择：

- [tjfoc/gmsm](https://github.com/tjfoc/gmsm) - 另一个成熟的 Go 国密实现
- [golang/crypto](https://github.com/golang/crypto) - 部分支持国密算法

选择时建议考虑：
- 社区活跃度
- 文档完整性
- 性能表现
- 与 gmkitx 的兼容性

## 相关资源

- [smgo GitHub 仓库](https://github.com/ZZMarquis/gm)
- [Go 国密算法标准](http://www.gmbz.org.cn/)
- [互操作测试向量](/dev/INTEROP_VECTORS)
