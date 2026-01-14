---
title: IMPLEMENTATION SUMMARY
icon: file-alt
author: mumu
date: 2025-11-23
category:
  - 技术总结
tag:
  - 总结
---

# 实现总结 / Implementation Summary

# 目的
聚焦实现与交付层面的要点，确保文档与代码一致。

## 主要实现
- **打包**：`tsup` 输出 ESM/CJS/IIFE 与类型定义，IIFE 全局名为 `GMKit`。
- **依赖**：运行时仅 `@noble/curves`、`@noble/hashes`；其余为开发工具链。
- **API**：函数式导出 + 类封装；支持命名空间导出，便于 tree-shaking。
- **解码**：默认 hex，部分算法支持 base64；解密端自动识别输入格式。

## 构建与分发
- **入口**：`src/index.ts`。
- **产物**：`dist/index.js`、`dist/index.cjs`、`dist/index.global.js`。
- **CDN**：
  - unpkg: `https://unpkg.com/gmkitx@latest/dist/index.global.js`
  - jsDelivr: `https://cdn.jsdelivr.net/npm/gmkitx@latest/dist/index.global.js`

## 测试与类型
- **测试**：Vitest 覆盖核心算法路径与边界场景。
- **类型**：`tsc --noEmit` 作为发布前校验。

## 向后兼容
- 具名函数导出保持稳定（`sm2Encrypt`/`sm4Encrypt`/`digest` 等）。
- SM2 默认 userId 仍为 `DEFAULT_USER_ID`，需手动切换到 `''` 以对齐 GM/T 0009-2023。

## 后续建议
1. 补充跨语言互操作向量与性能基准。
2. 完善密钥格式（PEM/DER）与流式接口。
3. 安排第三方安全审计。

## 相关资源 / Related Resources
- [PUBLISHING.md](../dev/PUBLISHING.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
