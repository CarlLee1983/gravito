import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PlanetCore, RuntimeMarkdownAdapter } from '@gravito/core'
import { archiveFromDirectory, getDefaultRuntimeAdapter, getMarkdownAdapter } from '@gravito/core'
import { AstralError } from './errors'
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
  /** 是否生成歸檔（.tar.gz） */
  archive?: boolean
  /** 歸檔輸出路徑（預設為 outputDir + '.tar.gz'） */
  archivePath?: string
}

/**
 * 遞迴渲染物件中所有 description 欄位的 Markdown 為 HTML。
 *
 * 僅處理值為 string 的 description 欄位，空字串不渲染。
 * 會深入遍歷所有巢狀物件和陣列。
 *
 * @param obj - 要處理的物件（spec 或子物件）
 * @param md - Markdown adapter 實例
 * @returns 新的物件（不修改原始物件）
 * @internal
 */
function renderDescriptionsInObject(obj: unknown, md: RuntimeMarkdownAdapter): unknown {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => renderDescriptionsInObject(item, md))
  }

  if (typeof obj !== 'object') {
    return obj
  }

  const source = obj as Record<string, unknown>
  const result: Record<string, unknown> = {}

  for (const key of Object.keys(source)) {
    const value = source[key]

    if (key === 'description' && typeof value === 'string' && value.length > 0) {
      // 渲染 Markdown 為 HTML
      result[key] = md.html(value)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => renderDescriptionsInObject(item, md))
    } else if (value !== null && typeof value === 'object') {
      result[key] = renderDescriptionsInObject(value, md)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * 對 OpenAPI spec 的 description 欄位進行 Markdown 渲染。
 *
 * 遞迴處理以下路徑：
 * - spec.info.description
 * - spec.servers[].description
 * - spec.tags[].description
 * - spec.paths[][].description, parameters[].description, responses[].description
 * - spec.components.schemas[].description 及其屬性
 * - spec.components.parameters[].description
 * - spec.components.responses[].description
 * - spec.components.requestBodies[].description
 *
 * @param spec - 原始 OpenAPI spec
 * @returns 渲染後的新 spec（不修改原始物件）
 * @internal
 */
function renderSpecDescriptions(spec: OpenApiDocument): OpenApiDocument {
  const md = getMarkdownAdapter()
  return renderDescriptionsInObject(spec, md) as OpenApiDocument
}

/**
 * Generates a static documentation site.
 *
 * Uses RuntimeAdapter for async file writes to prevent event loop blocking.
 * Optimized with batch writes for multiple files (openapi.json, index.html, offline assets).
 *
 * @param config - Configuration including the PlanetCore instance, output directory, and astral configuration.
 * @public
 */
export async function generateStaticSite(config: StaticExportConfig): Promise<void> {
  const { core, outputDir, astralConfig } = config
  const adapter = getDefaultRuntimeAdapter()

  // Ensure the output directory exists (async)
  await mkdir(outputDir, { recursive: true })

  // 1. Generate OpenAPI spec
  const generator = new OpenApiGenerator(astralConfig)
  const routes = core.router.compile()
  const rawSpec = generator.generateWithCache(routes) as OpenApiDocument

  // 2. 若啟用 renderDescriptions，渲染所有 description 欄位
  const spec = astralConfig.renderDescriptions ? renderSpecDescriptions(rawSpec) : rawSpec

  // 3. Write openapi.json (async with RuntimeAdapter or fallback)
  const specPath = join(outputDir, 'openapi.json')
  const specContent = JSON.stringify(spec, null, 2)
  if (adapter.writeFile) {
    await adapter.writeFile(specPath, specContent)
  } else {
    await writeFile(specPath, specContent)
  }

  // 4. Handle offline assets
  let cssUrl = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css'
  let bundleJsUrl = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js'
  let standaloneJsUrl = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js'

  if (astralConfig.bundleOfflineAssets) {
    core.logger.info('[Astral] Downloading Swagger UI assets for offline use...')
    async function downloadFile(url: string, filename: string): Promise<string> {
      const resp = await fetch(url)
      if (!resp.ok) {
        throw new AstralError(`Failed to download ${url}: ${resp.statusText}`, 'ASTRAL_DOWNLOAD_ERROR')
      }
      const text = await resp.text()
      // Async write instead of synchronous
      const filePath = join(outputDir, filename)
      if (adapter.writeFile) {
        await adapter.writeFile(filePath, text)
      } else {
        await writeFile(filePath, text)
      }
      return `./${filename}`
    }

    try {
      ;[cssUrl, bundleJsUrl, standaloneJsUrl] = await Promise.all([
        downloadFile(cssUrl, 'swagger-ui.css'),
        downloadFile(bundleJsUrl, 'swagger-ui-bundle.js'),
        downloadFile(standaloneJsUrl, 'swagger-ui-standalone-preset.js'),
      ])
      core.logger.info('[Astral] Asset download complete.')
    } catch (e) {
      core.logger.warn(`[Astral] Failed to bundle offline assets. Falling back to CDN URLs. ${e}`)
      cssUrl = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css'
      bundleJsUrl = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js'
      standaloneJsUrl = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js'
    }
  }

  // 5. Write index.html
  const htmlPath = join(outputDir, 'index.html')
  const title = astralConfig.title || 'API Documentation'

  // Create static HTML for Swagger UI
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="${cssUrl}" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${bundleJsUrl}"></script>
  <script src="${standaloneJsUrl}"></script>
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

  // 4. Write index.html (async with RuntimeAdapter or fallback)
  if (adapter.writeFile) {
    await adapter.writeFile(htmlPath, html)
  } else {
    await writeFile(htmlPath, html)
  }

  core.logger.info(`[Astral] Static site generated at: ${outputDir}`)

  // 6. 生成歸檔（選用）
  if (config.archive) {
    const archivePath = config.archivePath || `${outputDir}.tar.gz`
    await archiveFromDirectory(outputDir, archivePath, { compress: 'gzip' })
    core.logger.info(`[Astral] Archive generated: ${archivePath}`)
  }
}
