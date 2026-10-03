import { defineUserConfig } from 'vuepress';
import { hopeTheme } from 'vuepress-theme-hope';
import { viteBundler } from '@vuepress/bundler-vite';

const hiddenContributors = new Set(['Copilot', 'copilot-swe-agent[bot]']);

const contributorInfo = [
  {
    username: 'yulin',
    name: 'mumu',
    alias: ['mumu', 'linyuliu', 'yulin'],
    emailAlias: ['yulin.1996@foxmail.com'],
  },
];

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'GMKit',
  description: 'GMKit Java、TypeScript、协议边界与扩展包文档',
  base: '/',

  bundler: viteBundler({
    viteOptions: {
      build: {
        rolldownOptions: {
          // 构建警告必须处理后再发布，不能靠日志过滤掩盖缺失导出或打包异常。
          onwarn(warning) {
            throw new Error(`[docs-build] ${warning.code ?? 'WARNING'}: ${warning.message}`);
          },
        },
      },
    },
  }),

  plugins: [],
  theme: hopeTheme({
    hostname: 'https://gmkit.cn',

    repo: 'gmkits/gmkit',
    docsDir: 'docs/site',
    docsBranch: 'main',

    navbar: [
      { text: '快速入门', link: '/guide/' },
      {
        text: '使用手册',
        children: [
          { text: '手册阅读路径', link: '/manual/' },
          { text: 'TypeScript 使用手册', link: '/manual/typescript/' },
          { text: 'Java 使用手册', link: '/manual/java/' },
          { text: '跨语言协议接入', link: '/manual/interoperability' },
          { text: '旧系统迁移', link: '/manual/migration' },
        ],
      },
      {
        text: 'API 说明书',
        children: [
          { text: 'TypeScript 说明书', link: '/api/typescript/' },
          { text: 'Java 说明书', link: '/api/java/' },
          { text: '公共约定', link: '/api/common' },
          { text: 'API 总览', link: '/api/' },
          { text: '已发布版本签名索引', link: '/api/#已发布版本签名索引' },
        ],
      },
      {
        text: '算法与标准',
        children: [
          { text: '算法能力总览', link: '/algorithms/' },
          { text: 'SM2', link: '/algorithms/SM2' },
          { text: 'SM3', link: '/algorithms/SM3' },
          { text: 'SM4', link: '/algorithms/SM4' },
          { text: 'ZUC', link: '/algorithms/ZUC' },
          { text: 'SM9', link: '/algorithms/SM9' },
          { text: 'SHA', link: '/algorithms/SHA' },
          { text: '协议与标准', link: '/standards/' },
        ],
      },
      {
        text: '集成与扩展',
        children: [
          { text: '集成示例', link: '/integrations/' },
          { text: '扩展包', link: '/extensions/' },
          { text: '扩展包接入契约', link: '/extensions/package-contract' },
          { text: '文档交付清单', link: '/extensions/documentation-checklist' },
        ],
      },
      { text: '项目维护', link: '/maintenance/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门路径',
          children: [
            '/guide/',
            { text: '接入环境与验收', link: '/guide/getting-started' },
            '/guide/typescript',
            '/guide/java',
          ],
        },
        {
          text: '设计与上线',
          children: [
            '/guide/about-guomi',
            '/guide/security',
            '/guide/troubleshooting',
          ],
        },
      ],
      '/manual/': [
        {
          text: '阅读路径',
          children: [
            '/manual/',
            '/manual/interoperability',
            '/manual/migration',
          ],
        },
        {
          text: 'TypeScript 使用手册',
          children: [
            '/manual/typescript/',
            '/manual/typescript/data',
            '/manual/typescript/sm2',
            '/manual/typescript/digest-hmac',
            '/manual/typescript/sm4',
            '/manual/typescript/zuc',
            '/manual/typescript/advanced',
            {
              text: 'TypeScript API 详解',
              collapsible: true,
              children: [
                '/manual/typescript/api/',
                '/manual/typescript/api/common',
                '/manual/typescript/api/sm2',
                '/manual/typescript/api/sm3',
                '/manual/typescript/api/sm4',
                '/manual/typescript/api/zuc',
                '/manual/typescript/api/sha',
              ],
            },
          ],
        },
        {
          text: 'Java 使用手册',
          children: [
            '/manual/java/',
            '/manual/java/core',
            '/manual/java/sm2',
            '/manual/java/sm3',
            '/manual/java/sm4',
            '/manual/java/zuc',
            '/manual/java/sm9',
            '/manual/java/hybrid',
            {
              text: 'Java API 详解',
              collapsible: true,
              children: [
                '/manual/java/api/',
                '/manual/java/api/core',
                '/manual/java/api/sm2',
                '/manual/java/api/sm3',
                '/manual/java/api/sm4',
                '/manual/java/api/zuc',
                '/manual/java/api/sm9',
                { text: 'SM2 + SM4 混合加密', link: '/manual/java/api/integration' },
              ],
            },
          ],
        },
      ],
      '/api/': [
        {
          text: '公共 API',
          children: [
            '/api/',
            '/api/typescript/',
            '/api/java/',
            '/api/common',
          ],
        },
      ],
      '/api/typescript/': [
        {
          text: 'TypeScript 生成参考',
          children: [
            '/api/typescript/',
          ],
        },
      ],
      '/api/java/': [
        {
          text: 'Java 生成参考',
          children: [
            '/api/java/',
          ],
        },
      ],
      '/algorithms/': [
        {
          text: '算法与协议能力',
          children: [
            '/algorithms/',
            '/algorithms/SM2',
            '/algorithms/SM3',
            '/algorithms/SM4',
            '/algorithms/ZUC',
            '/algorithms/SM9',
            '/algorithms/SHA',
          ],
        },
      ],
      '/standards/': [
        {
          text: '协议与标准',
          children: [
            '/standards/',
            '/standards/GMT-0009-COMPLIANCE',
            '/standards/GMT-0009-快速参考',
            '/standards/interop-vectors',
          ],
        },
      ],
      '/integrations/': [
        {
          text: '集成示例',
          children: [
            '/integrations/',
            '/integrations/java-hutool',
            '/integrations/go',
            '/integrations/python',
            '/integrations/rust',
            '/integrations/web-crypto',
          ],
        },
      ],
      '/extensions/': [
        {
          text: '扩展与接入',
          children: [
            '/extensions/',
            '/extensions/package-contract',
            '/extensions/documentation-checklist',
          ],
        },
      ],
      '/maintenance/': [
        {
          text: '项目维护',
          children: [
            '/maintenance/',
            '/maintenance/architecture',
            '/maintenance/publishing',
            '/maintenance/documentation-deployment',
            '/maintenance/release-audit',
            { text: '公共 API 覆盖数据', link: '/api/public-api' },
          ],
        },
        {
          text: '性能与验证',
          children: [
            '/maintenance/performance/benchmarks',
            '/maintenance/performance/optimization',
            '/maintenance/reports/support-scope',
            '/maintenance/reports/validation-model',
            '/maintenance/reports/security-boundaries',
            '/maintenance/reports/sm2-compatibility',
          ],
        },
      ],
    },

    plugins: {
      copyCode: { showInMobile: true },
      git: {
        updatedTime: true,
        contributors: {
          info: contributorInfo,
          transform: (contributors) =>
            contributors
              .filter(
                ({ name, username }) =>
                  !hiddenContributors.has(name) && !hiddenContributors.has(username),
              )
              .sort((a, b) => b.commits - a.commits)
              .slice(0, 2),
        },
      },
      readingTime: { wordPerMinute: 200 },
      copyright: false,
      redirect: {
        config: {
          '/api/typescript/common.html': '/manual/typescript/api/common.html',
          '/api/typescript/sm2.html': '/manual/typescript/api/sm2.html',
          '/api/typescript/sm3.html': '/manual/typescript/api/sm3.html',
          '/api/typescript/sm4.html': '/manual/typescript/api/sm4.html',
          '/api/typescript/zuc.html': '/manual/typescript/api/zuc.html',
          '/api/typescript/sha.html': '/manual/typescript/api/sha.html',
          '/api/java/core.html': '/manual/java/api/core.html',
          '/api/java/sm2.html': '/manual/java/api/sm2.html',
          '/api/java/sm3.html': '/manual/java/api/sm3.html',
          '/api/java/sm4.html': '/manual/java/api/sm4.html',
          '/api/java/zuc.html': '/manual/java/api/zuc.html',
          '/api/java/sm9.html': '/manual/java/api/sm9.html',
          '/api/java/integration.html': '/manual/java/api/integration.html',
        },
      },
    },

    markdown: {
      gfm: true,
      breaks: true,
      linkify: true,
      footnote: true,
      tasklist: true,
      component: true,
      vPre: true,
      codeTabs: true,
      tabs: true,
    },
    lastUpdated: true,
    footer:
      'Apache-2.0 Licensed | Copyright © 2026 mumu | <a class="icp-link" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">备案号：京ICP备2023009505号-2</a>',
    displayFooter: true,
    author: { name: 'mumu', email: 'yulin.1996@foxmail.com' },
    metaLocales: { editLink: '在 GitHub 上编辑此页' },
  }),
});
