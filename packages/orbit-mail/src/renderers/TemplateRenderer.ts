import { TemplateEngine } from '@gravito/orbit-view';
import type { Renderer, RenderResult } from './Renderer';

export class TemplateRenderer implements Renderer {
  private engine: TemplateEngine;
  private template: string;

  constructor(templateName: string, viewsDir?: string) {
    this.template = templateName;
    // Default to src/emails if not provided, falling back to process cwd
    const defaultDir = viewsDir || process.cwd() + '/src/emails';
    this.engine = new TemplateEngine(defaultDir);
  }

  async render(data: Record<string, unknown>): Promise<RenderResult> {
    // Disable automatic layout by default for emails, unless explicitly handled in template
    const html = this.engine.render(this.template, data, { layout: undefined });

    return {
      html,
      text: this.stripHtml(html),
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
