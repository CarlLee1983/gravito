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

// Generate type declarations using tsc
try {
  execSync('bun tsc --declaration --emitDeclarationOnly --outDir ./dist --skipLibCheck', {
    stdio: 'inherit',
  })
} catch {
  // Generate a basic declaration file if tsc fails due to missing dependencies
  console.warn('⚠️  tsc declaration generation failed, creating basic index.d.ts')
  await Bun.write('./dist/index.d.ts', `declare module '@gravito/quark';\n`)
}

console.log('✅ @gravito/quark built successfully')
