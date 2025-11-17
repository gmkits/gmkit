# SMKit 架构文档

## 概述

SMKit 采用模块化、可扩展的架构设计，便于后续功能扩展和维护。

## 目录结构

```
gmkit/
├── src/                      # 源代码目录
│   ├── crypto/              # 密码算法实现（按算法分类）
│   │   ├── sm2/            # SM2 椭圆曲线算法
│   │   │   ├── index.ts    # SM2 主要功能实现
│   │   │   ├── curve.ts    # 椭圆曲线参数和工具
│   │   │   └── class.ts    # SM2 面向对象 API
│   │   ├── sm3/            # SM3 哈希算法
│   │   │   ├── index.ts    # SM3 主要功能实现
│   │   │   └── class.ts    # SM3 面向对象 API
│   │   └── sm4/            # SM4 分组密码算法
│   │       ├── index.ts    # SM4 主要功能实现
│   │       └── class.ts    # SM4 面向对象 API
│   ├── core/               # 核心工具模块
│   │   ├── utils.ts        # 通用工具函数
│   │   └── asn1.ts         # ASN.1 编解码
│   ├── types/              # 类型定义
│   │   └── constants.ts    # 常量定义
│   └── index.ts            # 主入口文件
├── demo/                    # 演示页面
│   ├── index.html          # Web 演示界面
│   └── README.md           # 演示说明
├── test/                    # 测试文件
├── dist/                    # 构建输出（gitignored）
├── README.md               # 中文文档（默认）
├── README.en.md            # 英文文档
└── package.json            # 包配置
```

## 设计原则

### 1. 模块化设计

每个算法都有独立的目录，包含：
- **index.ts**: 函数式 API 实现
- **class.ts**: 面向对象 API 实现
- **其他文件**: 算法特定的工具和参数

### 2. 分层架构

- **crypto/**: 密码算法层 - 实现具体的加密算法
- **core/**: 核心工具层 - 提供通用功能支持
- **types/**: 类型定义层 - 统一的类型和常量
- **index.ts**: 导出层 - 统一的对外接口

### 3. 可扩展性

新增算法只需：
1. 在 `crypto/` 下创建新目录
2. 实现函数式和面向对象 API
3. 在 `index.ts` 中导出

### 4. 双 API 支持

- **函数式 API**: 适合简单场景和函数式编程
- **面向对象 API**: 适合需要状态管理的复杂场景

## 核心模块说明

### crypto/sm2/

SM2 椭圆曲线公钥密码算法实现。

**主要功能**:
- 密钥对生成
- 公钥加密 / 私钥解密
- 数字签名 / 签名验证

**特点**:
- 已准备好集成 @noble/curves 库的架构
- 支持自定义曲线参数
- 完整的中文注释

### crypto/sm3/

SM3 密码哈希算法实现。

**主要功能**:
- 消息摘要计算
- HMAC 实现

**特点**:
- 纯 TypeScript 实现
- 高性能的位操作
- 详细的中文注释

### crypto/sm4/

SM4 分组密码算法实现。

**主要功能**:
- ECB、CBC 模式加解密
- 多种填充模式支持

**特点**:
- 完整的 S盒实现
- 支持多种工作模式
- 清晰的中文注释

### core/

核心工具模块，提供通用功能。

**包含**:
- `utils.ts`: 字节转换、XOR 运算等
- `asn1.ts`: ASN.1 编解码工具

### types/

类型定义和常量。

**包含**:
- 密码模式常量
- 填充模式常量  
- SM2 密文模式
- OID 定义

## 使用示例

### 函数式 API

```typescript
import { digest, sm4Encrypt, generateKeyPair } from 'gmkit';

// SM3 哈希
const hash = digest('Hello, World!');

// SM4 加密
const key = '0123456789abcdeffedcba9876543210';
const encrypted = sm4Encrypt(key, 'secret message');

// SM2 密钥生成
const keyPair = generateKeyPair();
```

### 面向对象 API

```typescript
import { SM2, SM3, SM4 } from 'gmkit';

// SM3 哈希
const sm3 = new SM3();
sm3.update('Hello');
sm3.update(' World!');
const hash = sm3.digest();

// SM4 加密
const sm4 = new SM4(key, { mode: 'CBC', iv });
const encrypted = sm4.encrypt('secret message');

// SM2 签名
const sm2 = SM2.generateKeyPair();
const signature = sm2.sign('message');
const isValid = sm2.verify('message', signature);
```

## 未来扩展计划

1. **完整的 @noble/curves 集成**
   - 使用 @noble/curves 实现真实的椭圆曲线运算
   - 提升 SM2 算法性能和安全性

2. **更多国密算法**
   - SM9: 标识密码算法
   - ZUC: 祖冲之序列密码算法

3. **性能优化**
   - WebAssembly 加速
   - Web Worker 支持

4. **更多功能**
   - 流式哈希计算
   - 密钥导出格式（PEM、DER）
   - 更多工作模式（CTR、GCM）

## 贡献指南

1. 遵循现有的目录结构
2. 保持代码的模块化和可测试性
3. 添加完整的中文注释
4. 编写充分的单元测试
5. 更新相关文档

## 技术栈

- **TypeScript**: 类型安全的开发体验
- **Vite**: 快速的构建工具
- **Vitest**: 现代化的测试框架
- **@noble/curves**: 准备集成的椭圆曲线库
- **@noble/hashes**: 准备集成的哈希库

## 许可证

Apache 2.0
