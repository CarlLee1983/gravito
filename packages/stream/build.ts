#!/usr/bin/env bun

/**
 * @gravito/stream 構建腳本
 *
 * 使用統一的 buildPackage() 函式，替代舊版 spawn('npx', 'tsup') 方式。
 * 格式：ESM + CJS（stream 的 package.json exports 同時有 import 和 require）
 *
 * 性能改進：
 * - 舊版：npx tsup 啟動約 500ms（Node.js 進程開銷）
 * - 新版：Bun.build 零啟動，約 0.3-0.8s 完成
 */

import { buildPackage, isDtsOnlyMode, printBuildSummary } from '../../scripts/build-utils.ts'

const dtsOnly = isDtsOnlyMode()

console.log(dtsOnly ? '生成 @gravito/stream 型別宣告...' : '構建 @gravito/stream...')

const result = await buildPackage({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: ['esm', 'cjs'],
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['@gravito/core', '@gravito/atlas'],
  dts: true,
  dtsOnly,
  silent: false,
})

printBuildSummary(result, '@gravito/stream')

if (!result.success) {
  process.exit(1)
}
