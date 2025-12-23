import { execSync } from 'node:child_process'

// Build with Bun
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'bun',
  splitting: false,
  sourcemap: 'external',
  minify: false,
  external: ['gravito-core'],
})

// Generate .cjs version
const cjsCode = `"use strict";
module.exports = require("./index.mjs");
`
await Bun.write('./dist/index.cjs', cjsCode)

// Generate type declarations
execSync('bunx tsc --emitDeclarationOnly --declaration --outDir ./dist', {
  stdio: 'inherit',
})

console.log('✅ @gravito/echo built successfully')
