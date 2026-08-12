import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(docsRoot, '..', '..');
const failures = [];

async function requireFile(file, label) {
  try {
    if (!(await stat(file)).isFile()) failures.push(`${label} 不是文件: ${file}`);
  } catch {
    failures.push(`${label} 不存在: ${file}`);
  }
}

function publicExportNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/^export\s+(?:declare\s+)?(?:const|let|var|function|class|interface|enum|type)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/^export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"][^'"]+['"];?/gm)) {
    for (const entry of match[1].split(',')) {
      const cleaned = entry.trim().replace(/^type\s+/, '');
      if (!cleaned) continue;
      names.add(cleaned.split(/\s+as\s+/).at(-1));
    }
  }
  return [...names].sort();
}

function collectNames(value, names = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectNames(entry, names);
  } else if (value && typeof value === 'object') {
    if (typeof value.name === 'string') names.add(value.name);
    for (const entry of Object.values(value)) collectNames(entry, names);
  }
  return names;
}

function commentSummary(comment) {
  return (comment?.summary ?? []).map(({ text = '' }) => text).join('').trim();
}

function blockTagText(comment, tag) {
  return (comment?.blockTags ?? [])
    .filter((entry) => entry.tag === tag)
    .flatMap((entry) => entry.content ?? [])
    .map(({ text = '' }) => text)
    .join('')
    .trim();
}

function isVoidType(type) {
  return type?.type === 'intrinsic' && (type.name === 'void' || type.name === 'never');
}

function requiresFailureDocumentation(signature) {
  if ((signature.parameters?.length ?? 0) === 0) return false;
  return /encrypt|decrypt|sign|verify|digest|hmac|keystream|exchange|decode|random|keypair/i.test(signature.name);
}

function requiresSemanticRemarks(reflection, parents) {
  if (reflection.variant !== 'signature') return false;
  // TypeDoc 会把继承方法投影到每个 SHA 类；强制每个投影签名重复写 remarks
  // 没有额外信息。这里只对全局配置和确实有协议边界的 setter 设门禁。
  if (/^(configureRNG|setCustomRNG|setTextCodec)$/.test(reflection.name)) return true;
  return reflection.name === 'setCurveParams';
}

function checkTypeDocSemantics(reflection, parents = []) {
  const qualifiedName = [...parents, reflection.name].filter(Boolean).join('.');
  if (reflection.variant === 'signature') {
    if (commentSummary(reflection.comment).length < 4) {
      failures.push(`TypeDoc 调用签名缺少用途摘要: ${qualifiedName}`);
    }
    for (const parameter of reflection.parameters ?? []) {
      if (commentSummary(parameter.comment).length < 2) {
        failures.push(`TypeDoc 参数缺少说明: ${qualifiedName}(${parameter.name})`);
      }
    }
    const isConstructor = reflection.kind === 16384 || parents.at(-1) === 'constructor';
    if (!isConstructor && !isVoidType(reflection.type) && !blockTagText(reflection.comment, '@returns')) {
      failures.push(`TypeDoc 非 void 调用缺少 @returns: ${qualifiedName}`);
    }
    if (requiresFailureDocumentation(reflection)) {
      const returns = blockTagText(reflection.comment, '@returns');
      const booleanFailure = reflection.type?.type === 'intrinsic'
        && reflection.type.name === 'boolean'
        && /false|失败|无效/.test(returns);
      if (!blockTagText(reflection.comment, '@throws') && !booleanFailure) {
        failures.push(`TypeDoc 密码操作缺少异常或 false 语义: ${qualifiedName}`);
      }
    }
    if (requiresSemanticRemarks(reflection, parents) && !blockTagText(reflection.comment, '@remarks')) {
      failures.push(`TypeDoc 有状态或安全边界 API 缺少 @remarks: ${qualifiedName}`);
    }
  }
  for (const child of reflection.children ?? []) checkTypeDocSemantics(child, [...parents, reflection.name]);
  for (const signature of reflection.signatures ?? []) checkTypeDocSemantics(signature, [...parents, reflection.name]);
  if (reflection.getSignature) checkTypeDocSemantics(reflection.getSignature, [...parents, reflection.name]);
  if (reflection.setSignature) checkTypeDocSemantics(reflection.setSignature, [...parents, reflection.name]);
}

const rootPackage = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
const tsPackage = JSON.parse(await readFile(path.join(repoRoot, 'packages', 'ts', 'package.json'), 'utf8'));
const docsPackage = JSON.parse(await readFile(path.join(docsRoot, 'package.json'), 'utf8'));
const catalogSchema = JSON.parse(await readFile(path.join(docsRoot, 'catalog', 'package.schema.json'), 'utf8'));
const catalog = JSON.parse(await readFile(path.join(docsRoot, 'catalog', 'packages.json'), 'utf8'));
const packageIds = new Set();
const tagPrefixes = new Set();
const coordinates = new Set();
const packageEntrySchema = catalogSchema.$defs?.packageEntry;
const requiredCatalogFields = packageEntrySchema?.required ?? [];
const allowedCatalogFields = new Set(Object.keys(packageEntrySchema?.properties ?? {}));
const siteRoutePattern = new RegExp(catalogSchema.$defs?.siteRoute?.pattern ?? '^/');

if (catalog.schemaVersion !== catalogSchema.properties?.schemaVersion?.const) {
  failures.push(
    `包目录 schemaVersion 不支持: catalog=${catalog.schemaVersion}, schema=${catalogSchema.properties?.schemaVersion?.const ?? '<missing>'}`,
  );
}
if (!Array.isArray(catalog.packages) || catalog.packages.length === 0) {
  failures.push('包目录 packages 必须是非空数组');
}

function routeSourceCandidates(route) {
  const relative = route.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');
  return [
    path.join(docsRoot, `${relative}.md`),
    path.join(docsRoot, relative, 'README.md'),
  ];
}

async function requireSourceRoute(route, label) {
  const candidates = routeSourceCandidates(route);
  const checks = await Promise.all(candidates.map(async (candidate) => {
    try { return (await stat(candidate)).isFile(); } catch { return false; }
  }));
  if (!checks.some(Boolean)) failures.push(`${label} 路由没有对应文档源码: ${route}`);
}

for (const entry of catalog.packages ?? []) {
  if (packageIds.has(entry.id)) failures.push(`包目录 id 重复: ${entry.id}`);
  packageIds.add(entry.id);

  for (const field of requiredCatalogFields) {
    if (entry[field] === undefined || entry[field] === '') failures.push(`包目录 ${entry.id ?? '<unknown>'} 缺少 ${field}`);
  }
  for (const field of Object.keys(entry)) {
    if (!allowedCatalogFields.has(field)) failures.push(`包目录 ${entry.id ?? '<unknown>'} 包含未知字段 ${field}`);
  }

  if (!/^[a-z][a-z0-9-]*$/.test(entry.id ?? '')) failures.push(`包目录 id 格式错误: ${entry.id}`);
  if (!/^\d+\.\d+\.\d+$/.test(entry.version ?? '')) failures.push(`包目录 ${entry.id} 版本格式错误: ${entry.version}`);
  if (!/^[a-z][a-z0-9-]*-v$/.test(entry.tagPrefix ?? '')) failures.push(`包目录 ${entry.id} tagPrefix 格式错误: ${entry.tagPrefix}`);
  if (tagPrefixes.has(entry.tagPrefix)) failures.push(`包目录 tagPrefix 重复: ${entry.tagPrefix}`);
  tagPrefixes.add(entry.tagPrefix);

  const allowedStatuses = packageEntrySchema?.properties?.status?.enum ?? [];
  if (!allowedStatuses.includes(entry.status)) failures.push(`包目录 ${entry.id} status 不支持: ${entry.status}`);

  const entryCoordinates = Array.isArray(entry.coordinates) ? entry.coordinates : [entry.coordinates];
  if (entryCoordinates.length === 0 || entryCoordinates.some((coordinate) => typeof coordinate !== 'string' || coordinate.length === 0)) {
    failures.push(`包目录 ${entry.id} coordinates 必须是非空字符串或非空字符串数组`);
  }
  for (const coordinate of entryCoordinates) {
    if (coordinates.has(coordinate)) failures.push(`包目录制品坐标重复: ${coordinate}`);
    coordinates.add(coordinate);
  }

  if (!Array.isArray(entry.capabilities) || entry.capabilities.length === 0) {
    failures.push(`包目录 ${entry.id} capabilities 必须是非空数组`);
  } else if (new Set(entry.capabilities).size !== entry.capabilities.length) {
    failures.push(`包目录 ${entry.id} capabilities 包含重复项`);
  }

  for (const field of ['guide', 'manual', 'api']) {
    if (!siteRoutePattern.test(entry[field] ?? '')) failures.push(`包目录 ${entry.id} ${field} 不是合法站内路由: ${entry[field]}`);
  }
  if (entry.api !== `/api/${entry.id}/latest/`) {
    failures.push(`包目录 ${entry.id} api 路径错误: ${entry.api}`);
  }
  await requireSourceRoute(entry.guide, `包目录 ${entry.id} guide`);
  await requireSourceRoute(entry.manual, `包目录 ${entry.id} manual`);
}

const tsCatalog = catalog.packages.find(({ id }) => id === 'typescript');
const javaCatalog = catalog.packages.find(({ id }) => id === 'java');
if (tsCatalog?.version !== tsPackage.version || tsPackage.version !== rootPackage.version || docsPackage.version !== rootPackage.version) {
  failures.push(`TypeScript/workspace 版本不一致: catalog=${tsCatalog?.version}, package=${tsPackage.version}, docs=${docsPackage.version}, root=${rootPackage.version}`);
}

const javaPom = await readFile(path.join(repoRoot, 'packages', 'java', 'pom.xml'), 'utf8');
const javaVersion = javaPom.match(/<artifactId>gmkit-parent<\/artifactId>\s*<version>([^<]+)<\/version>/)?.[1];
if (!javaVersion || javaCatalog?.version !== javaVersion) {
  failures.push(`Java 版本不一致: catalog=${javaCatalog?.version}, pom=${javaVersion ?? '<missing>'}`);
}

const tsJsonPath = path.join(docsRoot, '.vuepress', 'api-typescript.json');
const tsReflection = JSON.parse(await readFile(tsJsonPath, 'utf8'));
const documentedNames = collectNames(tsReflection);
const tsEntry = await readFile(path.join(repoRoot, 'packages', 'ts', 'src', 'index.ts'), 'utf8');
for (const exported of publicExportNames(tsEntry)) {
  if (!documentedNames.has(exported)) failures.push(`TypeDoc 缺少公开导出: ${exported}`);
}
for (const reflection of tsReflection.children ?? []) checkTypeDocSemantics(reflection);

const manualCoverage = JSON.parse(await readFile(path.join(docsRoot, 'api', 'manual-coverage.json'), 'utf8'));
if (manualCoverage.schemaVersion !== 2
    || manualCoverage.memberCoverage?.typescript !== 'typedoc-public-members') {
  failures.push('公共 API 覆盖数据未启用 TypeScript 成员级检查');
}

for (const [language, pages] of Object.entries(manualCoverage.semanticCoverage ?? {})) {
  if (!pages || typeof pages !== 'object' || Array.isArray(pages)) {
    failures.push(`公共 API 语义覆盖清单格式错误: ${language}`);
    continue;
  }
  for (const [relativePage, terms] of Object.entries(pages)) {
    if (!Array.isArray(terms) || terms.length === 0) {
      failures.push(`公共 API 语义覆盖清单为空: ${relativePage}`);
      continue;
    }
    let content;
    try {
      content = await readFile(path.join(docsRoot, relativePage), 'utf8');
    } catch {
      failures.push(`公共 API 语义覆盖页面不存在: ${relativePage}`);
      continue;
    }
    for (const term of terms) {
      if (typeof term !== 'string' || term.length === 0 || !content.includes(term)) {
        failures.push(`${relativePage} 缺少语义说明主题: ${term}`);
      }
    }
  }
}
const tsManualPage = new Map();
const tsManualContents = new Map();
for (const [relativePage, symbols] of Object.entries(manualCoverage.typescript ?? {})) {
  const content = await readFile(path.join(docsRoot, relativePage), 'utf8');
  tsManualContents.set(relativePage, content);
  for (const symbol of symbols) tsManualPage.set(symbol, relativePage);
}
for (const reflection of tsReflection.children ?? []) {
  const relativePage = tsManualPage.get(reflection.name);
  const content = tsManualContents.get(relativePage);
  if (!relativePage || !content) continue;
  for (const member of reflection.children ?? []) {
    const memberName = member.name === 'constructor' ? reflection.name : member.name;
    if (!new RegExp(`\\b${memberName.replaceAll('$', '\\$')}\\b`).test(content)) {
      failures.push(`${relativePage} 缺少 TypeScript 公共成员: ${reflection.name}.${member.name}`);
    }
  }
}

const publicApi = path.join(docsRoot, '.vuepress', 'public', 'api');
for (const entry of catalog.packages ?? []) {
  const apiIndex = path.join(docsRoot, '.vuepress', 'public', entry.api.replace(/^\//, ''), 'index.html');
  await requireFile(apiIndex, `${entry.name} 主线签名索引首页`);
}
await requireFile(path.join(publicApi, 'typescript', 'latest', 'index.html'), 'TypeDoc 首页');
await requireFile(path.join(publicApi, 'java', 'latest', 'index.html'), 'Javadoc 首页');
await requireFile(path.join(publicApi, 'java', 'latest', 'cn', 'gmkit', 'sm2', 'SM2.html'), 'SM2 Javadoc');
await requireFile(path.join(publicApi, 'java', 'latest', 'cn', 'gmkit', 'sm3', 'SM3.html'), 'SM3 Javadoc');
await requireFile(path.join(publicApi, 'java', 'latest', 'cn', 'gmkit', 'sm4', 'SM4.html'), 'SM4 Javadoc');
await requireFile(path.join(publicApi, 'java', 'latest', 'cn', 'gmkit', 'zuc', 'ZUC.html'), 'ZUC Javadoc');
await requireFile(path.join(publicApi, 'java', 'latest', 'cn', 'gmkit', 'sm9', 'SM9.html'), 'SM9 Javadoc');
await requireFile(path.join(publicApi, 'manifest.json'), 'API 生成清单');
const apiManifest = JSON.parse(await readFile(path.join(publicApi, 'manifest.json'), 'utf8'));
const tsSummary = apiManifest.packages?.find(({ id }) => id === 'typescript')?.apiSummary;
const javaSummary = apiManifest.packages?.find(({ id }) => id === 'java')?.apiSummary;
if (tsSummary?.typescriptRootExports !== publicExportNames(tsEntry).length) {
  failures.push(`API 清单 TypeScript 导出数量不一致: manifest=${tsSummary?.typescriptRootExports ?? '<missing>'}, source=${publicExportNames(tsEntry).length}`);
}

// 生成 API 与中文详解分离：每个公开成员必须在对应手册 API 页面出现，
// 但构造器和 setter 的默认值、状态变化等语义由页面正文负责维护。
const requiredApiPageFiles = [
  ...Object.keys(manualCoverage.typescript ?? {}),
  ...Object.keys(manualCoverage.java ?? {}),
];
for (const relativePage of requiredApiPageFiles) {
  if (!relativePage.startsWith('manual/') || !relativePage.includes('/api/')) {
    failures.push(`API 手册页面必须位于 manual/<language>/api/: ${relativePage}`);
  }
}
if (!Number.isSafeInteger(javaSummary?.javaPublicTypes) || javaSummary.javaPublicTypes <= 0) {
  failures.push('API 清单缺少 Java 公共顶层类型统计');
}
const versionsPath = path.join(publicApi, 'versions.json');
await requireFile(versionsPath, 'API 版本清单');
const versionsManifest = JSON.parse(await readFile(versionsPath, 'utf8'));
for (const entry of versionsManifest.packages ?? []) {
  if (!packageIds.has(entry.id)) failures.push(`API 版本清单包含未知包: ${entry.id}`);
  for (const version of entry.versions ?? []) {
    if (!/^\d+\.\d+\.\d+$/.test(version.version)) {
      failures.push(`API 版本清单包含非稳定版本: ${entry.id} ${version.version}`);
    }
    if (version.url !== `/api/${entry.id}/versions/${version.version}/`) {
      failures.push(`API 版本清单 URL 错误: ${entry.id} ${version.version}`);
    }
  }
}
for (const id of packageIds) {
  const entry = versionsManifest.packages?.find((candidate) => candidate.id === id);
  if (!entry || !Array.isArray(entry.versions) || entry.versions.length === 0) {
    failures.push(`API 版本清单缺少已发布版本: ${id}`);
  }
}

if (failures.length > 0) {
  console.error('[docs-api-check] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[docs-api-check] PASS: ${publicExportNames(tsEntry).length} 个 TypeScript 顶层导出，Java/SM9 聚合 Javadoc 已生成`);
