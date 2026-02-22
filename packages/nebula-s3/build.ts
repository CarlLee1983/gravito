#!/usr/bin/env bun
import { $ } from 'bun'

const isDtsOnly = process.argv.includes('--dts-only')

// Clean dist directory
await $`rm -rf dist`

// Run TypeScript compiler
if (isDtsOnly) {
  await $`tsc --emitDeclarationOnly`
} else {
  await $`tsc`
}

console.log('✅ Build complete!')
