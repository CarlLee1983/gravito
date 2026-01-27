import { stripHtml } from '../utils/html'
import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for template-based emails using Gravito Prism.
 *
 * Renders email templates from the filesystem using the Prism template engine.
 * It uses a static cache for the template engine to avoid redundant initialization
 * costs when rendering multiple emails from the same directory.
 *
 * @example
 * ```typescript
 * const renderer = new TemplateRenderer('welcome', './src/emails');
 * const result = await renderer.render({ name: 'John' });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class TemplateRenderer implements Renderer {
  private template: string
  private viewsDir: string
  private static engineCache = new Map<string, any>()

  /**
   * Creates an instance of TemplateRenderer.
   *
   * @param templateName - The name of the template file (without extension).
   * @param viewsDir - The directory containing template files. Defaults to `src/emails`.
   */
  constructor(templateName: string, viewsDir?: string) {
    this.template = templateName
    // Default to src/emails if not provided, falling back to process cwd
    this.viewsDir = viewsDir || `${process.cwd()}/src/emails`
  }

  /**
   * Renders the template with the provided data.
   *
   * This method lazily loads `@gravito/prism` to ensure the core package
   * remains lightweight for users who don't need template rendering.
   *
   * @param data - The data context for template interpolation.
   * @returns A promise resolving to the rendered content.
   * @throws {Error} If the template engine fails to load or rendering fails.
   */
  async render(data: Record<string, unknown>): Promise<RenderResult> {
    // Dynamic import to avoid hard dependency on @gravito/prism
    const { TemplateEngine } = await import('@gravito/prism')

    const cached = TemplateRenderer.engineCache.get(this.viewsDir)
    const engine = cached || new TemplateEngine(this.viewsDir)

    if (!cached) {
      TemplateRenderer.engineCache.set(this.viewsDir, engine)
    }

    // Disable automatic layout by default for emails, unless explicitly handled in template
    const html = engine.render(this.template, data, {})

    return {
      html,
      text: stripHtml(html),
    }
  }

  /**
   * Clear template engine cache.
   *
   * Useful in development environments to force recompilation of templates
   * after they have been modified on disk.
   *
   * @example
   * ```typescript
   * TemplateRenderer.clearCache();
   * ```
   *
   * @public
   * @since 3.1.0
   */
  static clearCache(): void {
    TemplateRenderer.engineCache.clear()
  }
}
