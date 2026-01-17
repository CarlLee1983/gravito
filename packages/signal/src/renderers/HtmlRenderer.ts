import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for plain HTML content.
 *
 * Renders static HTML strings and automatically generates
 * a plain text version by stripping HTML tags.
 *
 * @example
 * ```typescript
 * const renderer = new HtmlRenderer('<h1>Hello</h1><p>World</p>')
 * const { html, text } = await renderer.render()
 * // html: '<h1>Hello</h1><p>World</p>'
 * // text: 'Hello World'
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class HtmlRenderer implements Renderer {
  constructor(private content: string) {}

  async render(): Promise<RenderResult> {
    return {
      html: this.content,
      text: this.stripHtml(this.content),
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]+>/g, '') // Remove tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking space
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim()
  }
}
