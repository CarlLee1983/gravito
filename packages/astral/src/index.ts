import type { GravitoContext, GravitoOrbit, PlanetCore } from '@gravito/core'
import type { OpenAPIV3_1 } from 'openapi-types'
import { AstralConfigError, AstralResourceError } from './errors'
import { OpenApiGenerator } from './OpenApiGenerator'
import type { AstralConfig, AstralOperation, AstralResource } from './types'

export * from './errors'
export * from './types'

/**
 * Astral Contract Builder
 * A fluent utility for defining API resource contracts.
 * @public
 */
export const astral = {
  /**
   * Define a resource contract with named operations.
   *
   * @param path - The base URL path for this resource.
   * @param options - Configuration for operations and tags.
   * @returns A validated AstralResource contract.
   */
  resource(path: string, options: Omit<AstralResource, 'path'>): AstralResource {
    return {
      path,
      ...options,
    }
  },
}

/**
 * OrbitAstral provides automated OpenAPI (Swagger) documentation for Gravito.
 * It automatically scans your routes, validates inputs/outputs against schemas,
 * and serves a real-time Swagger UI.
 *
 * @example
 * ```typescript
 * const astral = new OrbitAstral({
 *   title: 'My Awesome API',
 *   version: '2.0.0',
 *   contracts: [
 *     astral.resource('/users', { operations: { index: { summary: 'List users' } } })
 *   ]
 * });
 * core.addOrbit(astral);
 * ```
 * @public
 */
export class OrbitAstral implements GravitoOrbit {
  private config: AstralConfig
  private generator: OpenApiGenerator
  private cachedSpec: OpenAPIV3_1.Document | null = null

  /**
   * Create a new OrbitAstral instance.
   *
   * @param config - The configuration for the OpenAPI generator and UI.
   */
  constructor(config: AstralConfig = {}) {
    this.config = {
      title: 'API Documentation',
      version: '1.0.0',
      uiPath: '/docs',
      jsonPath: '/openapi.json',
      ...config,
    }
    this.validateConfig(this.config)
    this.generator = new OpenApiGenerator(this.config)
  }

  /**
   * Validate the global Astral configuration for consistency and correctness.
   *
   * @param config - The config object to validate.
   * @throws AstralConfigError if validation fails.
   * @private
   */
  private validateConfig(config: AstralConfig): void {
    // Validate path formats
    if (config.uiPath && !config.uiPath.startsWith('/')) {
      throw new AstralConfigError('uiPath must start with /', 'uiPath')
    }
    if (config.jsonPath && !config.jsonPath.startsWith('/')) {
      throw new AstralConfigError('jsonPath must start with /', 'jsonPath')
    }
    if (config.path && !config.path.startsWith('/')) {
      throw new AstralConfigError('path must start with /', 'path')
    }

    // Validate version format
    if (config.version && !/^\d+\.\d+\.\d+/.test(config.version)) {
      throw new AstralConfigError('version should follow semver format (e.g., 1.0.0)', 'version')
    }

    // Validate contracts
    if (config.contracts) {
      if (!Array.isArray(config.contracts)) {
        throw new AstralConfigError('contracts must be an array', 'contracts')
      }
      for (const contract of config.contracts) {
        this.validateResource(contract)
      }
    }

    // Validate servers
    if (config.servers) {
      if (!Array.isArray(config.servers)) {
        throw new AstralConfigError('servers must be an array', 'servers')
      }
      for (const server of config.servers) {
        if (!server.url) {
          throw new AstralConfigError('each server must have a url field', 'servers')
        }
        try {
          new URL(server.url.startsWith('http') ? server.url : `http://localhost${server.url}`)
        } catch {
          throw new AstralConfigError(`invalid server URL: ${server.url}`, 'servers')
        }
      }
    }

    // Validate tags
    if (config.tags) {
      if (!Array.isArray(config.tags)) {
        throw new AstralConfigError('tags must be an array', 'tags')
      }
      const tagNames = new Set<string>()
      for (const tag of config.tags) {
        if (!tag.name) {
          throw new AstralConfigError('each tag must have a name field', 'tags')
        }
        if (tagNames.has(tag.name)) {
          throw new AstralConfigError(`duplicate tag name: ${tag.name}`, 'tags')
        }
        tagNames.add(tag.name)
      }
    }
  }

  /**
   * Validate a resource contract definition.
   *
   * @param resource - The resource contract to validate.
   * @throws AstralResourceError if validation fails.
   * @private
   */
  private validateResource(resource: AstralResource): void {
    // Validate path
    if (!resource.path) {
      throw new AstralResourceError('resource must have a path field', resource)
    }
    if (!resource.path.startsWith('/')) {
      throw new AstralResourceError(`path must start with /: ${resource.path}`, resource, 'path')
    }

    // Validate operations
    if (!resource.operations || typeof resource.operations !== 'object') {
      throw new AstralResourceError(
        'resource must have operations field and it must be an object',
        resource,
        'operations'
      )
    }

    const operationCount = Object.keys(resource.operations).length
    if (operationCount === 0) {
      throw new AstralResourceError(
        'at least one operation must be defined',
        resource,
        'operations'
      )
    }

    // Validate each operation
    for (const [key, operation] of Object.entries(resource.operations)) {
      if (operation) {
        this.validateOperation(operation, resource, key)
      }
    }
  }

  /**
   * Validate a single operation definition.
   *
   * @param operation - The operation metadata.
   * @param resource - The parent resource.
   * @param operationKey - The key of the operation (e.g., 'index').
   * @throws AstralResourceError if validation fails.
   * @private
   */
  private validateOperation(
    operation: AstralOperation,
    resource: AstralResource,
    operationKey: string
  ): void {
    // Validate status code
    if (operation.status !== undefined) {
      if (typeof operation.status !== 'number') {
        throw new AstralResourceError(
          `status for operation '${operationKey}' must be a number`,
          resource,
          `operations.${operationKey}.status`
        )
      }
      if (operation.status < 100 || operation.status > 599) {
        throw new AstralResourceError(
          `status for operation '${operationKey}' must be between 100 and 599`,
          resource,
          `operations.${operationKey}.status`
        )
      }
    }

    // Validate security
    if (operation.security) {
      if (!Array.isArray(operation.security)) {
        throw new AstralResourceError(
          `security for operation '${operationKey}' must be an array`,
          resource,
          `operations.${operationKey}.security`
        )
      }
    }

    // Validate errors
    if (operation.errors) {
      for (const [statusCode] of Object.entries(operation.errors)) {
        const code = Number(statusCode)
        if (Number.isNaN(code) || code < 100 || code > 599) {
          throw new AstralResourceError(
            `error status code for operation '${operationKey}' must be between 100 and 599: ${statusCode}`,
            resource,
            `operations.${operationKey}.errors`
          )
        }
      }
    }

    // Validate externalDocs
    if (operation.externalDocs) {
      if (!operation.externalDocs.url) {
        throw new AstralResourceError(
          `externalDocs for operation '${operationKey}' must have a url field`,
          resource,
          `operations.${operationKey}.externalDocs`
        )
      }
      try {
        new URL(operation.externalDocs.url)
      } catch {
        throw new AstralResourceError(
          `externalDocs URL for operation '${operationKey}' is invalid: ${operation.externalDocs.url}`,
          resource,
          `operations.${operationKey}.externalDocs`
        )
      }
    }
  }

  /**
   * Fluent configuration helper for creating an OrbitAstral instance.
   *
   * @param config - Configuration options.
   * @returns A new OrbitAstral instance.
   */
  static configure(config: AstralConfig): OrbitAstral {
    return new OrbitAstral(config)
  }

  /**
   * Install the Astral orbit into the framework core.
   * Registers routes for serving the OpenAPI JSON specification and the Swagger UI.
   *
   * @param core - The PlanetCore instance.
   * @returns A promise that resolves when installation is complete.
   */
  async install(core: PlanetCore): Promise<void> {
    const router = core.router

    // 1. Serve OpenAPI JSON (with caching)
    router.get(this.config.jsonPath || '/openapi.json', (ctx: GravitoContext) => {
      if (this.cachedSpec) {
        return ctx.json(this.cachedSpec)
      }

      const routes = router.compile()
      this.cachedSpec = this.generator.generateWithCache(routes) as any
      return ctx.json(this.cachedSpec)
    })

    // 2. Serve Swagger UI
    router.get(this.config.uiPath || '/docs', (ctx: GravitoContext) => {
      const jsonUrl = this.config.jsonPath
      return ctx.html(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${this.config.title}</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
          <style>
            html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
            *, *:before, *:after { box-sizing: inherit; }
            body { margin: 0; background: #fafafa; }
          </style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
          <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
          <script>
            window.onload = () => {
              window.ui = SwaggerUIBundle({
                url: '${jsonUrl}',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                  SwaggerUIBundle.presets.apis,
                  SwaggerUIStandalonePreset
                ],
                plugins: [
                  SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
              });
            };
          </script>
        </body>
        </html>
      `)
    })
  }
}
