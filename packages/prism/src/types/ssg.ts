/**
 * SSG (Static Site Generator) type definitions
 *
 * @public
 * @since 3.1.0
 */

/**
 * SSG export options
 */
export interface SSGExportOptions {
  baseUrl?: string
  concurrency?: number
  timeout?: number
  incremental?: boolean
  force?: boolean
  manifestPath?: string
}

/**
 * Dynamic route configuration
 */
export interface DynamicRouteConfig {
  pattern: string
  getStaticPaths: () => Promise<Array<{ params: Record<string, string>; data?: unknown }>>
}

/**
 * Resolved route
 */
export interface ResolvedRouteConfig {
  path: string
  getData?: () => Promise<unknown>
}

/**
 * Build manifest page entry
 */
export interface PageEntry {
  path: string
  hash: string
  sourceHash: string
  lastBuilt: number
  size: number
}

/**
 * Build manifest
 */
export interface BuildManifest {
  version: string
  baseUrl: string
  buildTime: number
  pages: Record<string, PageEntry>
}
