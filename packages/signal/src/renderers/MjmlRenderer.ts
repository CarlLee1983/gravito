import { stripHtml } from '../utils/html'
import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for MJML-based emails.
 *
 * MJML is a markup language designed to reduce the pain of coding a responsive email.
 * This renderer lazily loads the `mjml` package to keep the core lightweight.
 *
 * @example
 * ```typescript
 * const renderer = new MjmlRenderer('<mjml><mj-body>...</mj-body></mjml>');
 * const result = await renderer.render();
 * ```
 *
 * @public
 * @since 1.1.0
 */
export class MjmlRenderer implements Renderer {
  /**
   * Creates an instance of MjmlRenderer.
   *
   * @param content - The MJML markup string to be rendered.
   * @param options - Optional MJML transformation options.
   * @param deps - Optional dependency injection for testing.
   */
  constructor(
    private content: string,
    private options: Record<string, any> = {},
    private deps: {
      mjml2html?: (mjml: string, options?: any) => any
    } = {}
  ) {}

  /**
   * Renders the MJML content to static HTML.
   *
   * This method performs a dynamic import of `mjml` to ensure it's only
   * loaded if this renderer is actually used.
   *
   * @returns A promise resolving to the rendered content.
   * @throws {Error} If MJML dependencies cannot be loaded or rendering fails.
   */
  async render(): Promise<RenderResult> {
    let mjml2html = this.deps.mjml2html

    if (!mjml2html) {
      try {
        mjml2html = (await import('mjml')).default
      } catch (_e) {
        throw new Error(
          '[OrbitSignal] The "mjml" package is required for MjmlRenderer. Please install it using "bun add mjml".'
        )
      }
    }

    const { html, errors } = mjml2html(this.content, {
      validationLevel: 'soft',
      ...this.options,
    })

    if (errors && errors.length > 0 && this.options.validationLevel === 'strict') {
      throw new Error(
        `MJML rendering failed: ${errors.map((e: any) => e.formattedMessage).join(', ')}`
      )
    }

    return {
      html,
      text: stripHtml(html),
    }
  }
}
