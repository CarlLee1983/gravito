import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, rm } from 'node:fs/promises'

const isDtsOnly = process.argv.includes('--dts-only')

// Build with Bun (skip if dts-only)
if (!isDtsOnly) {
  await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    format: 'esm',
    target: 'bun',
    splitting: false,
    sourcemap: 'external',
    minify: false,
    external: ['@gravito/core'],
  })

  // Generate .cjs version
  const cjsCode = `"use strict";
module.exports = require("./index.js");
`
  await Bun.write('./dist/index.cjs', cjsCode)
}

// Generate type declarations using tsc
try {
  execSync('bun tsc --declaration --emitDeclarationOnly --outDir ./dist --skipLibCheck', {
    stdio: 'inherit',
  })

  // Fix incorrect directory structure from tsconfig (which has rootDir: ../../)
  // TypeScript outputs to dist/packages/quark/src/... but we need dist/...
  if (existsSync('dist/packages/quark/src')) {
    await mkdir('dist', { recursive: true })
    await cp('dist/packages/quark/src', 'dist', { recursive: true })
    await rm('dist/packages', { recursive: true, force: true })
  }
} catch {
  // Generate a basic declaration file if tsc fails due to missing dependencies
  console.warn('⚠️  tsc declaration generation failed, creating basic index.d.ts')
  await Bun.write('./dist/index.d.ts', `declare module '@gravito/quark';\n`)
}

console.log('✅ @gravito/quark built successfully')
