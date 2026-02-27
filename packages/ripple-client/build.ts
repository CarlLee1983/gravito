#!/usr/bin/env bun

/**
 * @gravito/ripple-client 構建腳本
 *
 * 使用統一的 buildPackage() 函式，替代舊版 Bun.build + execSync tsc 組合。
 *
 * 特殊配置：
 * - 目標平台：browser（前端 WebSocket client）
 * - 多入口點：index.ts + react.tsx + vue.ts
 * - ESM 命名：[name].mjs（ripple-client 使用 .mjs 後綴）
 * - CJS stub：僅主入口需要 require() 相容
 */

import {
  buildCJSStub,
  buildPackage,
  isDtsOnlyMode,
  printBuildSummary,
} from '../../scripts/build-utils.ts'

const dtsOnly = isDtsOnlyMode()

console.log(dtsOnly ? '生成 @gravito/ripple-client 型別宣告...' : '構建 @gravito/ripple-client...')

const result = await buildPackage({
  entrypoints: ['src/index.ts', 'src/react.tsx', 'src/vue.ts'],
  outdir: 'dist',
  // ripple-client 使用 .mjs 後綴，不生成 .cjs（靠 stub）
  format: ['esm'],
  target: 'browser',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  esmNaming: '[name].mjs',
  dts: true,
  dtsOnly,
  tscArgs: ['--skipLibCheck', '--types', 'node'],
  silent: false,
})

// 為主入口生成 CJS stub（package.json exports.require 指向 index.cjs）
// 注意：使用 'mjs' 作為 ESM 副檔名，因為 ripple-client 使用 .mjs 後綴
if (!dtsOnly && result.success) {
  await buildCJSStub('dist', ['src/index.ts'], 'mjs')
}

printBuildSummary(result, '@gravito/ripple-client')

if (!result.success) {
  process.exit(1)
}
