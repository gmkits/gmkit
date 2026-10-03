---
title: 常见问题与故障排查
description: 按安装、编码、签名、AEAD、随机源、Provider 和 SM9 本地动态库分类排查 GMKit 接入问题。
icon: life-ring
order: 7
category:
  - 使用指南
tag:
  - 故障排查
  - 错误处理
  - FAQ
---

# 常见问题与故障排查

排查密码协议问题时先保留原始字节、参数和版本，不要反复尝试不同 mode 或编码直到“碰巧成功”。自动猜测只能用于兼容读取，不能替代协议定义。

## 安装或导入失败

<ApiTable label="安装与导入故障" min-width="64rem">

| 现象 | 检查 |
|:--|:--|
| Node.js 无法导入 `gmkitx` | Node.js 是否为 18+；是否从包根入口导入；lockfile 中是否安装了预期版本 |
| 浏览器报 `TextEncoder`/`TextDecoder` 缺失 | 宿主是否满足 ES2020 与 UTF-8 API；受限平台是否按说明注入 codec |
| Java 找不到算法或 Provider | 依赖树是否含主包及 Bouncy Castle；是否错误混用不同 BC 产物族 |
| Javadoc/TypeDoc 与本地签名不同 | 主线构建可能领先正式制品；选择与 npm/Maven 制品相同的版本签名快照 |

</ApiTable>

## Hex、Base64 或 UTF-8 不一致

1. 打印或断言原始字节长度，不先比较经过文本解码的内容。
2. 确认字符串是业务文本，还是 Hex/Base64 编码后的二进制。
3. 确认 Hex 是否包含 `0x`、Base64 是否使用标准填充。
4. 二进制明文使用 `*DecryptBytes` 或 Java `byte[]` 返回入口。
5. 跨语言时固定 Charset 为 UTF-8，不依赖平台默认字符集。

## SM2 验签返回 false

签名端和验签端逐项核对：

- 完全相同的消息字节；
- 完全相同的 `userId`；
- raw `r || s` 或 DER 签名格式；
- 签名外层是 Hex、Base64 还是原始字节；
- 公钥压缩/非压缩表示是否被正确解析；
- 是否有一端跳过 Z 计算或签的是预摘要。

格式或密钥非法可能抛异常；数学验签不通过通常返回 `false`。不要把两者统一吞掉后返回成功。

## SM2 解密失败

- 核对 C1C3C2/C1C2C3 排列。
- 核对密文外层 Hex/Base64。
- 检查 C1 点、公私钥是否匹配。
- C3 不一致表示完整性失败，不能返回部分明文。
- 空明文不属于当前 SM2 加密入口的有效输入。

## SM4-GCM/CCM 认证失败

认证失败通常意味着以下任一字段不同：key、nonce、AAD、ciphertext、tag、tagLength 或编码。不要只重试解密。

TypeScript GCM 当前要求 12 字节 nonce；Java 接受更宽范围。跨语言协议使用双方交集，即 12 字节。认证失败时不得处理或记录未经认证的明文。

## 随机源警告

`gmkitx` 默认 `warn` 策略会在缺少 CSPRNG 时警告并兼容运行。安全敏感环境改为 `configureRNG('strict')`，受限平台通过 `setCustomRNG()` 注入经过平台保证的随机源。

## SM9 不可用

依次记录：

1. `SM9.nativePlatform()`；
2. `SM9.nativeVersion()`；
3. `SM9.nativeLoadErrorMessage()`；
4. 当前操作系统、CPU 架构和 JAR 的精确版本；
5. 是否设置了 `gmkit.sm9.native.path`。

不受支持的平台不会自动退回纯 Java 或其他算法。完整加载顺序和支持矩阵见 [Java SM9 API](/manual/java/api/sm9.html)。

## 仍无法定位

准备最小复现时只保留非敏感测试数据，并附上：

- 语言、运行时和 GMKit 精确版本；
- 完整公开签名与所用选项；
- 输入长度、编码和协议字段，不附真实私钥或生产明文；
- 期望行为、实际异常类型和经过脱敏的消息；
- 能否通过对应固定向量。

然后对照 [算法页](/algorithms/)、[公共输入约定](/api/common.html) 和与制品版本一致的 TypeDoc/Javadoc。
