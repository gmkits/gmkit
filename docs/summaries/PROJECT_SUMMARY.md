---
title: 项目总结
icon: clipboard-list
order: 1
author: mumu
date: 2025-11-23
category:
  - 技术总结
  - 项目
tag:
  - 项目总结
  - 技术栈
---

# GMKitX Project Summary

> 本页用于快速了解仓库现状与边界，避免与实际实现脱节。

## 当前范围
- 算法：SM2、SM3、SM4、ZUC、SHA（SHA-1/256/384/512）。
- 形态：函数式 API + 类封装，支持命名空间导出。
- 输出：默认 hex，部分算法支持 base64。

## 构建与发布
- 打包工具：`tsup` 输出 ESM/CJS/IIFE 与类型定义。
- 产物路径：`dist/index.js`（ESM）、`dist/index.cjs`（CJS）、`dist/index.global.js`（IIFE）。
- CDN：`unpkg`/`jsDelivr` 指向 `dist/index.global.js`。

## 目录结构（节选）
```
gmkit/
├── src/
│   ├── crypto/
│   │   ├── sm2/
│   │   ├── sm3/
│   │   ├── sm4/
│   │   ├── zuc/
│   │   └── sha/
│   ├── core/
│   ├── types/
│   └── index.ts
├── demo/
├── demo-vue/
├── docs/
├── test/
└── dist/
```

## 特性概览
- **依赖**：运行时仅 `@noble/curves` 与 `@noble/hashes`。
- **同构**：Node.js 与浏览器 API 一致。
- **可拆分**：具名导出与命名空间导出均支持 tree-shaking。
- **类型**：完整 TypeScript 类型定义。

## 风险与待办
- 安全：未完成第三方审计，生产使用前需自评。
- 互操作：需要持续补充跨语言向量与边界测试。
- 文档：示例与 API 需长期保持同步。

## Known Limitations
1. **ZUC-256**：尚未实现（仅 ZUC-128）。
2. **流式状态**：SM4/ZUC 不提供内建流式状态机，分块需自行管理。
3. **密钥格式**：暂不提供 PEM/DER 导入导出封装。

## License
Apache License 2.0
