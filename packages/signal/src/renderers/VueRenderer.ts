import type { Renderer, RenderResult } from './Renderer'

export class VueRenderer<P extends object = object> implements Renderer {
  constructor(
    private component: any, // Use any to avoid hard Vue dependency in types
    private props?: P
  ) {}

  async render(data: Record<string, unknown>): Promise<RenderResult> {
    // Dynamic imports to avoid hard dependencies on vue/@vue/server-renderer
    const { createSSRApp, h } = await import('vue')
    const { renderToString } = await import('@vue/server-renderer')

    const mergedProps = { ...this.props, ...data }

    const app = createSSRApp({
      render: () => h(this.component, mergedProps),
    })

    const html = await renderToString(app)

    const fullHtml = html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>${html}`

    return {
      html: fullHtml,
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
