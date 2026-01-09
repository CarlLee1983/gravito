import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'

// Clean dist directory
if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true, force: true })
}
mkdirSync('./dist', { recursive: true })

// Build with Bun
const result = await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'bun',
  splitting: false,
  sourcemap: 'external',
  minify: false,
  external: ['@gravito/core'],
})

if (!result.success) {
  console.error('❌ Bun build failed')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

// Generate .cjs version
const cjsCode = `"use strict";
module.exports = require("./index.js");
`
await Bun.write('./dist/index.cjs', cjsCode)

// Generate type declarations
try {
  execSync('bunx tsc --project tsconfig.json --emitDeclarationOnly --declaration --outDir ./dist', {
    stdio: 'inherit',
  })
} catch (error) {
  console.error('❌ TypeScript declaration generation failed')
  process.exit(1)
}

console.log('✅ @gravito/ripple built successfully')
