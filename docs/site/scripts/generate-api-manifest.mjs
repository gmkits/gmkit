import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(docsRoot, '..', '..');
const catalog = JSON.parse(await readFile(path.join(docsRoot, 'catalog', 'packages.json'), 'utf8'));
const output = path.join(docsRoot, '.vuepress', 'public', 'api', 'manifest.json');

// 统计数据必须来自本次生成的签名产物，避免手写 API 数量随版本漂移。
const typeDoc = JSON.parse(await readFile(path.join(docsRoot, '.vuepress', 'api-typescript.json'), 'utf8'));
const typescriptRootExports = (typeDoc.children ?? []).filter(({ name }) => name !== 'default').length;
const javaTypeSearch = await readFile(
  path.join(docsRoot, '.vuepress', 'public', 'api', 'java', 'latest', 'type-search-index.js'),
  'utf8',
);
const javaTypes = JSON.parse(javaTypeSearch.match(/typeSearchIndex = (\[.*?\]);/s)?.[1] ?? '[]');
const javaPublicTypes = javaTypes.filter(({ p, l }) => p && typeof l === 'string' && !l.includes('.')).length;

if (typescriptRootExports === 0 || javaPublicTypes === 0) {
  throw new Error('API 生成清单缺少 TypeScript 或 Java 公共类型统计');
}

const manifest = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  packages: catalog.packages.map(
    ({
      id,
      name,
      status,
      ecosystem,
      coordinates,
      version,
      tagPrefix,
      guide,
      manual,
      api,
      capabilities,
    }) => ({
      id,
      name,
      status,
      ecosystem,
      coordinates,
      version,
      tagPrefix,
      guide,
      manual,
      api,
      capabilities,
      apiSummary: {
        typescriptRootExports: id === 'typescript' ? typescriptRootExports : undefined,
        javaPublicTypes: id === 'java' ? javaPublicTypes : undefined,
      },
    }),
  ),
};

for (const entry of manifest.packages) {
  for (const [key, value] of Object.entries(entry.apiSummary)) {
    if (value === undefined) delete entry.apiSummary[key];
  }
}

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`[docs-api] API manifest written to ${path.relative(repoRoot, output)}`);
