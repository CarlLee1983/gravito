#!/usr/bin/env bun

/**
 * @gravito/echo 構建腳本
 *
 * 使用統一的 buildPackage() 函式，替代舊版 Bun.build + execSync tsc 組合。
 * 格式：ESM + CJS（echo 的 package.json exports 同時有 import 和 require）
 */

import { buildPackage, isDtsOnlyMode, printBuildSummary } from '../../scripts/build-utils.ts'

const dtsOnly = isDtsOnlyMode()

console.log(dtsOnly ? '生成 @gravito/echo 型別宣告...' : '構建 @gravito/echo...')

const result = await buildPackage({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: ['esm', 'cjs'],
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['@gravito/core'],
  dts: true,
  dtsOnly,
  silent: false,
})

printBuildSummary(result, '@gravito/echo')

if (!result.success) {
  process.exit(1)
}
