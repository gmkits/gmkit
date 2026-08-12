---
title: API 说明书
description: 按语言阅读 GMKit 使用说明，并从已发布版本签名索引核对历史制品。
pageInfo: false
contributors: false
editLink: false
icon: code
category:
  - API 说明书
tag:
  - API
  - TypeDoc
  - Javadoc
---

# API 说明书

按开发语言进入手写说明书，查询入口选择、参数约束、返回值、失败行为和可运行案例。只有核对历史制品的逐成员签名时，才需要版本签名索引。

<div class="doc-path-grid">
  <a class="doc-path-card" href="/api/typescript/">
    <span class="doc-path-label">npm · gmkitx</span>
    <strong>TypeScript API 说明书</strong>
    <small><ApiPackageSummary package-id="typescript" />覆盖浏览器与 Node.js 的参数、状态、默认值和失败断言。</small>
  </a>
  <a class="doc-path-card" href="/api/java/">
    <span class="doc-path-label">Maven · cn.gmkit</span>
    <strong>Java API 说明书</strong>
    <small><ApiPackageSummary package-id="java" />覆盖重载、Builder、Provider、异常和资源关闭。</small>
  </a>
  <a class="doc-path-card" href="/api/common.html">
    <span class="doc-path-label">双语言协议</span>
    <strong>公共输入与安全约定</strong>
    <small>统一 UTF-8、Hex、Base64、随机源、Provider、ASN.1 和失败语义。</small>
  </a>
  <a class="doc-path-card" href="#已发布版本签名索引">
    <span class="doc-path-label">历史制品</span>
    <strong>已发布版本签名索引</strong>
    <small>按 npm 或 Maven 制品版本核对函数、成员、字段和弃用标记。</small>
  </a>
</div>

## 查一个 API 的顺序

<ol class="doc-steps">
  <li><strong>先选语言页</strong><span>确认应该使用函数、静态工具还是保存配置的实例。</span></li>
  <li><strong>再看算法页</strong><span>核对完整签名、参数单位、编码、默认值、返回值和失败行为。</span></li>
  <li><strong>最后跑案例</strong><span>同时运行成功断言与篡改、错误身份或错误 tag 等失败断言。</span></li>
</ol>

算法总览只负责标准、协议字段和双语言差异。语言 API 页负责具体签名和案例，避免同一组参数在多处重复维护。

自动生成的签名索引会机械列出成员，但不会替应用决定 mode、padding、身份、编码、nonce 或资源生命周期，因此不作为日常阅读入口。

## 已发布版本签名索引

版本选择器只列出已经发布的快照。排查线上调用时，选择与 npm 或 Maven 制品完全相同的版本；当前源码签名由仓库构建任务校验，不在这里混入未发布内容。

<ApiVersionCatalog />

## 阅读示例的约定

- TypeScript 示例均从 `gmkitx` 根入口导入，不使用 `src/*`、`dist/*` 等深度路径。
- Java 示例只使用发布 JAR 中的 public 类型，不使用 package-private 实现。
- 示例中的 Hex 默认不带 `0x`；字符串消息默认使用 UTF-8。
- 普通案例使用同一笔订单、身份和 AAD；国标或第三方固定向量保留标准原文。
- 每个算法族至少给出成功断言和失败断言；测试通过不代表完成安全审计或产品认证。
