#!/usr/bin/env bun

/**
 * @gravito/beam 構建腳本
 *
 * 使用統一的 buildPackage() 函式，替代舊版 Bun.build + tsc 分離呼叫。
 * 格式：ESM only（beam 是輕量 RPC client，不需要 CJS）
 */

import { buildPackage, isDtsOnlyMode, printBuildSummary } from '../../scripts/build-utils.ts'

const dtsOnly = isDtsOnlyMode()

console.log(dtsOnly ? '生成 @gravito/beam 型別宣告...' : '構建 @gravito/beam...')

const result = await buildPackage({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: ['esm'],
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: ['@gravito/photon'],
  dts: true,
  dtsOnly,
  // beam 有 tsconfig.build.json，優先使用
  tsconfig: 'tsconfig.build.json',
  silent: false,
})

printBuildSummary(result, '@gravito/beam')

if (!result.success) {
  process.exit(1)
}
