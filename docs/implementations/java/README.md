---
title: Java 实现
icon: java
order: 2
author: GMKitX Team
date: 2024-11-22
category:
  - 实现
  - Java
tag:
  - Java
  - 后端
  - Spring
---

# Java 实现

::: info 说明
当前 GMKitX 项目主要提供 TypeScript/JavaScript 实现。如果您需要 Java 版本的国密算法实现，请参考以下推荐的成熟方案。

未来 GMKitX 可能会提供 Java 实现版本，届时会在此页面更新。
:::

## 🔧 推荐的 Java 国密库

### 1. Bouncy Castle (推荐)

**Bouncy Castle** 是最成熟的 Java 密码学库，支持国密算法。

#### 安装

```xml
<!-- Maven -->
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk15on</artifactId>
    <version>1.70</version>
</dependency>
```

```gradle
// Gradle
implementation 'org.bouncycastle:bcprov-jdk15on:1.70'
```

#### 示例代码

```java
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import java.security.Security;

// 注册 BouncyCastle 提供者
Security.addProvider(new BouncyCastleProvider());

// SM2 示例
import org.bouncycastle.crypto.engines.SM2Engine;
import org.bouncycastle.crypto.params.ECPublicKeyParameters;

// SM3 哈希
import org.bouncycastle.crypto.digests.SM3Digest;

SM3Digest digest = new SM3Digest();
byte[] data = "Hello World".getBytes("UTF-8");
digest.update(data, 0, data.length);
byte[] hash = new byte[digest.getDigestSize()];
digest.doFinal(hash, 0);

// SM4 对称加密
import org.bouncycastle.crypto.engines.SM4Engine;
```

**优势：**
- ✅ 国际知名，广泛使用
- ✅ 持续维护更新
- ✅ 文档完善
- ✅ 支持完整的国密算法套件

**链接：**
- [官网](https://www.bouncycastle.org/)
- [GitHub](https://github.com/bcgit/bc-java)
- [文档](https://www.bouncycastle.org/documentation.html)

---

### 2. Hutool（国内推荐）

**Hutool** 是国内流行的 Java 工具库，内置国密算法支持。

#### 安装

```xml
<!-- Maven -->
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-crypto</artifactId>
    <version>5.8.23</version>
</dependency>
```

```gradle
// Gradle
implementation 'cn.hutool:hutool-crypto:5.8.23'
```

#### 示例代码

```java
import cn.hutool.crypto.SmUtil;
import cn.hutool.crypto.asymmetric.KeyType;
import cn.hutool.crypto.asymmetric.SM2;

// SM2 加密
SM2 sm2 = SmUtil.sm2();
String plaintext = "Hello, World!";
String ciphertext = sm2.encryptHex(plaintext, KeyType.PublicKey);
String decrypted = sm2.decryptStr(ciphertext, KeyType.PrivateKey);

// SM3 哈希
String hash = SmUtil.sm3("Hello, World!");

// SM4 对称加密
String key = "0123456789abcdeffedcba9876543210";
String encrypted = SmUtil.sm4(key.getBytes()).encryptHex("Secret");
String decrypted = SmUtil.sm4(key.getBytes()).decryptStr(encrypted);
```

**优势：**
- ✅ 中文文档友好
- ✅ API 简洁易用
- ✅ 与其他 Hutool 模块集成好
- ✅ 活跃的国内社区

**链接：**
- [官网](https://hutool.cn/)
- [Gitee](https://gitee.com/dromara/hutool)
- [文档](https://doc.hutool.cn/)

**GMKitX 对接指南：** [Hutool 集成](/dev/HUTOOL-INTEGRATION.zh-CN)

---

### 3. 其他选择

#### gmhelper

轻量级国密算法库。

```xml
<dependency>
    <groupId>org.openeuler.gm</groupId>
    <artifactId>gmhelper</artifactId>
    <version>1.4.1</version>
</dependency>
```

**链接：** [GitHub](https://github.com/ZZMarquis/gmhelper)

#### XIPKI

支持国密算法的 PKI 解决方案。

**链接：** [GitHub](https://github.com/xipki/xipki)

---

## 🏗️ Spring Boot 集成

### 配置示例

```java
@Configuration
public class CryptoConfig {
    
    @Bean
    public SM2 sm2() {
        return SmUtil.sm2();
    }
    
    @Bean
    public SM4 sm4(@Value("${crypto.sm4.key}") String key) {
        return SmUtil.sm4(key.getBytes());
    }
}
```

### 使用示例

```java
@Service
public class CryptoService {
    
    @Autowired
    private SM2 sm2;
    
    @Autowired
    private SM4 sm4;
    
    public String encryptData(String data) {
        // SM2 加密
        return sm2.encryptHex(data, KeyType.PublicKey);
    }
    
    public String symmetricEncrypt(String data) {
        // SM4 对称加密
        return sm4.encryptHex(data);
    }
}
```

---

## 🔄 前后端对接

### TypeScript (前端) ↔ Java (后端)

当前端使用 GMKitX (TypeScript)，后端使用 Java 时：

#### 密钥格式统一

```java
// Java 端导出公钥（Hex 格式）
SM2 sm2 = SmUtil.sm2();
String publicKeyHex = sm2.getPublicKeyBase64(); // 或 getPublicKeyHex()

// 前端使用
import { sm2Encrypt } from 'gmkitx';
const encrypted = sm2Encrypt(publicKeyHex, 'data');
```

#### 密文格式统一

**重要：** 确保前后端使用相同的密文模式（C1C3C2 或 C1C2C3）

```java
// Java - Hutool (默认 C1C3C2)
SM2 sm2 = new SM2();
sm2.setMode(SM2Engine.Mode.C1C3C2); // 设置模式

// TypeScript - GMKitX (默认 C1C3C2)
import { sm2Encrypt, SM2CipherMode } from 'gmkitx';
const cipher = sm2Encrypt(publicKey, data, {
  mode: SM2CipherMode.C1C3C2  // 与 Java 保持一致
});
```

#### 编码格式统一

建议使用 **Hex** 或 **Base64** 进行传输：

```java
// Java 端
String hexCipher = sm2.encryptHex(data, KeyType.PublicKey);

// 前端
const hexCipher = sm2Encrypt(publicKey, data, {
  outputFormat: OutputFormat.HEX
});
```

**详细对接指南：** [Hutool 集成文档](/dev/HUTOOL-INTEGRATION.zh-CN)

---

## ⚡ 性能对比

### JVM vs JavaScript

| 维度 | Java | JavaScript/TypeScript |
|:----|:-----|:---------------------|
| **性能** | 更高（JIT 编译） | 中等（解释执行为主） |
| **硬件加速** | 支持（JNI 调用 native） | 不支持（纯软件） |
| **内存管理** | GC 自动管理 | GC 自动管理 |
| **并发处理** | 多线程优势明显 | 单线程 + 异步 |
| **适用场景** | 后端高性能服务 | 前端、全栈、轻量服务 |

### 性能优化建议

**Java 端：**
```java
// 1. 复用密码对象
private static final SM2 sm2 = SmUtil.sm2();

// 2. 使用线程池处理批量加密
ExecutorService executor = Executors.newFixedThreadPool(10);

// 3. 考虑使用 JNI 调用 native 实现（最高性能）
```

**TypeScript 端：**
```typescript
// 1. 使用 Worker 线程处理大数据
const worker = new Worker('crypto-worker.js');

// 2. 批量操作减少函数调用开销
const results = data.map(item => sm3Digest(item));

// 3. 生产环境使用压缩版本
```

---

## 🔐 安全性考虑

### Java 端

- ✅ JVM 内存管理相对安全
- ✅ 可以使用硬件安全模块（HSM）
- ⚠️ 注意密钥在内存中的生命周期
- ⚠️ 使用安全的随机数生成器（SecureRandom）

```java
// 使用安全随机数
SecureRandom random = new SecureRandom();
byte[] randomBytes = new byte[32];
random.nextBytes(randomBytes);
```

### 密钥存储

```java
// 使用 Java KeyStore
KeyStore ks = KeyStore.getInstance("PKCS12");
ks.load(new FileInputStream("keystore.p12"), password);
```

---

## 📚 学习资源

### Bouncy Castle

- [官方文档](https://www.bouncycastle.org/documentation.html)
- [API JavaDoc](https://www.bouncycastle.org/docs/docs1.5on/index.html)

### Hutool

- [Hutool Crypto 文档](https://doc.hutool.cn/pages/crypto/)
- [国密算法示例](https://doc.hutool.cn/pages/SmUtil/)

### Spring Security

- [Spring Security + 国密](https://spring.io/projects/spring-security)

---

## 🚧 GMKitX Java 版本（计划中）

GMKitX 团队正在考虑提供官方的 Java 实现，将具备以下特性：

- ✅ 与 TypeScript 版本 API 一致
- ✅ Maven Central 发布
- ✅ Spring Boot Starter 支持
- ✅ 完整的单元测试
- ✅ 与前端版本互操作性测试

**时间表：** 待定

**反馈：** 如果您需要 Java 版本，请在 [GitHub Issues](https://github.com/CherryRum/gmkit/issues) 告诉我们！

---

## 🔗 相关资源

- [GMKitX TypeScript 版本](/)
- [Hutool 集成指南](/dev/HUTOOL-INTEGRATION.zh-CN)
- [前后端对接最佳实践](/dev/HUTOOL-INTEGRATION.zh-CN)
- [性能对比测试](/performance/PERFORMANCE)
