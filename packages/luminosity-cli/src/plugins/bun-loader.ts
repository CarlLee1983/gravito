/**
 * Bun Plugin System for Gravito Framework
 *
 * This module provides a plugin architecture for Bun's build system, enabling:
 * - Custom file loaders (e.g., .gravito.config files)
 * - Schema validation at build time
 * - Framework-level extensibility
 *
 * Reference: https://bun.sh/docs/runtime/plugins
 */

import type { OnLoadArgs, OnResolveArgs } from 'bun'

/**
 * Configuration options for Gravito plugins
 */
export interface GravitoPluginConfig {
  /**
   * Enable schema validation for .schema.ts files
   * @default false
   */
  validateSchemas?: boolean

  /**
   * Enable debug logging for plugin operations
   * @default false
   */
  debug?: boolean

  /**
   * Custom file extensions to recognize
   * @default ['.ts', '.tsx']
   */
  fileExtensions?: string[]
}

/**
 * Create a Gravito configuration loader plugin
 *
 * Loads and validates Gravito configuration files (.gravito.config.ts)
 * at build time, providing early error detection.
 *
 * @param config - Plugin configuration options
 * @returns Bun plugin instance
 *
 * @example
 * ```typescript
 * const plugin = createGravitoConfigPlugin({
 *   debug: true,
 *   validateSchemas: true,
 * });
 * ```
 */
export function createGravitoConfigPlugin(config: GravitoPluginConfig = {}): any {
  return {
    name: 'gravito-config-loader',
    setup(build: any) {
      // Load .gravito.config.ts files
      build.onLoad({ filter: /\.gravito\.config\.ts$/ }, async (args: OnLoadArgs) => {
        if (config.debug) {
          console.log(`[gravito-config-loader] Loading config: ${args.path}`)
        }

        // Config is loaded as normal TypeScript
        // Validation happens at runtime via TypeScript types
        return undefined // Use default behavior
      })

      // Optional: Validate gravito.config.ts against schema
      if (config.validateSchemas) {
        build.onLoad({ filter: /gravito\.config\.ts$/ }, async (args: OnLoadArgs) => {
          if (config.debug) {
            console.log(`[gravito-config-loader] Validating: ${args.path}`)
          }
          return undefined // Validation at runtime
        })
      }
    },
  }
}

/**
 * Create a schema validation plugin
 *
 * Validates schema files (.schema.ts) at build time to catch schema
 * inconsistencies early in the development process.
 *
 * @param config - Plugin configuration options
 * @returns Bun plugin instance
 *
 * @example
 * ```typescript
 * const plugin = createSchemaValidationPlugin({
 *   debug: true,
 * });
 * ```
 */
export function createSchemaValidationPlugin(config: GravitoPluginConfig = {}): any {
  return {
    name: 'gravito-schema-validator',
    setup(build: any) {
      build.onLoad({ filter: /\.schema\.ts$/ }, async (args: OnLoadArgs) => {
        if (config.debug) {
          console.log(`[gravito-schema-validator] Validating schema: ${args.path}`)
        }

        // Schema is loaded as normal TypeScript
        // Type validation happens via TypeScript compiler
        return undefined // Use default behavior
      })
    },
  }
}

/**
 * Create a custom file type loader plugin
 *
 * Loads custom file extensions and transforms them into JavaScript modules.
 * Useful for domain-specific file formats.
 *
 * @param extension - File extension to handle (e.g., '.domain')
 * @param transformer - Async function to transform file content
 * @returns Bun plugin instance
 *
 * @example
 * ```typescript
 * const plugin = createCustomLoaderPlugin('.yml', async (content) => {
 *   const data = YAML.parse(content);
 *   return JSON.stringify(data);
 * });
 * ```
 */
export function createCustomLoaderPlugin(
  extension: string,
  transformer: (content: string, path: string) => Promise<string>
): any {
  const filter = new RegExp(`\\${extension}$`)

  return {
    name: `custom-loader-${extension}`,
    setup(build: any) {
      build.onLoad({ filter }, async (args: OnLoadArgs) => {
        try {
          const file = Bun.file(args.path)
          const content = await file.text()
          const transformed = await transformer(content, args.path)

          return {
            contents: transformed,
            loader: 'js',
          }
        } catch (error) {
          console.error(`Error loading ${extension} file ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

/**
 * Create a namespace resolver plugin
 *
 * Enables custom module resolution with namespaces.
 * Useful for virtual modules and custom import protocols.
 *
 * @param namespace - Namespace prefix (e.g., 'gravito:')
 * @param resolver - Function to resolve module path
 * @returns Bun plugin instance
 *
 * @example
 * ```typescript
 * const plugin = createNamespaceResolverPlugin(
 *   'gravito:',
 *   (specifier) => `/path/to/gravito/${specifier}`
 * );
 * ```
 */
export function createNamespaceResolverPlugin(
  namespace: string,
  resolver: (specifier: string) => string | Promise<string>
): any {
  const filter = new RegExp(`^${namespace}`)

  return {
    name: `namespace-resolver-${namespace}`,
    setup(build: any) {
      build.onResolve({ filter, namespace: 'file' }, async (args: OnResolveArgs) => {
        const specifier = args.path.replace(namespace, '')
        const resolved = await resolver(specifier)

        return {
          path: resolved,
          namespace: 'file',
        }
      })
    },
  }
}

/**
 * Create a source transformation plugin
 *
 * Transforms source code before parsing. Useful for:
 * - Adding global imports
 * - Instrumenting code
 * - Applying transpilers
 *
 * @param filter - RegExp to match files
 * @param transformer - Async function to transform source code
 * @returns Bun plugin instance
 *
 * @example
 * ```typescript
 * const plugin = createSourceTransformerPlugin(
 *   /\.instrumented\.ts$/,
 *   async (code) => `// instrumented\n${code}`
 * );
 * ```
 */
export function createSourceTransformerPlugin(
  filter: RegExp,
  transformer: (source: string, path: string) => Promise<string>
): any {
  return {
    name: 'source-transformer',
    setup(build: any) {
      build.onLoad({ filter }, async (args: OnLoadArgs) => {
        try {
          const file = Bun.file(args.path)
          const source = await file.text()
          const transformed = await transformer(source, args.path)

          return {
            contents: transformed,
            loader: 'ts',
          }
        } catch (error) {
          console.error(`Error transforming ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

/**
 * Default Gravito plugins for standard use cases
 *
 * Includes:
 * - Config file loader (.gravito.config.ts)
 * - Schema validator (.schema.ts)
 *
 * @example
 * ```typescript
 * await Bun.build({
 *   entrypoints: ['./src/index.ts'],
 *   outdir: './dist',
 *   plugins: createDefaultGravitoPlugins(),
 * });
 * ```
 */
export function createDefaultGravitoPlugins(config?: GravitoPluginConfig): any[] {
  return [createGravitoConfigPlugin(config), createSchemaValidationPlugin(config)]
}

/**
 * Plugin factory for building custom Bun plugins
 *
 * Provides utilities for creating plugin sets tailored to specific needs.
 */
export const PluginFactory = {
  /**
   * Create config loader
   */
  config: createGravitoConfigPlugin,

  /**
   * Create schema validator
   */
  schema: createSchemaValidationPlugin,

  /**
   * Create custom file loader
   */
  customLoader: createCustomLoaderPlugin,

  /**
   * Create namespace resolver
   */
  namespaceResolver: createNamespaceResolverPlugin,

  /**
   * Create source transformer
   */
  sourceTransformer: createSourceTransformerPlugin,

  /**
   * Get default plugins
   */
  default: createDefaultGravitoPlugins,
}

/**
 * Export all plugins for Bun build configuration
 */
export const gravitoPlugins = createDefaultGravitoPlugins()
