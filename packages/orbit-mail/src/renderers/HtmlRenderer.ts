import type { Renderer, RenderResult } from './Renderer';

export class HtmlRenderer implements Renderer {
  constructor(private content: string) {}

  async render(): Promise<RenderResult> {
    return {
      html: this.content,
      text: this.stripHtml(this.content),
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<[^>]+>/g, '') // Remove tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking space
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }
}
