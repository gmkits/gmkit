import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditCodeSamples } from './code-sample-audit.mjs';

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(docsRoot, '..', '..');
const configPath = path.join(docsRoot, '.vuepress', 'config.ts');

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.vuepress') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.name.endsWith('.md')) files.push(absolute);
  }
  return files;
}

async function publicJavaTypes(directory) {
  const types = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      types.push(...await publicJavaTypes(absolute));
      continue;
    }
    if (!entry.name.endsWith('.java')) continue;
    const source = await readFile(absolute, 'utf8');
    const match = source.match(/^public\s+(?:(?:final|abstract)\s+)?(?:class|interface|enum)\s+([A-Za-z_$][\w$]*)/m);
    const packageName = source.match(/^package\s+([A-Za-z_$][\w.$]*);/m)?.[1];
    if (match && packageName) {
      types.push({ name: match[1], fqcn: `${packageName}.${match[1]}`, source, file: absolute });
    }
  }
  return types.sort((left, right) => left.fqcn.localeCompare(right.fqcn));
}

function routeFor(file) {
  const relative = path.relative(docsRoot, file).replaceAll('\\', '/');
  if (relative === 'README.md') return '/';
  if (relative.endsWith('/README.md')) return `/${relative.slice(0, -'README.md'.length)}`;
  return `/${relative.replace(/\.md$/, '')}`;
}

function stripQueryAndHash(link) {
  return decodeURI(link.split('#')[0].split('?')[0]);
}

// 文档中的 shell 注释和示例链接不属于页面结构，扫描前先移除围栏代码块。
function stripFencedCode(content) {
  return content.replace(/^(?:```|~~~)[^\r\n]*\r?\n[\s\S]*?^(?:```|~~~)\s*$/gm, '');
}

function readFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return null;
  const title = match[1].match(/^title:\s*(.+?)\s*$/m)?.[1];
  const description = match[1].match(/^description:\s*(.+?)\s*$/m)?.[1];
  return { title, description };
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
      const parts = cleaned.split(/\s+as\s+/);
      names.add(parts.at(-1));
    }
  }

  return [...names].sort();
}

function requireMatch(content, pattern, label) {
  const value = content.match(pattern)?.[1];
  if (!value) failures.push(`无法从 ${label} 读取版本`);
  return value;
}

function requireDocumentedVersion(document, version, label) {
  if (version && !document.includes(version)) failures.push(`${label} 未声明清单版本 ${version}`);
}

function linkCandidates(source, link) {
  const cleaned = stripQueryAndHash(link);
  const base = cleaned.startsWith('/')
    ? path.join(docsRoot, cleaned.slice(1))
    : path.resolve(path.dirname(source), cleaned);
  // VuePress 的 clean URL 通常带尾斜杠，但源码页面仍然是同名 Markdown 文件。
  // 归一化后同时检查页面文件和目录 README，避免把合法路由误判为断链。
  const normalizedBase = base !== docsRoot ? base.replace(/[\\/]$/, '') : base;
  if (/\.html$/i.test(normalizedBase)) {
    const markdownBase = normalizedBase.slice(0, -'.html'.length);
    return [normalizedBase, `${markdownBase}.md`, path.join(markdownBase, 'README.md')];
  }
  // `.zh-CN` 是页面名的一部分，不是 Markdown 扩展名；只有明确的文件后缀才直接读取。
  if (/\.(?:md|png|jpe?g|gif|svg|webp|pdf|zip)$/i.test(normalizedBase)) return [normalizedBase];
  return [normalizedBase, `${normalizedBase}.md`, path.join(normalizedBase, 'README.md')];
}

const markdownFiles = await walk(docsRoot);
const config = await readFile(configPath, 'utf8');
const failures = [];
const seenCodeSampleIds = new Map();
const forbiddenClaims = [
  '生产级',
  '完全兼容',
  '完整合规',
  '绝对安全',
  '性能领先',
  '100%兼容',
  '全面支持所有',
  '完全符合',
];
const forbiddenPhrases = [
  'API Reference',
  '便利入口',
  '便利封装',
  '真正',
  '完整能力',
  '从这里开始',
  'wire format',
  '国内很少使用',
  '国内使用较少',
];

// 首页必须继承全站页脚；单页 footer 会覆盖主题配置中的备案信息。
const homePage = await readFile(path.join(docsRoot, 'README.md'), 'utf8');
const homeFrontmatter = homePage.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] ?? '';
if (/^footer:/m.test(homeFrontmatter)) {
  failures.push('docs/site/README.md: 不应覆盖全站页脚，否则备案信息不会显示');
}
if (!config.includes('https://beian.miit.gov.cn/')
    || !config.includes('京ICP备2023009505号-2')) {
  failures.push('docs/site/.vuepress/config.ts: 全站页脚缺少备案链接或备案号');
}

async function checkLocalLinks(file, content, relative) {
  const prose = stripFencedCode(content);
  const links = [
    ...[...prose.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((match) => match[1]),
    ...[...prose.matchAll(/<(?:a|area)\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]),
  ];
  for (const link of links) {
    if (/^(?:https?:|mailto:|#)/.test(link)) continue;
    // TypeDoc/Javadoc 只在构建阶段写入站点目录，不在文档源码中提交生成文件。
    if (/^\/api\/(?:typescript|java)\/(?:latest|versions\/[^/]+)(?:\/.*)?$/.test(stripQueryAndHash(link))) {
      continue;
    }
    const candidates = linkCandidates(file, link);
    const exists = await Promise.all(candidates.map(async (candidate) => {
      try { return (await stat(candidate)).isFile(); } catch { return false; }
    }));
    if (!exists.some(Boolean)) failures.push(`${relative}: 站内链接不存在 ${link}`);
  }
}

for (const file of markdownFiles) {
  const relative = path.relative(repoRoot, file).replaceAll('\\', '/');
  const content = await readFile(file, 'utf8');
  const prose = stripFencedCode(content);
  const frontmatter = readFrontmatter(content);

  failures.push(...await auditCodeSamples({
    file,
    displayPath: relative,
    content,
    readSource: (source) => readFile(source, 'utf8'),
    seenSampleIds: seenCodeSampleIds,
  }));

  if (!frontmatter) {
    failures.push(`${relative}: 缺少 YAML frontmatter`);
  } else {
    if (!frontmatter.title) failures.push(`${relative}: frontmatter 缺少 title`);
    if (!frontmatter.description || frontmatter.description.length < 12) {
      failures.push(`${relative}: frontmatter 缺少有效 description`);
    }
  }

  const quietMetaPage = relative.startsWith('docs/site/api/')
    || relative.startsWith('docs/site/manual/')
    || [
      'docs/site/guide/README.md',
      'docs/site/guide/getting-started.md',
      'docs/site/guide/typescript.md',
      'docs/site/guide/java.md',
    ].includes(relative);
  if (quietMetaPage && (!/^contributors:\s+false$/m.test(content) || !/^editLink:\s+false$/m.test(content))) {
    failures.push(`${relative}: API、手册和快速入门页只应在页尾保留更新时间`);
  }

  if (routeFor(file) !== '/') {
    const headings = [...prose.matchAll(/^#\s+(.+?)\s*$/gm)].map((match) => match[1]);
    if (headings.length !== 1) failures.push(`${relative}: 页面正文应只有一个 H1，实际为 ${headings.length}`);
  }

  for (const forbidden of [
    'github.com/CherryRum/gmkit',
    'gmkits/gmkit-java',
    'gmkit.oldletter.cn',
    'test/vectors/interop.json',
    'gmkitx@latest',
  ]) {
    if (content.includes(forbidden)) failures.push(`${relative}: 包含过期引用 ${forbidden}`);
  }

  // 文档只陈述可由固定测试、标准来源或发布制品核对的结论。
  for (const claim of forbiddenClaims) {
    if (prose.includes(claim)) failures.push(`${relative}: 包含缺少证据边界的表述 ${claim}`);
  }
  for (const phrase of forbiddenPhrases) {
    if (prose.includes(phrase)) failures.push(`${relative}: 包含需要改写的表述 ${phrase}`);
  }
  if (/\/api\/[^/\s)]+\/latest\//.test(prose)) {
    failures.push(`${relative}: 包含用户可见的 latest API 路径`);
  }

  await checkLocalLinks(file, content, relative);

  const route = routeFor(file);
  if (route !== '/' && !config.includes(`'${route}'`)) {
    failures.push(`${relative}: 未进入 VuePress 导航或侧栏`);
  }
}

// 包 README 和根级发布文档不属于 VuePress 路由，但其中的相对链接同样会展示给使用者。
for (const relative of [
  'README.md',
  'packages/ts/README.md',
  'packages/java/README.md',
  'vectors/README.md',
  'docs/API_STABILITY.md',
]) {
  const file = path.join(repoRoot, relative);
  const content = await readFile(file, 'utf8');
  const prose = stripFencedCode(content);
  await checkLocalLinks(file, content, relative);
  for (const phrase of forbiddenPhrases) {
    if (prose.includes(phrase)) failures.push(`${relative}: 包含需要改写的表述 ${phrase}`);
  }
  if (/\/api\/[^/\s)]+\/latest\//.test(prose)) {
    failures.push(`${relative}: 包含用户可见的 latest API 路径`);
  }
}

const apiDoc = await readFile(path.join(docsRoot, 'api', 'public-api.md'), 'utf8');
const publicEntry = await readFile(path.join(repoRoot, 'packages', 'ts', 'src', 'index.ts'), 'utf8');
for (const name of publicExportNames(publicEntry)) {
  if (!apiDoc.includes(`\`${name}\``)) failures.push(`api/public-api.md 缺少 TypeScript 公开 API: ${name}`);
}
const javaTypes = [];
for (const sourceRoot of [
  path.join(repoRoot, 'packages', 'java', 'gmkit', 'src', 'main', 'java'),
  path.join(repoRoot, 'packages', 'java', 'gmkit-sm9', 'src', 'main', 'java'),
]) {
  const sourceTypes = await publicJavaTypes(sourceRoot);
  javaTypes.push(...sourceTypes);
  for (const { name } of sourceTypes) {
    if (!apiDoc.includes(`\`${name}\``)) failures.push(`api/public-api.md 缺少 Java 公共类型: ${name}`);
  }
}

const manualCoveragePath = path.join(docsRoot, 'api', 'manual-coverage.json');
const manualCoverage = JSON.parse(await readFile(manualCoveragePath, 'utf8'));
if (manualCoverage.schemaVersion !== 2) {
  failures.push(`api/manual-coverage.json schemaVersion 不支持: ${manualCoverage.schemaVersion}`);
}
if (manualCoverage.memberCoverage?.typescript !== 'typedoc-public-members'
    || manualCoverage.memberCoverage?.java !== 'declared-public-members') {
  failures.push('api/manual-coverage.json 缺少双语言成员级覆盖策略');
}

async function checkManualCoverage(language, entries, expectedSymbols) {
  const assigned = new Map();
  const pages = new Map();
  for (const [relativePage, symbols] of Object.entries(entries ?? {})) {
    const page = path.join(docsRoot, relativePage);
    let content;
    try {
      content = await readFile(page, 'utf8');
      pages.set(relativePage, content);
    } catch {
      failures.push(`api/manual-coverage.json 的 ${language} 页面不存在: ${relativePage}`);
      continue;
    }
    if (!relativePage.startsWith(`manual/${language}/api/`) || !relativePage.endsWith('.md')) {
      failures.push(`api/manual-coverage.json 的 ${language} 页面路径非法: ${relativePage}`);
    }
    if (!Array.isArray(symbols) || symbols.length === 0) {
      failures.push(`api/manual-coverage.json 的 ${relativePage} 没有 API 映射`);
      continue;
    }
    for (const symbol of symbols) {
      if (assigned.has(symbol)) {
        failures.push(`api/manual-coverage.json 重复映射 ${symbol}: ${assigned.get(symbol)}, ${relativePage}`);
      }
      assigned.set(symbol, relativePage);
      const displayName = symbol.split('.').at(-1);
      if (!new RegExp(`\\b${displayName.replaceAll('$', '\\$')}\\b`).test(content)) {
        failures.push(`${relativePage} 未实际说明映射的 API: ${symbol}`);
      }
    }
  }

  const expected = new Set(expectedSymbols);
  for (const symbol of expected) {
    if (!assigned.has(symbol)) failures.push(`api/manual-coverage.json 缺少 ${language} API: ${symbol}`);
  }
  for (const symbol of assigned.keys()) {
    if (!expected.has(symbol)) failures.push(`api/manual-coverage.json 包含非公开 ${language} API: ${symbol}`);
  }
  return { assigned, pages };
}

const typescriptCoverage = await checkManualCoverage(
  'typescript',
  manualCoverage.typescript,
  publicExportNames(publicEntry),
);
const javaCoverage = await checkManualCoverage(
  'java',
  manualCoverage.java,
  javaTypes.map(({ fqcn }) => fqcn),
);

function publicJavaMemberNames({ name, source }) {
  const names = new Set();
  const constructorPattern = new RegExp(`^\\s*public\\s+${name}\\s*\\(`, 'gm');
  if (constructorPattern.test(source)) names.add(name);

  const methodPattern = /^\s*public\s+(?:(?:static|final|abstract|synchronized|native|default|strictfp)\s+)*(?:<[^\n;{}]+>\s+)?[^\n;={}]+?\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  for (const match of source.matchAll(methodPattern)) names.add(match[1]);

  const fieldPattern = /^\s*public\s+(?:(?:static|final|volatile|transient)\s+)+[^\n;={}]+?\s+([A-Za-z_$][\w$]*)\s*(?:=|;)/gm;
  for (const match of source.matchAll(fieldPattern)) names.add(match[1]);

  const enumBody = source.match(new RegExp(`public\\s+enum\\s+${name}\\s*\\{([\\s\\S]*?)(?:;|\\n})`))?.[1];
  if (enumBody) {
    for (const match of enumBody.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*(?:,|\()/gm)) names.add(match[1]);
  }
  return [...names].sort();
}

for (const javaType of javaTypes) {
  const relativePage = javaCoverage.assigned.get(javaType.fqcn);
  const content = javaCoverage.pages.get(relativePage);
  if (!relativePage || !content) continue;
  for (const member of publicJavaMemberNames(javaType)) {
    if (!new RegExp(`\\b${member.replaceAll('$', '\\$')}\\b`).test(content)) {
      failures.push(`${relativePage} 缺少 Java 公共成员: ${javaType.fqcn}.${member}`);
    }
  }
}

const requiredExamplePages = new Map([
  ['manual/typescript/api/common.md', ['ts-common-example']],
  ['manual/typescript/api/sm2.md', ['ts-sm2-example']],
  ['manual/typescript/api/sm3.md', ['ts-sm3-sha-example']],
  ['manual/typescript/api/sha.md', ['ts-sm3-sha-example']],
  ['manual/typescript/api/sm4.md', ['ts-sm4-example']],
  ['manual/typescript/api/zuc.md', ['ts-zuc-example']],
  ['manual/java/api/core.md', ['java-core-example']],
  ['manual/java/api/sm2.md', ['java-sm2-example']],
  ['manual/java/api/sm3.md', ['java-sm3-example', 'java-sm3-hmac-example']],
  ['manual/java/api/sm4.md', ['java-sm4-example']],
  ['manual/java/api/zuc.md', ['java-zuc-example']],
  ['manual/java/api/sm9.md', ['java-sm9-example', 'java-sm9-pem-example']],
  ['manual/java/api/integration.md', ['java-hybrid-example']],
]);
const requiredOutcomePages = [
  'manual/typescript/api/sm2.md',
  'manual/typescript/api/sm3.md',
  'manual/typescript/api/sm4.md',
  'manual/typescript/api/zuc.md',
  'manual/typescript/api/sha.md',
  'manual/java/api/sm2.md',
  'manual/java/api/sm3.md',
  'manual/java/api/sm4.md',
  'manual/java/api/zuc.md',
  'manual/java/api/sm9.md',
  'manual/java/api/integration.md',
];
const exampleRunner = await readFile(path.join(docsRoot, 'scripts', 'test-examples.mjs'), 'utf8');

const userManualCoveragePath = path.join(docsRoot, 'manual', 'manual-coverage.json');
const userManualCoverage = JSON.parse(await readFile(userManualCoveragePath, 'utf8'));
const manualRootPackage = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
const allowedManualLanguages = new Set(['common', 'typescript', 'java']);
const allowedManualLevels = new Set(['start', 'common', 'advanced', 'protocol', 'migration']);
const seenManualChapterIds = new Set();
const seenManualPages = new Set();
const legacyManualPatterns = new Map([
  ['setRNGPolicy', /`setRNGPolicy\b/],
  ['autoDecodeString', /`autoDecodeString\b/],
  ['decodeAuto', /`(?:ByteEncodings\.)?decodeAuto\b/],
  ['skipZComputation', /`skipZComputation\b/],
  ['signWithoutZ', /`signWithoutZ\b/],
  ['verifyWithoutZ', /`verifyWithoutZ\b/],
  ['computeEWithoutZ', /`computeEWithoutZ\b/],
  ['GM_2023_USER_ID', /`GM_2023_USER_ID\b/],
  ['SHA-1 API', /`(?:sha1|SHA1)\b/],
  ['旧 eea3 API', /`(?:ZUC\.)?eea3(?:\(|`)/],
  ['默认聚合导出', /(?:默认聚合导出|默认导出|default export)/i],
]);

if (userManualCoverage.schemaVersion !== 2) {
  failures.push(`manual/manual-coverage.json schemaVersion 不支持: ${userManualCoverage.schemaVersion}`);
}
if (userManualCoverage.baselineVersion !== manualRootPackage.version) {
  failures.push(
    `manual/manual-coverage.json 基线版本 ${userManualCoverage.baselineVersion}`
      + ` 与发布版本 ${manualRootPackage.version} 不一致`,
  );
}
if (!Array.isArray(userManualCoverage.chapters) || userManualCoverage.chapters.length === 0) {
  failures.push('manual/manual-coverage.json 缺少章节清单');
}

for (const chapter of userManualCoverage.chapters ?? []) {
  const label = chapter.id || chapter.page || '<unknown>';
  if (typeof chapter.id !== 'string' || chapter.id.length === 0) {
    failures.push(`manual/manual-coverage.json 章节缺少 id: ${JSON.stringify(chapter)}`);
  } else if (seenManualChapterIds.has(chapter.id)) {
    failures.push(`manual/manual-coverage.json 章节 id 重复: ${chapter.id}`);
  }
  seenManualChapterIds.add(chapter.id);

  if (!allowedManualLanguages.has(chapter.language)) {
    failures.push(`manual/manual-coverage.json ${label} 的 language 非法: ${chapter.language}`);
  }
  if (!allowedManualLevels.has(chapter.level)) {
    failures.push(`manual/manual-coverage.json ${label} 的 level 非法: ${chapter.level}`);
  }
  if (typeof chapter.page !== 'string' || !chapter.page.startsWith('manual/') || !chapter.page.endsWith('.md')) {
    failures.push(`manual/manual-coverage.json ${label} 的 page 非法: ${chapter.page}`);
    continue;
  }
  if (seenManualPages.has(chapter.page)) {
    failures.push(`manual/manual-coverage.json 页面重复: ${chapter.page}`);
  }
  seenManualPages.add(chapter.page);

  const pagePath = path.join(docsRoot, chapter.page);
  let pageContent;
  try {
    pageContent = await readFile(pagePath, 'utf8');
  } catch {
    failures.push(`manual/manual-coverage.json 页面不存在: ${chapter.page}`);
    continue;
  }

  const route = routeFor(pagePath);
  if (!config.includes(`'${route}'`)) {
    failures.push(`manual/manual-coverage.json 页面未进入导航: ${chapter.page}`);
  }

  for (const property of ['apis', 'sampleIds', 'sourceRegions']) {
    if (!Array.isArray(chapter[property])) {
      failures.push(`manual/manual-coverage.json ${label} 的 ${property} 必须是数组`);
    }
  }
  if (!Array.isArray(chapter.apis)
      || !Array.isArray(chapter.sampleIds)
      || !Array.isArray(chapter.sourceRegions)) {
    continue;
  }

  if (!['manual-home', 'interoperability', 'migration'].includes(chapter.id)
      && (chapter.apis.length === 0 || chapter.sampleIds.length === 0 || chapter.sourceRegions.length === 0)) {
    failures.push(`manual/manual-coverage.json ${label} 缺少 API、样例 ID 或源码区域`);
  }

  const declaredSamples = new Map(
    [...pageContent.matchAll(/<!--\s+code-sample\s+id="([^"]+)"\s+steps="([^"]+)"[^>]*-->/g)]
      .map((match) => [match[1], match[2].split('|')]),
  );
  const includedRegions = new Set();
  let searchableContent = pageContent;
  for (const include of pageContent.matchAll(/<!--\s*@include:\s+([^#\s]+)#([A-Za-z0-9_-]+)\s*-->/g)) {
    const sourcePath = path.resolve(path.dirname(pagePath), include[1]);
    includedRegions.add(`${sourcePath}#${include[2]}`);
    try {
      searchableContent += `\n${await readFile(sourcePath, 'utf8')}`;
    } catch {
      // 通用站内示例检查会报告具体的源文件缺失，此处只避免二次抛错。
    }
  }

  if (new Set(chapter.apis).size !== chapter.apis.length) {
    failures.push(`manual/manual-coverage.json ${label} 包含重复 API`);
  }
  for (const api of chapter.apis) {
    if (typeof api !== 'string' || api.length === 0) {
      failures.push(`manual/manual-coverage.json ${label} 包含空 API 名称`);
      continue;
    }
    const apiName = api.split('.').at(-1);
    if (!new RegExp(`\\b${apiName.replaceAll('$', '\\$')}\\b`).test(searchableContent)) {
      failures.push(`${chapter.page}: 清单中的 API 未出现在页面或样例源码: ${api}`);
    }
  }

  if (new Set(chapter.sampleIds).size !== chapter.sampleIds.length) {
    failures.push(`manual/manual-coverage.json ${label} 包含重复样例 ID`);
  }
  for (const sampleId of chapter.sampleIds) {
    if (!declaredSamples.has(sampleId)) {
      failures.push(`${chapter.page}: 缺少清单声明的 code-sample ${sampleId}`);
    }
  }
  for (const sampleId of declaredSamples.keys()) {
    if (!chapter.sampleIds.includes(sampleId)) {
      failures.push(`${chapter.page}: code-sample ${sampleId} 未进入手册清单`);
    }
  }

  for (const sourceRegion of chapter.sourceRegions) {
    if (!sourceRegion || typeof sourceRegion.path !== 'string'
        || typeof sourceRegion.region !== 'string'
        || typeof sourceRegion.runner !== 'string') {
      failures.push(`manual/manual-coverage.json ${label} 的源码区域字段不完整`);
      continue;
    }
    const sourcePath = path.resolve(docsRoot, sourceRegion.path);
    let sourceContent;
    try {
      sourceContent = await readFile(sourcePath, 'utf8');
    } catch {
      failures.push(`manual/manual-coverage.json ${label} 的源码不存在: ${sourceRegion.path}`);
      continue;
    }
    if (!sourceContent.includes(`#region ${sourceRegion.region}`)
        || !sourceContent.includes(`#endregion ${sourceRegion.region}`)) {
      failures.push(
        `manual/manual-coverage.json ${label} 的源码区域不存在或未闭合:`
          + ` ${sourceRegion.path}#${sourceRegion.region}`,
      );
    }
    if (!includedRegions.has(`${sourcePath}#${sourceRegion.region}`)) {
      failures.push(
        `${chapter.page}: 未引用清单声明的源码区域`
          + ` ${sourceRegion.path}#${sourceRegion.region}`,
      );
    }
    const runnerName = `name: '${sourceRegion.runner}'`;
    const sourceToken = path.basename(sourceRegion.path).replace(/\.(?:mjs|java)$/, '');
    if (!exampleRunner.includes(runnerName) || !exampleRunner.includes(sourceToken)) {
      failures.push(
        `manual/manual-coverage.json ${label} 的源码未进入执行任务`
          + ` ${sourceRegion.runner}: ${sourceRegion.path}`,
      );
    }
  }

  if (chapter.id !== 'migration') {
    const prose = stripFencedCode(pageContent);
    for (const [legacyName, pattern] of legacyManualPatterns) {
      if (pattern.test(prose)) {
        failures.push(`${chapter.page}: 主手册出现旧入口 ${legacyName}，应移到迁移附录`);
      }
    }
  }

  if (['common', 'advanced'].includes(chapter.level) && chapter.sampleIds.length > 0) {
    const steps = chapter.sampleIds.flatMap((sampleId) => declaredSamples.get(sampleId) ?? []);
    const isNegativeStep = (step) => /(?:失败|篡改|非法|拒绝|错误).*断言/.test(step);
    if (!steps.some((step) => !isNegativeStep(step)
        && /(?:断言|往返|解码|验签|解密|计算|生成|创建)/.test(step))) {
      failures.push(`${chapter.page}: 任务案例缺少成功结果或固定结果断言`);
    }
    if (!steps.some(isNegativeStep)) {
      failures.push(`${chapter.page}: 任务案例缺少失败、篡改或非法输入断言`);
    }
  }
}

// API 详解属于成员级 API 清单，不重复塞进按任务组织的 manual-coverage。
const taskManualFiles = markdownFiles.filter((entry) => entry.includes(`${path.sep}manual${path.sep}`)
  && !entry.includes(`${path.sep}manual${path.sep}typescript${path.sep}api${path.sep}`)
  && !entry.includes(`${path.sep}manual${path.sep}java${path.sep}api${path.sep}`));
for (const file of taskManualFiles) {
  const relative = path.relative(docsRoot, file).replaceAll('\\', '/');
  if (!seenManualPages.has(relative)) {
    failures.push(`manual/manual-coverage.json 缺少手册页面: ${relative}`);
  }
}

const executedSources = new Map([
  ['examples/node/public-api-manual.mjs', 'public-api-manual.mjs'],
  ['../../packages/java/gmkit/src/test/java/cn/gmkit/PublicApiManualExamplesTest.java', 'PublicApiManualExamplesTest'],
  ['../../packages/java/gmkit-sm9/src/test/java/cn/gmkit/sm9/SM9ManualExamplesTest.java', 'SM9ManualExamplesTest'],
  ['../../packages/java/gmkit-sm9/src/test/java/cn/gmkit/sm9/SM9KeyPemTest.java', 'SM9KeyPemTest'],
]);

for (const [relativePage, requiredRegions] of requiredExamplePages) {
  const page = path.join(docsRoot, relativePage);
  const content = await readFile(page, 'utf8');
  const includes = [...content.matchAll(/<!--\s*@include:\s+([^#\s]+)#([A-Za-z0-9_-]+)\s*-->/g)];
  const includedRegions = new Set(includes.map((match) => match[2]));
  for (const region of requiredRegions) {
    if (!includedRegions.has(region)) failures.push(`${relativePage}: 缺少可执行测试区域 ${region}`);
  }
  for (const [, includePath, region] of includes) {
    const source = path.resolve(path.dirname(page), includePath);
    let sourceContent;
    try {
      sourceContent = await readFile(source, 'utf8');
    } catch {
      failures.push(`${relativePage}: 示例源文件不存在 ${includePath}`);
      continue;
    }
    if (!sourceContent.includes(`#region ${region}`) || !sourceContent.includes(`#endregion ${region}`)) {
      failures.push(`${relativePage}: 示例区域不存在或未闭合 ${includePath}#${region}`);
    }
    const sourceFromDocs = path.relative(docsRoot, source).replaceAll('\\', '/');
    const runnerToken = executedSources.get(sourceFromDocs);
    if (!runnerToken || !exampleRunner.includes(runnerToken)) {
      failures.push(`${relativePage}: 示例源文件未进入 docs:test-examples ${includePath}`);
    }
  }
}

for (const relativePage of requiredOutcomePages) {
  const content = await readFile(path.join(docsRoot, relativePage), 'utf8');
  const declaredSteps = [...content.matchAll(/<!--\s+code-sample\s+[^>]*steps="([^"]+)"[^>]*-->/g)]
    .flatMap((match) => match[1].split('|'));
  const negative = (step) => /(?:失败|篡改|非法|拒绝).*断言/.test(step);
  if (!declaredSteps.some((step) => /断言|校验/.test(step) && !negative(step))) {
    failures.push(`${relativePage}: 密码 API 家族缺少成功或固定结果断言`);
  }
  if (!declaredSteps.some(negative)) {
    failures.push(`${relativePage}: 密码 API 家族缺少失败、篡改或非法输入断言`);
  }
}

// 正式发布文档中的版本必须来自构建清单，避免升级后保留可运行但过期的样例。
const rootPackage = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'));
const tsPackage = JSON.parse(await readFile(path.join(repoRoot, 'packages', 'ts', 'package.json'), 'utf8'));
const docsPackage = JSON.parse(await readFile(path.join(docsRoot, 'package.json'), 'utf8'));
if (rootPackage.version !== tsPackage.version || rootPackage.version !== docsPackage.version) {
  failures.push(`workspace 版本不一致: root=${rootPackage.version}, ts=${tsPackage.version}, docs=${docsPackage.version}`);
}

for (const relative of ['README.md', 'guide/README.md', 'guide/getting-started.md']) {
  const content = await readFile(path.join(docsRoot, relative), 'utf8');
  requireDocumentedVersion(content, tsPackage.version, relative);
}

const javaPom = await readFile(path.join(repoRoot, 'packages', 'java', 'pom.xml'), 'utf8');
const javaVersion = requireMatch(javaPom, /<artifactId>gmkit-parent<\/artifactId>\s*<version>([^<]+)<\/version>/, 'packages/java/pom.xml');
const javaGuide = await readFile(path.join(docsRoot, 'guide', 'getting-started.md'), 'utf8');
requireDocumentedVersion(javaGuide, javaVersion, 'guide/getting-started.md');
for (const relative of ['README.md', 'guide/README.md', 'guide/getting-started.md']) {
  const content = await readFile(path.join(docsRoot, relative), 'utf8');
  requireDocumentedVersion(content, javaVersion, relative);
}

const goMod = await readFile(path.join(docsRoot, 'examples', 'go', 'go.mod'), 'utf8');
const goGmsmVersion = requireMatch(goMod, /github\.com\/emmansun\/gmsm\s+(v[^\s]+)/, 'examples/go/go.mod');
const goGuide = await readFile(path.join(docsRoot, 'integrations', 'go.md'), 'utf8');
requireDocumentedVersion(goGuide, goGmsmVersion, 'GO-INTEGRATION.zh-CN.md');

const requirements = await readFile(path.join(docsRoot, 'examples', 'python', 'requirements.txt'), 'utf8');
const pythonGmsslVersion = requireMatch(requirements, /^gmssl==([^\s]+)$/m, 'examples/python/requirements.txt');
const pythonGuide = await readFile(path.join(docsRoot, 'integrations', 'python.md'), 'utf8');
requireDocumentedVersion(pythonGuide, pythonGmsslVersion, 'PYTHON-INTEGRATION.zh-CN.md');

const cargoToml = await readFile(path.join(docsRoot, 'examples', 'rust', 'Cargo.toml'), 'utf8');
const rustGuide = await readFile(path.join(docsRoot, 'integrations', 'rust.md'), 'utf8');
for (const crate of ['sm3', 'sm4']) {
  const version = requireMatch(cargoToml, new RegExp(`^${crate}\\s*=\\s*"([^"]+)"$`, 'm'), `examples/rust/Cargo.toml ${crate}`);
  requireDocumentedVersion(rustGuide, version, `RUST-INTEGRATION.zh-CN.md ${crate}`);
}

const hutoolPom = await readFile(path.join(docsRoot, 'examples', 'hutool', 'pom.xml'), 'utf8');
const hutoolGuide = await readFile(path.join(docsRoot, 'integrations', 'java-hutool.md'), 'utf8');
for (const artifact of ['hutool-crypto', 'bcprov-jdk15to18']) {
  const version = requireMatch(
    hutoolPom,
    new RegExp(`<artifactId>${artifact}<\\/artifactId>\\s*<version>([^<]+)<\\/version>`),
    `examples/hutool/pom.xml ${artifact}`,
  );
  requireDocumentedVersion(hutoolGuide, version, `JAVA-INTEGRATION.zh-CN.md ${artifact}`);
}

const vectors = JSON.parse(await readFile(path.join(repoRoot, 'vectors', 'interop.json'), 'utf8'));
const vectorIds = new Set();
for (const [index, vector] of vectors.cases.entries()) {
  for (const field of ['id', 'algo', 'op', 'expected']) {
    if (vector[field] === undefined) failures.push(`vectors/interop.json cases[${index}] 缺少字段 ${field}`);
  }
  if (vectorIds.has(vector.id)) failures.push(`vectors/interop.json 包含重复 id: ${vector.id}`);
  vectorIds.add(vector.id);
  if (vector.source && typeof vector.source !== 'string') {
    failures.push(`vectors/interop.json ${vector.id} 的 source 必须是字符串`);
  }
}

if (failures.length > 0) {
  console.error('[docs-check] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[docs-check] PASS: ${markdownFiles.length} 个页面均已检查`);
