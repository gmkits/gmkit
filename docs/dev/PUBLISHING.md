---
title: 发布流程指南
icon: upload
order: 5
author: GMKitX Team
date: 2024-11-22
category:
  - 开发指南
  - 发布
tag:
  - NPM
  - 发布
  - 版本管理
---

# 发布指南 / Publishing Guide

本文档介绍如何发布 GMKit 到 NPM，以及如何使用不同的模块格式。

This document describes how to publish GMKit to NPM and how to use different module formats.

## 模块格式支持 / Module Format Support

GMKit 现在支持三种模块格式，确保在各种环境下都能正常工作：

GMKit now supports three module formats to ensure it works in various environments:

### 1. ES Module (ESM)
最现代的模块格式，支持 tree-shaking，推荐在现代 JavaScript 项目中使用。

The most modern module format with tree-shaking support, recommended for modern JavaScript projects.

```javascript
// 在现代打包工具中使用（Vite, Webpack 5+, Rollup）
// Use with modern bundlers (Vite, Webpack 5+, Rollup)
import { digest, sm4Encrypt, generateKeyPair } from 'gmkitx';

// 或导入全部
// Or import everything
import * as gmkit from 'gmkitx';
```

**文件位置 / File Location:** `dist/gmkit.js`

### 2. CommonJS (CJS)
Node.js 传统模块格式，兼容旧版 Node.js 和打包工具。

Traditional Node.js module format, compatible with older Node.js versions and bundlers.

```javascript
// 在 Node.js 或旧版打包工具中使用
// Use with Node.js or older bundlers
const { digest, sm4Encrypt, generateKeyPair } = require('gmkitx');

// 或导入全部
// Or import everything
const gmkit = require('gmkitx');
```

**文件位置 / File Location:** `dist/gmkit.cjs`

### 3. UMD (Universal Module Definition)
通用模块定义，可以直接在浏览器中通过 `<script>` 标签使用。

Universal Module Definition, can be used directly in browsers with `<script>` tags.

```html
<!-- 通过 CDN 使用（推荐） -->
<!-- Use via CDN (recommended) -->
<script src="https://unpkg.com/GMKit@latest/dist/gmkit.umd.js"></script>
<script>
  // 全局变量 GMKit 现在可用
  // Global variable GMKit is now available
  const hash = GMKit.digest('Hello, World!');
  console.log(hash);
</script>

<!-- 或使用 jsDelivr -->
<!-- Or use jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/gmkitx@latest/dist/gmkit.umd.js"></script>
```

**文件位置 / File Location:** `dist/gmkit.umd.js`

**CDN 链接 / CDN Links:**
- unpkg: `https://unpkg.com/GMKit@latest/dist/gmkit.umd.js`
- jsDelivr: `https://cdn.jsdelivr.net/npm/gmkitx@latest/dist/gmkit.umd.js`

## 发布流程 / Publishing Process

### 前置准备 / Prerequisites

1. **NPM 账号 / NPM Account**
   - 在 [npmjs.com](https://www.npmjs.com/) 注册账号
   - Register an account at [npmjs.com](https://www.npmjs.com/)

2. **生成 NPM Token / Generate NPM Token**
   - 登录 NPM 网站
   - 访问 Account Settings -> Access Tokens
   - 点击 "Generate New Token" -> "Classic Token"
   - 选择 "Automation" 类型
   - 复制生成的 token
   
   Login to NPM website, visit Account Settings -> Access Tokens, click "Generate New Token" -> "Classic Token", select "Automation" type, and copy the generated token.

3. **配置 GitHub Secret / Configure GitHub Secret**
   - 在 GitHub 仓库中，访问 Settings -> Secrets and variables -> Actions
   - 点击 "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: 粘贴你的 NPM token
   
   In your GitHub repository, go to Settings -> Secrets and variables -> Actions, click "New repository secret", set Name to `NPM_TOKEN` and paste your NPM token as Value.

### 发布步骤 / Publishing Steps

#### 1. 更新版本号 / Update Version

首先，更新 `package.json` 中的版本号，遵循[语义化版本控制](https://semver.org/)：

First, update the version in `package.json` following [Semantic Versioning](https://semver.org/):

```bash
# 补丁版本（bug 修复）/ Patch version (bug fixes)
npm version patch  # 0.1.0 -> 0.1.1

# 次要版本（新功能，向后兼容）/ Minor version (new features, backward compatible)
npm version minor  # 0.1.0 -> 0.2.0

# 主要版本（破坏性变更）/ Major version (breaking changes)
npm version major  # 0.1.0 -> 1.0.0

# 或手动编辑 package.json
# Or manually edit package.json
```

#### 2. 更新 CHANGELOG / Update CHANGELOG

在 `CHANGELOG.md` 中记录本次发布的变更：

Document the changes in `CHANGELOG.md`:

```markdown
## [0.2.0] - 2025-10-14

### Added
- UMD 模块格式支持
- CDN 使用支持（unpkg, jsDelivr）

### Changed
- 改进了打包配置
```

#### 3. 提交变更 / Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"
git push
```

#### 4. 运行预发布检查 / Run prepublish checks

在发布前执行自动化检查，确保类型检查、单元测试和构建流程全部通过：

Run the automated prepublish checks to ensure type checking, unit tests, and the production build all succeed:

```bash
npm run prepublishOnly
```

#### 5. 创建并推送标签 / Create and Push Tag

**重要：标签版本必须与 package.json 中的版本一致**

**Important: Tag version must match the version in package.json**

```bash
# 创建标签（必须以 'v' 开头）
# Create tag (must start with 'v')
git tag v0.2.0

# 推送标签到 GitHub，这将触发发布工作流
# Push tag to GitHub, this will trigger the publish workflow
git push origin v0.2.0
```

#### 6. 自动发布 / Automatic Publishing

当标签被推送后，GitHub Actions 会自动：

When the tag is pushed, GitHub Actions will automatically:

1. ✅ 检出代码 / Checkout code
2. ✅ 安装依赖 / Install dependencies
3. ✅ 运行类型检查 / Run type checking
4. ✅ 运行测试 / Run tests
5. ✅ 构建项目（生成 ESM, CJS, UMD）/ Build project (generate ESM, CJS, UMD)
6. ✅ 验证标签版本与 package.json 版本一致 / Verify tag version matches package.json
7. ✅ 发布到 NPM / Publish to NPM
8. ✅ 创建 GitHub Release / Create GitHub Release

你可以在 GitHub 仓库的 "Actions" 标签页中查看发布进度。

You can monitor the publishing progress in the "Actions" tab of your GitHub repository.

#### 7. 验证发布 / Verify Publication

发布成功后，验证包是否可用：

After successful publication, verify the package:

```bash
# 检查 NPM 上的最新版本
# Check latest version on NPM
npm view gmkit version

# 在新项目中安装测试
# Install and test in a new project
npm install gmkitx@latest

# 测试不同的导入方式
# Test different import methods
node -e "const gmkit = require('gmkitx'); console.log(gmkit.digest('test'));"
```

## 版本管理最佳实践 / Version Management Best Practices

### 语义化版本控制 / Semantic Versioning

- **MAJOR** (主版本): 不兼容的 API 变更 / Incompatible API changes
- **MINOR** (次版本): 向后兼容的新功能 / Backward-compatible new features  
- **PATCH** (补丁版本): 向后兼容的 bug 修复 / Backward-compatible bug fixes

### 预发布版本 / Pre-release Versions

对于 beta 测试或候选版本：

For beta testing or release candidates:

```bash
# Beta 版本
npm version 0.2.0-beta.1
git tag v0.2.0-beta.1
git push origin v0.2.0-beta.1

# Release Candidate
npm version 0.2.0-rc.1
git tag v0.2.0-rc.1
git push origin v0.2.0-rc.1
```

安装预发布版本：

Install pre-release versions:

```bash
npm install gmkitx@beta
npm install gmkitx@0.2.0-beta.1
```

## 故障排除 / Troubleshooting

### 版本不匹配 / Version Mismatch

如果看到 "Version mismatch" 错误：

If you see "Version mismatch" error:

```bash
# 删除本地标签
# Delete local tag
git tag -d v0.2.0

# 删除远程标签
# Delete remote tag
git push origin :refs/tags/v0.2.0

# 修正 package.json 中的版本
# Fix version in package.json

# 重新创建和推送标签
# Recreate and push tag
git tag v0.2.0
git push origin v0.2.0
```

### NPM 发布失败 / NPM Publish Failed

检查：

Check:

1. NPM_TOKEN 是否正确配置 / Is NPM_TOKEN correctly configured?
2. 你的 NPM 账号是否有发布权限 / Does your NPM account have publish permissions?
3. 包名是否已被占用 / Is the package name already taken?
4. 网络连接是否正常 / Is the network connection stable?

### 工作流未触发 / Workflow Not Triggered

确保：

Ensure:

1. 标签以 'v' 开头 / Tag starts with 'v'
2. 标签已推送到 GitHub / Tag is pushed to GitHub
3. 工作流文件位于 `.github/workflows/` 目录 / Workflow file is in `.github/workflows/` directory

## 回滚发布 / Rolling Back a Release

如果发布出现问题，可以弃用有问题的版本：

If there's an issue with a release, you can deprecate the problematic version:

```bash
# 弃用特定版本
# Deprecate a specific version
npm deprecate gmkit@0.2.0 "This version has critical bugs, please upgrade to 0.2.1"

# 或者发布一个新的修复版本
# Or publish a new patch version
npm version patch
git tag v0.2.1
git push origin v0.2.1
```

## 本地测试发布 / Local Testing Before Publishing

在正式发布前，可以本地测试打包：

Before official publishing, test the package locally:

```bash
# 构建项目
# Build the project
npm run build

# 创建本地包
# Create local package
npm pack

# 这会生成 gmkit-0.2.0.tgz 文件
# This generates a gmkit-0.2.0.tgz file

# 在另一个项目中测试安装
# Test installation in another project
npm install /path/to/gmkit-0.2.0.tgz
```

## 持续集成 / Continuous Integration

发布工作流包含完整的 CI 检查：

The publish workflow includes complete CI checks:

- ✅ 类型检查 / Type checking
- ✅ 单元测试 / Unit tests
- ✅ 构建验证 / Build verification
- ✅ 版本一致性验证 / Version consistency verification

只有所有检查通过后才会发布到 NPM。

The package is only published to NPM after all checks pass.

## 相关资源 / Related Resources

- [NPM Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
