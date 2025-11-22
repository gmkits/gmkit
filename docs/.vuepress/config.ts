import { defineUserConfig } from 'vuepress';
import { hopeTheme } from 'vuepress-theme-hope';
import { webpackBundler } from '@vuepress/bundler-webpack';

export default defineUserConfig({
  lang: 'zh-CN',
  title: 'GMKitX',
  description: '国密算法与国际标准的全场景 TypeScript 解决方案',
  base: '/gmkit/',

  bundler: webpackBundler({
    scss: {},
    sass: {},
  }),

  theme: hopeTheme({
    hostname: 'https://cherryrum.github.io/gmkit',
    
    // 网站图标
    logo: '/logo.svg',
    
    // 仓库配置
    repo: 'CherryRum/gmkit',
    repoLabel: 'GitHub',
    repoDisplay: true,
    
    // 文档目录配置
    docsDir: 'docs',
    docsBranch: 'main',
    
    // 导航栏
    navbar: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/getting-started' },
      {
        text: '算法文档',
        children: [
          { text: 'SM2 - 椭圆曲线公钥密码', link: '/algorithms/SM2' },
          { text: 'SM3 - 密码杂凑算法', link: '/algorithms/SM3' },
          { text: 'SM4 - 分组密码算法', link: '/algorithms/SM4' },
          { text: 'ZUC - 祖冲之序列密码', link: '/algorithms/ZUC' },
          { text: 'SHA - 国际标准算法', link: '/algorithms/SHA' },
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
    ],
    
    // 侧边栏
    sidebar: {
      '/guide/': [
        {
          text: '快速开始',
          children: [
            '/guide/getting-started',
            '/guide/installation',
            '/guide/quick-start',
          ],
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
          children: [
            '/algorithms/SHA',
          ],
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
          children: [
            '/standards/GMT-0009-COMPLIANCE',
            '/standards/GMT-0009-快速参考',
          ],
        },
      ],
      '/performance/': [
        {
          text: '性能',
          children: [
            '/performance/PERFORMANCE',
            '/performance/PERFORMANCE-OPTIMIZATIONS',
          ],
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
    
    // 插件配置
    plugins: {
      // Markdown 增强
      mdEnhance: {
        // 启用代码块
        codetabs: true,
        // 启用任务列表
        tasklist: true,
        // 启用图表
        mermaid: true,
        // 启用数学公式
        katex: true,
        // 启用代码演示
        demo: true,
        // 启用标记
        mark: true,
        // 启用对齐
        align: true,
        // 启用属性
        attrs: true,
        // 启用下标
        sub: true,
        // 启用上标
        sup: true,
        // 启用脚注
        footnote: true,
        // 启用图片标记
        figure: true,
        // 启用图片懒加载
        imgLazyload: true,
        // 启用图片标记
        imgMark: true,
        // 启用图片大小
        imgSize: true,
        // 启用选项卡
        tabs: true,
        // 启用提示容器
        hint: true,
      },
      
      // 代码复制
      copyCode: {
        showInMobile: true,
      },
      
      // 版权信息
      copyright: {
        author: 'yulin.1996@foxmail.com',
        license: 'Apache-2.0',
        global: true,
      },
      
      // Git 信息
      git: true,
      
      // 阅读时间
      readingTime: {
        wordPerMinute: 200,
      },
      
      // 搜索
      searchPro: {
        indexContent: true,
      },
    },
    
    // 页脚
    footer: 'Apache-2.0 Licensed | Copyright © 2024-present GMKitX',
    displayFooter: true,
    
    // 加密配置
    encrypt: {
      config: {},
    },
    
    // 作者信息
    author: {
      name: 'GMKitX Team',
      email: 'yulin.1996@foxmail.com',
    },
    
    // 页面元信息
    metaLocales: {
      editLink: '在 GitHub 上编辑此页',
    },
  }),
});
