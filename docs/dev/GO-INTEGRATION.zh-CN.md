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
  - gmsm
  - 对接其他语言
---

# Go 语言对接指南

本页介绍 Go 语言与 gmkitx 的互通方案。

## 推荐库：gmsm

[gmsm](https://github.com/emmansun/gmsm) 是一个活跃维护的 Go 语言国密算法实现库，支持 SM2、SM3、SM4 等算法，并提供完整的使用文档和互操作说明。

### 安装

```bash
go get github.com/emmansun/gmsm@latest
```

### 依赖配置

```go
// go.mod
module your-project

go 1.24.0

require (
    github.com/emmansun/gmsm v0.40.1
)

// 如果你的 Go 版本不同，请以 gmsm 仓库 go.mod 的版本要求为准。
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

@tab Go (gmsm)
```go
package main

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"

    "github.com/emmansun/gmsm/sm2"
)

func main() {
    // 生成密钥对
    privateKey, err := sm2.GenerateKey(rand.Reader)
    if err != nil {
        panic(err)
    }
    publicKey := &privateKey.PublicKey

    // 加密（C1C3C2 模式 + 非压缩公钥）
    plaintext := []byte("Hello, SM2!")
    opts := sm2.NewPlainEncrypterOpts(sm2.MarshalUncompressed, sm2.C1C3C2)
    // 如果对端使用 C1C2C3：
    // opts = sm2.NewPlainEncrypterOpts(sm2.MarshalUncompressed, sm2.C1C2C3)
    ciphertext, err := sm2.Encrypt(rand.Reader, publicKey, plaintext, opts)
    if err != nil {
        panic(err)
    }

    fmt.Printf("密文: %s\n", hex.EncodeToString(ciphertext))

    // 解密
    decrypted, err := sm2.Decrypt(privateKey, ciphertext)
    // C1C2C3 需要使用私钥解密选项：
    // decrypted, err = privateKey.Decrypt(rand.Reader, ciphertext, sm2.NewPlainDecrypterOpts(sm2.C1C2C3))
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

@tab Go (gmsm)
```go
package main

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"

    "github.com/emmansun/gmsm/sm2"
)

func main() {
    // 生成密钥对
    privateKey, err := sm2.GenerateKey(rand.Reader)
    if err != nil {
        panic(err)
    }
    publicKey := &privateKey.PublicKey
    message := []byte("Important message")

    // 签名
    signature, err := privateKey.Sign(rand.Reader, message, sm2.DefaultSM2SignerOpts)
    if err != nil {
        panic(err)
    }

    fmt.Printf("签名: %s\n", hex.EncodeToString(signature))

    // 验签
    // uid 传 nil 时使用默认 1234567812345678
    ok := sm2.VerifyASN1WithSM2(publicKey, nil, message, signature)
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

@tab Go (gmsm)
```go
package main

import (
    "fmt"

    "github.com/emmansun/gmsm/sm3"
)

func main() {
    data := []byte("Hello, SM3!")

    // 计算 SM3 摘要
    sum := sm3.Sum(data)
    fmt.Printf("SM3摘要: %x\n", sum)

    // 增量哈希
    h := sm3.New()
    h.Write([]byte("Hello, "))
    h.Write([]byte("SM3!"))
    fmt.Printf("增量哈希: %x\n", h.Sum(nil))
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

@tab Go (gmsm)
```go
// ECB 模式加密解密
package main

import (
    "encoding/hex"
    "fmt"

    gmsmCipher "github.com/emmansun/gmsm/cipher"
    "github.com/emmansun/gmsm/padding"
    "github.com/emmansun/gmsm/sm4"
)

func main() {
    // 密钥（16字节）
    key, _ := hex.DecodeString("0123456789abcdeffedcba9876543210")
    plaintext := []byte("Hello, SM4!")

    block, err := sm4.NewCipher(key)
    if err != nil {
        panic(err)
    }

    // ECB 加密（PKCS7 填充）
    pkcs7 := padding.NewPKCS7Padding(sm4.BlockSize)
    padded := pkcs7.Pad(plaintext)
    ecb := gmsmCipher.NewECBEncrypter(block)
    ciphertext := make([]byte, len(padded))
    ecb.CryptBlocks(ciphertext, padded)

    fmt.Printf("密文: %s\n", hex.EncodeToString(ciphertext))

    // ECB 解密
    ecbDec := gmsmCipher.NewECBDecrypter(block)
    decryptedPadded := make([]byte, len(ciphertext))
    ecbDec.CryptBlocks(decryptedPadded, ciphertext)
    decrypted, err := pkcs7.Unpad(decryptedPadded)
    if err != nil {
        panic(err)
    }
    fmt.Printf("明文: %s\n", string(decrypted))
}
```

### CBC 模式

```go
package main

import (
    "crypto/cipher"
    "encoding/hex"
    "fmt"

    "github.com/emmansun/gmsm/padding"
    "github.com/emmansun/gmsm/sm4"
)

func main() {
    key, _ := hex.DecodeString("0123456789abcdeffedcba9876543210")
    iv, _ := hex.DecodeString("fedcba98765432100123456789abcdef")
    plaintext := []byte("Hello, SM4 CBC!")

    block, err := sm4.NewCipher(key)
    if err != nil {
        panic(err)
    }

    // CBC 加密（PKCS7 填充）
    pkcs7 := padding.NewPKCS7Padding(sm4.BlockSize)
    padded := pkcs7.Pad(plaintext)
    ciphertext := make([]byte, len(padded))
    encrypter := cipher.NewCBCEncrypter(block, iv)
    encrypter.CryptBlocks(ciphertext, padded)

    fmt.Printf("密文: %s\n", hex.EncodeToString(ciphertext))

    // CBC 解密
    decrypter := cipher.NewCBCDecrypter(block, iv)
    decryptedPadded := make([]byte, len(ciphertext))
    decrypter.CryptBlocks(decryptedPadded, ciphertext)
    decrypted, err := pkcs7.Unpad(decryptedPadded)
    if err != nil {
        panic(err)
    }
    fmt.Printf("明文: %s\n", string(decrypted))
}
```
:::

## 互操作性测试

为确保 Go 实现与 gmkitx 的兼容性，建议使用统一的测试向量进行验证：

```go
package main

import (
    "crypto/cipher"
    "crypto/rand"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "os"

    gmsmCipher "github.com/emmansun/gmsm/cipher"
    "github.com/emmansun/gmsm/padding"
    "github.com/emmansun/gmsm/sm2"
    "github.com/emmansun/gmsm/sm3"
    "github.com/emmansun/gmsm/sm4"
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
    sum := sm3.Sum([]byte(tc.Input))
    actual := hex.EncodeToString(sum[:])
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

    block, err := sm4.NewCipher(key)
    if err != nil {
        panic(err)
    }

    // PKCS7 填充（块大小 16）
    pkcs7 := padding.NewPKCS7Padding(sm4.BlockSize)
    data := []byte(tc.Input)
    if tc.Padding == "PKCS7" {
        data = pkcs7.Pad(data)
    }

    var cipherText []byte
    switch tc.Mode {
    case "ECB":
        cipherText = make([]byte, len(data))
        encrypter := gmsmCipher.NewECBEncrypter(block)
        encrypter.CryptBlocks(cipherText, data)
    case "CBC":
        ivHex := tc.IvHex
        if ivHex == "" {
            ivHex = defaults.Sm4IvHex
        }
        iv, _ := hex.DecodeString(ivHex)
        cipherText = make([]byte, len(data))
        encrypter := cipher.NewCBCEncrypter(block, iv)
        encrypter.CryptBlocks(cipherText, data)
    default:
        fmt.Printf("! %s skipped (mode %s)\n", tc.ID, tc.Mode)
        return
    }

    if expectedHex, ok := tc.Expected["cipherHex"].(string); ok {
        if hex.EncodeToString(cipherText) != expectedHex {
            fmt.Printf("✗ %s failed\n", tc.ID)
            return
        }
    }

    var plainPadded []byte
    switch tc.Mode {
    case "ECB":
        plainPadded = make([]byte, len(cipherText))
        decrypter := gmsmCipher.NewECBDecrypter(block)
        decrypter.CryptBlocks(plainPadded, cipherText)
    case "CBC":
        ivHex := tc.IvHex
        if ivHex == "" {
            ivHex = defaults.Sm4IvHex
        }
        iv, _ := hex.DecodeString(ivHex)
        plainPadded = make([]byte, len(cipherText))
        decrypter := cipher.NewCBCDecrypter(block, iv)
        decrypter.CryptBlocks(plainPadded, cipherText)
    }
    if tc.Padding == "PKCS7" {
        plainPadded, err = pkcs7.Unpad(plainPadded)
        if err != nil {
            panic(err)
        }
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
    priv, err := sm2.NewPrivateKey(priBytes)
    if err != nil {
        panic(err)
    }

    pubBytes, _ := hex.DecodeString(pubHex)
    if len(pubBytes) == 64 {
        pubBytes = append([]byte{0x04}, pubBytes...)
    }
    pub, err := sm2.NewPublicKey(pubBytes)
    if err != nil {
        panic(err)
    }

    if tc.Op == "encrypt" {
        splicing := sm2.C1C3C2
        if tc.Mode == "C1C2C3" {
            splicing = sm2.C1C2C3
        }
        opts := sm2.NewPlainEncrypterOpts(sm2.MarshalUncompressed, splicing)
        cipherText, err := sm2.Encrypt(rand.Reader, pub, []byte(tc.Input), opts)
        if err != nil {
            panic(err)
        }
        var plain []byte
        if splicing == sm2.C1C3C2 {
            plain, err = sm2.Decrypt(priv, cipherText)
        } else {
            plain, err = priv.Decrypt(rand.Reader, cipherText, sm2.NewPlainDecrypterOpts(splicing))
        }
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
        sig, err := priv.Sign(rand.Reader, []byte(tc.Input), sm2.DefaultSM2SignerOpts)
        if err != nil {
            panic(err)
        }
        ok := sm2.VerifyASN1WithSM2(pub, nil, []byte(tc.Input), sig)
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

除了 gmsm，还有其他 Go 国密算法库可供选择：

- [ZZMarquis/gm](https://github.com/ZZMarquis/gm) - 历史较久的 Go 国密实现
- [tjfoc/gmsm](https://github.com/tjfoc/gmsm) - 另一个成熟的 Go 国密实现

选择时建议考虑：
- 社区活跃度
- 文档完整性
- 性能表现
- 与 gmkitx 的兼容性

## 相关资源

- [gmsm GitHub 仓库](https://github.com/emmansun/gmsm)
- [gmsm 使用文档（SM2/SM3/SM4）](https://github.com/emmansun/gmsm/tree/develop/docs)
- [Go 国密算法标准](http://www.gmbz.org.cn/)
- [互操作测试向量](/dev/INTEROP_VECTORS)
