import { stripHtml } from '../utils/html'
import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for plain HTML content.
 *
 * The simplest renderer - accepts raw HTML strings and automatically generates
 * a plain text version by stripping HTML tags. Ideal for pre-rendered HTML or
 * when using external HTML generation libraries.
 *
 * @example
 * ```typescript
 * const renderer = new HtmlRenderer('<h1>Hello</h1>');
 * const result = await renderer.render();
 * // result.html: '<h1>Hello</h1>'
 * // result.text: 'Hello'
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class HtmlRenderer implements Renderer {
  /**
   * Creates an instance of HtmlRenderer.
   *
   * @param content - The raw HTML string to be rendered.
   */
  constructor(private content: string) {}

  /**
   * Returns the original HTML and a stripped plain text version.
   *
   * @returns A promise resolving to the rendered content.
   */
  async render(): Promise<RenderResult> {
    return {
      html: this.content,
      text: stripHtml(this.content),
    }
  }
}
