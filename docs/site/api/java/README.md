---
title: Java 生成签名索引
description: 由 Maven Javadoc 从 GMKit Java 公共类型生成的 Java 签名和成员索引。
pageInfo: false
contributors: false
editLink: false
icon: coffee
category:
  - API 说明书
  - Java
tag:
  - Javadoc
  - 生成索引
---

# Java 生成签名索引

本页是 Javadoc 生成签名索引的入口。它只反映本次构建中 `gmkit` 与 `gmkit-sm9` 的 public 类型和成员，不替代中文手册中的接入步骤、协议边界和 native 运行要求。

## 中文 API 说明

请阅读 [Java API 详解](/manual/java/api/)。该目录按 core、SM2、SM3、SM4、ZUC、SM9 和组合工具组织，说明重载差异、默认值、异常、PEM 和资源生命周期。

## 生成内容

当前版本的完整签名索引由站点构建生成。历史版本从对应 `java-vX.Y.Z` tag 重新生成，版本清单位于 [API 说明书](/api/#已发布版本签名索引)。

Javadoc 页面用于核对 Java 签名和成员；SM9 的固定 GmSSL reference、JNI 行为和五平台消费测试分别代表不同验证证据，不能混为一个结论。
