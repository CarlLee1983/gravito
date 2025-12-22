import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface RenderOptions {
  layout?: string // Legacy layout support
  [key: string]: unknown
}

export type HelperFunction = (
  args: Record<string, string | number | boolean>,
  data: Record<string, unknown>
) => string

interface RenderContext {
  sections: Map<string, string>
  stacks: Map<string, string[]>
}

export class TemplateEngine {
  private cache = new Map<string, string>()
  private viewsDir: string
  private helpers = new Map<string, HelperFunction>()

  constructor(viewsDir: string) {
    this.viewsDir = viewsDir
  }

  public registerHelper(name: string, fn: HelperFunction): void {
    this.helpers.set(name, fn)
  }

  public unregisterHelper(name: string): void {
    this.helpers.delete(name)
  }

  public render(
    view: string,
    data: Record<string, unknown> = {},
    options: RenderOptions = {}
  ): string {
    const context: RenderContext = {
      sections: new Map(),
      stacks: new Map(),
    }

    // 1. Load the initial view
    let template = this.readTemplate(view)

    // Merge options into data
    const viewData = { ...data, ...options }

    // 2. Handle Blade-style Layout Inheritance (@extends)
    const extendsMatch = template.match(/^\s*@extends\s*\(\s*['"](.+?)['"]\s*\)/m)

    if (extendsMatch) {
      const layoutName = extendsMatch[1]

      // Remove @extends line
      template = template.replace(extendsMatch[0], '')

      // Extract Sections (`@section('name')...@endsection`)
      this.extractSections(template, context)

      // Extract Stacks (`@push('name')...@endpush`)
      this.extractStacks(template, context)
      // Remove stacks from template to avoid processing them in sections if nested
      template = this.removeStacks(template)

      // Switch master template to the layout
      if (layoutName) {
        template = this.readTemplate(layoutName)
      }
    } else if (options.layout) {
      // Legacy "layout" option support
      const layoutContent = this.readTemplate(options.layout)
      context.sections.set('content', template)
      template = layoutContent
    }

    // 3. Compile the result
    return this.compile(template, viewData, context)
  }

  // --- Core Compilation Pipeline ---

  private compile(template: string, data: Record<string, unknown>, ctx: RenderContext): string {
    let result = template

    // 1. Process Includes (Recursive)
    result = this.processIncludes(result)

    // 2. Inject Layout Structure (@yield, @stack)
    // IMPORTANT: Inherited structure must be assembled BEFORE components are processed
    result = this.processYields(result, ctx)
    result = this.processStacks(result, ctx)

    // 3. Process Components <x-name> (Recursive)
    result = this.processComponents(result, data, ctx)

    // 4. Directives Upgrade (@if, @foreach) mapping to legacy logic
    result = this.processDirectives(result)

    // 5. Logic (Loops & Conditionals)
    result = this.processLoops(result, data)
    result = this.processConditionals(result, data)

    // 6. Helpers & Interpolation
    result = this.processHelpers(result, data)
    result = this.interpolate(result, data)

    return result
  }

  // --- Structural Processors ---

  private extractSections(template: string, ctx: RenderContext) {
    const sectionRegex = /@section\s*\(\s*['"](.+?)['"]\s*\)([\s\S]*?)@endsection/g
    let match
    while ((match = sectionRegex.exec(template)) !== null) {
      const name = match[1]
      const content = match[2]
      if (name && content) {
        ctx.sections.set(name, content.trim())
      }
    }
  }

  private extractStacks(template: string, ctx: RenderContext) {
    const pushRegex = /@push\s*\(\s*['"](.+?)['"]\s*\)([\s\S]*?)@endpush/g
    let match
    while ((match = pushRegex.exec(template)) !== null) {
      const name = match[1]
      const content = match[2]
      if (name && content) {
        if (!ctx.stacks.has(name)) {
          ctx.stacks.set(name, [])
        }
        ctx.stacks.get(name)!.push(content.trim())
      }
    }
  }

  private removeStacks(template: string): string {
    return template.replace(/@push\s*\(\s*['"](.+?)['"]\s*\)([\s\S]*?)@endpush/g, '')
  }

  private processYields(template: string, ctx: RenderContext): string {
    // @yield('name', 'default')
    return template.replace(/@yield\s*\(\s*['"](.+?)['"](?:\s*,\s*['"](.+?)['"])?\s*\)/g, (_, name, defaultValue) => {
      return ctx.sections.get(name) || defaultValue || ''
    })
  }

  private processStacks(template: string, ctx: RenderContext): string {
    // @stack('name')
    return template.replace(/@stack\s*\(\s*['"](.+?)['"]\s*\)/g, (_, name) => {
      const stack = ctx.stacks.get(name)
      return stack ? stack.join('\n') : ''
    })
  }

  // --- Component Processors ---

  private processComponents(template: string, data: Record<string, unknown>, ctx: RenderContext, depth = 0): string {
    if (depth > 10) throw new Error('Maximum component depth exceeded')

    let result = template
    let hasComponent = true

    while (hasComponent) {
      const startTagMatch = result.match(/<x-([a-zA-Z0-9-]+)([^>]*)>/)
      if (!startTagMatch) {
        hasComponent = false
        break
      }

      const tagName = startTagMatch[1]
      const attrsString = startTagMatch[2]
      const startIndex = startTagMatch.index!
      const contentStartIndex = startIndex + startTagMatch[0].length

      // Find closing tag </x-tagName>
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

      // We found the component block
      const innerContent = result.substring(contentStartIndex, finalCloseIndex)

      // Process Attributes
      const componentData = this.parseAttributes(attrsString || '')

      // Load Component Template
      let componentTemplate = ''
      try {
        componentTemplate = this.readTemplate(`components/${tagName}`)
      } catch (e) {
        console.warn(`Component x-${tagName} not found.`)
        // Replace with comment to prevent infinite loop
        const fullMatch = result.substring(startIndex, finalCloseIndex + `</x-${tagName}>`.length)
        result = result.replace(fullMatch, `<!-- Component ${tagName} not found -->`)
        continue
      }

      // Handle Slots
      const slots: Record<string, string> = {
        slot: innerContent
      }

      let processedDefaultSlot = innerContent
      const slotRegex = /<x-slot:([a-zA-Z0-9-]+)>([\s\S]*?)<\/x-slot:\1>/g
      processedDefaultSlot = processedDefaultSlot.replace(slotRegex, (_, slotName, slotContent) => {
        slots[slotName] = this.compile(slotContent, data, ctx)
        return ''
      })
      slots.slot = this.compile(processedDefaultSlot.trim(), data, ctx)

      const componentScope = { ...componentData, ...slots }

      let renderedComponent = this.compile(componentTemplate, componentScope, ctx)

      // Careful replacement
      const before = result.substring(0, startIndex)
      const after = result.substring(finalCloseIndex + `</x-${tagName}>`.length)
      result = before + renderedComponent + after
    }

    return result
  }

  private parseAttributes(attrString: string): Record<string, unknown> {
    const args: Record<string, unknown> = {}
    const pattern = /([a-zA-Z0-9-:]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g

    let match
    while ((match = pattern.exec(attrString)) !== null) {
      const key = match[1]
      const valDouble = match[2]
      const valSingle = match[3]
      const valRaw = match[4]

      if (!key) continue

      if (valDouble !== undefined) args[key] = valDouble
      else if (valSingle !== undefined) args[key] = valSingle
      else if (valRaw !== undefined) {
        if (valRaw === 'true') args[key] = true
        else if (valRaw === 'false') args[key] = false
        else if (!isNaN(Number(valRaw))) args[key] = Number(valRaw)
        else args[key] = valRaw
      } else {
        args[key] = true
      }
    }
    return args
  }

  // --- Directives & Legacy ---

  private processDirectives(template: string): string {
    return template
      .replace(/@if\s*\((.+?)\)/g, '{{#if $1}}')
      .replace(/@else/g, '{{else}}')
      .replace(/@endif/g, '{{/if}}')
      .replace(/@unless\s*\((.+?)\)/g, '{{#unless $1}}')
      .replace(/@endunless/g, '{{/unless}}')
  }

  // --- Existing Methods (Preserved) ---

  private readTemplate(name: string): string {
    const cached = this.cache.get(name)
    if (cached !== undefined) return cached

    const path = resolve(this.viewsDir, `${name}.html`)
    if (!existsSync(path)) {
      throw new Error(`View not found: ${path}`)
    }

    const content = readFileSync(path, 'utf-8')
    if (process.env.NODE_ENV === 'production') {
      this.cache.set(name, content)
    }
    return content
  }

  private processIncludes(template: string, depth = 0): string {
    if (depth > 10) throw new Error('Maximum include depth exceeded')

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
        if (!Array.isArray(items) || items.length === 0) return ''
        return items.map((item) => {
          const itemData = typeof item === 'object' && item !== null
            ? { ...data, ...(item as object), this: item }
            : { ...data, this: item }
          let inner = content
          inner = this.processLoops(inner, itemData)
          inner = this.processConditionals(inner, itemData)
          inner = this.interpolate(inner, itemData)
          return inner
        }).join('')
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
        if (!helper) return match
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
    let match: RegExpExecArray | null = argPattern.exec(argsString)
    while (match !== null) {
      const key = match[1]
      if (key) {
        if (match[3] !== undefined) args[key] = match[3]
        else if (match[4] !== undefined) args[key] = match[4]
        else if (match[5] !== undefined) args[key] = Number(match[5])
        else if (match[6] !== undefined) args[key] = match[6] === 'true'
        else if (match[7] !== undefined) args[key] = match[7]
      }
      match = argPattern.exec(argsString)
    }
    return args
  }

  private interpolate(template: string, data: Record<string, unknown>): string {
    const result = template.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
      const value = this.getNestedValue(data, key)
      return String(value ?? '')
    })
    return result.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const value = this.getNestedValue(data, key)
      return this.escapeHtml(String(value ?? ''))
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
      // @ts-expect-error: Dynamic access
      return prev ? prev[curr] : undefined
    }, obj)
  }
}
