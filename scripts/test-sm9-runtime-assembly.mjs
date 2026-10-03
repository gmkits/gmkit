#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const platformFiles = Object.freeze({
  'linux-x86_64': ['libgmkitsm9.so', 'libgmssl.so.3'],
  'linux-aarch64': ['libgmkitsm9.so', 'libgmssl.so.3'],
  'darwin-x86_64': ['libgmkitsm9.dylib', 'libgmssl.3.dylib'],
  'darwin-aarch64': ['libgmkitsm9.dylib', 'libgmssl.3.dylib'],
  'windows-x86_64': ['gmkitsm9.dll', 'gmssl.dll'],
})

const repoRoot = path.resolve(import.meta.dirname, '..')
const assembler = path.join(repoRoot, 'scripts', 'assemble-sm9-runtime.mjs')

function runAssembler(input, output) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      assembler,
      '--input', input,
      '--output', output,
      '--gmssl-commit', 'test-commit',
    ], { stdio: 'pipe' })
    let stderr = ''
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', (code) => resolve({ code, stderr }))
  })
}

async function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

async function main() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'gmkit-sm9-assembly-'))
  const input = path.join(root, 'input')
  const output = path.join(root, 'output')
  try {
    const contents = new Map()
    for (const [platform, files] of Object.entries(platformFiles)) {
      for (const file of files) {
        const content = Buffer.from(`fixture:${platform}:${file}`)
        contents.set(`native/${platform}/${file}`, content)
        const source = path.join(input, platform, file)
        await mkdir(path.dirname(source), { recursive: true })
        await writeFile(source, content)
      }
    }

    const success = await runAssembler(input, output)
    if (success.code !== 0) throw new Error(`完整 runtime 组装失败：${success.stderr}`)

    const manifest = await readFile(path.join(output, 'META-INF', 'gmkit', 'sm9-native.sha256'), 'utf8')
    const entries = new Map(manifest.trim().split(/\r?\n/).map((line) => {
      const [, hash, resource] = line.match(/^([0-9a-f]{64})  (.+)$/u) ?? []
      if (!hash || !resource) throw new Error(`SHA-256 清单格式错误：${line}`)
      return [resource, hash]
    }))
    if (entries.size !== contents.size) throw new Error('SHA-256 清单条目数量错误')
    for (const [resource, content] of contents) {
      if (entries.get(resource) !== await sha256(content)) {
        throw new Error(`SHA-256 清单内容错误：${resource}`)
      }
    }

    const properties = await readFile(path.join(output, 'META-INF', 'gmkit', 'sm9-native.properties'), 'utf8')
    for (const platform of Object.keys(platformFiles)) {
      if (!properties.includes(platform)) throw new Error(`平台未写入 properties：${platform}`)
    }

    await rm(path.join(input, 'windows-x86_64', 'gmssl.dll'))
    const missing = await runAssembler(input, path.join(root, 'missing-output'))
    if (missing.code === 0 || !missing.stderr.includes('windows-x86_64/gmssl.dll')) {
      throw new Error('缺失 native 文件时没有返回明确失败')
    }
    console.log('SM9 runtime assembly checks passed')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error.stack ?? error.message)
  process.exitCode = 1
})
