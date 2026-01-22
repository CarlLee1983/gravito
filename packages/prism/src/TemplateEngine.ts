import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type CacheOptions, TemplateCache } from './core/TemplateCache'

export type { CacheOptions }

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
 * Custom helper function signature.
 *
 * Helpers are used to extend the template engine with custom logic that can be
 * invoked directly from templates using the `{{ helperName arg1=val1 }}` syntax.
 *
 * @param args - Arguments passed to the helper in the template as key-value pairs.
 * @param data - Global data context of the template, providing access to all template variables.
 * @returns A string to be injected into the rendered HTML.
 *
 * @example
 * ```typescript
 * const uppercase: HelperFunction = (args) => {
 *   return String(args.value).toUpperCase();
 * };
 * ```
 *
 * @public
 * @since 3.0.0
 */
export type HelperFunction = (
  /** Arguments passed to the helper in the template */
  args: Record<string, string | number | boolean>,
  /** Global data context of the template */
  data: Record<string, unknown>
) => string

/**
 * Internal rendering context for inheritance and stacks.
 * @internal
 */
interface RenderContext {
  /** Sections captured from @section directives */
  sections: Map<string, string>
  /** Stacks captured from @push directives */
  stacks: Map<string, string[]>
}

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
/**
 * Static regex constants for better performance
 */
const EXTENDS_REGEX = /^\s*@extends\s*\(\s*['"](.+?)['"]\s*\)/m
const SECTION_REGEX = /@section\s*\(\s*['"](.+?)['"]\s*\)([\s\S]*?)@endsection/g
const PUSH_REGEX = /@push\s*\(\s*['"](.+?)['"]\s*\)([\s\S]*?)@endpush/g
const YIELD_REGEX = /@yield\s*\(\s*['"](.+?)['"](?:\s*,\s*['"](.+?)['"])?\s*\)/g
const STACK_REGEX = /@stack\s*\(\s*['"](.+?)['"]\s*\)/g
const COMPONENT_TAG_REGEX = /<x-([a-zA-Z0-9-]+)([^>]*)>/
const INTERPOLATE_REGEX = /\{\{\{?\s*([\w.]+)\s*\}?\}\}/g

export class TemplateEngine {
  private cache: TemplateCache
  private viewsDir: string
  private helpers = new Map<string, HelperFunction>()

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
      this.extractSections(template, context)
      this.extractStacks(template, context)
      template = this.removeStacks(template)
      if (layoutName) {
        template = this.readTemplate(layoutName)
      }
    } else if (options.layout) {
      const layoutContent = this.readTemplate(options.layout)
      context.sections.set('content', template)
      template = layoutContent
    }

    return this.compile(template, viewData, context)
  }

  private compile(template: string, data: Record<string, unknown>, ctx: RenderContext): string {
    let result = template
    result = this.processIncludes(result)
    result = this.processYields(result, ctx)
    result = this.processStacks(result, ctx)
    result = this.processComponents(result, data, ctx)
    result = this.processDirectives(result)
    result = this.processLoops(result, data)
    result = this.processConditionals(result, data)
    result = this.processHelpers(result, data)
    result = this.interpolate(result, data)
    return result
  }

  private extractSections(template: string, ctx: RenderContext) {
    for (const match of template.matchAll(SECTION_REGEX)) {
      const name = match[1]
      const content = match[2]
      if (name && content) {
        ctx.sections.set(name, content.trim())
      }
    }
  }

  private extractStacks(template: string, ctx: RenderContext) {
    for (const match of template.matchAll(PUSH_REGEX)) {
      const name = match[1]
      const content = match[2]
      if (name && content) {
        if (!ctx.stacks.has(name)) {
          ctx.stacks.set(name, [])
        }
        ctx.stacks.get(name)?.push(content.trim())
      }
    }
  }

  private removeStacks(template: string): string {
    return template.replace(PUSH_REGEX, '')
  }

  private processYields(template: string, ctx: RenderContext): string {
    return template.replace(YIELD_REGEX, (_, name, defaultValue) => {
      return ctx.sections.get(name) || defaultValue || ''
    })
  }

  private processStacks(template: string, ctx: RenderContext): string {
    return template.replace(STACK_REGEX, (_, name) => {
      const stack = ctx.stacks.get(name)
      return stack ? stack.join('\n') : ''
    })
  }

  private processComponents(
    template: string,
    data: Record<string, unknown>,
    ctx: RenderContext,
    depth = 0
  ): string {
    if (depth > 10) {
      throw new Error('Maximum component depth exceeded')
    }

    let result = template
    let hasComponent = true

    while (hasComponent) {
      const startTagMatch = result.match(COMPONENT_TAG_REGEX)
      if (!startTagMatch) {
        hasComponent = false
        break
      }

      const tagName = startTagMatch[1]
      const attrsString = startTagMatch[2]
      const startIndex = startTagMatch.index ?? 0
      const contentStartIndex = startIndex + startTagMatch[0].length

      let depthCounter = 1
      let searchIndex = contentStartIndex
      let finalCloseIndex = -1

      while (depthCounter > 0) {
        const nextOpen = result.indexOf(`<x-${tagName}`, searchIndex)
        const nextClose = result.indexOf(`</x-${tagName}>`, searchIndex)

        if (nextClose === -1) {
          return result
        }

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depthCounter++
          searchIndex = nextOpen + 1
        } else {
          depthCounter--
          searchIndex = nextClose + 1
          if (depthCounter === 0) {
            finalCloseIndex = nextClose
          }
        }
      }

      const innerContent = result.substring(contentStartIndex, finalCloseIndex)
      const componentData = this.parseAttributes(attrsString || '')

      let componentTemplate = ''
      try {
        componentTemplate = this.readTemplate(`components/${tagName}`)
      } catch (_e) {
        const fullMatch = result.substring(startIndex, finalCloseIndex + `</x-${tagName}>`.length)
        result = result.replace(fullMatch, `<!-- Component ${tagName} not found -->`)
        continue
      }

      const slots: Record<string, string> = {
        slot: innerContent,
      }

      let processedDefaultSlot = innerContent
      const slotRegex = /<x-slot:([a-zA-Z0-9-]+)>([\s\S]*?)<\/x-slot:\1>/g
      processedDefaultSlot = processedDefaultSlot.replace(slotRegex, (_, slotName, slotContent) => {
        slots[slotName] = this.compile(slotContent, data, ctx)
        return ''
      })
      slots.slot = this.compile(processedDefaultSlot.trim(), data, ctx)

      const componentScope = { ...componentData, ...slots }
      const renderedComponent = this.compile(componentTemplate, componentScope, ctx)

      const before = result.substring(0, startIndex)
      const after = result.substring(finalCloseIndex + `</x-${tagName}>`.length)
      result = before + renderedComponent + after
    }

    return result
  }

  private parseAttributes(attrString: string): Record<string, unknown> {
    const args: Record<string, unknown> = {}
    const pattern = /([a-zA-Z0-9-:]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g

    for (const match of attrString.matchAll(pattern)) {
      const key = match[1]
      const valDouble = match[2]
      const valSingle = match[3]
      const valRaw = match[4]

      if (!key) {
        continue
      }

      if (valDouble !== undefined) {
        args[key] = valDouble
      } else if (valSingle !== undefined) {
        args[key] = valSingle
      } else if (valRaw !== undefined) {
        if (valRaw === 'true') {
          args[key] = true
        } else if (valRaw === 'false') {
          args[key] = false
        } else if (!Number.isNaN(Number(valRaw))) {
          args[key] = Number(valRaw)
        } else {
          args[key] = valRaw
        }
      } else {
        args[key] = true
      }
    }
    return args
  }

  private processDirectives(template: string): string {
    return template
      .replace(/@if\s*\((.+?)\)/g, '{{#if $1}}')
      .replace(/@else/g, '{{else}}')
      .replace(/@endif/g, '{{/if}}')
      .replace(/@unless\s*\((.+?)\)/g, '{{#unless $1}}')
      .replace(/@endunless/g, '{{/unless}}')
      .replace(/@inertia/g, '<div id="app" data-page=\'{{{ page }}}\'></div>')
      .replace(/@vite\s*\(\s*\[\s*(['"])(.+?)\1\s*\]\s*\)/g, (_, _quote, path) => {
        return `{{#if isDev}}
    <script type="module" src="http://localhost:5173/@vite/client"></script>
    <script type="module" src="http://localhost:5173/${path}"></script>
{{else}}
    <script type="module" src="/build/${path}"></script>
{{/if}}`
      })
      .replace(/@csrf/g, '<input type="hidden" name="_token" value="{{{ _token }}}">')
  }

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

  private processIncludes(template: string, depth = 0): string {
    if (depth > 10) {
      throw new Error('Maximum include depth exceeded')
    }

    const regex = /(?:\{\{\s*include\s+['"](.+?)['"]\s*\}\}|@include\s*\(\s*['"](.+?)['"]\s*\))/g

    return template.replace(regex, (_, p1, p2) => {
      const partialName = p1 || p2
      const partialContent = this.readTemplate(partialName)
      return this.processIncludes(partialContent, depth + 1)
    })
  }

  private processLoops(template: string, data: Record<string, unknown>): string {
    return template.replace(
      /\{\{\s*#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g,
      (_, key, content) => {
        const items = this.getNestedValue(data, key)
        if (!Array.isArray(items) || items.length === 0) {
          return ''
        }
        return items
          .map((item) => {
            const itemData =
              typeof item === 'object' && item !== null
                ? { ...data, ...(item as object), this: item }
                : { ...data, this: item }
            let inner = content
            inner = this.processLoops(inner, itemData)
            inner = this.processConditionals(inner, itemData)
            inner = this.interpolate(inner, itemData)
            return inner
          })
          .join('')
      }
    )
  }

  private processConditionals(template: string, data: Record<string, unknown>): string {
    let result = template.replace(
      /\{\{\s*#if\s+([\w.]+)\s*\}\}([\s\S]*?)(\{\{\s*else\s*\}\}([\s\S]*?))?\{\{\s*\/if\s*\}\}/g,
      (_, key, trueBlock, _elseGroup, falseBlock) => {
        const value = this.getNestedValue(data, key)
        return value ? trueBlock : falseBlock || ''
      }
    )
    result = result.replace(
      /\{\{\s*#unless\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/unless\s*\}\}/g,
      (_, key, content) => {
        const value = this.getNestedValue(data, key)
        return !value ? content : ''
      }
    )
    return result
  }

  private processHelpers(template: string, data: Record<string, unknown>): string {
    return template.replace(
      /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+([^}]+)\s*\}\}/g,
      (match, helperName, argsString) => {
        const helper = this.helpers.get(helperName)
        if (!helper) {
          return match
        }
        const args = this.parseHelperArgs(argsString)
        try {
          return helper(args, data)
        } catch (error) {
          console.error(`Error in helper "${helperName}":`, error)
          return ''
        }
      }
    )
  }

  private parseHelperArgs(argsString: string): Record<string, string | number | boolean> {
    const args: Record<string, string | number | boolean> = {}
    const argPattern = /(\w+)\s*=\s*("([^"]*)"|'([^']*)'|(\d+\.?\d*)|(true|false)|([^\s}]+))/g

    for (const match of argsString.matchAll(argPattern)) {
      const key = match[1]
      if (key) {
        if (match[3] !== undefined) {
          args[key] = match[3]
        } else if (match[4] !== undefined) {
          args[key] = match[4]
        } else if (match[5] !== undefined) {
          args[key] = Number(match[5])
        } else if (match[6] !== undefined) {
          args[key] = match[6] === 'true'
        } else if (match[7] !== undefined) {
          args[key] = match[7]
        }
      }
    }
    return args
  }

  private interpolate(template: string, data: Record<string, unknown>): string {
    return template.replace(INTERPOLATE_REGEX, (match, key) => {
      const value = this.getNestedValue(data, key)
      const str = String(value ?? '')
      // Check if it's triple braces (raw)
      if (match.startsWith('{{{')) {
        return str
      }
      return this.escapeHtml(str)
    })
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((prev, curr) => {
      if (prev && typeof prev === 'object') {
        return (prev as Record<string, unknown>)[curr]
      }
      return undefined
    }, obj)
  }
}
