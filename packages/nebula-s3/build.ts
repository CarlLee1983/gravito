#!/usr/bin/env bun
import { $ } from 'bun'
import { existsSync } from 'fs'
import { cp, mkdir } from 'fs/promises'

const isDtsOnly = process.argv.includes('--dts-only')

// Clean dist directory
await $`rm -rf dist`

// Run TypeScript compiler
if (isDtsOnly) {
  await $`tsc --emitDeclarationOnly`
} else {
  await $`tsc --declaration`
}

// Fix incorrect directory structure from tsconfig
// TypeScript outputs to dist/nebula-s3/src/... but we need dist/...
if (existsSync('dist/nebula-s3')) {
  await mkdir('dist', { recursive: true })
  await cp('dist/nebula-s3/src', 'dist', { recursive: true })
  await $`rm -rf dist/nebula-s3`
}

console.log('✅ Build complete!')
