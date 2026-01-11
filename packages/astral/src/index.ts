import type { PlanetCore } from '@gravito/core'
import { OpenApiGenerator } from './OpenApiGenerator'
import type { AstralConfig, AstralResource } from './types'

export * from './types'

/**
 * Astral Contract Builder
 */
export const astral = {
  /**
   * Define a resource contract
   */
  resource(path: string, options: Omit<AstralResource, 'path'>): AstralResource {
    return {
      path,
      ...options,
    }
  },
}

/**
 * OrbitAstral - Gravito Orbit extension
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
    this.generator = new OpenApiGenerator(this.config)
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
    router.get(this.config.jsonPath || '/openapi.json', (ctx: any) => {
      const routes = router.compile()
      const spec = this.generator.generate(routes)
      return ctx.json(spec)
    })

    // 2. Serve Swagger UI
    router.get(this.config.uiPath || '/docs', (ctx: any) => {
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
