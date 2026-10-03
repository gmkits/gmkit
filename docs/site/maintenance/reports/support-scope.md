---
title: 项目支持范围
description: 汇总 GMKit Java 与 TypeScript 当前发布制品、平台、算法和明确不支持范围。
icon: info
order: 1
category: [项目参考]
tag: [支持矩阵, TypeScript, Java]
---

# 项目支持范围

本页给出 GMKit 各发布单元的能力边界。它用于判断应该依赖哪个模块，不替代具体算法页和 API 声明。

## 发布单元

| 单元 | 使用场景 | 独立发布 | 不包含 |
|:--|:--|:--|:--|
| `gmkitx` | 浏览器、Node.js、受限 JavaScript 运行时 | npm | SM9、AES、RSA、native/WASM |
| `cn.gmkit:gmkit` | JVM 后端和 Java 应用 | Maven | SM9、native 二进制、专用 SHA 模块 |
| `cn.gmkit:gmkit-sm9` | Java SM9 API/JNI 与五平台 runtime | Maven | SM2/SM3/SM4/ZUC 通用 API |
| 技术文档 | API、协议边界和可执行示例 | GitHub Pages | 业务密钥管理方案 |
| GMKit Studio | 独立工具站 | Web 应用 | 算法包发布承诺 |

## 算法矩阵

| 算法 | TypeScript | Java | 说明 |
|:--|:--:|:--:|:--|
| SM2 | 支持 | 支持 | 加解密、签名验签、密钥交换；跨语言必须固定格式和 userId |
| SM3 | 支持 | 支持 | 摘要与 HMAC；TS 另有增量状态类 |
| SM4 | 支持 | 支持 | ECB/CBC/CTR/CFB/OFB/GCM/CCM；新协议优先 AEAD |
| ZUC-128 | 支持 | 支持 | 通用密钥流、128-EEA3、128-EIA3 |
| ZUC-256 | 不支持 | 不支持 | 不应从 ZUC-128 API 推断支持 |
| SHA-1/2 | 支持 | 使用 JDK | SHA-1 只用于旧协议兼容 |
| SM9 | 不支持 | Java/native | 单一 `gmkit-sm9` JAR 内置 GmSSL/JNI 五平台 runtime |

## 运行环境

- `gmkitx` 包声明 Node.js 18 及以上；CI 在 Node.js 18、20、22 上执行类型、测试和构建。
- Monorepo 安装和文档构建使用 Node.js 22.15 及以上。
- Java 主包保持 Java 8 API/字节码基线；CI 在 JDK 8、11、17、21、25 上测试。
- SM9 native CI 覆盖 Linux x86_64/aarch64、macOS x86_64/aarch64、Windows x86_64。未进入矩阵的平台不属于已验证范围。

## 不作出的承诺

- Java 和 TypeScript 不承诺相同 API、ABI、类结构或异常类型。
- 项目向量不等于外部标准向量；单元测试不等于第三方安全审计或产品认证。
- JavaScript 运行时不保证严格常量时间和所有敏感内存副本可清除。
- 默认 RNG 的兼容降级不具备密码学安全性；安全部署必须使用可验证的 CSPRNG。
- 工具站和跨语言示例不是密钥托管、证书信任、访问控制或防重放系统。

## 选择入口

- 浏览器或 Node.js：从 [TypeScript 快速入门](/guide/typescript.html)和 [TypeScript API 说明书](/api/typescript/)开始。
- Java 后端：从 [Java 快速入门](/guide/java.html)和对应[算法文档](/algorithms/)开始。
- 跨语言协议：先固定[互操作向量字段](/standards/interop-vectors)，再做双向测试。
- 发布评估：阅读[验证模型](/maintenance/reports/validation-model)和[安全保证边界](/maintenance/reports/security-boundaries)。
