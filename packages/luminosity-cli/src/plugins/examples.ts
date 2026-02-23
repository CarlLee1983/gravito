/**
 * Example Bun Plugins for Gravito
 *
 * This file demonstrates how to create various types of plugins
 * for common use cases in Gravito development.
 *
 * These examples can be adapted for your specific needs.
 */

import type { Plugin } from 'bun'
import { createCustomLoaderPlugin } from './bun-loader'

// ============================================================================
// YAML Configuration Loader
// ============================================================================

/**
 * Load YAML configuration files (.yml, .yaml)
 *
 * Requires: import { parse } from 'yaml';
 *
 * @example
 * ```typescript
 * import { createYamlLoaderPlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createYamlLoaderPlugin();
 * ```
 */
export function createYamlLoaderPlugin(): Plugin {
  return {
    name: 'yaml-loader',
    setup(build) {
      build.onLoad({ filter: /\.(yml|yaml)$/ }, async (args) => {
        try {
          // Dynamic import to avoid hard dependency
          const { parse } = await import('yaml')
          const file = Bun.file(args.path)
          const content = await file.text()
          const data = parse(content)

          return {
            contents: `export default ${JSON.stringify(data)};`,
            loader: 'js',
          }
        } catch (error) {
          console.error(`Failed to parse YAML ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

// ============================================================================
// JSON5 Loader
// ============================================================================

/**
 * Load JSON5 files with comments and trailing commas
 *
 * Requires: npm install json5
 *
 * @example
 * ```typescript
 * import { createJson5LoaderPlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createJson5LoaderPlugin();
 * ```
 */
export function createJson5LoaderPlugin(): Plugin {
  return {
    name: 'json5-loader',
    setup(build) {
      build.onLoad({ filter: /\.json5$/ }, async (args) => {
        try {
          // Dynamic import to avoid hard dependency
          const JSON5 = await import('json5')
          const file = Bun.file(args.path)
          const content = await file.text()
          const data = JSON5.parse(content)

          return {
            contents: `export default ${JSON.stringify(data)};`,
            loader: 'js',
          }
        } catch (error) {
          console.error(`Failed to parse JSON5 ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

// ============================================================================
// Environment Configuration Loader
// ============================================================================

/**
 * Load .env.json files with environment-specific configurations
 *
 * @example
 * ```typescript
 * import { createEnvConfigLoaderPlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createEnvConfigLoaderPlugin();
 * ```
 */
export function createEnvConfigLoaderPlugin(): Plugin {
  return {
    name: 'env-config-loader',
    setup(build) {
      build.onLoad({ filter: /\.env\.json$/ }, async (args) => {
        try {
          const file = Bun.file(args.path)
          const content = await file.text()
          const envConfig = JSON.parse(content)

          // Add current environment
          envConfig.nodeEnv = process.env.NODE_ENV || 'development'
          envConfig.isProduction = envConfig.nodeEnv === 'production'
          envConfig.isDevelopment = envConfig.nodeEnv === 'development'

          return {
            contents: `export default ${JSON.stringify(envConfig)};`,
            loader: 'js',
          }
        } catch (error) {
          console.error(`Failed to parse env config ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

// ============================================================================
// Markdown to HTML Loader
// ============================================================================

/**
 * Transform Markdown (.md) files to HTML
 *
 * Requires: npm install marked
 *
 * @example
 * ```typescript
 * import { createMarkdownLoaderPlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createMarkdownLoaderPlugin();
 * ```
 */
export function createMarkdownLoaderPlugin(): Plugin {
  return {
    name: 'markdown-loader',
    setup(build) {
      build.onLoad({ filter: /\.md$/ }, async (args) => {
        try {
          // Dynamic import to avoid hard dependency
          const { marked } = await import('marked')
          const file = Bun.file(args.path)
          const content = await file.text()
          const html = await marked(content)

          return {
            contents: `export default ${JSON.stringify(html)};`,
            loader: 'js',
          }
        } catch (error) {
          console.error(`Failed to parse Markdown ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

// ============================================================================
// CSV Data Loader
// ============================================================================

/**
 * Load CSV files and transform to array of objects
 *
 * @example
 * ```typescript
 * import { createCsvLoaderPlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createCsvLoaderPlugin();
 * ```
 */
export function createCsvLoaderPlugin(): Plugin {
  return {
    name: 'csv-loader',
    setup(build) {
      build.onLoad({ filter: /\.csv$/ }, async (args) => {
        try {
          const file = Bun.file(args.path)
          const content = await file.text()
          const lines = content.trim().split('\n')

          if (lines.length === 0) {
            return {
              contents: 'export default [];',
              loader: 'js',
            }
          }

          const headers = lines[0].split(',').map((h) => h.trim())
          const data = lines.slice(1).map((line) => {
            const values = line.split(',').map((v) => v.trim())
            return Object.fromEntries(headers.map((h, i) => [h, values[i] || null]))
          })

          return {
            contents: `export default ${JSON.stringify(data)};`,
            loader: 'js',
          }
        } catch (error) {
          console.error(`Failed to parse CSV ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

// ============================================================================
// SQL Loader
// ============================================================================

/**
 * Load SQL files and export as strings
 *
 * @example
 * ```typescript
 * import { createSqlLoaderPlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createSqlLoaderPlugin();
 * ```
 */
export function createSqlLoaderPlugin(): Plugin {
  return {
    name: 'sql-loader',
    setup(build) {
      build.onLoad({ filter: /\.sql$/ }, async (args) => {
        try {
          const file = Bun.file(args.path)
          const content = await file.text()

          return {
            contents: `export default ${JSON.stringify(content)};`,
            loader: 'js',
          }
        } catch (error) {
          console.error(`Failed to load SQL ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

// ============================================================================
// Global Import Injection
// ============================================================================

/**
 * Automatically inject imports into specific file patterns
 *
 * Useful for adding logging, tracing, or common utilities
 *
 * @param filter - RegExp to match files
 * @param imports - Array of import statements to inject
 * @returns Bun plugin
 *
 * @example
 * ```typescript
 * import { createGlobalImportPlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createGlobalImportPlugin(
 *   /\.page\.ts$/,
 *   [
 *     "import { useRouter } from '@gravito/photon';",
 *     "import { log } from '@gravito/logging';",
 *   ]
 * );
 * ```
 */
export function createGlobalImportPlugin(filter: RegExp, imports: string[]): Plugin {
  const importBlock = imports.join('\n')

  return {
    name: 'global-import-injector',
    setup(build) {
      build.onLoad({ filter }, async (args) => {
        try {
          const file = Bun.file(args.path)
          const content = await file.text()

          return {
            contents: `${importBlock}\n\n${content}`,
            loader: 'ts',
          }
        } catch (error) {
          console.error(`Failed to inject imports in ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

// ============================================================================
// Source Code Instrumentation
// ============================================================================

/**
 * Instrument source code with logging or tracing
 *
 * @param filter - RegExp to match files
 * @param instrumenter - Function to instrument source code
 * @returns Bun plugin
 *
 * @example
 * ```typescript
 * import { createInstrumentationPlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createInstrumentationPlugin(
 *   /\.instrumented\.ts$/,
 *   (source, path) => {
 *     return `// Instrumented: ${path}\n${source}`;
 *   }
 * );
 * ```
 */
export function createInstrumentationPlugin(
  filter: RegExp,
  instrumenter: (source: string, path: string) => Promise<string>
): Plugin {
  return {
    name: 'source-instrumentor',
    setup(build) {
      build.onLoad({ filter }, async (args) => {
        try {
          const file = Bun.file(args.path)
          const source = await file.text()
          const instrumented = await instrumenter(source, args.path)

          return {
            contents: instrumented,
            loader: 'ts',
          }
        } catch (error) {
          console.error(`Failed to instrument ${args.path}:`, error)
          throw error
        }
      })
    },
  }
}

// ============================================================================
// Virtual Module Namespace
// ============================================================================

/**
 * Create a virtual module namespace (e.g., gravito:, app:, api:)
 *
 * @param namespace - Namespace prefix (e.g., 'gravito:')
 * @param basePath - Base directory to resolve modules from
 * @returns Bun plugin
 *
 * @example
 * ```typescript
 * import { createVirtualNamespacePlugin } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugin = createVirtualNamespacePlugin(
 *   'gravito:',
 *   `${process.cwd()}/src/gravito`
 * );
 *
 * // Usage: import config from 'gravito:config.ts';
 * ```
 */
export function createVirtualNamespacePlugin(namespace: string, basePath: string): Plugin {
  const namespaceName = namespace.replace(/:/g, '')
  const filter = new RegExp(`^${namespace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)

  return {
    name: `virtual-namespace-${namespaceName}`,
    setup(build) {
      build.onResolve({ filter }, (args) => {
        const specifier = args.path.replace(namespace, '')
        return {
          path: `${basePath}/${specifier}`,
          namespace: 'file',
        }
      })
    },
  }
}

// ============================================================================
// Plugin Combinations
// ============================================================================

/**
 * Get a set of common data file loaders
 *
 * Includes:
 * - YAML/YML
 * - JSON5
 * - CSV
 * - SQL
 * - Markdown
 *
 * @returns Array of plugins
 *
 * @example
 * ```typescript
 * import { getCommonDataLoaders } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugins = getCommonDataLoaders();
 * ```
 */
export function getCommonDataLoaders(): Plugin[] {
  return [
    createYamlLoaderPlugin(),
    createJson5LoaderPlugin(),
    createCsvLoaderPlugin(),
    createSqlLoaderPlugin(),
    createMarkdownLoaderPlugin(),
  ]
}

/**
 * Get a development workflow plugin set
 *
 * Includes:
 * - YAML loader
 * - Environment config loader
 * - Global import injector (for logging)
 *
 * @returns Array of plugins
 *
 * @example
 * ```typescript
 * import { getDevelopmentPlugins } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugins = getDevelopmentPlugins();
 * ```
 */
export function getDevelopmentPlugins(): Plugin[] {
  const logImports = [
    "import { debug } from '@gravito/logging';",
    "const __module = '${filename}';",
  ]

  return [
    createYamlLoaderPlugin(),
    createEnvConfigLoaderPlugin(),
    createGlobalImportPlugin(/\.dev\.ts$/, logImports),
  ]
}

/**
 * Get a production build plugin set
 *
 * Includes:
 * - Common data loaders
 * - SQL loader
 * - Environment config loader
 *
 * @returns Array of plugins
 *
 * @example
 * ```typescript
 * import { getProductionPlugins } from '@gravito/luminosity-cli/plugins/examples';
 *
 * const plugins = getProductionPlugins();
 * ```
 */
export function getProductionPlugins(): Plugin[] {
  return [...getCommonDataLoaders(), createEnvConfigLoaderPlugin()]
}
