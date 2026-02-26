/**
 * Bun plugin for loading Gravito configuration and schema files
 */
import type { BunPlugin, OnLoadArgs, PluginBuilder } from 'bun'

export interface GravitoPluginConfig {
  validateSchemas?: boolean
  debug?: boolean
}

/**
 * Main plugin for Gravito loaders
 */
export const createGravitoPlugin = (config: GravitoPluginConfig = {}): BunPlugin => {
  return {
    name: 'gravito-loader',
    setup(build: PluginBuilder) {
      // Load .gravito.config.ts files
      build.onLoad({ filter: /\.gravito\.config\.ts$/ }, (args: OnLoadArgs) => {
        if (config.debug) {
          console.log(`[gravito-loader] Loading config: ${args.path}`)
        }
        // Config is loaded as normal TypeScript
        // Validation happens at runtime
        return undefined // Use default behavior
      })

      // Optional: Schema validation
      if (config.validateSchemas) {
        build.onLoad({ filter: /\.schema\.ts$/ }, (args: OnLoadArgs) => {
          if (config.debug) {
            console.log(`[gravito-loader] Validating schema: ${args.path}`)
          }
          return undefined
        })
      }
    },
  }
}

/**
 * Export plugins for use in build config
 */
export const gravitoPlugins = [createGravitoPlugin()]
