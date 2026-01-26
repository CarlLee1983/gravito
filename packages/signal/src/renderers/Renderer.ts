/**
 * Result of a content rendering operation.
 *
 * This interface defines the structure of the output produced by any renderer.
 * It ensures consistency across different rendering strategies (HTML, React, Vue, etc.),
 * providing both the final HTML for the email body and an optional plain text version
 * for clients that do not support HTML.
 *
 * @example
 * ```typescript
 * const result: RenderResult = {
 *   html: '<html><body><h1>Hello</h1></body></html>',
 *   text: 'Hello'
 * };
 * ```
 *
 * @public
 * @since 3.0.0
 */
export interface RenderResult {
  /**
   * The rendered HTML string.
   *
   * This is the primary content used for the email body.
   */
  html: string
  /**
   * Optional rendered plain text string.
   *
   * Used as a fallback for email clients that cannot display HTML or for accessibility.
   */
  text?: string
}

/**
 * Interface for email content renderers.
 *
 * Renderers are responsible for transforming various input formats (raw HTML,
 * templates, or UI components) into a standardized {@link RenderResult}.
 * This abstraction allows the mail system to support multiple view engines
 * and frameworks interchangeably.
 *
 * @example
 * ```typescript
 * class MyRenderer implements Renderer {
 *   async render(data: Record<string, unknown>): Promise<RenderResult> {
 *     return { html: `<div>${data.name}</div>`, text: String(data.name) };
 *   }
 * }
 * ```
 *
 * @public
 * @since 3.0.0
 */
export interface Renderer {
  /**
   * Render the content into HTML and optionally plain text.
   *
   * This method performs the actual transformation of the source content
   * using the provided data context.
   *
   * @param data - The data context for rendering.
   * @returns A promise resolving to the rendered content.
   * @throws {Error} If rendering fails due to syntax errors or missing dependencies.
   */
  render(data: Record<string, unknown>): Promise<RenderResult>
}
