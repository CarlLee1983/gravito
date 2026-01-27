import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type CacheOptions, TemplateCache } from '../core/TemplateCache'
import { type HelperFunction, type RenderContext, TemplateCompiler } from '../core/TemplateCompiler'

export type { CacheOptions }
export type { HelperFunction, RenderContext }

/**
 * Options for rendering templates.
 *
 * Configures the rendering context, including data injection and legacy layout support.
 * Used to pass dynamic data to templates and control layout inheritance.
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
  /** Legacy layout file to extend (optional). Prefer `@extends` directive in templates. */
  layout?: string
  /** Dynamic data to be available as variables in the template. */
  [key: string]: unknown
}

/**
 * Static regex constants for layout detection
 */
const EXTENDS_REGEX = /^\s*@extends\s*\(\s*['"](.+?)['"]\s*\)/m

/**
 * Core template rendering engine for Gravito Prism.
 *
 * Implements a Blade-inspired syntax for server-side rendering.
 *
 * Key features:
 * - **Inheritance**: Master layouts with `@extends`, `@section`, and `@yield`.
 * - **Components**: Reusable UI blocks with `<x-component>` syntax.
 * - **Directives**: Control structures like `@if`, `@foreach`, `@push`, and `@stack`.
 * - **Extensibility**: Custom helper registration.
 *
 * Designed for performance with built-in caching and optimized compilation.
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
   * Initializes the engine with a specific views directory and optional caching configuration.
   *
   * @param viewsDir - Absolute path to the directory containing template files.
   * @param cacheOptions - Configuration for the internal LRU cache.
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
   * Helpers extend the template engine's capabilities, allowing custom logic to be invoked
   * from within templates using `{{helperName arg=value}}`.
   *
   * @param name - Unique identifier for the helper (alphanumeric, underscores allowed).
   * @param fn - The function to execute when the helper is invoked.
   *
   * @example
   * ```typescript
   * engine.registerHelper('formatDate', (args) => {
   *   const date = new Date(args.date as string);
   *   return date.toLocaleDateString();
   * });
   *
   * // Usage in template: {{formatDate date="2024-01-01"}}
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
   * Removes a helper from the registry, making it unavailable in subsequent renders.
   *
   * @param name - The name of the helper to remove.
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
   * Compiles and executes a template file, resolving all directives, components,
   * inheritance chains, and variable interpolations.
   *
   * The rendering pipeline includes:
   * 1. **Inheritance resolution**: resolving `@extends` and layouts.
   * 2. **Section extraction**: processing `@section` and `@yield`.
   * 3. **Stack processing**: handling `@push` and `@stack`.
   * 4. **Component expansion**: rendering `<x-component>` tags.
   * 5. **Directives & Logic**: executing `@if`, `@foreach`, etc.
   *
   * @param view - Template name relative to `viewsDir` (without `.html` extension).
   * @param data - Key-value pairs to inject as variables into the template.
   * @param options - Additional render options (e.g., legacy layout override).
   * @returns The fully rendered HTML string.
   *
   * @throws {Error} If the template file is not found in `viewsDir`.
   * @throws {Error} If maximum recursion depth is exceeded for components (10) or includes (50).
   * @throws {Error} If a syntax error occurs during template compilation.
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
   * Read template from file system with caching.
   *
   * @param name - Template name.
   * @returns Template content.
   * @throws {Error} If file does not exist.
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
   * Get current cache statistics.
   *
   * Useful for performance monitoring and debugging cache efficiency.
   *
   * @returns Object containing hits, misses, evictions, and total size.
   *
   * @example
   * ```typescript
   * const stats = engine.getCacheStats();
   * console.log(`Cache hit rate: ${stats.hits / (stats.hits + stats.misses)}`);
   * ```
   *
   * @public
   * @since 3.1.0
   */
  public getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Clear the entire template cache.
   *
   * Forces a reload of all templates from disk on next render.
   * Useful during development or when deploying updates without restarting.
   *
   * @example
   * ```typescript
   * engine.clearCache();
   * ```
   *
   * @public
   * @since 3.1.0
   */
  public clearCache(): void {
    this.cache.clear()
  }
}
