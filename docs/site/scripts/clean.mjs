import { rm } from 'node:fs/promises';

await Promise.all([
  // 先删除构建产物，避免 Windows 在清理 Javadoc 压缩目录时遇到 ENOTEMPTY。
  rm(new URL('../.vuepress/dist', import.meta.url), { recursive: true, force: true }),
  rm(new URL('../.vuepress/.cache', import.meta.url), { recursive: true, force: true }),
  rm(new URL('../.vuepress/.temp', import.meta.url), { recursive: true, force: true }),
]);
