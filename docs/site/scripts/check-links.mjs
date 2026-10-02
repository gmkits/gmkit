import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LinkChecker, LinkState } from 'linkinator';

const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../.vuepress/dist', import.meta.url)));
async function htmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await htmlFiles(file));
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(file);
  }
  return result;
}
const files = await htmlFiles(root);
if (!files.length) throw new Error(`No built HTML pages in ${root}`);

// 本地服务只解析真实文件、.html 和目录首页，不用 SPA fallback 把缺页伪装成 200。
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    for (const file of [target, `${target}.html`, path.join(target, 'index.html')]) {
      try {
        const body = await readFile(file);
        const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
        response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
        response.end(request.method === 'HEAD' ? undefined : body);
        return;
      } catch (error) {
        if (!['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code)) throw error;
      }
    }
    response.writeHead(404).end();
  } catch {
    response.writeHead(500).end();
  }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  // 所有生成页面都作为入口；不要只抓首页，遗漏没有被首页直接引用的 API 页面。
  // 一次只检查一个入口，限制连接数并保留每个父页面的诊断。
  let links = 0;
  for (const file of files) {
    // Linkinator 会缓存已检查页面，漏掉后续入口新增的锚点；每页新建实例且不递归。
    const checker = new LinkChecker();
    checker.on('link', link => {
      if (link.state === LinkState.BROKEN) console.error(`[docs-links] ${link.parent ?? 'entry'} -> ${link.url} (${link.status ?? 'fragment'})`);
    });
    const result = await checker.check({
      path: `${origin}/${path.relative(root, file).split(path.sep).map(encodeURIComponent).join('/')}`,
      recurse: false,
      checkFragments: true,
      concurrency: 20,
      linksToSkip: async url => new URL(url).origin !== origin,
    });
    links += result.links.length;
    if (!result.passed) process.exitCode = 1;
  }
  console.log(`[docs-links] ${process.exitCode ? 'FAIL' : 'PASS'}: ${files.length} HTML pages, ${links} link checks`);
} finally {
  await new Promise(resolve => server.close(resolve));
}
