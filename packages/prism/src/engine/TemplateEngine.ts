import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type CacheOptions, TemplateCache } from '../core/TemplateCache'
import { type HelperFunction, type RenderContext, TemplateCompiler } from '../core/TemplateCompiler'

export type { CacheOptions }
export type { HelperFunction, RenderContext }

/**
 * Options for rendering templates.
 *
 * Provides configuration for the rendering process, including layout specification
 * and dynamic data injection.
 *
 * @example
 * ```typescript
 * const options: RenderOptions = {
 *   layout: 'layouts/main',
 *   title: 'Home Page',
 *   user: { name: 'John' }
 * };
 * ```
 *
 * @public
 * @since 3.0.0
 */
export interface RenderOptions {
  /** Legacy layout support - specifies a layout file to use */
  layout?: string // Legacy layout support
  /** Additional data to pass to the template */
  [key: string]: unknown
}

/**
 * Static regex constants for layout detection
 */
const EXTENDS_REGEX = /^\s*@extends\s*\(\s*['"](.+?)['"]\s*\)/m

/**
 * TemplateEngine is the core rendering engine for Gravito Prism.
 *
 * It implements a Blade-like syntax with support for inheritance, components, and custom helpers.
 * Key features include:
 * - Layout inheritance with `@extends`, `@section`, and `@yield`.
 * - Content stacks with `@push` and `@stack`.
 * - Reusable components using `<x-component>` syntax.
 * - Dynamic data interpolation and control structures (`@if`, `@foreach`).
 *
 * @example
 * ```typescript
 * const engine = new TemplateEngine('./views');
 *
 * // Register a helper
 * engine.registerHelper('upper', (args) => String(args.value).toUpperCase());
 *
 * // Render a template
 * const html = engine.render('home', {
 *   name: 'World',
 *   showSubtitle: true
 * });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class TemplateEngine {
  private cache: TemplateCache
  private viewsDir: string
  private helpers = new Map<string, HelperFunction>()
  private compiler: TemplateCompiler

  /**
   * Create a new TemplateEngine instance.
   *
   * @param viewsDir - Absolute path to the views directory containing template files
   * @param cacheOptions - Optional cache configuration for template optimization
   *
   * @example
   * ```typescript
   * const engine = new TemplateEngine('./src/views', {
   *   maxSize: 1000,
   *   enabled: process.env.NODE_ENV === 'production'
   * });
   * ```
   *
   * @public
   * @since 3.0.0
   */
  constructor(viewsDir: string, cacheOptions?: CacheOptions) {
    this.viewsDir = viewsDir
    this.cache = new TemplateCache(cacheOptions)
    this.compiler = new TemplateCompiler()
  }

  /**
   * Register a custom helper function.
   *
   * Helpers can be invoked from templates using `{{helperName arg=value}}` syntax.
   * They receive arguments as key-value pairs and must return a string.
   *
   * @param name - Helper name (must be alphanumeric with underscores, no spaces)
   * @param fn - Helper function that takes arguments and returns HTML string
   *
   * @example
   * ```typescript
   * engine.registerHelper('formatDate', (args) => {
   *   const date = new Date(args.date as string);
   *   return date.toLocaleDateString();
   * });
   *
   * // In template:
   * // {{formatDate date="2024-01-01"}}
   * ```
   *
   * @public
   * @since 3.0.0
   */
  public registerHelper(name: string, fn: HelperFunction): void {
    this.helpers.set(name, fn)
  }

  /**
   * Unregister a previously registered helper function.
   *
   * @param name - Name of the helper to remove
   *
   * @example
   * ```typescript
   * engine.unregisterHelper('formatDate');
   * ```
   *
   * @public
   * @since 3.0.0
   */
  public unregisterHelper(name: string): void {
    this.helpers.delete(name)
  }

  /**
   * Render a template with data.
   *
   * Processes the template through the full rendering pipeline including:
   * - Layout inheritance (`@extends`)
   * - Sections and yields (`@section`, `@yield`)
   * - Content stacks (`@push`, `@stack`)
   * - Components (`<x-component>`)
   * - Includes (`@include`)
   * - Control structures (`@if`, `@foreach`)
   * - Variable interpolation (`{{ var }}`)
   *
   * @param view - Template name (relative to viewsDir, without .html extension)
   * @param data - Data to pass to the template
   * @param options - Render options including legacy layout support
   * @returns Rendered HTML string
   *
   * @throws {Error} If template file is not found
   * @throws {Error} If maximum component depth (10) is exceeded
   * @throws {Error} If maximum include depth (50) is exceeded
   *
   * @example
   * ```typescript
   * const html = engine.render('user/profile', {
   *   user: { name: 'John', email: 'john@example.com' },
   *   isAdmin: true
   * });
   * ```
   *
   * @public
   * @since 3.0.0
   */
  public render(
    view: string,
    data: Record<string, unknown> = {},
    options: RenderOptions = {}
  ): string {
    const context: RenderContext = {
      sections: new Map(),
      stacks: new Map(),
    }

    let template = this.readTemplate(view)
    const viewData = { ...data, ...options }

    const extendsMatch = template.match(EXTENDS_REGEX)

    if (extendsMatch) {
      const layoutName = extendsMatch[1]
      template = template.replace(extendsMatch[0], '')
      this.compiler.extractSections(template, context)
      this.compiler.extractStacks(template, context)
      template = this.compiler.removeStacks(template)
      if (layoutName) {
        template = this.readTemplate(layoutName)
      }
    } else if (options.layout) {
      const layoutContent = this.readTemplate(options.layout)
      context.sections.set('content', template)
      template = layoutContent
    }

    return this.compiler.compile(template, viewData, context, this.helpers, (name: string) =>
      this.readTemplate(name)
    )
  }

  /**
   * Read template from file system with caching
   */
  private readTemplate(name: string): string {
    const cached = this.cache.getSource(name)
    if (cached !== null) {
      return cached
    }

    const path = resolve(this.viewsDir, `${name}.html`)
    if (!existsSync(path)) {
      throw new Error(`View not found: ${path}`)
    }

    const content = readFileSync(path, 'utf-8')
    this.cache.setSource(name, content)
    return content
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics object
   * @public
   * @since 3.1.0
   */
  public getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Clear template cache
   *
   * @public
   * @since 3.1.0
   */
  public clearCache(): void {
    this.cache.clear()
  }
}
