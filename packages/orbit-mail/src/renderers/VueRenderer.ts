import { renderToString } from '@vue/server-renderer';
import { type Component, createSSRApp, h } from 'vue';
import type { Renderer, RenderResult } from './Renderer';

export class VueRenderer<P extends object = object> implements Renderer {
  constructor(
    private component: Component,
    private props?: P
  ) {}

  async render(data: Record<string, unknown>): Promise<RenderResult> {
    const mergedProps = { ...this.props, ...data };

    const app = createSSRApp({
      render: () => h(this.component, mergedProps),
    });

    const html = await renderToString(app);

    const fullHtml = html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>${html}`;

    return {
      html: fullHtml,
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
