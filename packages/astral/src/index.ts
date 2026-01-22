import type { GravitoContext, GravitoOrbit, PlanetCore } from '@gravito/core'
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
   * 驗證 Astral 配置的有效性
   * @private
   */
  private validateConfig(config: AstralConfig): void {
    // 驗證路徑格式
    if (config.uiPath && !config.uiPath.startsWith('/')) {
      throw new AstralConfigError('uiPath 必須以 / 開頭', 'uiPath')
    }
    if (config.jsonPath && !config.jsonPath.startsWith('/')) {
      throw new AstralConfigError('jsonPath 必須以 / 開頭', 'jsonPath')
    }
    if (config.path && !config.path.startsWith('/')) {
      throw new AstralConfigError('path 必須以 / 開頭', 'path')
    }

    // 驗證版本格式
    if (config.version && !/^\d+\.\d+\.\d+/.test(config.version)) {
      throw new AstralConfigError('版本號應遵循 semver 格式 (例如: 1.0.0)', 'version')
    }

    // 驗證 contracts
    if (config.contracts) {
      if (!Array.isArray(config.contracts)) {
        throw new AstralConfigError('contracts 必須是陣列', 'contracts')
      }
      for (const contract of config.contracts) {
        this.validateResource(contract)
      }
    }

    // 驗證 servers
    if (config.servers) {
      if (!Array.isArray(config.servers)) {
        throw new AstralConfigError('servers 必須是陣列', 'servers')
      }
      for (const server of config.servers) {
        if (!server.url) {
          throw new AstralConfigError('每個 server 必須有 url 欄位', 'servers')
        }
        try {
          new URL(server.url.startsWith('http') ? server.url : `http://localhost${server.url}`)
        } catch {
          throw new AstralConfigError(`無效的 server URL: ${server.url}`, 'servers')
        }
      }
    }

    // 驗證 tags
    if (config.tags) {
      if (!Array.isArray(config.tags)) {
        throw new AstralConfigError('tags 必須是陣列', 'tags')
      }
      const tagNames = new Set<string>()
      for (const tag of config.tags) {
        if (!tag.name) {
          throw new AstralConfigError('每個 tag 必須有 name 欄位', 'tags')
        }
        if (tagNames.has(tag.name)) {
          throw new AstralConfigError(`重複的 tag 名稱: ${tag.name}`, 'tags')
        }
        tagNames.add(tag.name)
      }
    }
  }

  /**
   * 驗證資源定義的有效性
   * @private
   */
  private validateResource(resource: AstralResource): void {
    // 驗證 path
    if (!resource.path) {
      throw new AstralResourceError('resource 必須有 path 欄位', resource)
    }
    if (!resource.path.startsWith('/')) {
      throw new AstralResourceError(`路徑必須以 / 開頭: ${resource.path}`, resource, 'path')
    }

    // 驗證 operations
    if (!resource.operations || typeof resource.operations !== 'object') {
      throw new AstralResourceError(
        'resource 必須有 operations 欄位且為物件',
        resource,
        'operations'
      )
    }

    const operationCount = Object.keys(resource.operations).length
    if (operationCount === 0) {
      throw new AstralResourceError('至少需要定義一個 operation', resource, 'operations')
    }

    // 驗證每個 operation
    for (const [key, operation] of Object.entries(resource.operations)) {
      if (operation) {
        this.validateOperation(operation, resource, key)
      }
    }
  }

  /**
   * 驗證單個 operation 定義
   * @private
   */
  private validateOperation(
    operation: AstralOperation,
    resource: AstralResource,
    operationKey: string
  ): void {
    // 驗證 status code
    if (operation.status !== undefined) {
      if (typeof operation.status !== 'number') {
        throw new AstralResourceError(
          `operation '${operationKey}' 的 status 必須是數字`,
          resource,
          `operations.${operationKey}.status`
        )
      }
      if (operation.status < 100 || operation.status > 599) {
        throw new AstralResourceError(
          `operation '${operationKey}' 的 status 必須在 100-599 範圍內`,
          resource,
          `operations.${operationKey}.status`
        )
      }
    }

    // 驗證 security
    if (operation.security) {
      if (!Array.isArray(operation.security)) {
        throw new AstralResourceError(
          `operation '${operationKey}' 的 security 必須是陣列`,
          resource,
          `operations.${operationKey}.security`
        )
      }
    }

    // 驗證 errors
    if (operation.errors) {
      for (const [statusCode] of Object.entries(operation.errors)) {
        const code = Number(statusCode)
        if (isNaN(code) || code < 100 || code > 599) {
          throw new AstralResourceError(
            `operation '${operationKey}' 的 error status code 必須在 100-599 範圍內: ${statusCode}`,
            resource,
            `operations.${operationKey}.errors`
          )
        }
      }
    }

    // 驗證 externalDocs
    if (operation.externalDocs) {
      if (!operation.externalDocs.url) {
        throw new AstralResourceError(
          `operation '${operationKey}' 的 externalDocs 必須有 url 欄位`,
          resource,
          `operations.${operationKey}.externalDocs`
        )
      }
      try {
        new URL(operation.externalDocs.url)
      } catch {
        throw new AstralResourceError(
          `operation '${operationKey}' 的 externalDocs URL 無效: ${operation.externalDocs.url}`,
          resource,
          `operations.${operationKey}.externalDocs`
        )
      }
    }
  }

  static configure(config: AstralConfig): OrbitAstral {
    return new OrbitAstral(config)
  }

  /**
   * Install the orbit
   * This will be called by PlanetCore
   */
  async install(core: PlanetCore): Promise<void> {
    const router = core.router

    // 1. Serve OpenAPI JSON
    router.get(this.config.jsonPath || '/openapi.json', (ctx: GravitoContext) => {
      const routes = router.compile()
      const spec = this.generator.generate(routes)
      return ctx.json(spec)
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
