# GMKit

<div align="center">

[![npm version](https://img.shields.io/npm/v/gmkit.svg?style=flat-square)](https://www.npmjs.com/package/gmkit)
[![npm downloads](https://img.shields.io/npm/dm/gmkit.svg?style=flat-square)](https://www.npmjs.com/package/gmkit)
[![License](https://img.shields.io/npm/l/gmkit.svg?style=flat-square)](https://github.com/CherryRum/gmkit/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

**Pure TypeScript implementation of Chinese national cryptographic algorithms (SM2, SM3, SM4, ZUC) and international standards (SHA-256, SHA-384, SHA-512)**

[简体中文](./README.md) | [English](./README.en.md)

</div>

---

## 📑 Table of Contents

- [What is GMKit?](#what-is-gmkit)
- [Why GMKit?](#why-gmkit)
- [Features](#features)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [5-Minute Tutorial](#5-minute-tutorial)
- [Online Demo](#online-demo)
- [Usage Guide](#usage)
- [Algorithm Comparison](#algorithm-comparison)
- [API Reference](#api-reference)
- [FAQ](#faq)
- [Documentation](#documentation)

---

## What is GMKit?

GMKit is a comprehensive cryptographic library that makes it easy to use Chinese national cryptographic algorithms (SM algorithms) in frontend and Node.js environments.

**What are SM algorithms?**
SM algorithms are commercial cryptographic standards developed by the State Cryptography Administration of China, including SM2 (asymmetric encryption), SM3 (hash algorithm), SM4 (symmetric encryption), and ZUC (stream cipher). These algorithms are widely used in finance, government affairs, telecommunications, and especially in scenarios that need to comply with Chinese information security regulations.

**What can GMKit do?**
- 🔐 **Data Encryption**: Encrypt sensitive data using SM2 or SM4
- ✍️ **Digital Signatures**: Sign and verify data using SM2
- 🔑 **Key Exchange**: Securely negotiate shared keys between parties
- 🎲 **Hash Computation**: Generate data digests using SM3 or SHA series
- 📡 **Stream Encryption**: High-speed data encryption using ZUC

---

## Why GMKit?

### Comparison with Other SM Libraries

| Feature | GMKit | Other Libraries |
|---------|-------|-----------------|
| **Type Support** | ✅ Complete TypeScript definitions | ⚠️ Some lack types |
| **Modular** | ✅ Tree-shaking, load on demand | ⚠️ Usually load entire library |
| **Dual API** | ✅ Functional + Object-Oriented | ❌ Usually only one |
| **International** | ✅ Both SM and SHA series | ⚠️ Mostly SM only |
| **Browser** | ✅ UMD direct import | ⚠️ Some Node.js only |
| **Documentation** | ✅ Detailed docs in CN/EN + examples | ⚠️ Usually brief |
| **Dependencies** | ✅ Only 2 production deps | ⚠️ Usually more |
| **Maintenance** | ✅ Actively maintained | ⚠️ Some unmaintained |

### Core Advantages

- **Production Ready**: 267+ unit tests covering core features and common use cases
- **Standards Compliant**: Strictly follows GM/T national standards (GM/T 0003-2012, GM/T 0004-2012, etc.)
- **Easy Integration**: Detailed [Hutool Integration Guide](./docs/HUTOOL-INTEGRATION.zh-CN.md) for Java backend integration
- **Developer Experience**: Clear error messages, complete documentation, rich examples

---

## Features

- **✨ Purity**: Core SM algorithms in pure TypeScript, international algorithms based on @noble/hashes
- **⚡ High Performance**: Internal data processing uses `Uint8Array` for better performance
- **🔧 Modern**: Written in TypeScript with first-class type support, ES Modules first, CommonJS compatible
- **🌐 Isomorphic**: Works seamlessly in both Node.js and modern browsers
- **🎨 Flexible**: Multiple output formats (hex, base64) for different scenarios
- **📚 International**: Supports both SM and SHA series hash algorithms

---

## Quick Start

### Installation

```bash
# Using npm
npm install gmkit

# Using yarn
yarn add gmkit

# Using pnpm
pnpm add gmkit
```

### 5-Minute Tutorial

Choose the module format you're familiar with:

#### **Method 1: ES Module (Recommended ⭐)**

For modern frontend projects (Vue, React, Angular, etc.) and Node.js (>= 18)

```typescript
import { digest, sm4Encrypt, generateKeyPair } from 'gmkit';

// 1. Hash computation - simplest entry point
const hash = digest('Hello, SM3!');
console.log('Hash:', hash);

// 2. Symmetric encryption - encrypt sensitive data
const key = '0123456789abcdeffedcba9876543210'; // 128-bit key
const encrypted = sm4Encrypt(key, 'my password');
console.log('Encrypted:', encrypted);

// 3. Asymmetric encryption - generate key pair
const keyPair = generateKeyPair();
console.log('Public Key:', keyPair.publicKey);
console.log('Private Key:', keyPair.privateKey);
```

#### **Method 2: CommonJS**

For traditional Node.js projects

```javascript
const { digest, sm4Encrypt, generateKeyPair } = require('gmkit');

// Usage is the same as ES Module
const hash = digest('Hello, SM3!');
```

#### **Method 3: UMD (Direct Browser Import)**

For projects without build tools

```html
<!DOCTYPE html>
<html>
<head>
  <title>GMKit Quick Start</title>
</head>
<body>
  <script src="https://unpkg.com/gmkit@latest/dist/index.global.js"></script>
  <script>
    // Access all features through global GMKit object
    const hash = GMKit.digest('Hello, World!');
    console.log('Hash:', hash);
    
    // Encryption example
    const key = '0123456789abcdeffedcba9876543210';
    const encrypted = GMKit.sm4Encrypt(key, 'secret message');
    console.log('Encrypted:', encrypted);
  </script>
</body>
</html>
```

### Complete Example: Secure Communication

```typescript
import { generateKeyPair, sm2Encrypt, sm2Decrypt, sign, verify } from 'gmkit';

// Scenario: Alice wants to send an encrypted message to Bob

// 1. Bob generates a key pair (public key can be shared, private key must be secret)
const bobKeyPair = generateKeyPair();

// 2. Alice encrypts the message using Bob's public key
const message = 'This is a secret message';
const encrypted = sm2Encrypt(bobKeyPair.publicKey, message);
console.log('Encrypted message:', encrypted);

// 3. Bob decrypts the message using his private key
const decrypted = sm2Decrypt(bobKeyPair.privateKey, encrypted);
console.log('Decrypted message:', decrypted); // Output: 'This is a secret message'

// 4. Alice signs the message (prove it's from Alice)
const aliceKeyPair = generateKeyPair();
const signature = sign(aliceKeyPair.privateKey, message);

// 5. Bob verifies the signature (confirm the source)
const isValid = verify(aliceKeyPair.publicKey, message, signature);
console.log('Signature verification:', isValid ? '✅ Valid' : '❌ Invalid');
```

---

## Online Demo

Want to try GMKit quickly? We provide two interactive demo pages:

### Vue 3 Modern Demo (Recommended)

Modern web application built with Vue 3 + TypeScript, providing better user experience:

```bash
# Clone the repository
git clone https://github.com/CherryRum/gmkit.git
cd gmkit

# Install dependencies
npm install
cd demo-vue && npm install

# Start Vue demo
npm run dev
```

Features:
- 🔐 **Chinese National Cryptographic Algorithms**: Complete testing for SM2, SM3, SM4
- 🌐 **International Standard Algorithms**: AES, RSA, SHA (coming soon)
- 🛠️ **Utility Tools**: Key generation, format conversion, signature validation
- 📱 Responsive design, mobile-friendly
- 🎨 Modern UI with smooth animations

[View Vue Demo Documentation](./demo-vue/README.md)

### H5 Simple Demo

Traditional HTML5 demo page:

```bash
# Start demo
npm run demo
```

Features:
- ✅ Test SM3 hash computation
- ✅ Test SM4 encryption/decryption
- ✅ Test SM2 key generation, signing and verification

[View H5 Demo Documentation](./demo/README.md)

---

## Algorithm Comparison

### SM Algorithms vs International Standards

Understanding different algorithms helps you choose the right solution:

| Feature | SM2 | RSA | SM3 | SHA-256 | SM4 | AES |
|---------|-----|-----|-----|---------|-----|-----|
| **Type** | Asymmetric | Asymmetric | Hash | Hash | Symmetric | Symmetric |
| **Key Length** | 256-bit | 2048-4096-bit | - | - | 128-bit | 128/192/256-bit |
| **Performance** | ECC 256-bit | RSA 2048+ bit | Fast | Fast | Fast | Fast |
| **Security** | 256-bit | 2048+ bit | 256-bit | 256-bit | 128-bit | 128/192/256-bit |
| **Standard** | GM/T 0003 | PKCS#1 | GM/T 0004 | FIPS 180-4 | GM/T 0002 | FIPS 197 |
| **Compliance** | ✅ Chinese | ✅ International | ✅ Chinese | ✅ International | ✅ Chinese | ✅ International |

### Typical Use Cases

#### **SM2 - Asymmetric Encryption**
```typescript
// Use cases
✅ Digital signatures (contracts, documents)
✅ Key exchange (establish secure channel)
✅ Encrypt small data (keys, passwords)
❌ Not for large files (low performance)

// Typical example
const keyPair = generateKeyPair();
const signature = sign(keyPair.privateKey, 'Important contract');
```

#### **SM3 - Hash Algorithm**
```typescript
// Use cases
✅ Data integrity verification
✅ Password storage (salted hash)
✅ Digital fingerprints
✅ Blockchain applications

// Typical example
const hash = digest('user password' + 'random salt');
// Store hash instead of plaintext
```

#### **SM4 - Symmetric Encryption**
```typescript
// Use cases
✅ Large data encryption (files, databases)
✅ Real-time communication encryption
✅ Storage encryption
✅ High-performance scenarios

// Typical example
const key = '0123456789abcdeffedcba9876543210';
const encrypted = sm4Encrypt(key, 'Large sensitive data...');
```

#### **ZUC - Stream Cipher**
```typescript
// Use cases
✅ Mobile communications (4G/5G LTE)
✅ Real-time video/audio encryption
✅ Low-latency requirements
✅ Hardware optimization

// Typical example
const keystream = zucEncrypt(key, iv, 'Real-time data stream');
```

### How to Choose?

**🔒 Need to encrypt data?**
- Small data (< 100 bytes): Use **SM2**
- Large data (> 100 bytes): Use **SM4**
- Stream data: Use **ZUC**

**✍️ Need digital signatures?**
- Use **SM2** `sign()` and `verify()` functions

**🔑 Need data integrity verification?**
- Use **SM3** or **SHA-256**

**🤝 Need key exchange?**
- Use **SM2** `keyExchange()` function

---

## Usage Guide

[简体中文](./README.md) | English

### Functional API

#### SM3 Hash Algorithm

```typescript
import { digest, hmac } from 'gmkit';

// Hash a string
const hash = digest('Hello, SM3!');
console.log(hash); // lowercase hex string (64 characters)

// HMAC
const mac = hmac('secret-key', 'data to authenticate');
console.log(mac); // lowercase hex string (64 characters)
```

#### SM4 Block Cipher

```typescript
import { sm4Encrypt, sm4Decrypt, CipherMode, PaddingMode } from 'gmkit';

const key = '0123456789abcdeffedcba9876543210'; // 128-bit key (32 hex chars)
const plaintext = 'Hello, SM4!';

// ECB mode (Electronic Codebook)
const encrypted = sm4Encrypt(key, plaintext, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
const decrypted = sm4Decrypt(key, encrypted, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });

// CBC mode (Cipher Block Chaining)
const iv = 'fedcba98765432100123456789abcdef'; // 128-bit IV (32 hex chars)
const encryptedCBC = sm4Encrypt(key, plaintext, { mode: CipherMode.CBC, padding: PaddingMode.PKCS7, iv });
const decryptedCBC = sm4Decrypt(key, encryptedCBC, { mode: CipherMode.CBC, padding: PaddingMode.PKCS7, iv });

// CTR mode (Counter) - stream cipher mode, no padding required
const counter = '00000000000000000000000000000000'; // 128-bit counter/nonce
const encryptedCTR = sm4Encrypt(key, plaintext, { mode: CipherMode.CTR, iv: counter });
const decryptedCTR = sm4Decrypt(key, encryptedCTR, { mode: CipherMode.CTR, iv: counter });

// CFB mode (Cipher Feedback) - stream cipher mode, no padding required
const encryptedCFB = sm4Encrypt(key, plaintext, { mode: CipherMode.CFB, iv });
const decryptedCFB = sm4Decrypt(key, encryptedCFB, { mode: CipherMode.CFB, iv });

// OFB mode (Output Feedback) - stream cipher mode, no padding required
const encryptedOFB = sm4Encrypt(key, plaintext, { mode: CipherMode.OFB, iv });
const decryptedOFB = sm4Decrypt(key, encryptedOFB, { mode: CipherMode.OFB, iv });

// GCM mode (Galois/Counter Mode) - authenticated encryption with associated data
const gcmIv = '000000000000000000000000'; // 96-bit IV (24 hex chars, required for GCM)
const aad = 'Additional Authenticated Data'; // Optional additional authenticated data
const gcmResult = sm4Encrypt(key, plaintext, { mode: CipherMode.GCM, iv: gcmIv, aad });
console.log(gcmResult); // { ciphertext: '...', tag: '...' }
const decryptedGCM = sm4Decrypt(key, gcmResult, { mode: CipherMode.GCM, iv: gcmIv, aad });
```

#### SM2 Elliptic Curve Cryptography

```typescript
import { generateKeyPair, getPublicKeyFromPrivateKey, sm2Encrypt, sm2Decrypt, sign, verify, SM2CipherMode } from 'gmkit';

// Generate key pair (using secure random number generation from @noble/curves)
const keyPair = generateKeyPair();
console.log(keyPair.publicKey);  // Hex string, uncompressed format starting with 04
console.log(keyPair.privateKey); // Hex string, 32 bytes

// Derive public key from private key
const publicKey = getPublicKeyFromPrivateKey(keyPair.privateKey);

// Encrypt/Decrypt
const plaintext = 'Hello, SM2!';
// Supports two cipher modes: C1C3C2 (default) and C1C2C3
const encrypted = sm2Encrypt(keyPair.publicKey, plaintext, SM2CipherMode.C1C3C2);
const decrypted = sm2Decrypt(keyPair.privateKey, encrypted, SM2CipherMode.C1C3C2);

// Sign/Verify (using SM3 hash and Z-value calculation)
const data = 'Message to sign';
const signature = sign(keyPair.privateKey, data);
const isValid = verify(keyPair.publicKey, data, signature);
console.log(isValid); // true

// DER-encoded signatures (ASN.1 DER format)
const signatureDER = sign(keyPair.privateKey, data, { der: true });
const isValidDER = verify(keyPair.publicKey, data, signatureDER, { der: true });

// Custom user ID (default is '1234567812345678')
const signatureCustom = sign(keyPair.privateKey, data, { userId: 'user@example.com' });
const isValidCustom = verify(keyPair.publicKey, data, signatureCustom, { userId: 'user@example.com' });

// Automatic input format detection
// Supports:
// - Hex strings (with or without 0x prefix)
// - Uppercase or lowercase hex
// - Compressed or uncompressed public key formats
// - DER-encoded or raw format signatures
const privateKeyWith0x = '0x' + keyPair.privateKey;
const publicKeyUpper = keyPair.publicKey.toUpperCase();
const sig = sign(privateKeyWith0x, 'test');
const valid = verify(publicKeyUpper, 'test', sig); // Auto-detects format

// Support for Uint8Array input
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
const encryptedBinary = sm2Encrypt(keyPair.publicKey, binaryData);
const signatureBinary = sign(keyPair.privateKey, binaryData);

// SM2 Key Exchange (based on GM/T 0003.3-2012 and GM/T 0009-2023)
import { keyExchange } from 'gmkit';

// Suppose Alice and Bob need to negotiate a shared key
const aliceKeyPair = generateKeyPair();
const bobKeyPair = generateKeyPair();

// Step 1: Generate temporary key pairs
const aliceTempKeyPair = generateKeyPair();
const bobTempKeyPair = generateKeyPair();

// Step 2: Alice as initiator performs key exchange
const aliceResult = keyExchange({
  privateKey: aliceKeyPair.privateKey,
  tempPrivateKey: aliceTempKeyPair.privateKey,
  peerPublicKey: bobKeyPair.publicKey,
  peerTempPublicKey: bobTempKeyPair.publicKey,
  isInitiator: true,
  keyLength: 16, // Derive 16 bytes (128 bits) key
});

// Step 3: Bob as responder performs key exchange
const bobResult = keyExchange({
  privateKey: bobKeyPair.privateKey,
  tempPrivateKey: bobTempKeyPair.privateKey,
  peerPublicKey: aliceKeyPair.publicKey,
  peerTempPublicKey: aliceTempKeyPair.publicKey,
  isInitiator: false,
  keyLength: 16,
});

// Alice and Bob get the same shared key
console.log(aliceResult.sharedKey === bobResult.sharedKey); // true
```

### Object-Oriented API

#### SM3 - Hash Operations

```typescript
import { SM3 } from 'gmkit';

// Static methods
const hash = SM3.digest('Hello, SM3!');
const mac = SM3.hmac('secret-key', 'data');

// Incremental hashing
const sm3 = new SM3();
sm3.update('Hello, ').update('SM3!');
const result = sm3.digest();
```

#### SM4 - Block Cipher

```typescript
import { SM4, CipherMode, PaddingMode } from 'gmkit';

const key = '0123456789abcdeffedcba9876543210';
const iv = 'fedcba98765432100123456789abcdef';

// Using constructor
const sm4 = new SM4(key, { mode: CipherMode.ECB, padding: PaddingMode.PKCS7 });
const encrypted = sm4.encrypt('Hello, SM4!');
const decrypted = sm4.decrypt(encrypted);

// Using factory methods
const sm4ecb = SM4.ECB(key);
const sm4cbc = SM4.CBC(key, iv);
const sm4ctr = SM4.CTR(key, '00000000000000000000000000000000');
const sm4cfb = SM4.CFB(key, iv);
const sm4ofb = SM4.OFB(key, iv);

// Configuration setters
sm4.setMode(CipherMode.CBC);
sm4.setIV(iv);
sm4.setPadding(PaddingMode.PKCS7);
```

#### SM2 - Elliptic Curve Cryptography

```typescript
import { SM2, SM2CipherMode } from 'gmkit';

// Generate key pair
const sm2 = SM2.generateKeyPair();

// Create from existing keys
const sm2FromPrivate = SM2.fromPrivateKey(privateKey);
const sm2FromPublic = SM2.fromPublicKey(publicKey);

// Encrypt/Decrypt
const encrypted = sm2.encrypt('Hello, SM2!', SM2CipherMode.C1C3C2);
const decrypted = sm2.decrypt(encrypted, SM2CipherMode.C1C3C2);

// Sign/Verify
const signature = sm2.sign('Message to sign');
const isValid = sm2.verify('Message to sign', signature);

// Key Exchange
const alice = SM2.generateKeyPair();
const bob = SM2.generateKeyPair();

// Both parties generate temporary key pairs
const aliceTemp = SM2.generateKeyPair();
const bobTemp = SM2.generateKeyPair();

// Alice as initiator performs key exchange
const aliceResult = alice.keyExchange(
  bob.getPublicKey(),
  bobTemp.getPublicKey(),
  true, // Alice is initiator
  { 
    tempPrivateKey: aliceTemp.getPrivateKey(),
    keyLength: 16 
  }
);

// Bob as responder performs key exchange
const bobResult = bob.keyExchange(
  alice.getPublicKey(),
  aliceTemp.getPublicKey(),
  false, // Bob is responder
  { 
    tempPrivateKey: bobTemp.getPrivateKey(),
    keyLength: 16 
  }
);

// Both parties get the same shared key
console.log(aliceResult.sharedKey === bobResult.sharedKey); // true

// Custom curve parameters
const curveParams = {
  p: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFF',
  a: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000FFFFFFFFFFFFFFFC',
  b: '28E9FA9E9D9F5E344D5A9E4BCF6509A7F39789F515AB8F92DDBCBD414D940E93',
  Gx: '32C4AE2C1F1981195F9904466A39C9948FE30BBFF2660BE1715A4589334C74C7',
  Gy: 'BC3736A2F4F6779C59BDCEE36B692153D0A9877CC62A474002DF32E52139F0A0',
  n: 'FFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFF7203DF6B21C6052B53BBF40939D54123',
};
const sm2Custom = SM2.generateKeyPair(curveParams);
```

#### ZUC - Stream Cipher

```typescript
import { ZUC } from 'gmkit';

const key = '00112233445566778899aabbccddeeff';
const iv = 'ffeeddccbbaa99887766554433221100';

// Using constructor
const zuc = new ZUC(key, iv);
const encrypted = zuc.encrypt('Hello, ZUC!');
const decrypted = zuc.decrypt(encrypted);

// Using factory method
const zuc128 = ZUC.ZUC128(key, iv);

// Generate keystream
const keystream = zuc.keystream(4); // Generate 4 32-bit words

// Set new IV
zuc.setIV('00000000000000000000000000000000');

// EEA3 static method (3GPP LTE encryption)
const eea3Keystream = ZUC.eea3(key, 0x12345678, 5, 0, 256);

// EIA3 static method (3GPP LTE integrity)
const mac = ZUC.eia3(key, 0x12345678, 5, 0, 'Message to authenticate');
```


### Utility Functions

```typescript
import { hexToBytes, bytesToHex, stringToBytes, bytesToString } from 'gmkit';

// Convert between hex and bytes
const bytes = hexToBytes('48656c6c6f');
const hex = bytesToHex(bytes);

// Convert between string and bytes
const strBytes = stringToBytes('Hello');
const str = bytesToString(strBytes);
```

## Constants

### Cipher Modes
```typescript
import { CipherMode } from 'gmkit';

// Block cipher modes
CipherMode.ECB  // 'ecb' - Electronic Codebook
CipherMode.CBC  // 'cbc' - Cipher Block Chaining

// Stream cipher modes
CipherMode.CTR  // 'ctr' - Counter
CipherMode.CFB  // 'cfb' - Cipher Feedback
CipherMode.OFB  // 'ofb' - Output Feedback

// Authenticated Encryption with Associated Data (AEAD) modes
CipherMode.GCM  // 'gcm' - Galois/Counter Mode (implemented)
```

**Notes**:
- **ECB**: Not recommended for production, encrypts each block independently
- **CBC**: Requires IV, each block is XORed with previous ciphertext
- **CTR/CFB/OFB**: Stream cipher modes, no padding required, requires IV
- **GCM**: Authenticated encryption, provides both encryption and authentication, requires a 12-byte IV
- **CCM/XTS**: Planned roadmap items that are not included in this release

### Padding Modes
```typescript
import { PaddingMode } from 'gmkit';

PaddingMode.PKCS7  // 'pkcs7' - PKCS#7 padding (default)
PaddingMode.NONE   // 'none' - No padding
PaddingMode.ZERO   // 'zero' - Zero padding
```

**Notes**:
- **PKCS7**: Padding value equals the number of padding bytes (e.g., pad 3 bytes, each byte value is 0x03)
- **NONE**: No padding, data length must be a multiple of 16 bytes
- **ZERO**: Pad with zero bytes to a multiple of 16 bytes
- Stream cipher modes (CTR/CFB/OFB/GCM) don't use padding

### SM2 Cipher Modes
```typescript
import { SM2CipherMode } from 'gmkit';

SM2CipherMode.C1C3C2  // 'C1C3C2' (recommended)
SM2CipherMode.C1C2C3  // 'C1C2C3'
```

### OID (Object Identifier)
```typescript
import { OID } from 'gmkit';

OID.SM2            // '1.2.156.10197.1.301' - SM2 algorithm
OID.SM2_SM3        // '1.2.156.10197.1.501' - SM2 signature with SM3
OID.SM3            // '1.2.156.10197.1.401' - SM3 hash algorithm
OID.SM4            // '1.2.156.10197.1.104' - SM4 cipher algorithm
OID.EC_PUBLIC_KEY  // '1.2.840.10045.2.1' - Standard EC public key (incorrect SM2 identification in OpenSSL 1.x)
```

**Notes**:
- 1.2.156 is the registration number of the Chinese State Cryptography Administration
- 10197 is the commercial cryptography identifier
- SM2 is based on elliptic curves (ECC) but uses China's independently registered OID and parameters
- These OIDs are different from international standard ECC OIDs, ensuring the independence of commercial cryptographic algorithms

**⚠️ OpenSSL Version Compatibility**:
- **OpenSSL 1.x**: SM2 public keys are incorrectly identified as standard EC public keys (OID: `1.2.840.10045.2.1`)
- **OpenSSL 3.x**: SM2 public keys use the correct national cryptographic standard OID (`1.2.156.10197.1.301`)
- If you see OID `1.2.840.10045.2.1` when parsing certificates, it indicates the certificate was generated by OpenSSL 1.x
- **Recommendation**: Use OpenSSL 3.x to generate certificates to ensure compliance with GB/T 33560-2017 standard
- This library follows the national cryptographic standard and uses the correct OID `1.2.156.10197.1.301`

### Default Values
```typescript
import { DEFAULT_USER_ID } from 'gmkit';

DEFAULT_USER_ID  // '1234567812345678' - Default user ID for SM2 signature (backward compatible)
                 // GM/T 0009-2023 recommends using empty string ''
```

## API Reference

### SM3

**Functional API:**
- `digest(data: string | Uint8Array): string` - Compute SM3 hash digest
- `hmac(key: string | Uint8Array, data: string | Uint8Array): string` - Compute SM3-HMAC

**Object-Oriented API:**
- `SM3.digest(data)` - Static method to compute hash
- `SM3.hmac(key, data)` - Static method to compute HMAC
- `new SM3()` - Create instance for incremental hashing
  - `.update(data)` - Add data to hash
  - `.digest()` - Finalize and return hash
  - `.reset()` - Reset state

### SM4

**Functional API:**
- `sm4Encrypt(key: string, data: string | Uint8Array, options?: SM4Options): string` - Encrypt data using SM4
- `sm4Decrypt(key: string, encryptedData: string, options?: SM4Options): string` - Decrypt data using SM4

**SM4Options:**
- `mode?: CipherModeType` - Cipher mode (default: ECB)
- `padding?: PaddingModeType` - Padding scheme (default: PKCS7)
- `iv?: string` - Initialization vector for CBC mode (32 hex chars)

**Object-Oriented API:**
- `new SM4(key, options?)` - Create SM4 instance
- `SM4.ECB(key, padding?)` - Create ECB mode instance
- `SM4.CBC(key, iv, padding?)` - Create CBC mode instance
- Instance methods:
  - `.encrypt(data)` - Encrypt data
  - `.decrypt(encryptedData)` - Decrypt data
  - `.setMode(mode)` / `.getMode()` - Set/get mode
  - `.setPadding(padding)` / `.getPadding()` - Set/get padding
  - `.setIV(iv)` / `.getIV()` - Set/get IV

### SM2

**Functional API:**

*Key Management:*
- `generateKeyPair(compressed?: boolean): KeyPair` - Generate SM2 key pair
  - `compressed`: Use compressed format (**default: false**)
- `getPublicKeyFromPrivateKey(privateKey: string, compressed?: boolean): string` - Derive public key from private key
  - `compressed`: Return compressed format (**default: false**)
- `compressPublicKey(publicKey: string): string` - Compress public key (04->02/03)
- `decompressPublicKey(publicKey: string): string` - Decompress public key (02/03->04)

*Encryption/Decryption:*
- `sm2Encrypt(publicKey: string, data: string | Uint8Array, mode?: SM2CipherModeType): string` - Encrypt data using SM2
  - `mode`: Cipher mode (**default: 'C1C3C2'**)
- `sm2Decrypt(privateKey: string, encryptedData: string, mode?: SM2CipherModeType): string` - Decrypt data using SM2
  - `mode`: Cipher mode (**default: 'C1C3C2'**)

*Signing/Verification:*
- `sign(privateKey: string, data: string | Uint8Array, options?: SignOptions): string` - Sign data using SM2
- `verify(publicKey: string, data: string | Uint8Array, signature: string, options?: VerifyOptions): boolean` - Verify signature using SM2

*Key Exchange:*
- `keyExchange(params: SM2KeyExchangeParams): SM2KeyExchangeResult` - Execute SM2 key exchange protocol

**SignOptions:**
- `der?: boolean` - Use DER encoding format (**default: false**, Raw format)
- `userId?: string` - User ID for signing (**default: '1234567812345678'**)
- `skipZComputation?: boolean` - Skip Z value computation (**default: false**)
- `curveParams?: SM2CurveParams` - Custom elliptic curve parameters (**default: GM/T 0003-2012 standard parameters, continued in GM/T 0009-2023**)

**VerifyOptions:**
- `der?: boolean` - Signature in DER encoding format (**default: false**)
- `userId?: string` - User ID for verification (**default: '1234567812345678'**, must match signing)
- `skipZComputation?: boolean` - Skip Z value computation (**default: false**, must match signing)
- `curveParams?: SM2CurveParams` - Custom elliptic curve parameters

**SM2KeyExchangeParams:**
- `privateKey: string` - Self private key (required)
- `publicKey?: string` - Self public key (optional, derived from private key if not provided)
- `userId?: string` - Self user ID (**default: '1234567812345678'**)
- `tempPrivateKey?: string` - Self temporary private key (optional, auto-generated if not provided)
- `peerPublicKey: string` - Peer public key (required)
- `peerTempPublicKey: string` - Peer temporary public key (required)
- `peerUserId?: string` - Peer user ID (**default: '1234567812345678'**)
- `isInitiator: boolean` - Whether is initiator (required)
- `keyLength?: number` - Derived key byte length (**default: 16**)

**SM2KeyExchangeResult:**
- `tempPublicKey: string` - Self temporary public key
- `sharedKey: string` - Derived shared key
- `s1?: string` - Self confirmation hash (optional, for mutual authentication)
- `s2?: string` - Peer confirmation hash (optional, for mutual authentication)

**SM2CurveParams:**
- `p?: string` - Prime modulus p
- `a?: string` - Coefficient a
- `b?: string` - Coefficient b
- `Gx?: string` - Base point x coordinate
- `Gy?: string` - Base point y coordinate
- `n?: string` - Order n

**Object-Oriented API:**
- `SM2.generateKeyPair(curveParams?)` - Generate key pair
- `SM2.fromPrivateKey(privateKey, curveParams?)` - Create from private key
- `SM2.fromPublicKey(publicKey, curveParams?)` - Create from public key
- Instance methods:
  - `.encrypt(data, mode?)` - Encrypt data (**mode default: 'C1C3C2'**)
  - `.decrypt(encryptedData, mode?)` - Decrypt data (**mode default: 'C1C3C2'**)
  - `.sign(data, options?)` - Sign data
  - `.verify(data, signature, options?)` - Verify signature
  - `.keyExchange(peerPublicKey, peerTempPublicKey, isInitiator, options?)` - Execute key exchange
  - `.getPublicKey()` / `.getPrivateKey()` - Get keys
  - `.setCurveParams(params)` / `.getCurveParams()` - Set/get curve parameters

### Utils

**Data Conversion:**
- `hexToBytes(hex: string): Uint8Array` - Convert hex string to bytes
- `bytesToHex(bytes: Uint8Array): string` - Convert bytes to lowercase hex string
- `stringToBytes(str: string): Uint8Array` - Convert UTF-8 string to bytes
- `bytesToString(bytes: Uint8Array): string` - Convert bytes to UTF-8 string
- `normalizeInput(data: string | Uint8Array): Uint8Array` - Normalize input to Uint8Array

**Bit Operations:**
- `xor(a: Uint8Array, b: Uint8Array): Uint8Array` - XOR two byte arrays
- `rotl(value: number, shift: number): number` - Left rotate a 32-bit value

**ASN.1 Encoding Tools:**
- `encodeSignature(r: string, s: string): Uint8Array` - Encode r, s as DER format signature
- `decodeSignature(derSignature: Uint8Array): { r: string; s: string }` - Decode DER format signature
- `rawToDer(rawSignature: string): string` - Convert raw signature (r||s) to DER format
- `derToRaw(derSignature: string): string` - Convert DER format signature to raw format (r||s)
- `asn1ToXml(data: Uint8Array): string` - Convert ASN.1 data to XML format (for debugging)
- `signatureToXml(signature: string): string` - Convert signature to XML format (for debugging)

## Data Format Conventions

- **Internal Processing**: All binary data uses `Uint8Array`
- **Input**: Accepts both `string` and `Uint8Array` types. Strings are decoded as UTF-8
- **Output**: Binary outputs (ciphertext, signatures) are encoded as **lowercase hex strings**
- **Keys**: All keys use **hex string** format

## Architecture

GMKit follows functional programming principles with all features implemented as independent, pure functions. It also provides object-oriented APIs for better state management and ease of use. This enables:

- **Tree-shaking**: Only import what you need
- **Easy testing**: Pure functions with fixed input/output
- **Strong composability**: Combine functions like building blocks
- **Flexibility**: Choose functional or object-oriented style

For detailed architecture documentation, see [Architecture Guide](./docs/ARCHITECTURE.zh-CN.md)

## Building from Source

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run type-check
```

## Local Testing

Want to quickly test all features? We provide comprehensive testing scripts:

```bash
# Run interactive test script (recommended)
npx tsx test-local.ts

# Run full test suite
npm test
```

Test coverage:
- ✅ SM3 hash and HMAC
- ✅ SM4 multiple modes (ECB, CBC, CTR, CFB, OFB, GCM)
- ✅ SM2 key generation, encryption/decryption, signing/verification, key exchange
- ✅ ZUC encryption/decryption, EEA3, EIA3

## Integration with Hutool Backend

If you need to integrate GMKit on the frontend with Hutool (Java) on the backend, we provide a complete integration guide:

```bash
# View integration guide
cat docs/HUTOOL-INTEGRATION.zh-CN.md
```

The guide includes:
- Data format compatibility table
- Complete SM3/SM4/SM2 integration examples
- Common issues and solutions
- Key format conversion methods

For details, see [Hutool Integration Guide](./docs/HUTOOL-INTEGRATION.zh-CN.md)

## License

Apache-2.0

## Standards and References

This library implements the following Chinese national cryptographic standards:

- **GM/T 0003-2012**: SM2 Elliptic Curve Public Key Cryptographic Algorithm
- **GM/T 0004-2012**: SM3 Cryptographic Hash Algorithm
- **GM/T 0002-2012**: SM4 Block Cipher Algorithm
- **GM/T 0009-2023**: SM2 Cryptographic Algorithm Application Specification (replaces GM/T 0009-2012)
- **GM/T 0006-2012**: Cryptographic Application Identifier Specification (OID definitions)

### Standard Evolution Notes

Key updates in GMT 0009-2023 compared to GMT 0009-2012:

1. **Default User ID**: Recommends using empty string `''` instead of `'1234567812345678'`
   - This library defaults to `'1234567812345678'` for backward compatibility
   - To comply with the latest standard, explicitly specify `userId: ''` when signing/verifying

2. **Cipher Mode**: Explicitly recommends C1C3C2 mode (already the default in this library)

3. **Public Key Format**: Explicitly recommends uncompressed format (04 prefix, already the default)

4. **Security Enhancements**: Enhanced recommendations for key length and parameter validation

## Note

GMKit provides full implementations of SM2, SM3, SM4, and ZUC algorithms, validated by 214+ unit tests. All core features are implemented and production-ready.

## Documentation

For more documentation, see the [docs](./docs) directory:

- [Hutool Integration Guide](./docs/HUTOOL-INTEGRATION.zh-CN.md) - Integration with Java Hutool backend
- [Architecture Guide](./docs/ARCHITECTURE.zh-CN.md) - Project architecture design
- [Publishing Guide](./docs/PUBLISHING.md) - How to publish new versions
- [Performance Benchmarks](./docs/PERFORMANCE.md) - Performance test results
- [Standards Compliance](./docs/GMT-0009-COMPLIANCE.md) - GMT national standard compliance

For a complete documentation index, see [docs/README.md](./docs/README.md)

---

## FAQ

### Installation and Usage

<details>
<summary><strong>❓ How to use in TypeScript projects?</strong></summary>

GMKit has native TypeScript support, no additional configuration needed:

```typescript
import { digest, sm4Encrypt, type KeyPair } from 'gmkit';

// TypeScript automatically provides type hints and checks
const keyPair: KeyPair = generateKeyPair();
```

</details>

<details>
<summary><strong>❓ Getting "Module not found" error in browser?</strong></summary>

If using build tools like Vite or Webpack, ensure correct configuration:

**Vite Configuration Example:**
```javascript
// vite.config.js
export default {
  optimizeDeps: {
    include: ['gmkit']
  }
}
```

**Or use UMD version directly:**
```html
<script src="https://unpkg.com/gmkit@latest/dist/index.global.js"></script>
```

</details>

<details>
<summary><strong>❓ Getting "Cannot find module" error in Node.js?</strong></summary>

Ensure your Node.js version >= 18.0.0:

```bash
node --version  # Should be >= v18.0.0
```

If using CommonJS, ensure correct import:
```javascript
const { digest } = require('gmkit');
```

</details>

### Encryption and Decryption

<details>
<summary><strong>❓ SM4 decryption fails, returns gibberish?</strong></summary>

**Reason 1: Inconsistent parameters between encryption and decryption**

```typescript
// ❌ Wrong example
const encrypted = sm4Encrypt(key, data, { mode: CipherMode.CBC, iv });
const decrypted = sm4Decrypt(key, encrypted, { mode: CipherMode.ECB }); // Mode mismatch!

// ✅ Correct example
const encrypted = sm4Encrypt(key, data, { mode: CipherMode.CBC, iv });
const decrypted = sm4Decrypt(key, encrypted, { mode: CipherMode.CBC, iv }); // Consistent params
```

**Reason 2: Wrong key format**

```typescript
// ❌ Wrong: Key length is not 32 hex characters (128 bits)
const key = '0123456789';

// ✅ Correct: Must be 32 hex characters
const key = '0123456789abcdeffedcba9876543210';
```

</details>

<details>
<summary><strong>❓ Can't decrypt SM2 encrypted data?</strong></summary>

**Check cipher mode consistency:**

```typescript
// ✅ Method 1: Specify same mode for both
const encrypted = sm2Encrypt(publicKey, data, SM2CipherMode.C1C3C2);
const decrypted = sm2Decrypt(privateKey, encrypted, SM2CipherMode.C1C3C2);

// ✅ Method 2: Let decryption auto-detect mode
const encrypted = sm2Encrypt(publicKey, data, SM2CipherMode.C1C3C2);
const decrypted = sm2Decrypt(privateKey, encrypted); // Auto-detect
```

**Check if public and private keys match:**

```typescript
// ✅ Correct: Use same key pair
const keyPair = generateKeyPair();
const encrypted = sm2Encrypt(keyPair.publicKey, data);
const decrypted = sm2Decrypt(keyPair.privateKey, encrypted); // Use corresponding private key
```

</details>

<details>
<summary><strong>❓ Signature verification always returns false?</strong></summary>

**Reason 1: Inconsistent userId**

```typescript
// ❌ Wrong: Different userId for signing and verification
const sig = sign(privateKey, data, { userId: 'alice@example.com' });
const valid = verify(publicKey, data, sig, { userId: 'bob@example.com' }); // Different userId!

// ✅ Correct: userId must be the same
const sig = sign(privateKey, data, { userId: 'alice@example.com' });
const valid = verify(publicKey, data, sig, { userId: 'alice@example.com' }); // Same userId
```

**Reason 2: Data was modified**

```typescript
const sig = sign(privateKey, 'original data');
const valid = verify(publicKey, 'modified data', sig); // ❌ Different data, verification fails
```

**Reason 3: DER format mismatch**

```typescript
// ✅ Format must be consistent
const sig = sign(privateKey, data, { der: true });
const valid = verify(publicKey, data, sig, { der: true }); // der parameter must match
```

</details>

### Integration with Other Systems

<details>
<summary><strong>❓ How to integrate with Java backend (Hutool)?</strong></summary>

We provide a detailed integration guide: [Hutool Integration Guide](./docs/HUTOOL-INTEGRATION.zh-CN.md)

**Quick points:**
1. Use `C1C3C2` cipher mode consistently
2. Use uncompressed public key format (starts with 04)
3. Transfer keys as hex strings
4. userId must be consistent with backend

</details>

<details>
<summary><strong>❓ How to integrate with OpenSSL-generated keys?</strong></summary>

**Note OpenSSL version differences:**
- OpenSSL 1.x: SM2 public keys use incorrect OID `1.2.840.10045.2.1`
- OpenSSL 3.x: Uses correct national crypto OID `1.2.156.10197.1.301`

**Recommended to use OpenSSL 3.x for key generation:**
```bash
# Generate SM2 private key
openssl ecparam -genkey -name SM2 -out private.pem

# Extract public key
openssl ec -in private.pem -pubout -out public.pem
```

See [OID Constants Documentation](#oid-object-identifier) for details.

</details>

### Performance

<details>
<summary><strong>❓ Encrypting large files is slow?</strong></summary>

**For large files (> 1MB):**

1. **Use streaming (chunked encryption):**
```typescript
function encryptLargeFile(key: string, data: string, chunkSize = 1024 * 1024) {
  const chunks = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    chunks.push(sm4Encrypt(key, chunk));
  }
  return chunks;
}
```

2. **Use hybrid encryption (SM2 + SM4):**
```typescript
// 1. Generate random SM4 key
const sm4Key = generateRandomKey(); // Implement random key generation

// 2. Encrypt large file with SM4
const encryptedData = sm4Encrypt(sm4Key, largeFileData);

// 3. Encrypt SM4 key with SM2
const encryptedKey = sm2Encrypt(publicKey, sm4Key);

// Transfer: { encryptedData, encryptedKey }
```

</details>

<details>
<summary><strong>❓ How to improve performance?</strong></summary>

**Performance optimization tips:**

1. **Choose right algorithm:**
   - Large data encryption: Use SM4 (symmetric) not SM2
   - Stream data: Use ZUC
   
2. **Choose right mode:**
   - ECB/CTR modes are slightly faster than CBC
   - GCM provides encryption + authentication, avoiding extra hash computation

3. **Reduce repeated operations:**
```typescript
// ❌ Bad: Create new instance each time
for (let i = 0; i < 1000; i++) {
  const hash = digest(data[i]);
}

// ✅ Better: Reuse instance
const sm3 = new SM3();
for (let i = 0; i < 1000; i++) {
  sm3.reset();
  sm3.update(data[i]);
  const hash = sm3.digest();
}
```

</details>

### Security

<details>
<summary><strong>❓ How should keys be stored?</strong></summary>

**⚠️ Security recommendations:**

❌ **Don't do this:**
```typescript
// Never hardcode keys
const key = '0123456789abcdeffedcba9876543210';

// Don't store private keys in frontend
localStorage.setItem('privateKey', privateKey);
```

✅ **Recommended practices:**

1. **Private keys always on server:**
```typescript
// Frontend only stores public key
const publicKey = await fetch('/api/public-key').then(r => r.text());

// Encryption on frontend
const encrypted = sm2Encrypt(publicKey, sensitiveData);

// Decryption on server
await fetch('/api/decrypt', {
  method: 'POST',
  body: JSON.stringify({ encrypted })
});
```

2. **Use environment variables** (server-side):
```typescript
// .env
SM4_KEY=0123456789abcdeffedcba9876543210

// Code
const key = process.env.SM4_KEY;
```

3. **Use key management services** (production):
   - AWS KMS
   - Azure Key Vault
   - HashiCorp Vault

</details>

<details>
<summary><strong>❓ How to securely transfer keys?</strong></summary>

**Use key exchange protocol:**

```typescript
// Negotiate keys instead of direct transfer
const alice = generateKeyPair();
const bob = generateKeyPair();

// Both generate temporary keys
const aliceTemp = generateKeyPair();
const bobTemp = generateKeyPair();

// Exchange public keys over public channel, negotiate shared key
const aliceResult = keyExchange({
  privateKey: alice.privateKey,
  tempPrivateKey: aliceTemp.privateKey,
  peerPublicKey: bob.publicKey,
  peerTempPublicKey: bobTemp.publicKey,
  isInitiator: true,
  keyLength: 16
});

// Alice and Bob get same key without ever transmitting it
```

</details>

---

## Related Projects

- [sm-crypto-v2](https://github.com/Cubelrti/sm-crypto-v2) - Another excellent implementation of SM algorithms
