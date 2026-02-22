import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PlanetCore } from '@gravito/core'
import { OpenApiGenerator } from './OpenApiGenerator'
import type { AstralConfig, OpenApiDocument } from './types'

/**
 * Configuration for static export.
 * @public
 */
export interface StaticExportConfig {
  core: PlanetCore
  outputDir: string
  astralConfig: AstralConfig
}

/**
 * Generates a static documentation site.
 *
 * @param config - Configuration including the PlanetCore instance, output directory, and astral configuration.
 * @public
 */
export function generateStaticSite(config: StaticExportConfig): void {
  const { core, outputDir, astralConfig } = config

  // Ensure the output directory exists
  mkdirSync(outputDir, { recursive: true })

  // 1. Generate OpenAPI spec
  const generator = new OpenApiGenerator(astralConfig)
  const routes = core.router.compile()
  const spec = generator.generateWithCache(routes) as OpenApiDocument

  // 2. Write openapi.json
  const specPath = join(outputDir, 'openapi.json')
  writeFileSync(specPath, JSON.stringify(spec, null, 2))

  // 3. Write index.html
  const htmlPath = join(outputDir, 'index.html')
  const title = astralConfig.title || 'API Documentation'

  // Create static HTML for Swagger UI
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
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
        url: './openapi.json',
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
</html>`

  writeFileSync(htmlPath, html)
  console.log(`Astral static site generated successfully at: ${outputDir}`)
}
