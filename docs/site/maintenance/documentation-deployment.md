---
title: 文档构建与部署
description: 说明 VuePress、TypeDoc、Javadoc、版本快照、链接检查和部署产物流程。
icon: cloud-upload
category:
  - 项目维护
tag:
  - VuePress
  - EdgeOne
  - GitHub Actions
---

# 文档构建与部署

文档站由 `.github/workflows/docs.yml` 构建。Pull Request 与 `main` 使用同一套 `docs:verify` 门禁和同一个站点 artifact；Pull Request 只上传 artifact，`main` 才部署。工作流变绿表示本次构建和部署检查通过，不代表算法实现通过第三方安全认证。

## 本地验证

文档工具链与 CI 统一使用 Node.js 22.12+ 和 JDK 21（设置 `JAVA_HOME`）；这是构建要求，不改变发布 Java 库的 Java 8 运行基线。旧 JDK 的 Javadoc 可能生成失效锚点，不能用缓存产物代替当前 JDK 的生成结果。

```bash
npm ci
npm run docs:verify
```

`docs:verify` 会构建 gmkitx，生成 TypeDoc 与 Java/SM9 聚合 Javadoc，检查公开 API、版本、措辞、部署契约和链接，再执行 Node、Go、Python、Rust、Hutool 示例。SM9 普通文档 lane 只做平台诊断和 native 不可用边界检查；Java Javadoc 使用 `doclint=all`，公共成员缺少参数、返回值或异常说明时会失败。SM9 真实运行证据来自专用五平台 Action。

VuePress 使用锁文件安装的工具链，Rolldown 打包警告直接使构建失败（配置依据见 [Vite build.rolldownOptions](https://vite.dev/config/build-options.html#build-rolldownoptions)）。浏览器兼容数据库的更新时间提示不属于打包器警告，应在依赖维护时单独更新。内容关键词、TypeDoc 参数标签和成员覆盖检查可以防止遗漏，但不能证明注释语义正确，仍需对照实现和可执行示例审查。

构建后链接门禁枚举全部 HTML（包括 TypeDoc/Javadoc），检查本地页面、资源和锚点；扩展名省略的路径按 `.html` 或目录首页解析，缺页不会退回 SPA 首页。此命令不访问外部站点，外链可用性不属于这项本地验证的证据。

Rust 示例默认使用临时 Cargo 缓存下载锁定依赖。若本机证书吊销服务或 registry 不可达，`docs:verify` 会失败，不自动跳过或关闭证书校验。可在 `docs/site/examples/rust` 运行 `cargo test --locked --offline`，或在运行 `docs:verify` 时显式设置 `CARGO_HOME` 指向已有缓存并设置 `CARGO_NET_OFFLINE=true`。这仍会真实编译、执行所有示例，缺少缓存即失败；报告必须注明离线依赖条件，不能声称全新依赖下载已通过。脚本不会删除外部指定的 Cargo 缓存。

## 部署顺序

1. Action 写入 `deployment.json`，记录 commit、构建时间、Action run 和 Java/TypeScript 版本。
2. 同一个 artifact 通过 rsync 部署到 CN 源站的 `/home/gmkit-site/www/`。
3. 源站检查首页、TypeDoc、Javadoc 和 `deployment.json` 中的 commit。
4. 源站验证通过后，调用中国大陆 EdgeOne 的 `CreatePurgeTask`，同时刷新 `gmkit.cn` 与 `www.gmkit.cn`。
5. 轮询 `https://gmkit.cn/deployment.json`，直到读取到本次 commit，并确认 `https://www.gmkit.cn/deployment.json` 通过 HTTPS 跳转到规范域名的同一路径。

rsync 使用 `--delay-updates --delete-delay`。latest 部署明确排除 `/api/*/versions/` 和 `/api/versions.json`，避免覆盖或删除由 tag 快照工作流维护的历史 API。

## GitHub Secrets

部署使用仓库已有的国内主机、账号、私钥和 EdgeOne 中国大陆凭据：

| Secret | 用途 |
|:--|:--|
| `USER` | 国内源站的 SSH 用户 |
| `SSH_KEY` | 部署私钥 |
| `CN_HOST` | 国内源站地址 |
| `CN_SSH_HOST_FINGERPRINT` | 可信渠道核对的 SSH `SHA256:` 主机指纹 |
| `TENCENT_SECRET_ID_CN`、`TENCENT_SECRET_KEY_CN` | EdgeOne 中国大陆 API 凭据 |
| `EDGEONE_ZONE_ID_CN` | `gmkit.cn` 所属 EdgeOne Zone |

指纹必须在可信主机控制台或云平台控制面核对，不能把首次 `ssh-keyscan` 的输出直接当作可信值。部署脚本只把与预置指纹匹配的主机公钥写入临时 `known_hosts`；缺少 secret 或指纹不匹配时直接失败。

## 手动执行

`workflow_dispatch` 默认只验证并上传 artifact。需要人工重新部署 latest 时，选择 `deploy=true`；仍会从头执行完整门禁，不复用未验证的本地构建。

EdgeOne 请求失败、限流重试耗尽、源站校验失败、CDN 未读到本次 commit，或 `www` 没有通过 HTTPS 跳转到规范域名，都会使工作流失败。`https://gmkit.cn` 是规范域名；`https://www.gmkit.cn` 只作为兼容入口，不维护第二份站点内容。

## API 版本快照

`.github/workflows/docs-api-snapshot.yml` 监听稳定的 `ts-v*`、`java-v*` 标签。工作流使用当前文档工具链 checkout 对应不可变 tag 的源码，生成单语言 API，然后只同步到：

- TypeScript：`/api/typescript/versions/<version>/`
- Java：`/api/java/versions/<version>/`

preview 或其他预发布标签不会进入 `api/versions.json`。更新版本清单前，部署脚本会通过 SSH 逐个确认清单中所有版本的 `index.html` 已存在；缺少任一快照时不会覆盖现有清单。

首次回填按以下顺序手动执行，并选择 `deploy=true`：

1. `java-v0.10.0`，`publish_manifest=false`。
2. `java-v0.10.1`，`publish_manifest=false`。
3. `ts-v0.10.1`，`publish_manifest=true`。

手动运行还可以用 `mode=latest` 与指定 `ref` 只重建某一语言的 latest API。该入口不修改版本清单，也不替代 `docs.yml` 的整站部署。
