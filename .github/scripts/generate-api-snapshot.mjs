import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const docsRoot = path.join(repoRoot, 'docs', 'site');
const target = process.env.API_TARGET;
const sourceRoot = path.resolve(process.env.API_SOURCE_ROOT ?? '');
const output = path.resolve(process.env.API_OUTPUT_DIR ?? '');
const expectedVersion = process.env.API_VERSION;
const channel = process.env.API_CHANNEL ?? 'snapshot';

if (!['typescript', 'java'].includes(target)) throw new Error('API_TARGET must be typescript or java');
if (!process.env.API_SOURCE_ROOT || !process.env.API_OUTPUT_DIR) {
  throw new Error('API_SOURCE_ROOT and API_OUTPUT_DIR are required');
}
if (!expectedVersion || !/^\d+\.\d+\.\d+$/.test(expectedVersion)) {
  throw new Error('API_VERSION must be a stable semantic version');
}
if (!['latest', 'snapshot'].includes(channel)) throw new Error('API_CHANNEL must be latest or snapshot');

function isInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

const allowedOutputRoots = [os.tmpdir(), process.env.RUNNER_TEMP].filter(Boolean);
if (!allowedOutputRoots.some((root) => isInside(root, output))) {
  throw new Error(`API_OUTPUT_DIR must be below a temporary directory: ${output}`);
}

function run(command, args, options = {}) {
  console.log(`[api-snapshot] $ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit', ...options });
}

function quoteForCmd(value) {
  return /[\s&()^|<>]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function runMaven(args, options = {}) {
  if (process.platform === 'win32') {
    run(process.env.ComSpec ?? 'cmd.exe', [
      '/d',
      '/s',
      '/c',
      ['mvn', ...args].map(quoteForCmd).join(' '),
    ], options);
    return;
  }
  run('mvn', args, options);
}

async function requireFile(file, label) {
  try {
    if ((await stat(file)).isFile()) return;
  } catch {
    // 统一在下面报告与发布路径相关的错误。
  }
  throw new Error(`${label} 不存在: ${file}`);
}

function publicExportNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/^export\s+(?:declare\s+)?(?:const|let|var|function|class|interface|enum|type)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(match[1]);
  }
  for (const match of source.matchAll(/^export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+['"][^'"]+['"];?/gm)) {
    for (const entry of match[1].split(',')) {
      const cleaned = entry.trim().replace(/^type\s+/, '');
      if (cleaned) names.add(cleaned.split(/\s+as\s+/).at(-1));
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

function cliPath(value) {
  return process.platform === 'win32' ? value.replaceAll('\\', '/') : value;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

if (target === 'typescript') {
  const packageJson = JSON.parse(await readFile(path.join(sourceRoot, 'packages', 'ts', 'package.json'), 'utf8'));
  if (packageJson.version !== expectedVersion) {
    throw new Error(`TypeScript tag version mismatch: expected=${expectedVersion}, package=${packageJson.version}`);
  }

  const typedoc = path.join(repoRoot, 'node_modules', 'typedoc', 'bin', 'typedoc');
  const dependencyLink = path.join(sourceRoot, 'node_modules');
  let createdDependencyLink = false;
  try {
    await stat(dependencyLink);
  } catch {
    // 历史 tag 单独 checkout 时不安装第二份依赖，只链接当前已锁定的 workspace 依赖。
    await symlink(
      path.join(repoRoot, 'node_modules'),
      dependencyLink,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    createdDependencyLink = true;
  }
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'gmkit-typedoc-'));
  const reflection = path.join(temporary, 'typedoc-snapshot.json');
  const snapshotTsconfig = path.join(temporary, 'tsconfig.snapshot.json');
  const snapshotOptions = path.join(temporary, 'typedoc.snapshot.json');
  const entryPoint = path.join(sourceRoot, 'packages', 'ts', 'src', 'index.ts');
  await writeFile(snapshotTsconfig, `${JSON.stringify({
    extends: cliPath(path.join(sourceRoot, 'packages', 'ts', 'tsconfig.json')),
    compilerOptions: {
      rootDir: cliPath(path.join(sourceRoot, 'packages', 'ts', 'src')),
      typeRoots: [cliPath(path.join(repoRoot, 'node_modules', '@types'))],
      types: ['node'],
    },
    include: [cliPath(path.join(sourceRoot, 'packages', 'ts', 'src', '**', '*'))],
    exclude: [],
  }, null, 2)}\n`, 'utf8');
  const hostedBaseUrl = channel === 'latest'
    ? 'https://gmkit.cn/api/typescript/latest/'
    : `https://gmkit.cn/api/typescript/versions/${expectedVersion}/`;
  const typedocOptions = JSON.parse(await readFile(path.join(docsRoot, 'typedoc.json'), 'utf8'));
  await writeFile(snapshotOptions, `${JSON.stringify({
    ...typedocOptions,
    $schema: undefined,
    entryPoints: [cliPath(entryPoint)],
    tsconfig: cliPath(snapshotTsconfig),
    out: cliPath(output),
    json: cliPath(reflection),
    // 快照与主站使用同一份 TypeScript 手册入口，避免 tag 构建因旧目录路径失败。
    readme: cliPath(path.join(docsRoot, 'manual', 'typescript', 'README.md')),
    customCss: cliPath(path.join(docsRoot, '.vuepress', 'styles', 'typedoc.css')),
    hostedBaseUrl,
    // 历史 tag 的注释不能回写；当前 main 仍由 docs:verify 以 warning-as-error 门禁。
    treatWarningsAsErrors: false,
    validation: {
      ...typedocOptions.validation,
      notDocumented: false,
    },
    requiredToBeDocumented: [],
  }, null, 2)}\n`, 'utf8');
  try {
    run(process.execPath, [typedoc,
      '--options', cliPath(snapshotOptions),
    ], { cwd: docsRoot });

    const documented = collectNames(JSON.parse(await readFile(reflection, 'utf8')));
    const source = await readFile(entryPoint, 'utf8');
    const missing = publicExportNames(source).filter((name) => !documented.has(name));
    if (missing.length > 0) throw new Error(`TypeDoc 缺少公开导出: ${missing.join(', ')}`);
    await requireFile(path.join(output, 'index.html'), 'TypeDoc 首页');
    console.log(`[api-snapshot] TypeScript ${expectedVersion}: ${publicExportNames(source).length} 个顶层导出`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
    if (createdDependencyLink) await rm(dependencyLink, { recursive: true, force: true });
  }
} else {
  const pom = await readFile(path.join(sourceRoot, 'packages', 'java', 'pom.xml'), 'utf8');
  const actualVersion = pom.match(/<artifactId>gmkit-parent<\/artifactId>\s*<version>([^<]+)<\/version>/)?.[1];
  if (actualVersion !== expectedVersion) {
    throw new Error(`Java tag version mismatch: expected=${expectedVersion}, pom=${actualVersion ?? '<missing>'}`);
  }

  runMaven([
    '-f', path.join(sourceRoot, 'packages', 'java', 'pom.xml'),
    '-B',
    '-ntp',
    '-pl', 'gmkit,gmkit-sm9',
    '-am',
    '-DskipTests',
    '-Ddoclint=all',
    '-Dmaven.javadoc.failOnWarnings=true',
    'org.apache.maven.plugins:maven-javadoc-plugin:3.7.0:aggregate',
  ], { cwd: sourceRoot });

  const generated = path.join(sourceRoot, 'packages', 'java', 'target', 'site', 'apidocs');
  await cp(generated, output, { recursive: true });
  for (const [relative, label] of [
    ['index.html', 'Javadoc 首页'],
    ['cn/gmkit/sm2/SM2.html', 'SM2 Javadoc'],
    ['cn/gmkit/sm3/SM3.html', 'SM3 Javadoc'],
    ['cn/gmkit/sm4/SM4.html', 'SM4 Javadoc'],
    ['cn/gmkit/zuc/ZUC.html', 'ZUC Javadoc'],
    ['cn/gmkit/sm9/SM9.html', 'SM9 Javadoc'],
  ]) {
    await requireFile(path.join(output, ...relative.split('/')), label);
  }
  console.log(`[api-snapshot] Java ${expectedVersion}: 核心与 SM9 Javadoc 已生成`);
}
