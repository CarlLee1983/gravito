#!/usr/bin/env bun

/**
 * @gravito/spectrum 構建腳本
 *
 * 使用統一的 buildPackage() 函式，替代舊版 spawn('npx', 'tsup') 方式。
 * 格式：ESM + CJS
 *
 * 外部依賴包含 OpenTelemetry 套件，確保不打包進輸出。
 */

import { buildPackage, isDtsOnlyMode, printBuildSummary } from '../../scripts/build-utils.ts'

const dtsOnly = isDtsOnlyMode()

console.log(dtsOnly ? '生成 @gravito/spectrum 型別宣告...' : '構建 @gravito/spectrum...')

const result = await buildPackage({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: ['esm', 'cjs'],
  target: 'bun',
  splitting: false,
  minify: false,
  sourcemap: 'external',
  external: [
    '@gravito/core',
    '@gravito/atlas',
    '@gravito/photon',
    '@opentelemetry/api',
    '@opentelemetry/sdk-node',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
  ],
  dts: true,
  dtsOnly,
  silent: false,
})

printBuildSummary(result, '@gravito/spectrum')

if (!result.success) {
  process.exit(1)
}
