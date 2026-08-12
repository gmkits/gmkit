---
title: TypeScript API 说明书
description: 按公共工具、SM2、SM3、SM4、ZUC 和 SHA 查阅 gmkitx 的根导出及公开成员。
pageInfo: false
contributors: false
editLink: false
icon: code
category:
  - API 说明书
  - TypeScript
tag:
  - TypeScript
  - gmkitx
  - API
---

# TypeScript API 说明书

`gmkitx` 是面向 TypeScript 和 JavaScript 的密码工具包，当前发布版为 `0.10.1`。本说明书覆盖包根入口和公开类成员，并说明选项字段、默认值、编码、状态变化和失败行为。当前导出数量由构建产物生成：<ApiPackageSummary package-id="typescript" />。

先安装并运行固定向量，确认包入口和运行环境正常。查具体方法时，可直接从下方 API 目录进入对应算法页。应用代码只从 `gmkitx` 包根导入；不要依赖仓库 `src/*` 或 Node/bundler 的 `dist/*` 深度路径。

::: warning 使用前先确认安全边界
当前发布包尚未完成独立第三方安全审计。固定向量和自动测试用于发现实现偏差，不能替代密码产品认证、协议评审、密钥管理或目标运行环境的安全评估。
:::

## 安装

```bash
npm install gmkitx@0.10.1
```

发布包要求 Node.js 18 或更高版本，同时提供 ESM、CommonJS、浏览器 IIFE 和 TypeScript 声明。项目自身的文档构建 Node 版本不改变发布包的消费边界。

<ApiTable label="gmkitx 发布入口" min-width="68rem">

| 环境 | 导入方式 | 发布文件 | 说明 |
|:--|:--|:--|:--|
| ESM / TypeScript | `import { sm3Digest } from 'gmkitx'` | `dist/index.js` | 新代码首选；包声明 `sideEffects: false` |
| CommonJS | `const { sm3Digest } = require('gmkitx')` | `dist/index.cjs` | Node 兼容入口 |
| 浏览器脚本 | `GMKit.sm3Digest('abc')` | `dist/index.global.js` | 全局对象名固定为 `GMKit` |
| 类型声明 | 自动解析 | `dist/index.d.ts` | `types` 与 `exports.types` 均指向它 |

</ApiTable>

包的公开 `exports` 只有 `gmkitx` 根入口和 `gmkitx/package.json`。IIFE 文件是 `unpkg`/`jsdelivr` 明确声明的浏览器脚本产物；这不表示其他 `dist/*` 文件都属于稳定深度导入 API。

## 30 秒确认安装正确

<!-- code-sample id="api-typescript-index-01" steps="计算摘要|固定向量断言" -->
```ts
import { sm3Digest } from 'gmkitx';

// 1. 计算摘要：使用标准输入 abc 计算 SM3。
const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
const actual = sm3Digest('abc');

// 2. 固定向量断言：摘要必须与标准结果完全一致。
if (actual !== expected) {
  throw new Error(`SM3 vector mismatch: ${actual}`);
}
```

这个固定向量同时检查包入口、UTF-8 文本路径和摘要输出，不涉及随机源。随后按 [TypeScript 使用手册](/manual/typescript/) 完成随机源、SM2 签名和 SM4-GCM 认证失败测试。

## 三种主线使用方式

### 1. 具名导出：应用代码首选

<!-- code-reference -->
```ts
import {
  CipherMode,
  getRandomBytes,
  sm2GenerateKeyPair,
  sm2Sign,
  sm2Verify,
  sm3Digest,
  sm4Decrypt,
  sm4Encrypt,
} from 'gmkitx';
```

带算法前缀的名称在调用点就能看出归属，也利于静态分析和 tree-shaking。类型使用 `import type`，避免把纯类型误当运行时值：

<!-- code-reference -->
```ts
import type { KeyPair, SM4Options } from 'gmkitx';
```

### 2. 算法命名空间：按模块组织

根入口导出五个算法对象：`sm2`、`sm3`、`sm4`、`zuc`、`sha`。每个对象聚合同算法函数和类，适合依赖注入或按算法分组。

<!-- code-sample id="api-typescript-index-04" steps="生成密钥|计算摘要|长度断言" -->
```ts
import { sm2, sm3 } from 'gmkitx';

// 1. 生成密钥：通过 SM2 命名空间取得算法入口。
const keys = sm2.generateKeyPair();

// 2. 计算摘要：通过 SM3 命名空间计算 abc 的摘要。
const digest = sm3.digest('abc');

// 3. 长度断言：SM3 的 Hex 输出固定为 64 个字符。
if (digest.length !== 64) throw new Error('SM3 output length mismatch');
```

命名空间中的短名称不是弃用别名。例如 `sm2.sign`、`sm3.digest` 是正常成员；只有包根的无算法前缀 `sign`、`digest` 等旧名称被弃用。

### 3. 类：保存配置或增量状态

<!-- code-reference -->
```ts
import { SM2, SM3, SM4, SHA256, ZUC } from 'gmkitx';
```

<ApiTable label="TypeScript 类的状态用途" min-width="66rem">

| 类 | 保存什么 | 复用时要注意什么 |
|:--|:--|:--|
| `SM2` | 可选私钥、公钥 | 实例可能持有长期密钥；身份和签名格式仍按每次调用传入 |
| `SM3` | 增量摘要状态、输出格式 | `digest()` 后自动清空消息状态，输出格式保留 |
| `SM4` | key、mode、padding、IV/nonce | 不自动更换 nonce；GCM/CCM/CTR 复用前必须更新 IV |
| `ZUC` | key、IV | 每次运算从同一 key/IV 起点重建；不会自动推进或换 IV |
| `SHA256/384/512` | 增量摘要状态、输出格式 | `digest()` 后自动清空消息状态 |

</ApiTable>

可变类不要跨异步任务共享。具体构造器、setter、reset 和生命周期见对应算法页。

## 浏览器脚本

不经过 bundler 时可加载固定版本的 IIFE：

```html
<script src="https://cdn.jsdelivr.net/npm/gmkitx@0.10.1/dist/index.global.js"></script>
<script>
  // 1. 准备固定向量：浏览器样例使用公开的 SM3 abc 结果。
  const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';

  // 2. 计算摘要：IIFE 构建通过全局 GMKit 对象调用 SM3。
  const actual = GMKit.sm3Digest('abc');

  // 3. 固定向量断言：结果不一致时立即终止页面自检。
  if (actual !== expected) throw new Error('SM3 browser vector mismatch');
</script>
```

生产页面固定完整版本，不使用浮动版本 URL。还应设置合适的 CSP，并按部署流程校验第三方脚本完整性；页面脚本一旦遭到 XSS，JavaScript 中的明文和密钥都可能被读取。

## 运行环境检查

现代 Node 和浏览器通常已有 UTF-8 与 Web Crypto。受限小程序需要在应用启动时检查并注入宿主能力：

<!-- code-sample id="api-typescript-index-08" steps="启用严格随机策略|检查密码能力|检查文本能力" -->
```ts
import {
  configureRNG,
  getEnvReport,
  hasCustomRNG,
} from 'gmkitx';

// 1. 启用严格随机策略：没有安全随机源时禁止继续运行。
configureRNG('strict');

// 2. 检查密码能力：至少存在一个可用的安全随机源。
const env = getEnvReport();
if (!env.hasWebCrypto && !env.hasNodeCrypto && !hasCustomRNG()) {
  throw new Error('no platform CSPRNG is configured');
}

// 3. 检查文本能力：缺失原生编码器时明确记录 fallback。
if (!env.hasTextEncoder || !env.hasTextDecoder) {
  console.warn('当前宿主将使用内部 UTF-8 fallback，或需要注入 TextCodec');
}
```

`getEnvReport()` 在 Node ESM 中可能显示 `hasNodeCrypto: false`，因为该字段只探测 CommonJS `require('node:crypto')`；Node 18+ 通常同时有 `hasWebCrypto: true`。随机源与 `TextCodec` 的精确优先级见 [公共类型与工具](/api/typescript/common.html)。

## API 目录

<div class="doc-path-grid">
  <a class="doc-path-card" href="/api/typescript/common.html">
    <span class="doc-path-label">公共基础入口</span>
    <strong>公共类型与工具</strong>
    <small>格式常量、Hex/Base64、UTF-8、RNG、环境、字节和 ASN.1。</small>
  </a>
  <a class="doc-path-card" href="/api/typescript/sm2.html">
    <span class="doc-path-label">公钥密码</span>
    <strong>SM2</strong>
    <small>密钥、加解密、身份绑定签名、raw/DER、密钥交换和 SM2 类。</small>
  </a>
  <a class="doc-path-card" href="/api/typescript/sm3.html">
    <span class="doc-path-label">国密摘要</span>
    <strong>SM3</strong>
    <small>一次性摘要、HMAC、自动复用类和低层增量状态。</small>
  </a>
  <a class="doc-path-card" href="/api/typescript/sm4.html">
    <span class="doc-path-label">对称密码</span>
    <strong>SM4</strong>
    <small>七种模式、padding、GCM/CCM、tag、二进制解密和类工厂。</small>
  </a>
  <a class="doc-path-card" href="/api/typescript/zuc.html">
    <span class="doc-path-label">流密码与 3GPP</span>
    <strong>ZUC</strong>
    <small>ZUC-128、byte/word/bit 长度、EEA3、EIA3 和底层状态。</small>
  </a>
  <a class="doc-path-card" href="/api/typescript/sha.html">
    <span class="doc-path-label">国际摘要</span>
    <strong>SHA</strong>
    <small>SHA-256/384/512、HMAC、增量类和 SHA-1 旧协议边界。</small>
  </a>
</div>

上面六页覆盖包根入口和公开成员。需要按名称核对时，可查看各页末尾的“本页覆盖的公共 API”，或进入本次构建生成的 TypeDoc 签名索引。

## 输入与返回值总则

<ApiTable label="TypeScript API 总体约定" min-width="70rem">

| 情况 | 约定 | 例外或下一步 |
|:--|:--|:--|
| 消息 `string` | UTF-8 | key、IV、nonce、密文等字段按具体参数的 Hex/Base64 约定 |
| 原始二进制 | `Uint8Array` | 不要经过字符串中转 |
| 输出编码 | 没有跨算法统一默认值 | 每个函数页列出确切默认值；跨系统调用显式传格式 |
| 文本解密 | 返回 `string` | 二进制使用 `sm2DecryptBytes`、`sm4DecryptBytes`、`zucDecryptBytes` |
| SM2 验签不接受 | 返回 `false` | 0.10.1 的 TypeScript SM2 验签会把解析和参数错误一并收敛为 `false` |
| AEAD 认证失败 | 抛出 `Error` | 不返回未认证明文 |
| 其他参数错误 | 抛出 `Error` | 不使用 `null` 作为通用失败值 |

</ApiTable>

稳定协议必须保存格式、算法模式、字段长度和版本，调用时显式传 `InputFormat`、签名格式或密文排列。自动识别规则只在[旧系统迁移](/manual/migration.html#密文和签名自动识别)中使用。

## 错误处理示例

<!-- code-sample id="api-typescript-index-09" steps="准备输入|SM2 签名|SM2 验签|篡改断言" -->
```ts
import {
  sm2GenerateKeyPair,
  sm2Sign,
  sm2Verify,
} from 'gmkitx';

// 1. 准备输入：正常订单与金额被修改的订单分开保存。
const keys = sm2GenerateKeyPair();
const message = 'order=GMKIT-DEMO-0001&amount=88.00';
const receivedMessage = 'order=GMKIT-DEMO-0001&amount=99.00';

// 2. SM2 签名：签名端固定 userId 和 DER 编码。
const signature = sm2Sign(keys.privateKey, message, {
  userId: 'merchant@gmkit.cn',
  signatureFormat: 'der',
});

// 3. SM2 验签：合法但不匹配的消息返回 false，非法输入才抛错。
let verified: boolean;
try {
  verified = sm2Verify(keys.publicKey, receivedMessage, signature, {
    userId: 'merchant@gmkit.cn',
    signatureFormat: 'der',
  });
} catch (error) {
  // 非法 Hex、DER、密钥或参数进入这里；不要记录敏感输入原文。
  throw new Error('invalid SM2 verification input', { cause: error });
}

// 4. 篡改断言：金额变化后不得验证成功。
if (verified) throw new Error('tampered order must not verify');
```

实际错误边界以算法页为准。例如 SM4-GCM 的 tag 错误一定抛异常，SM2 验签对合法但不匹配的签名返回 `false`，`ZUCState` 未初始化却不会主动报错。

## 兼容导入

<details>
<summary>只在迁移整体导入的旧代码时展开</summary>

包命名空间导入会取得全部根导出：

<!-- code-sample id="api-typescript-index-06" steps="计算摘要" -->
```ts
import * as gmkit from 'gmkitx';

// 1. 计算摘要：包命名空间中使用带算法前缀的公开名称。
const digest = gmkit.sm3Digest('abc');
```

默认聚合导出为旧整体导入和 IIFE 兼容保留：

<!-- code-sample id="api-typescript-index-07" steps="计算摘要" -->
```ts
import GMKit from 'gmkitx';

// 1. 计算摘要：默认聚合导出只用于迁移旧整体导入。
const digest = GMKit.sm3Digest('abc');
```

新 ESM/CommonJS 代码使用具名导出。无算法前缀的 `sign`、`digest` 等名称和完整替代表见[旧系统迁移](/manual/migration.html#typescript-无前缀别名)。

</details>

## 已发布版本签名

本说明书解释用途、约束和案例。需要核对某个历史 npm 制品的逐成员 TypeScript 签名时，从 [已发布版本签名索引](/api/#已发布版本签名索引) 选择与 lockfile 相同的版本。

## 接下来

- [TypeScript 使用手册](/manual/typescript/)：按业务任务完成环境自检、签名和认证加密闭环
- [跨语言公共约定](/api/common.html)：统一编码、错误和安全边界
- [常见问题与故障排查](/guide/troubleshooting.html)
- [安全边界](/guide/security.html)
