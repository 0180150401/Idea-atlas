import { compile } from 'svelte/compiler'
import * as esbuild from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourcePath = path.join(root, 'src/svelte/MemoryGraph.svelte')
const outputDir = path.join(root, '.svelte-build')
const outputPath = path.join(outputDir, 'MemoryGraph.js')
const bundlePath = path.join(root, 'public/memory-graph.js')

const source = await readFile(sourcePath, 'utf8')
const compiled = compile(source, {
  customElement: true,
  filename: sourcePath,
  generate: 'client',
})

await mkdir(outputDir, { recursive: true })
await mkdir(path.dirname(bundlePath), { recursive: true })
await writeFile(outputPath, compiled.js.code)

await esbuild.build({
  bundle: true,
  entryPoints: [outputPath],
  format: 'iife',
  outfile: bundlePath,
  platform: 'browser',
  target: ['es2020'],
})
