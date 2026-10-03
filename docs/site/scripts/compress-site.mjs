import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip, zstdCompress } from 'node:zlib';

// 在 VuePress 完成 SSR 和复制 API 后压缩；不占用 bundler hook，也不修改警告门禁。
// 使用中等压缩级别和有界并发，避免最高 Brotli 级别在 CI 消耗数十秒 CPU。
const algorithms = [
  { extension: 'gz', compress: promisify(gzip), options: { level: 6 } },
  { extension: 'br', compress: promisify(brotliCompress), options: { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } } },
  { extension: 'zst', compress: promisify(zstdCompress), options: { params: { [constants.ZSTD_c_compressionLevel]: 3 } } },
];

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`压缩目录不允许符号链接: ${file}`);
    if (entry.isDirectory()) files.push(...await collectFiles(file));
    else if (entry.isFile() && /\.(js|mjs|css|html|json|svg|map)$/i.test(entry.name)) files.push(file);
  }
  return files;
}

export async function compressSite(directory) {
  directory = path.resolve(directory);
  const collected = await collectFiles(directory);
  // 两个清单分别由部署步骤和快照工作流更新；绝不能让旧 sidecar 覆盖新 JSON。
  const dynamicManifests = ['deployment.json', 'api/versions.json'].map((file) => path.join(directory, file));
  for (const file of dynamicManifests) {
    for (const { extension } of algorithms) await rm(`${file}.${extension}`, { force: true });
  }
  const files = collected.filter((file) => !dynamicManifests.includes(file));
  let next = 0;
  let sidecars = 0;
  // 一次只持有四个原文件；每个 worker 内顺序压缩，磁盘或 zlib 错误直接向上抛出。
  const workers = Array.from({ length: Math.min(4, files.length) }, async () => {
    while (next < files.length) {
      const file = files[next++];
      const input = await readFile(file);
      for (const { extension, compress, options } of algorithms) {
        const output = `${file}.${extension}`;
        const packed = input.length >= 1024 ? await compress(input, options) : null;
        if (packed && packed.length < input.length) {
          await writeFile(output, packed);
          sidecars++;
        } else {
          // 保留原文件；重复执行时清除已不适用的旧副本，防止服务器返回过期内容。
          await rm(output, { force: true });
        }
      }
    }
  });
  // 失败也等待其它 worker 退出，调用者不会在后台仍写文件时开始清理或部署。
  const results = await Promise.allSettled(workers);
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
  if (errors.length) throw new AggregateError(errors, '文档压缩失败');
  return { files: files.length, sidecars };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const start = performance.now();
  const result = await compressSite(fileURLToPath(new URL('../.vuepress/dist/', import.meta.url)));
  console.log(`[docs-compress] ${result.files} files, ${result.sidecars} sidecars, ${((performance.now() - start) / 1000).toFixed(2)}s`);
}
