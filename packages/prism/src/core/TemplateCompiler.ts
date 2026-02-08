/**
 * TemplateCompiler - Core logic for compiling templates into HTML.
 *
 * Responsibilities:
 * - Parsing and processing Blade-like directives (`@if`, `@foreach`, `@section`).
 * - Resolving component tags (`<x-component>`).
 * - executing helper functions.
 * - Interpolating variables.
 *
 * This class handles the low-level string manipulation required to transform
 * a raw template string into a final rendered output.
 *
 * @public
 * @since 3.1.0
 */

/**
 * Render context for managing template inheritance and stacking.
 *
 * Stores content captured by `@section` and `@push` directives to be yielded
 * or stacked in layouts.
 */
export interface RenderContext {
  /** Sections captured from `@section` directives, mapped by name. */
  sections: Map<string, string>
  /** Stacks captured from `@push` directives, mapped by stack name. */
  stacks: Map<string, string[]>
}

/**
 * Metadata extracted from a compiled template.
 *
 * Used to optimize rendering by identifying which features are present.
 */
export interface CompiledMetadata {
  hasConditionals: boolean
  hasLoops: boolean
  hasComponents: boolean
}

/**
 * Signature for custom helper functions.
 *
 * @param args - Key-value arguments passed from the template (e.g., `arg="value"`).
 * @param data - The full data context available to the template.
 * @returns The generated HTML string.
 */
export type HelperFunction = (
  args: Record<string, string | number | boolean>,
  data: Record<string, unknown>
) => string

/**
 * Configuration options for the compiler.
 */
export interface CompilerOptions {
  /** If true, throws errors when accessing undefined variables. */
  strict?: boolean
  /** If true, includes source map information for debugging. */
  debug?: boolean
}

/**
 * Static regex constants for better performance
 */
const SECTION_REGEX = /@section\s*\(\s*['"](.+?)['"]\s*\)([\s\S]*?)@endsection/g
const PUSH_REGEX = /@push\s*\(\s*['"](.+?)['"]\s*\)([\s\S]*?)@endpush/g
const YIELD_REGEX = /@yield\s*\(\s*['"](.+?)['"](?:\s*,\s*['"](.+?)['"])?\s*\)/g
const STACK_REGEX = /@stack\s*\(\s*['"](.+?)['"]\s*\)/g
const COMPONENT_TAG_REGEX = /<x-([a-zA-Z0-9-]+)([^>]*)>/
const INTERPOLATE_REGEX = /\{\{\{?\s*([\w.]+)\s*\}?\}\}/g

/**
 * TemplateCompiler handles the transformation of template source code into HTML.
 *
 * It provides the compilation pipeline that processes:
 * 1. Includes
 * 2. Inheritance (Yields & Stacks)
 * 3. Components
 * 4. Directives (@if, @foreach)
 * 5. Helpers
 * 6. Interpolation
 *
 * @example
 * ```typescript
 * const compiler = new TemplateCompiler();
 * const ctx = { sections: new Map(), stacks: new Map() };
 * const html = compiler.compile(
 *   '<h1>{{ title }}</h1>',
 *   { title: 'Hello' },
 *   ctx,
 *   helpers,
 *   (name) => loadTemplate(name)
 * );
 * ```
 *
 * @public
 * @since 3.1.0
 */
export class TemplateCompiler {
  /**
   * Compile template source to rendered HTML.
   *
   * Executes the full compilation pipeline, transforming a raw template string
   * into final HTML by processing includes, inheritance, components, directives,
   * and variable interpolation.
   *
   * The pipeline order is critical for correct rendering:
   * 1. **Includes**: Resolves `@include` and `{{include}}` recursively.
   * 2. **Inheritance**: Resolves `@yield` and `@stack` placeholders.
   * 3. **Components**: Expands `<x-component>` tags into their respective templates.
   * 4. **Directives**: Transforms `@if`, `@foreach`, etc., into internal logic.
   * 5. **Helpers**: Executes custom helper functions.
   * 6. **Interpolation**: Replaces `{{var}}` and `{{{raw}}}` with data values.
   *
   * @param template - Raw template source string to compile.
   * @param data - Data context containing variables available to the template.
   * @param ctx - Render context for managing shared state like sections and stacks.
   * @param helpers - Registry of custom helper functions.
   * @param readTemplate - Callback function to retrieve template source by name.
   * @returns The fully rendered HTML string.
   *
   * @throws {Error} If maximum recursion depth (10) is exceeded for includes or components.
   * @throws {Error} If a component template cannot be found.
   *
   * @example
   * ```typescript
   * const compiler = new TemplateCompiler();
   * const html = compiler.compile(
   *   '<div>{{ message }}</div>',
   *   { message: 'Hello World' },
   *   { sections: new Map(), stacks: new Map() },
   *   new Map(),
   *   (name) => fs.readFileSync(`${name}.html`, 'utf-8')
   * );
   * ```
   *
   * @public
   * @since 3.1.0
   */
  compile(
    template: string,
    data: Record<string, unknown>,
    ctx: RenderContext,
    helpers: Map<string, HelperFunction>,
    readTemplate: (name: string) => string
  ): string {
    let result = template
    result = this.processIncludes(result, readTemplate)
    result = this.processYields(result, ctx)
    result = this.processStacks(result, ctx)
    result = this.processComponents(result, data, ctx, helpers, readTemplate)
    result = this.processDirectives(result)
    result = this.processLoops(result, data)
    result = this.processConditionals(result, data)
    result = this.processHelpers(result, data, helpers)
    result = this.interpolate(result, data)
    return result
  }

  /**
   * Extract sections from a template.
   *
   * Parses `@section('name')...@endsection` blocks and stores them in the context.
   * Used during the inheritance phase to capture child content.
   *
   * @param template - Template source to parse.
   * @param ctx - Render context where sections will be stored.
   */
  extractSections(template: string, ctx: RenderContext): void {
    for (const match of template.matchAll(SECTION_REGEX)) {
      const name = match[1]
      const content = match[2]
      if (name && content) {
        ctx.sections.set(name, content.trim())
      }
    }
  }

  /**
   * Extract stacks from a template.
   *
   * Parses `@push('name')...@endpush` blocks and appends them to the named stack in the context.
   * Used to aggregate scripts or styles from multiple partials.
   *
   * @param template - Template source to parse.
   * @param ctx - Render context where stacks will be stored.
   */
  extractStacks(template: string, ctx: RenderContext): void {
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

  /**
   * Remove `@push` directives from the template.
   *
   * Cleans up `@push` blocks after they have been extracted, so they don't appear in the output.
   *
   * @param template - Template source.
   * @returns Cleaned template source.
   */
  removeStacks(template: string): string {
    return template.replace(PUSH_REGEX, '')
  }

  /**
   * Process @yield directives
   */
  private processYields(template: string, ctx: RenderContext): string {
    return template.replace(YIELD_REGEX, (_, name, defaultValue) => {
      return ctx.sections.get(name) || defaultValue || ''
    })
  }

  /**
   * Process @stack directives
   */
  private processStacks(template: string, ctx: RenderContext): string {
    return template.replace(STACK_REGEX, (_, name) => {
      const stack = ctx.stacks.get(name)
      return stack ? stack.join('\n') : ''
    })
  }

  /**
   * Process @include directives
   */
  private processIncludes(
    template: string,
    readTemplate: (name: string) => string,
    depth = 0
  ): string {
    if (depth > 10) {
      throw new Error('Maximum include depth exceeded')
    }

    const regex = /(?:\{\{\s*include\s+['"](.+?)['"]\s*\}\}|@include\s*\(\s*['"](.+?)['"]\s*\))/g

    return template.replace(regex, (_, p1, p2) => {
      const partialName = p1 || p2
      const partialContent = readTemplate(partialName)
      return this.processIncludes(partialContent, readTemplate, depth + 1)
    })
  }

  /**
   * Process components (<x-component>)
   */
  private processComponents(
    template: string,
    data: Record<string, unknown>,
    ctx: RenderContext,
    helpers: Map<string, HelperFunction>,
    readTemplate: (name: string) => string,
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
        componentTemplate = readTemplate(`components/${tagName}`)
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
        slots[slotName] = this.compile(slotContent, data, ctx, helpers, readTemplate)
        return ''
      })
      slots.slot = this.compile(processedDefaultSlot.trim(), data, ctx, helpers, readTemplate)

      const componentScope = { ...componentData, ...slots }
      const renderedComponent = this.compile(
        componentTemplate,
        componentScope,
        ctx,
        helpers,
        readTemplate
      )

      const before = result.substring(0, startIndex)
      const after = result.substring(finalCloseIndex + `</x-${tagName}>`.length)
      result = before + renderedComponent + after
    }

    return result
  }

  /**
   * Parse HTML attributes from string
   */
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

  /**
   * Process directive transformations (@if, @else, etc.)
   */
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

  /**
   * Process loop directives
   */
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

  /**
   * Process conditional directives
   */
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

  /**
   * Process helper invocations
   */
  private processHelpers(
    template: string,
    data: Record<string, unknown>,
    helpers: Map<string, HelperFunction>
  ): string {
    return template.replace(
      /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+([^}]+)\s*\}\}/g,
      (match, helperName, argsString) => {
        const helper = helpers.get(helperName)
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

  /**
   * Parse helper arguments from string
   */
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

  /**
   * Interpolate variables in template
   */
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

  /**
   * Escape HTML special characters
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((prev, curr) => {
      if (prev && typeof prev === 'object') {
        return (prev as Record<string, unknown>)[curr]
      }
      return undefined
    }, obj)
  }

  /**
   * Get metadata about template
   */
  getMetadata(source: string): CompiledMetadata {
    return {
      hasConditionals: /@if/.test(source) || /\{\{#if/.test(source),
      hasLoops: /@foreach/.test(source) || /\{\{#each/.test(source),
      hasComponents: /<x-\w+/.test(source),
    }
  }
}
