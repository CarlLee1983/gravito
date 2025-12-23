import type { Renderer, RenderResult } from './Renderer'

export class TemplateRenderer implements Renderer {
  private template: string
  private viewsDir: string

  constructor(templateName: string, viewsDir?: string) {
    this.template = templateName
    // Default to src/emails if not provided, falling back to process cwd
    this.viewsDir = viewsDir || `${process.cwd()}/src/emails`
  }

  async render(data: Record<string, unknown>): Promise<RenderResult> {
    // Dynamic import to avoid hard dependency on @gravito/prism
    const { TemplateEngine } = await import('@gravito/prism')
    const engine = new TemplateEngine(this.viewsDir)

    // Disable automatic layout by default for emails, unless explicitly handled in template
    const html = engine.render(this.template, data, {})

    return {
      html,
      text: this.stripHtml(html),
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
