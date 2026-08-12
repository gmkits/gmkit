import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(docsRoot, '..', '..');
const examplesRoot = path.join(docsRoot, 'examples');
const only = process.env.DOC_EXAMPLE_ONLY?.split(',').map((item) => item.trim()).filter(Boolean);

function mavenExample(args) {
  return process.platform === 'win32'
    ? {
        command: process.env.ComSpec ?? 'cmd.exe',
        args: ['/d', '/s', '/c', ['mvn', '-B', '-ntp', ...args].join(' ')],
      }
    : { command: 'mvn', args: ['-B', '-ntp', ...args] };
}

const examples = [
  { name: 'quickstart-typescript', command: process.execPath, args: ['quick-start.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'manual-typescript-start', command: process.execPath, args: ['manual-typescript-start.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'manual-typescript-data', command: process.execPath, args: ['manual-typescript-data.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'manual-typescript-sm2', command: process.execPath, args: ['manual-typescript-sm2.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'manual-typescript-digest-hmac', command: process.execPath, args: ['manual-typescript-digest-hmac.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'manual-typescript-sm4', command: process.execPath, args: ['manual-typescript-sm4.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'manual-typescript-zuc', command: process.execPath, args: ['manual-typescript-zuc.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'manual-typescript-advanced', command: process.execPath, args: ['manual-typescript-advanced.mjs'], cwd: path.join(examplesRoot, 'node') },
  {
    name: 'quickstart-java',
    ...mavenExample(['-pl', 'gmkit', '-Dtest=PublicApiManualExamplesTest', 'test']),
    cwd: path.join(repoRoot, 'packages', 'java'),
  },
  {
    name: 'manual-java-common',
    ...mavenExample([
      '-pl',
      'gmkit',
      '-Dtest=ManualJavaStartTest,ManualJavaCoreTest,ManualJavaSm2Test,ManualJavaSm3Test,ManualJavaSm4Test,ManualJavaZucTest',
      'test',
    ]),
    cwd: path.join(repoRoot, 'packages', 'java'),
  },
  {
    name: 'api-java-sm9-boundary',
    ...mavenExample([
      '-pl',
      'gmkit-sm9',
      // 普通文档 CI 只验证 SM9 测试源码可编译、平台诊断和不可用时的失败边界。
      // 五平台真实签名/IBE 运行由 sm9-native.yml 强制执行，不能在这里用 skip 冒充成功。
      '-Dtest=SM9NativeAvailableTest,SM9ManualExamplesTest,SM9KeyPemTest,ManualJavaSm9UserGuideTest',
      'test',
    ]),
    cwd: path.join(repoRoot, 'packages', 'java'),
  },
  {
    name: 'manual-java-hybrid',
    ...mavenExample(['-pl', 'gmkit', '-Dtest=ManualJavaHybridTest', 'test']),
    cwd: path.join(repoRoot, 'packages', 'java'),
  },
  { name: 'gmkit', command: process.execPath, args: ['gmkit-release.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'api-typescript', command: process.execPath, args: ['public-api-manual.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'node', command: process.execPath, args: ['international-crypto.mjs'], cwd: path.join(examplesRoot, 'node') },
  { name: 'go', command: 'go', args: ['test', './...'], cwd: path.join(examplesRoot, 'go') },
  { name: 'python', custom: runPythonExample },
  { name: 'rust', custom: runRustExample },
  {
    name: 'hutool',
    ...mavenExample(['test']),
    cwd: path.join(examplesRoot, 'hutool'),
  },
].filter(({ name }) => !only || only.includes(name));

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    console.log(`[docs-examples] $ ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: 'inherit',
      shell: false,
      env: options.env ?? process.env,
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0
      ? resolve()
      : reject(new Error(`${command} 退出码 ${code}`)));
  });
}

async function runPythonExample() {
  const cwd = path.join(examplesRoot, 'python');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'gmkit-docs-python-'));
  const venv = path.join(temporary, '.venv');
  const systemPython = process.env.PYTHON
    ?? (process.platform === 'win32' ? 'python' : 'python3');
  const python = process.platform === 'win32'
    ? path.join(venv, 'Scripts', 'python.exe')
    : path.join(venv, 'bin', 'python');
  try {
    await runCommand(systemPython, ['-m', 'venv', venv], { cwd });
    await runCommand(python, ['-m', 'pip', 'install', '--disable-pip-version-check', '-r', 'requirements.txt'], { cwd });
    await runCommand(python, ['verify_vectors.py'], { cwd });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function runRustExample() {
  const cwd = path.join(examplesRoot, 'rust');
  const cargoHome = await mkdtemp(path.join(os.tmpdir(), 'gmkit-docs-cargo-'));
  await mkdir(cargoHome, { recursive: true });
  try {
    await runCommand('cargo', ['test', '--locked'], {
      cwd,
      env: {
        ...process.env,
        CARGO_HOME: cargoHome,
        CARGO_REGISTRIES_CRATES_IO_PROTOCOL: 'sparse',
      },
    });
  } finally {
    await rm(cargoHome, { recursive: true, force: true });
  }
}

for (const example of examples) {
  console.log(`\n[docs-examples] ${example.name}`);
  if (example.custom) await example.custom();
  else await runCommand(example.command, example.args, { cwd: example.cwd });
}
console.log(`\n[docs-examples] PASS: ${examples.map(({ name }) => name).join(', ')}`);
console.log('[docs-examples] SM9 runtime evidence: boundary lane only; full native behavior is required in sm9-native.yml');
