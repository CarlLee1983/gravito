#!/usr/bin/env bun
import { $ } from 'bun'

// Clean dist directory
await $`rm -rf dist`

// Run TypeScript compiler
await $`tsc`

console.log('✅ Build complete!')
