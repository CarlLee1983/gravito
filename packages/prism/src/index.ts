import { resolve } from 'node:path'
import type {
  GravitoContext,
  GravitoNext,
  GravitoOrbit,
  PlanetCore,
  ViewService,
} from '@gravito/core'
import { type CacheOptions, TemplateEngine } from './engine/TemplateEngine'
import { createImageHelper } from './helpers/image'
import { createMarkdownHelper } from './helpers/markdown'
import { createSanitizeHelper } from './helpers/sanitize'
import { StaticSiteGenerator } from './ssg/StaticSiteGenerator'

export interface SSGOptions {
  concurrency?: number
  timeout?: number
  incremental?: boolean
  manifestPath?: string
}

export interface OrbitPrismOptions {
  cache?: CacheOptions
  ssg?: SSGOptions
}

/**
 * OrbitPrism provides a flexible template rendering engine for Gravito.
 *
 * It integrates with PlanetCore to provide a full-featured view engine with:
 * - Blade-like syntax (`@extends`, `@section`, `@yield`).
 * - Component-based UI building (`<x-component>`).
 * - Built-in performance optimizations for images.
 * - Automatic middleware injection (exposed as `c.get('view')`).
 *
 * @example
 * ```typescript
 * import { OrbitPrism } from '@gravito/prism';
 *
 * const prism = new OrbitPrism();
 * core.addOrbit(prism);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class OrbitPrism implements GravitoOrbit {
  private options?: OrbitPrismOptions

  /**
   * Create a new OrbitPrism instance.
   *
   * @param options - Optional configuration for the orbit
   *
   * @example
   * ```typescript
   * const prism = new OrbitPrism({
   *   cache: {
   *     maxSize: 1000,
   *     enabled: process.env.NODE_ENV === 'production'
   *   }
   * });
   * ```
   *
   * @public
   * @since 3.0.0
   */
  constructor(options?: OrbitPrismOptions) {
    this.options = options
  }

  /**
   * Install the orbit into PlanetCore.
   *
   * This method is called by PlanetCore during the boot sequence.
   * It initializes the template engine, registers helpers, and sets up middleware.
   *
   * @param core - The PlanetCore instance
   *
   * @public
   * @since 3.0.0
   */
  install(core: PlanetCore): void {
    core.logger.info('[OrbitPrism] Initializing View Engine (Exposed as: view)')

    const configuredPath = core.config.get<string>('VIEW_DIR', 'src/views')
    const viewsDir = resolve(process.cwd(), configuredPath)

    const engine = new TemplateEngine(viewsDir, this.options?.cache)

    engine.registerHelper('image', createImageHelper())
    engine.registerHelper('markdown', createMarkdownHelper())
    engine.registerHelper('sanitize', createSanitizeHelper())

    core.adapter.use('*', async (c: GravitoContext, next: GravitoNext) => {
      c.set('view', engine)
      return await next()
    })

    core.container.instance('view', engine)

    core.hooks.doAction('view:helpers:register', engine)

    const ssg = new StaticSiteGenerator(core, this.options?.ssg)
    core.container.singleton('ssg', () => ssg)
    core.logger.info('[OrbitPrism] SSG registered (Exposed as: ssg)')
  }
}

// Module augmentation for GravitoVariables (abstraction layer)
declare module '@gravito/core' {
  interface GravitoVariables {
    /** View engine for rendering templates */
    view?: TemplateEngine
  }
}

// ============================================
// Core exports (backward compatible)
// ============================================
export type { ViewService, CacheOptions }
export { TemplateEngine }

// ============================================
// Image exports
// ============================================
export { Image, type ImageProps } from './components/Image'
export type { CacheStats } from './core/TemplateCache'
// ============================================
// New exports (Phase 1-5)
// ============================================
export { TemplateCache } from './core/TemplateCache'
export type { CompiledMetadata, CompilerOptions } from './core/TemplateCompiler'
export { TemplateCompiler } from './core/TemplateCompiler'
export type { HelperFunction, RenderContext } from './engine/TemplateEngine'
export { createImageHelper } from './helpers/image'
export { createMarkdownHelper } from './helpers/markdown'
export { createSanitizeHelper } from './helpers/sanitize'
export { defaultLoader, type ImageCDNLoader, type TransformOptions } from './image/ImageCDNLoader'
export {
  calculateLQIPDimensions,
  calculateMinLQIPSize,
  generateColorPlaceholder,
  generatePlaceholderStyles,
  hexToRGB,
} from './image/ImagePlaceholder'
export { type ImageOptions, ImageService } from './image/ImageService'
export { Sanitizer, type SanitizerOptions, sanitizeHtml, stripHtmlTags } from './security/Sanitizer'
export {
  type DynamicRoute,
  DynamicRouteResolver,
  type ResolvedRoute,
} from './ssg/DynamicRouteResolver'
export { IncrementalBuilder } from './ssg/IncrementalBuilder'
// ============================================
// SSG exports
// ============================================
export { type ExportOptions, StaticSiteGenerator } from './ssg/StaticSiteGenerator'
export type {
  ArtDirectionConfig,
  CDNLoaderOptions,
  PlaceholderOptions,
} from './types/image'
export type {
  BuildManifest,
  DynamicRouteConfig,
  PageEntry,
  ResolvedRouteConfig,
  SSGExportOptions,
} from './types/ssg'
// ============================================
// Type re-exports (unified types)
// ============================================
export type {
  CompiledMetadata as TemplateMetadata,
  RenderOptions,
} from './types/template'
