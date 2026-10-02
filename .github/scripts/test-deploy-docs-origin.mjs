import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const script = '.github/scripts/deploy-docs-origin.sh';

function gitBashCommand() {
  if (process.platform !== 'win32') return 'bash';
  const execPath = execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim();
  return path.resolve(execPath, '..', '..', '..', 'bin', 'bash.exe');
}

function bashPath(file) {
  const normalized = file.replaceAll('\\', '/');
  if (process.platform !== 'win32') return normalized;
  return normalized.replace(/^([A-Za-z]):\//, (_, drive) => `/${drive.toLowerCase()}/`);
}

function run(envOverrides) {
  return new Promise((resolve, reject) => {
    const child = spawn(gitBashCommand(), [script], {
      cwd: repoRoot,
      env: {
        ...process.env,
        DOCS_VALIDATE_ONLY: 'true',
        DOCS_SOURCE_DIR: bashPath(envOverrides.sourceDir),
        DOCS_REMOTE_DIR: envOverrides.remoteDir,
        DEPLOY_COMMIT: 'test-commit',
        SSH_PRIVATE_KEY: 'test-key',
        SSH_REMOTE_USER: 'test-user',
        SSH_REMOTE_HOST: 'test-host',
        SSH_HOST_FINGERPRINT: 'SHA256:test-fingerprint',
        DOCS_DEPLOY_MODE: envOverrides.mode ?? 'site',
        API_LANGUAGE: envOverrides.language ?? 'typescript',
        API_VERSION: envOverrides.version ?? '0.10.1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, stdout, stderr }));
  });
}

const temporary = await mkdtemp(path.join(os.tmpdir(), 'gmkit-deploy-contract-'));
try {
  const site = path.join(temporary, 'site');
  await mkdir(site, { recursive: true });
  await writeFile(path.join(site, 'index.html'), '<!doctype html>');
  await writeFile(path.join(site, 'deployment.json'), '{"commit":"test-commit"}');

  const valid = await run({ sourceDir: site, remoteDir: '/home/gmkit-site/www/' });
  assert.equal(valid.code, 0, valid.stderr);

  const wrongRemote = await run({ sourceDir: site, remoteDir: '/tmp/site/' });
  assert.notEqual(wrongRemote.code, 0);
  assert.match(wrongRemote.stderr, /Refusing unexpected remote directory/);

  const missingArtifact = await run({ sourceDir: temporary, remoteDir: '/home/gmkit-site/www/' });
  assert.notEqual(missingArtifact.code, 0);
  assert.match(missingArtifact.stderr, /artifact is incomplete/);

  const unsupportedMode = await run({
    sourceDir: site,
    remoteDir: '/home/gmkit-site/www/',
    mode: 'unknown',
  });
  assert.notEqual(unsupportedMode.code, 0);
  assert.match(unsupportedMode.stderr, /Unsupported DOCS_DEPLOY_MODE/);

  for (const language of ['typescript', 'java']) {
    for (const mode of ['api-latest', 'api-snapshot']) {
      const suffix = mode === 'api-latest' ? 'latest' : 'versions/0.10.1';
      const api = await run({ sourceDir: site, remoteDir: `/home/gmkit-site/www/api/${language}/${suffix}/`, mode, language });
      assert.equal(api.code, 0, api.stderr);
    }
  }
  const preview = await run({ sourceDir: site, remoteDir: '/home/gmkit-site/www/api/typescript/versions/0.10.1-rc.1/', mode: 'api-snapshot', version: '0.10.1-rc.1' });
  assert.notEqual(preview.code, 0);
  assert.match(preview.stderr, /stable semantic version/);
  const language = await run({ sourceDir: site, remoteDir: '/home/gmkit-site/www/api/unknown/latest/', mode: 'api-latest', language: 'unknown' });
  assert.notEqual(language.code, 0);

  // 无效清单必须在网络访问和 rsync 之前失败，不能按空清单发布。
  for (const content of ['{broken', '{}', '{"packages":[{"id":"java","versions":[{"version":"../bad"}]}]}']) {
    await writeFile(path.join(site, 'versions.json'), content);
    const invalid = await run({ sourceDir: site, remoteDir: '/home/gmkit-site/www/api/', mode: 'api-manifest' });
    assert.notEqual(invalid.code, 0, content);
  }
  await writeFile(path.join(site, 'versions.json'), JSON.stringify({ packages: [{ id: 'java', versions: [{ version: '0.10.1' }] }] }));
  const manifest = await run({ sourceDir: site, remoteDir: '/home/gmkit-site/www/api/', mode: 'api-manifest' });
  assert.equal(manifest.code, 0, manifest.stderr);

  console.log('[docs-deploy-contract] PASS');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
