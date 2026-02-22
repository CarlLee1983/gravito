import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'

const isDtsOnly = process.argv.includes('--dts-only')

// Clean dist directory
if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true, force: true })
}
mkdirSync('./dist', { recursive: true })

// Build with Bun (skip if dts-only)
if (!isDtsOnly) {
  const result = await Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    format: 'esm',
    target: 'bun',
    splitting: false,
    sourcemap: 'external',
    minify: false,
    external: ['@gravito/core', 'nats', 'ioredis'],
  })

  if (!result.success) {
    console.error('❌ Bun build failed')
    for (const log of result.logs) {
      console.error(log)
    }
    process.exit(1)
  }

  // Copy proto files to dist
  if (existsSync('./src/proto')) {
    cpSync('./src/proto', './dist/proto', { recursive: true })
    console.log('📦 Copied proto files to dist/')
  }

  // Generate .cjs version
  const cjsCode = `"use strict";
module.exports = require("./index.js");
`
  await Bun.write('./dist/index.cjs', cjsCode)
}

// Generate type declarations
try {
  execSync('bunx tsc --project tsconfig.json --emitDeclarationOnly --declaration --outDir ./dist', {
    stdio: 'inherit',
  })
} catch (_error) {
  console.error('❌ TypeScript declaration generation failed')
  process.exit(1)
}

console.log('✅ @gravito/ripple built successfully')
