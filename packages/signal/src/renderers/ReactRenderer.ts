import type { Renderer, RenderResult } from './Renderer'

export class ReactRenderer<P extends object = object> implements Renderer {
  constructor(
    private component: any, // Use any to avoid hard React dependency in types
    private props?: P
  ) {}

  async render(data: Record<string, unknown>): Promise<RenderResult> {
    // Dynamic imports to avoid hard dependencies on react/react-dom
    const { createElement } = await import('react')
    const { renderToStaticMarkup } = await import('react-dom/server')

    const mergedProps = { ...this.props, ...data } as P

    const element = createElement(this.component, mergedProps)
    const html = renderToStaticMarkup(element)

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
