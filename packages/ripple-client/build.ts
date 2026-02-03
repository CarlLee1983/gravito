import { execSync } from 'node:child_process'

// Build main entry
await Bun.build({
  entrypoints: ['./src/index.ts', './src/react.tsx', './src/vue.ts'],
  outdir: './dist',
  format: 'esm',
  target: 'browser',
  splitting: false,
  sourcemap: 'external',
  minify: false,
  naming: '[name].mjs',
})

// Generate .cjs version
const cjsCode = `"use strict";
module.exports = require("./index.mjs");
`
await Bun.write('./dist/index.cjs', cjsCode)

// Generate type declarations
execSync(
  'bunx tsc --emitDeclarationOnly --declaration --outDir ./dist --skipLibCheck --types "node"',
  {
    stdio: 'inherit',
  }
)

console.log('✅ @gravito/ripple-client built successfully')
