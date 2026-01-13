---
title: GMKitX 跨语言对照向量
icon: link
order: 99
---

# 跨语言对接（SM2 → SM3 → SM4）

面向 Hutool/Java 以及后续 Go、Python 等实现的互通校验。固定输入、密钥、IV、公私钥在 `test/vectors/interop.json`，便于一次生成、多端共用。

## 文件与约定
- `test/vectors/interop.json`：标准向量；SM3/SM4 已填确定性期望值，SM2 以「解密=原文 / 验签成功」判定。
- `defaults` 提供示例密钥（开发验证用，非生产）。
- 字符串默认 UTF-8，二进制字段小写 hex。

## 验证流程
1. 读取同一 JSON。
2. 按 `algo/op` 调用：SM2（encrypt/sign）、SM3（digest/HMAC 可扩展）、SM4（encrypt/decrypt）。
3. SM2 不比对密文字面与签名字面，只看解密或 `verify`。
4. 新增语言或库：保持字段语义一致，追加用例即可。

## SM2

::: code-tabs#sm2
@tab TypeScript (gmkitx)
```ts
import {
  sm2Encrypt, sm2Decrypt, sign, verify, SM2CipherMode
} from 'gmkitx';
import fs from 'node:fs';

const vec = JSON.parse(fs.readFileSync('test/vectors/interop.json', 'utf8'));

for (const c of vec.cases.filter((v: any) => v.algo === 'SM2')) {
  const pub = c.publicKeyHex ?? vec.defaults.sm2PublicKeyHex;
  const pri = c.privateKeyHex ?? vec.defaults.sm2PrivateKeyHex;

  if (c.op === 'encrypt') {
    const cipher = sm2Encrypt(pub, c.input, { mode: SM2CipherMode[c.mode] });
    const plain = sm2Decrypt(pri, cipher, { mode: SM2CipherMode[c.mode] });
    console.assert(plain === c.input, c.id);
  }
  if (c.op === 'sign') {
    const sig = sign(pri, c.input);
    const ok = verify(pub, c.input, sig);
    console.assert(ok === true, c.id);
  }
}
```

@tab Java (Hutool)
```java
import cn.hutool.crypto.SmUtil;
import cn.hutool.core.util.HexUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bouncycastle.crypto.engines.SM2Engine;
import java.nio.file.Paths;
import java.util.Map;

record Case(String id, String algo, String op, String mode,
            String input, String publicKeyHex, String privateKeyHex,
            Map<String, String> expected) {}

public class SM2Interop {
  public static void main(String[] args) throws Exception {
    var root = new ObjectMapper().readTree(Paths.get("test/vectors/interop.json").toFile());
    var defaults = root.get("defaults");
    for (var node : root.get("cases")) {
      var c = new ObjectMapper().convertValue(node, Case.class);
      if (!"SM2".equals(c.algo())) continue;
      var pri = HexUtil.decodeHex(c.privateKeyHex() != null ? c.privateKeyHex() : defaults.get("sm2PrivateKeyHex").asText());
      var pub = HexUtil.decodeHex(c.publicKeyHex() != null ? c.publicKeyHex() : defaults.get("sm2PublicKeyHex").asText());
      var sm2 = SmUtil.sm2(pri, pub);
      switch (c.op()) {
        case "encrypt" -> {
          var mode = c.mode().equals("C1C2C3") ? SM2Engine.Mode.C1C2C3 : SM2Engine.Mode.C1C3C2;
          sm2.setMode(mode);
          var cipher = sm2.encryptHex(c.input());
          var back = sm2.decryptStr(cipher);
          assert back.equals(c.input()) : c.id();
        }
        case "sign" -> {
          var sig = sm2.signHex(c.input());
          assert sm2.verifyHex(c.input(), sig) : c.id();
        }
      }
    }
  }
}
```

@tab Go (smgo)
```go
package main

import (
  "encoding/hex"
  "encoding/json"
  "fmt"
  "os"

  "github.com/ZZMarquis/gm/sm2"
)

type Defaults struct {
  Sm2PublicKeyHex  string `json:"sm2PublicKeyHex"`
  Sm2PrivateKeyHex string `json:"sm2PrivateKeyHex"`
}

type Case struct {
  ID            string `json:"id"`
  Algo          string `json:"algo"`
  Op            string `json:"op"`
  Mode          string `json:"mode"`
  Input         string `json:"input"`
  PublicKeyHex  string `json:"publicKeyHex"`
  PrivateKeyHex string `json:"privateKeyHex"`
}

type Vectors struct {
  Defaults Defaults `json:"defaults"`
  Cases    []Case  `json:"cases"`
}

func main() {
  // 读取测试向量
  data, _ := os.ReadFile("test/vectors/interop.json")
  var vec Vectors
  json.Unmarshal(data, &vec)

  for _, c := range vec.Cases {
    if c.Algo != "SM2" {
      continue
    }
    priHex := c.PrivateKeyHex
    if priHex == "" {
      priHex = vec.Defaults.Sm2PrivateKeyHex
    }
    pubHex := c.PublicKeyHex
    if pubHex == "" {
      pubHex = vec.Defaults.Sm2PublicKeyHex
    }
    priBytes, _ := hex.DecodeString(priHex)
    priv, _ := sm2.RawBytesToPrivateKey(priBytes)
    pubBytes, _ := hex.DecodeString(pubHex)
    if len(pubBytes) == 65 && pubBytes[0] == 0x04 {
      pubBytes = pubBytes[1:]
    }
    pub, _ := sm2.RawBytesToPublicKey(pubBytes)

    if c.Op == "encrypt" {
      // 按向量指定的密文模式加解密
      mode := sm2.C1C3C2
      if c.Mode == "C1C2C3" {
        mode = sm2.C1C2C3
      }
      cipher, _ := sm2.Encrypt(pub, []byte(c.Input), mode)
      plain, _ := sm2.Decrypt(priv, cipher, mode)
      fmt.Println(c.ID, string(plain) == c.Input)
    }
    if c.Op == "sign" {
      // 默认 userId = 1234567812345678
      sig, _ := sm2.Sign(priv, nil, []byte(c.Input))
      ok := sm2.Verify(pub, nil, []byte(c.Input), sig)
      fmt.Println(c.ID, ok)
    }
  }
}
```

@tab Python (gmssl)
```python
import json
from gmssl import sm2

with open("test/vectors/interop.json", "r", encoding="utf-8") as f:
    vec = json.load(f)

for c in vec["cases"]:
    if c["algo"] != "SM2":
        continue
    public_key = c.get("publicKeyHex") or vec["defaults"]["sm2PublicKeyHex"]
    private_key = c.get("privateKeyHex") or vec["defaults"]["sm2PrivateKeyHex"]
    # mode=1 为 C1C3C2，mode=0 为 C1C2C3
    mode = 1 if c.get("mode") == "C1C3C2" else 0
    sm2_crypt = sm2.CryptSM2(private_key=private_key, public_key=public_key, mode=mode)

    if c["op"] == "encrypt":
        cipher = sm2_crypt.encrypt(c["input"].encode("utf-8"))
        plain = sm2_crypt.decrypt(cipher).decode("utf-8")
        print(c["id"], plain == c["input"])
    if c["op"] == "sign":
        msg = c["input"].encode("utf-8")
        # 默认 userId=1234567812345678
        sig = sm2_crypt.sign_with_sm3(msg)
        ok = sm2_crypt.verify_with_sm3(sig, msg)
        print(c["id"], ok)
```

@tab Rust (libsm)
```rust
use serde::Deserialize;
use std::fs;

use hex;
use libsm::sm2::encrypt::{DecryptCtx, EncryptCtx};
use libsm::sm2::signature::SigCtx;

#[derive(Debug, Deserialize)]
struct Defaults {
    sm2PublicKeyHex: String,
    sm2PrivateKeyHex: String,
}

#[derive(Debug, Deserialize)]
struct Case {
    id: String,
    algo: String,
    op: String,
    mode: Option<String>,
    input: String,
    publicKeyHex: Option<String>,
    privateKeyHex: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Vectors {
    defaults: Defaults,
    cases: Vec<Case>,
}

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
    let data = fs::read_to_string("test/vectors/interop.json").unwrap();
    let vec: Vectors = serde_json::from_str(&data).unwrap();
    let sig_ctx = SigCtx::new();

    for c in vec.cases {
        if c.algo != "SM2" {
            continue;
        }
        let pri_hex = c.privateKeyHex.as_deref().unwrap_or(&vec.defaults.sm2PrivateKeyHex);
        let pub_hex = c.publicKeyHex.as_deref().unwrap_or(&vec.defaults.sm2PublicKeyHex);
        let pri_bytes = hex::decode(pri_hex).unwrap();
        let pub_bytes = hex::decode(pub_hex).unwrap();
        let sk = sig_ctx.load_seckey(&pri_bytes).unwrap();
        let pk = sig_ctx.load_pubkey(&pub_bytes).unwrap();

        if c.op == "encrypt" {
            let input = c.input.as_bytes();
            let encrypt_ctx = EncryptCtx::new(input.len(), pk.clone());
            let cipher_c1c2c3 = encrypt_ctx.encrypt(input).unwrap();
            let cipher_for_mode = if c.mode.as_deref() == Some("C1C3C2") {
                c1c2c3_to_c1c3c2(&cipher_c1c2c3)
            } else {
                cipher_c1c2c3.clone()
            };
            let cipher_for_decrypt = if c.mode.as_deref() == Some("C1C3C2") {
                c1c3c2_to_c1c2c3(&cipher_for_mode)
            } else {
                cipher_for_mode
            };
            let decrypt_ctx = DecryptCtx::new(input.len(), sk.clone());
            let plain = decrypt_ctx.decrypt(&cipher_for_decrypt).unwrap();
            println!("{} {}", c.id, plain == input);
        }
        if c.op == "sign" {
            let msg = c.input.as_bytes();
            let signature = sig_ctx.sign(msg, &sk, &pk);
            let ok = sig_ctx.verify(msg, &pk, &signature);
            println!("{} {}", c.id, ok);
        }
    }
}
```
:::

## SM3

::: code-tabs#sm3
@tab TypeScript (gmkitx)
```ts
import { digest, hmac } from 'gmkitx';
import fs from 'node:fs';

const vec = JSON.parse(fs.readFileSync('test/vectors/interop.json', 'utf8'));

for (const c of vec.cases.filter((v: any) => v.algo === 'SM3')) {
  const out = digest(c.input);
  console.assert(out === c.expected.hex, c.id);
}
// 如需 HMAC，可参照 hmac(key, data) 并扩展 JSON
```

@tab Java (Hutool)
```java
import cn.hutool.crypto.SmUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Paths;

public class SM3Interop {
  public static void main(String[] args) throws Exception {
    var root = new ObjectMapper().readTree(Paths.get("test/vectors/interop.json").toFile());
    for (var node : root.get("cases")) {
      if (!"SM3".equals(node.get("algo").asText())) continue;
      var input = node.get("input").asText();
      var expected = node.get("expected").get("hex").asText();
      var out = SmUtil.sm3().digestHex(input);
      assert out.equals(expected) : node.get("id").asText();
    }
  }
}
```

@tab Go (smgo)
```go
package main

import (
  "encoding/hex"
  "encoding/json"
  "os"

  "github.com/ZZMarquis/gm/sm3"
)

type Case struct {
  ID      string `json:"id"`
  Algo    string `json:"algo"`
  Input   string `json:"input"`
  Expected struct {
    Hex string `json:"hex"`
  } `json:"expected"`
}

type Vectors struct {
  Cases []Case `json:"cases"`
}

func main() {
  data, _ := os.ReadFile("test/vectors/interop.json")
  var vec Vectors
  json.Unmarshal(data, &vec)

  for _, c := range vec.Cases {
    if c.Algo != "SM3" {
      continue
    }
    // 计算 SM3 摘要并比对向量
    out := sm3.Sm3Sum([]byte(c.Input))
    if hex.EncodeToString(out) != c.Expected.Hex {
      panic(c.ID)
    }
  }
}
```

@tab Python (gmssl)
```python
import json
from gmssl import sm3, func

with open("test/vectors/interop.json", "r", encoding="utf-8") as f:
    vec = json.load(f)

for c in vec["cases"]:
    if c["algo"] != "SM3":
        continue
    # gmssl 的 sm3_hash 需要字节列表
    out = sm3.sm3_hash(func.bytes_to_list(c["input"].encode("utf-8")))
    assert out == c["expected"]["hex"], c["id"]
```

@tab Rust (libsm)
```rust
use serde::Deserialize;
use std::fs;

use hex;
use libsm::sm3::hash::Sm3Hash;

#[derive(Debug, Deserialize)]
struct Case {
    id: String,
    algo: String,
    input: String,
    expected: Expected,
}

#[derive(Debug, Deserialize)]
struct Expected {
    hex: String,
}

#[derive(Debug, Deserialize)]
struct Vectors {
    cases: Vec<Case>,
}

fn main() {
    let data = fs::read_to_string("test/vectors/interop.json").unwrap();
    let vec: Vectors = serde_json::from_str(&data).unwrap();

    for c in vec.cases {
        if c.algo != "SM3" {
            continue;
        }
        let mut hasher = Sm3Hash::new(c.input.as_bytes());
        let hash = hasher.get_hash();
        assert_eq!(hex::encode(hash), c.expected.hex, "{}", c.id);
    }
}
```
:::

## SM4

::: code-tabs#sm4
@tab TypeScript (gmkitx)
```ts
import { sm4Encrypt, sm4Decrypt, CipherMode, PaddingMode } from 'gmkitx';
import fs from 'node:fs';

const vec = JSON.parse(fs.readFileSync('test/vectors/interop.json', 'utf8'));

for (const c of vec.cases.filter((v: any) => v.algo === 'SM4')) {
  const key = c.keyHex ?? vec.defaults.sm4KeyHex;
  const opt = {
    mode: CipherMode[c.mode],
    padding: PaddingMode[c.padding],
    iv: c.ivHex,
  };
  const cipher = sm4Encrypt(key, c.input, opt);
  if (c.expected?.cipherHex) console.assert(cipher === c.expected.cipherHex, c.id);
  const plain = sm4Decrypt(key, cipher, opt);
  console.assert(plain === c.input, `${c.id}-decrypt`);
}
```

@tab Java (Hutool)
```java
import cn.hutool.crypto.symmetric.SymmetricAlgorithm;
import cn.hutool.crypto.symmetric.SymmetricCrypto;
import cn.hutool.crypto.Mode;
import cn.hutool.crypto.Padding;
import cn.hutool.core.util.HexUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.file.Paths;

public class SM4Interop {
  public static void main(String[] args) throws Exception {
    var mapper = new ObjectMapper();
    var root = mapper.readTree(Paths.get("test/vectors/interop.json").toFile());
    for (var node : root.get("cases")) {
      if (!"SM4".equals(node.get("algo").asText())) continue;
      var key = HexUtil.decodeHex(node.has("keyHex") ? node.get("keyHex").asText() : root.get("defaults").get("sm4KeyHex").asText());
      var iv = node.has("ivHex") ? HexUtil.decodeHex(node.get("ivHex").asText()) : null;
      var mode = Mode.valueOf(node.get("mode").asText());
      var padding = node.get("padding").asText().equals("PKCS7") ? Padding.PKCS5Padding : Padding.valueOf(node.get("padding").asText());
      var sm4 = new SymmetricCrypto(mode, padding, SymmetricAlgorithm.SM4.getValue(), key, iv);
      var cipher = sm4.encryptHex(node.get("input").asText());
      if (node.get("expected").has("cipherHex")) {
        assert cipher.equals(node.get("expected").get("cipherHex").asText()) : node.get("id").asText();
      }
      var plain = sm4.decryptStr(cipher);
      assert plain.equals(node.get("input").asText()) : node.get("id").asText() + "-decrypt";
    }
  }
}
```

@tab Go (smgo)
```go
package main

import (
  "encoding/hex"
  "encoding/json"
  "os"

  "github.com/ZZMarquis/gm/sm4"
  "github.com/ZZMarquis/gm/util"
)

type Defaults struct {
  Sm4KeyHex string `json:"sm4KeyHex"`
  Sm4IvHex  string `json:"sm4IvHex"`
}

type Case struct {
  ID      string         `json:"id"`
  Algo    string         `json:"algo"`
  Mode    string         `json:"mode"`
  Padding string         `json:"padding"`
  Input   string         `json:"input"`
  KeyHex  string         `json:"keyHex"`
  IvHex   string         `json:"ivHex"`
  Expected map[string]any `json:"expected"`
}

type Vectors struct {
  Defaults Defaults `json:"defaults"`
  Cases    []Case   `json:"cases"`
}

func main() {
  data, _ := os.ReadFile("test/vectors/interop.json")
  var vec Vectors
  json.Unmarshal(data, &vec)

  for _, c := range vec.Cases {
    if c.Algo != "SM4" {
      continue
    }
    keyHex := c.KeyHex
    if keyHex == "" {
      keyHex = vec.Defaults.Sm4KeyHex
    }
    key, _ := hex.DecodeString(keyHex)
    ivHex := c.IvHex
    if ivHex == "" {
      ivHex = vec.Defaults.Sm4IvHex
    }
    iv, _ := hex.DecodeString(ivHex)

    // smgo 需要手动 PKCS5/PKCS7 填充
    data := []byte(c.Input)
    if c.Padding == "PKCS7" {
      data = util.PKCS5Padding(data, sm4.BlockSize)
    }

    var cipher []byte
    if c.Mode == "ECB" {
      cipher, _ = sm4.ECBEncrypt(key, data)
    } else if c.Mode == "CBC" {
      cipher, _ = sm4.CBCEncrypt(key, iv, data)
    }

    if exp, ok := c.Expected["cipherHex"].(string); ok && hex.EncodeToString(cipher) != exp {
      panic(c.ID)
    }

    var plainPadded []byte
    if c.Mode == "ECB" {
      plainPadded, _ = sm4.ECBDecrypt(key, cipher)
    } else {
      plainPadded, _ = sm4.CBCDecrypt(key, iv, cipher)
    }
    if c.Padding == "PKCS7" {
      plainPadded = util.PKCS5UnPadding(plainPadded)
    }
    if string(plainPadded) != c.Input {
      panic(c.ID)
    }
  }
}
```

@tab Python (gmssl)
```python
import json
from gmssl import sm4

with open("test/vectors/interop.json", "r", encoding="utf-8") as f:
    vec = json.load(f)

for c in vec["cases"]:
    if c["algo"] != "SM4":
        continue
    key_hex = c.get("keyHex") or vec["defaults"]["sm4KeyHex"]
    iv_hex = c.get("ivHex") or vec["defaults"]["sm4IvHex"]
    mode = c.get("mode")
    padding = c.get("padding")

    key = bytes.fromhex(key_hex)
    iv = bytes.fromhex(iv_hex) if mode == "CBC" else None
    # gmssl 内置 PKCS7 填充
    padding_mode = sm4.PKCS7 if padding == "PKCS7" else sm4.NoPadding
    sm4_crypt = sm4.CryptSM4(padding_mode=padding_mode)
    sm4_crypt.set_key(key, sm4.SM4_ENCRYPT)

    if mode == "ECB":
        cipher = sm4_crypt.crypt_ecb(c["input"].encode("utf-8"))
    else:
        cipher = sm4_crypt.crypt_cbc(iv, c["input"].encode("utf-8"))

    if "cipherHex" in c["expected"]:
        assert cipher.hex() == c["expected"]["cipherHex"], c["id"]

    sm4_crypt.set_key(key, sm4.SM4_DECRYPT)
    if mode == "ECB":
        plain = sm4_crypt.crypt_ecb(cipher)
    else:
        plain = sm4_crypt.crypt_cbc(iv, cipher)
    assert plain.decode("utf-8") == c["input"], c["id"]
```

@tab Rust (libsm)
```rust
use serde::Deserialize;
use std::fs;

use hex;
use libsm::sm4::cipher::Sm4Cipher;
use libsm::sm4::cipher_mode::{CipherMode, Sm4CipherMode};

#[derive(Debug, Deserialize)]
struct Defaults {
    sm4KeyHex: String,
    sm4IvHex: String,
}

#[derive(Debug, Deserialize)]
struct Case {
    id: String,
    algo: String,
    mode: String,
    padding: String,
    input: String,
    keyHex: Option<String>,
    ivHex: Option<String>,
    expected: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct Vectors {
    defaults: Defaults,
    cases: Vec<Case>,
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

fn main() {
    let data = fs::read_to_string("test/vectors/interop.json").unwrap();
    let vec: Vectors = serde_json::from_str(&data).unwrap();

    for c in vec.cases {
        if c.algo != "SM4" {
            continue;
        }
        let key_hex = c.keyHex.as_deref().unwrap_or(&vec.defaults.sm4KeyHex);
        let key = hex::decode(key_hex).unwrap();

        // ECB 手动 PKCS7，CBC 内部自动 PKCS7
        let (ciphertext, plain) = if c.mode == "ECB" {
            let cipher = Sm4Cipher::new(&key).unwrap();
            let padded = if c.padding == "PKCS7" {
                pkcs7_pad(c.input.as_bytes())
            } else {
                c.input.as_bytes().to_vec()
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
            let pt = if c.padding == "PKCS7" { pkcs7_unpad(&pt) } else { pt };
            (ct, pt)
        } else {
            let iv_hex = c.ivHex.as_deref().unwrap_or(&vec.defaults.sm4IvHex);
            let iv = hex::decode(iv_hex).unwrap();
            let cipher = Sm4CipherMode::new(&key, CipherMode::Cbc).unwrap();
            let ct = cipher.encrypt(&[], c.input.as_bytes(), &iv).unwrap();
            let pt = cipher.decrypt(&[], &ct, &iv).unwrap();
            (ct, pt)
        };

        if let Some(expected_hex) = c.expected.get("cipherHex").and_then(|v| v.as_str()) {
            assert_eq!(hex::encode(&ciphertext), expected_hex, "{}", c.id);
        }
        assert_eq!(plain, c.input.as_bytes(), "{}", c.id);
    }
}
```
:::

## 复用与扩展
- 新增语言/库：保持字段语义一致，直接在 JSON 追加用例，代码 tabs 的占位处补上实现。
- 想覆盖 CTR/OFB/CFB/GCM：先确认各实现计数器/IV/AAD 规则一致，再写入期望值。
- 如需可重复密文/签名（测试场景）：可在本地固定随机源，但请在用例备注中说明；生产环境不建议。 
