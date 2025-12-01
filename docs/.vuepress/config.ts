import { defineUserConfig } from 'vuepress';
import { hopeTheme } from 'vuepress-theme-hope';
import { viteBundler } from '@vuepress/bundler-vite';

import { compression, defineAlgorithm } from 'vite-plugin-compression2';
import { constants } from 'zlib';

// ❗ 新插件：取代 mdEnhancePlugin
import { markdownExtPlugin } from '@vuepress/plugin-markdown-ext';

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'GMKitX',
  description: '国密算法与国际标准的全场景 TypeScript 解决方案',
  base: '/gmkit/',

  bundler: viteBundler({
    viteOptions: {
      plugins: [
        compression({
          include: /\.(js|mjs|css|html|json|svg|map)$/i,
          threshold: 1024,
          skipIfLargerOrEqual: true,
          deleteOriginalAssets: false,
          algorithms: [
            defineAlgorithm('gzip', { level: 9 }),

            defineAlgorithm('brotliCompress', {
              params: {
                [constants.BROTLI_PARAM_QUALITY]: 11,
              },
            }),

            defineAlgorithm('zstandard', { level: 19 }),
          ],
        }),
      ],
    },
  }),

  // ===================================================================
  // 正确方式：使用 markdown-ext，而不是 mdEnhancePlugin
  // ===================================================================
  plugins: [
    markdownExtPlugin({
      // 对应旧 mdEnhance 的功能
      attrs: true,          // 属性语法
      mark: true,           // ==高亮==
      figure: true,         // 图片+标题 Figure
      footnote: true,       // 脚注
      sub: true,            // 下标
      sup: true,            // 上标
      imgLazyload: true,    // 图片懒加载
      imgSize: true,        // 图片尺寸语法
      tasklist: true,       // 任务列表
      tabs: true,           // 标签页
      codetabs: true,       // 代码标签页
      stylize: true,        // ::: tip ::: 等增强
      component: true,      // 组件 Markdown 语法
      chartjs: false,       // 如果用不到不要开
    }),
  ],

  // ===================================================================
  // hopeTheme 保持原样（确保 theme.plugins 里不要再写 mdEnhance）
  // ===================================================================
  theme: hopeTheme({
    hostname: 'https://cherryrum.github.io/gmkit',

    repo: 'CherryRum/gmkit',
    docsDir: 'docs',
    docsBranch: 'main',

    navbar: [
      { text: '首页', link: '/' },
      {
        text: '指南',
        children: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '关于国密算法', link: '/guide/about-guomi' },
        ],
      },
      {
        text: '算法文档',
        children: [
          { text: 'SM2 - 椭圆曲线公钥密码', link: '/algorithms/SM2' },
          { text: 'SM3 - 密码杂凑算法', link: '/algorithms/SM3' },
          { text: 'SM4 - 分组密码算法', link: '/algorithms/SM4' },
          { text: 'ZUC - 序列密码算法', link: '/algorithms/ZUC' },
          { text: 'SHA - 国际标准算法', link: '/algorithms/SHA' },
        ],
      },
      {
        text: '多语言实现',
        children: [
          { text: 'TypeScript / JavaScript', link: '/implementations/typescript/' },
          { text: 'Java（推荐库）', link: '/implementations/java/' },
        ],
      },
      {
        text: '开发指南',
        children: [
          { text: '架构设计', link: '/dev/ARCHITECTURE.zh-CN' },
          { text: '导入方式', link: '/dev/IMPORT_GUIDE' },
          { text: 'Hutool 集成', link: '/dev/HUTOOL-INTEGRATION.zh-CN' },
          { text: '国际算法使用', link: '/dev/INTERNATIONAL-ALGORITHMS.zh-CN' },
        ],
      },
      {
        text: '标准与性能',
        children: [
          { text: 'GMT-0009 合规性', link: '/standards/GMT-0009-COMPLIANCE' },
          { text: 'GMT-0009 快速参考', link: '/standards/GMT-0009-快速参考' },
          { text: '性能测试', link: '/performance/PERFORMANCE' },
          { text: '性能优化', link: '/performance/PERFORMANCE-OPTIMIZATIONS' },
        ],
      },
      {
        text: '技术总结',
        children: [
          { text: '项目总结', link: '/summaries/PROJECT_SUMMARY' },
          { text: '实现总结', link: '/summaries/IMPLEMENTATION_SUMMARY' },
          { text: '迁移总结', link: '/summaries/STANDARD-MIGRATION-SUMMARY' },
          { text: '安全总结', link: '/summaries/SECURITY-SUMMARY' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '快速开始',
          children: ['/guide/getting-started', '/guide/about-guomi'],
        },
      ],
      '/implementations/': [
        {
          text: '不同语言实现',
          children: ['/implementations/typescript/', '/implementations/java/'],
        },
      ],
      '/algorithms/': [
        {
          text: '国密算法',
          children: [
            '/algorithms/SM2',
            '/algorithms/SM3',
            '/algorithms/SM4',
            '/algorithms/ZUC',
          ],
        },
        {
          text: '国际标准算法',
          children: ['/algorithms/SHA'],
        },
      ],
      '/dev/': [
        {
          text: '开发指南',
          children: [
            '/dev/ARCHITECTURE.zh-CN',
            '/dev/IMPORT_GUIDE',
            '/dev/HUTOOL-INTEGRATION.zh-CN',
            '/dev/INTERNATIONAL-ALGORITHMS.zh-CN',
            '/dev/PUBLISHING',
          ],
        },
      ],
      '/standards/': [
        {
          text: '标准与合规',
          children: ['/standards/GMT-0009-COMPLIANCE', '/standards/GMT-0009-快速参考'],
        },
      ],
      '/performance/': [
        {
          text: '性能',
          children: ['/performance/PERFORMANCE', '/performance/PERFORMANCE-OPTIMIZATIONS'],
        },
      ],
      '/summaries/': [
        {
          text: '技术总结',
          children: [
            '/summaries/PROJECT_SUMMARY',
            '/summaries/IMPLEMENTATION_SUMMARY',
            '/summaries/STANDARD-MIGRATION-SUMMARY',
            '/summaries/SECURITY-SUMMARY',
          ],
        },
      ],
    },

    plugins: {
      copyCode: { showInMobile: true },
      git: true,
      readingTime: { wordPerMinute: 200 },
      copyright: false,
    },

    footer: 'Apache-2.0 Licensed | Copyright © 2025-present mumu',
    displayFooter: true,
    author: { name: 'mumu', email: 'yulin.1996@foxmail.com' },
    metaLocales: { editLink: '在 GitHub 上编辑此页' },
  }),
});
