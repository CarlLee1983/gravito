import { type ComponentType, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Renderer, RenderResult } from './Renderer'

export class ReactRenderer<P extends object = object> implements Renderer {
  constructor(
    private component: ComponentType<P>,
    private props?: P
  ) {}

  async render(data: Record<string, unknown>): Promise<RenderResult> {
    const mergedProps = { ...this.props, ...data } as P

    // We assume the component is a standard React component
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
