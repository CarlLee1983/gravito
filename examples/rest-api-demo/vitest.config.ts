/**
 * Vitest 配置
 * 單元測試和整合測試配置
 */

import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 測試環境
    environment: 'node',

    // 測試匹配模式
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.idea', 'dist', 'build'],

    // 全局設置
    globals: true,

    // 覆蓋率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'tests/', 'dist/', '**/*.test.ts', '**/index.ts', '**/.d.ts'],
      lines: 85, // 目標：85% 行覆蓋率
      functions: 85,
      branches: 80,
      statements: 85,
    },

    // 並發數
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // 超時時間
    testTimeout: 10000,
    hookTimeout: 10000,

    // 報告器
    reporters: ['verbose', 'html'],

    // HTML 報告位置
    outputFile: {
      html: './test-results/index.html',
    },
  },

  // 路徑別名
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './src/domain'),
      '@application': path.resolve(__dirname, './src/application'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@presentation': path.resolve(__dirname, './src/presentation'),
      '@config': path.resolve(__dirname, './src/config'),
      '@providers': path.resolve(__dirname, './src/providers'),
    },
  },
})
