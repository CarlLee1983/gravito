import { execSync } from 'node:child_process'

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

// Generate type declarations
execSync('bunx tsc --emitDeclarationOnly --declaration --outDir ./dist', {
  stdio: 'inherit',
})

console.log('✅ @gravito/echo built successfully')
