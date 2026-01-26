/**
 * StubGenerator - Abstract template processor for generating code files.
 *
 * Provides a flexible system for processing stub templates with Handlebars,
 * enabling extensible code generation for any file type.
 *
 * @example
 * ```typescript
 * const generator = new StubGenerator({
 *   stubsDir: './stubs',
 *   outputDir: './src',
 * });
 *
 * await generator.generate('controller.stub', 'Controllers/UserController.ts', {
 *   name: 'User',
 *   namespace: 'App\\Controllers',
 * });
 * ```
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import Handlebars from 'handlebars'

/**
 * Variables passed to stub templates during processing.
 *
 * @public
 * @since 3.0.0
 */
export interface StubVariables {
  [key: string]: unknown
}

/**
 * Configuration for the `StubGenerator`.
 *
 * @public
 * @since 3.0.0
 */
export interface StubConfig {
  /** Directory containing the raw stub templates. */
  stubsDir: string

  /** Root directory for all generated files. */
  outputDir: string

  /** Default variables available to all templates. */
  defaultVariables?: StubVariables

  /** Optional custom Handlebars helper implementations. */
  helpers?: Record<string, Handlebars.HelperDelegate>
}

/**
 * StubGenerator processes template stubs using the Handlebars engine.
 *
 * It provides a rich set of built-in helpers for string manipulation
 * (camelCase, PascalCase, etc.) and handles file reading and writing.
 *
 * @public
 * @since 3.0.0
 */
export class StubGenerator {
  private config: StubConfig
  private handlebars: typeof Handlebars

  constructor(config: StubConfig) {
    this.config = config
    this.handlebars = Handlebars.create()

    // Register built-in helpers
    this.registerBuiltinHelpers()

    // Register custom helpers
    if (config.helpers) {
      for (const [name, helper] of Object.entries(config.helpers)) {
        this.handlebars.registerHelper(name, helper)
      }
    }
  }

  /**
   * Register built-in Handlebars helpers.
   */
  private registerBuiltinHelpers(): void {
    // Capitalize first letter
    this.handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) {
        return ''
      }
      return str.charAt(0).toUpperCase() + str.slice(1)
    })

    // Convert to lowercase
    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str?.toLowerCase() ?? ''
    })

    // Convert to uppercase
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str?.toUpperCase() ?? ''
    })

    // Convert to camelCase
    this.handlebars.registerHelper('camelCase', (str: string) => {
      if (!str) {
        return ''
      }
      return str
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^./, (c) => c.toLowerCase())
    })

    // Convert to PascalCase
    this.handlebars.registerHelper('pascalCase', (str: string) => {
      if (!str) {
        return ''
      }
      return str
        .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
        .replace(/^./, (c) => c.toUpperCase())
    })

    // Convert to snake_case
    this.handlebars.registerHelper('snakeCase', (str: string) => {
      if (!str) {
        return ''
      }
      return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/[-\s]+/g, '_')
    })

    // Convert to kebab-case
    this.handlebars.registerHelper('kebabCase', (str: string) => {
      if (!str) {
        return ''
      }
      return str
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '')
        .replace(/[_\s]+/g, '-')
    })

    // Pluralize (simple)
    this.handlebars.registerHelper('pluralize', (str: string) => {
      if (!str) {
        return ''
      }
      if (str.endsWith('y')) {
        return `${str.slice(0, -1)}ies`
      }
      if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) {
        return `${str}es`
      }
      return `${str}s`
    })

    // Get current date
    this.handlebars.registerHelper('date', (format?: string) => {
      const now = new Date()
      if (format === 'iso') {
        return now.toISOString()
      }
      if (format === 'year') {
        return now.getFullYear().toString()
      }
      return now.toISOString().split('T')[0]
    })

    // Conditional equal
    this.handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)

    // Conditional not equal
    this.handlebars.registerHelper('neq', (a: unknown, b: unknown) => a !== b)
  }

  /**
   * Generate a file from a stub template.
   *
   * @param stubName - Name of the stub file (relative to stubsDir)
   * @param outputPath - Output path (relative to outputDir)
   * @param variables - Template variables
   * @returns Path to the generated file
   */
  async generate(
    stubName: string,
    outputPath: string,
    variables: StubVariables = {}
  ): Promise<string> {
    // Read stub template
    const stubPath = path.resolve(this.config.stubsDir, stubName)
    const template = await fs.readFile(stubPath, 'utf-8')

    // Compile and render
    const compiled = this.handlebars.compile(template)
    const content = compiled({
      ...this.config.defaultVariables,
      ...variables,
    })

    // Write output file
    const fullOutputPath = path.resolve(this.config.outputDir, outputPath)
    await fs.mkdir(path.dirname(fullOutputPath), { recursive: true })
    await fs.writeFile(fullOutputPath, content, 'utf-8')

    return fullOutputPath
  }

  /**
   * Generate multiple files from a stub template.
   *
   * @param stubName - Name of the stub file
   * @param outputs - Array of [outputPath, variables] tuples
   * @returns Array of generated file paths
   */
  async generateMany(stubName: string, outputs: [string, StubVariables][]): Promise<string[]> {
    const results: string[] = []

    for (const [outputPath, variables] of outputs) {
      const result = await this.generate(stubName, outputPath, variables)
      results.push(result)
    }

    return results
  }

  /**
   * Render a template string directly.
   *
   * @param template - Template string
   * @param variables - Template variables
   * @returns Rendered content
   */
  render(template: string, variables: StubVariables = {}): string {
    const compiled = this.handlebars.compile(template)
    return compiled({
      ...this.config.defaultVariables,
      ...variables,
    })
  }

  /**
   * Register a custom Handlebars helper.
   *
   * @param name - Helper name
   * @param helper - Helper function
   */
  registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    this.handlebars.registerHelper(name, helper)
  }

  /**
   * Register a Handlebars partial.
   *
   * @param name - Partial name
   * @param partial - Partial template string
   */
  registerPartial(name: string, partial: string): void {
    this.handlebars.registerPartial(name, partial)
  }
}
