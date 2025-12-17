export interface RenderResult {
  html: string;
  text?: string;
}

export interface Renderer {
  /**
   * Render the content into HTML and optionally plain text
   */
  render(data: Record<string, unknown>): Promise<RenderResult>;
}
