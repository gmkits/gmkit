import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(docsRoot, '..', '..');
const javaRoot = path.join(repoRoot, 'packages', 'java');
const javaPom = path.join(javaRoot, 'pom.xml');
const checkstyleConfig = path.join(javaRoot, 'config', 'checkstyle-javadoc.xml');
const generated = path.join(javaRoot, 'target', 'site', 'apidocs');
const destination = path.join(docsRoot, '.vuepress', 'public', 'api', 'java', 'latest');

function quoteForCmd(value) {
  return /[\s&()^|<>]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function runMaven(args) {
  const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'mvn';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', ['mvn', ...args].map(quoteForCmd).join(' ')]
    : args;

  return new Promise((resolve, reject) => {
    console.log(`[docs-api] $ mvn ${args.join(' ')}`);
    const child = spawn(command, commandArgs, {
      cwd: repoRoot,
      env: process.env,
      shell: false,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0
      ? resolve()
      : reject(new Error(`Maven API documentation command exited with code ${code}`)));
  });
}

await runMaven([
  '-f', javaPom,
  '-B', '-ntp',
  '-pl', 'gmkit,gmkit-sm9',
  '-DskipTests',
  `-Dcheckstyle.config.location=${checkstyleConfig}`,
  '-Dcheckstyle.consoleOutput=true',
  '-Dcheckstyle.failOnViolation=true',
  'org.apache.maven.plugins:maven-checkstyle-plugin:3.6.0:check',
]);

// JDK 切换不会使 Maven 的源码时间戳缓存失效；文档门禁必须使用本次工具链重新生成。
await rm(path.join(javaRoot, 'target', 'maven-javadoc-plugin-stale-data.txt'), { force: true });
await rm(generated, { recursive: true, force: true });

await runMaven([
  '-f', javaPom,
  '-B', '-ntp',
  '-pl', 'gmkit,gmkit-sm9',
  '-am',
  '-DskipTests',
  '-Ddoclint=all',
  '-Dmaven.javadoc.failOnWarnings=true',
  'org.apache.maven.plugins:maven-javadoc-plugin:3.7.0:aggregate',
]);

await readFile(path.join(generated, 'index.html'));
await rm(destination, { recursive: true, force: true });
await mkdir(path.dirname(destination), { recursive: true });
await cp(generated, destination, { recursive: true });
console.log(`[docs-api] Java Javadoc copied to ${path.relative(repoRoot, destination)}`);
