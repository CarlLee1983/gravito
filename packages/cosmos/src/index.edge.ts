/**
 * @file packages/cosmos/src/index.edge.ts
 * @module @gravito/cosmos/edge
 * @description Edge Runtime 入口點
 *
 * 此入口點不包含 Node.js 特定功能:
 * - 不導出 FileSystemLoader (依賴 node:fs)
 * - 不導出 HMRWatcher (依賴 node:fs)
 * - 不導出舊的 loader.ts (依賴 node:fs)
 *
 * Edge Runtime 環境包括:
 * - Cloudflare Workers
 * - Vercel Edge Functions
 * - Deno Deploy
 * - 其他邊緣運行環境
 *
 * @since 3.2.0
 * @platform edge
 */

// Core services
export * from './I18nService'
export { I18nOrbit, OrbitCosmos } from './index'
export * from './loaders/ChainedLoader'
export * from './loaders/CloudflareKVLoader'
export * from './loaders/EdgeKVLoader'
export * from './loaders/MemoryLoader'
export * from './loaders/RemoteLoader'
// Edge-compatible loaders
export * from './loaders/TranslationLoader'
export * from './loaders/VercelKVLoader'

// Runtime utilities
export * from './runtime/detector'
export * from './runtime/path-utils'
