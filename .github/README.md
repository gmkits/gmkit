# GitHub Workflows 配置说明

## EdgeOne CDN 缓存刷新配置

本项目使用腾讯云 EdgeOne CDN 服务，支持国内站和国际站的缓存刷新。

### 需要配置的 GitHub Secrets

为了使 EdgeOne 缓存刷新功能正常工作，需要在 GitHub 仓库的 Settings -> Secrets and variables -> Actions 中配置以下 secrets：

#### 腾讯云 API 凭证（通用）

- `TENCENT_SECRET_ID`: 腾讯云 API 密钥 ID
- `TENCENT_SECRET_KEY`: 腾讯云 API 密钥 Key

> 获取方式：登录腾讯云控制台 -> 访问管理 -> API密钥管理
> 文档：https://console.cloud.tencent.com/cam/capi

#### EdgeOne Zone ID（分站点配置）

- `EDGEONE_ZONE_ID_CN`: 国内站 EdgeOne 站点 ID（例如：zone-xxx，对应域名 gmkit.cn）
- `EDGEONE_ZONE_ID_GLOBAL`: 国际站 EdgeOne 站点 ID（例如：zone-yyy，对应域名 gmkit.com）

> 获取方式：登录腾讯云控制台 -> EdgeOne -> 站点列表 -> 选择对应站点查看站点 ID
> 文档：https://console.cloud.tencent.com/edgeone

### 工作流程

当代码推送到 `main` 分支且影响 `docs/**` 目录时：

1. 构建 VuePress 文档站点
2. 部署到香港（HK）源站服务器
3. 部署到中国大陆（CN）源站服务器
4. 刷新国内站 EdgeOne CDN 缓存（gmkit.cn）
5. 刷新国际站 EdgeOne CDN 缓存（gmkit.com）

### 技术说明

- 使用腾讯云官方 CLI (`tccli`) 进行 EdgeOne 缓存刷新
- 国内站使用 `ap-guangzhou` 区域端点
- 国际站使用 `ap-singapore` 区域端点（通过 `--endpoint` 参数指定）
- 使用 `purge_host` 类型进行主机级别的完整缓存刷新
- 分别为国内站和国际站配置不同的 Zone ID 和域名，实现双站点缓存刷新
- 参考文档：https://cloud.tencent.com/document/product/1552/80703

### 参数说明

- `Type`: 刷新类型，使用 `purge_host` 进行主机级别刷新
- `Targets`: 需要刷新的域名列表（JSON 数组格式）
  - 国内站：`["gmkit.cn"]`
  - 国际站：`["gmkit.com"]`
- `region`: API 区域
  - 国内站：`ap-guangzhou`
  - 国际站：通过 `--endpoint` 指定 `teo.ap-singapore.tencentcloudapi.com`

### 故障排查

如果缓存刷新失败，请检查：

1. GitHub Secrets 是否正确配置
2. 腾讯云 API 密钥是否有效且具有 EdgeOne 操作权限
3. Zone ID 是否正确对应目标站点
4. EdgeOne 站点状态是否正常
