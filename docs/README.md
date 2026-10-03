# GMKit 文档目录

`docs` 只保存文档策略、公开站点源码和可执行文档夹具，不保存 Java 或 TypeScript 算法实现。

## 目录职责

| 路径 | 职责 | 是否发布到网站 |
|:--|:--|:--:|
| `API_STABILITY.md` | 仓库级公共 API 兼容策略 | 否 |
| `specs/plans/` | Issue 推进顺序、依赖和验证证据索引；GitHub 是状态依据 | 否 |
| `site/` | VuePress 文档门户 workspace | 是 |
| `site/.vuepress/` | 站点配置、主题样式和静态资源 | 是 |
| `site/guide/` | 安装、快速开始和安全边界 | 是 |
| `site/algorithms/` | 按能力统一组织 Java 与 TypeScript 算法文档 | 是 |
| `site/api/` | API 总入口、公开清单、跨语言公共约定和覆盖映射 | 是 |
| `site/api/typescript/` | TypeScript 公共 API 说明书，按 common 与算法分册 | 是 |
| `site/api/java/` | Java 公共 API 说明书，按 core、算法、SM9 与集成分册 | 是 |
| `site/standards/` | 协议约定和验证依据 | 是 |
| `site/integrations/` | Java、Go、Python、Rust、Node 等集成说明 | 是 |
| `site/extensions/` | 后续扩展包的登记和接入规则 | 是 |
| `site/maintenance/` | 架构、发布、部署、性能和验证报告 | 是 |
| `site/examples/` | 文档示例的可执行测试夹具 | 否 |
| `site/scripts/` | API 生成、内容检查和示例测试脚本 | 否 |

TypeDoc 和 Javadoc 会生成到 `site/.vuepress/public/api/`，VuePress 构建结果位于
`site/.vuepress/dist/`。两者都是可重建产物，不提交到 Git。

## 修改规则

- 公共用法写入站点页面，仓库内部稳定性约束写入根级策略文件。
- 每个 TypeScript 根导出和 Java 公共顶层类型都必须登记到 `site/api/manual-coverage.json` 的唯一说明页。
- 新增页面时同步加入 VuePress 侧栏，并通过 `npm run docs:check`。
- 新增发布包时更新 `site/catalog/packages.json`，再登记指南、API 生成方式和测试命令。
- 示例中的版本、输入和期望结果必须可由仓库门禁复现；测试通过不等同于安全认证。

完整验证命令：

```bash
npm run docs:verify
```
