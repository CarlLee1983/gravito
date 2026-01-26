/**
 * Result of a content rendering operation.
 *
 * @public
 * @since 3.0.0
 */
export interface RenderResult {
  /** Rendered HTML string. */
  html: string
  /** Optional rendered plain text string. */
  text?: string
}

/**
 * Interface for email content renderers (HTML, Template, React, Vue).
 *
 * @public
 * @since 3.0.0
 */
export interface Renderer {
  /**
   * Render the content into HTML and optionally plain text.
   *
   * @param data - The data context for rendering.
   */
  render(data: Record<string, unknown>): Promise<RenderResult>
}
