import { stripHtml } from '../utils/html'
import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for Vue component-based emails.
 *
 * Renders Vue 3 components to static HTML using server-side rendering (SSR).
 * It lazily loads Vue and `@vue/server-renderer` dependencies only when needed,
 * preventing unnecessary bundle bloat for users who do not use Vue renderers.
 *
 * @example
 * ```typescript
 * const renderer = new VueRenderer(MyComponent, { title: 'Welcome' });
 * const result = await renderer.render({ name: 'John' });
 * ```
 *
 * @typeParam P - Props type for the Vue component.
 * @public
 * @since 3.0.0
 */
export class VueRenderer<P extends object = object> implements Renderer {
  /**
   * Creates an instance of VueRenderer.
   *
   * @param component - The Vue component to render.
   * @param props - Initial props for the component.
   * @param deps - Optional dependency injection for testing.
   */
  constructor(
    private component: any, // Use any to avoid hard Vue dependency in types
    private props?: P,
    private deps: {
      createSSRApp?: (...args: any[]) => any
      h?: (...args: any[]) => any
      renderToString?: (app: any) => Promise<string>
    } = {}
  ) {}

  /**
   * Renders the Vue component to a static HTML string.
   *
   * This method performs dynamic imports of `vue` and `@vue/server-renderer`
   * to ensure they are only loaded if this renderer is actually used.
   *
   * @param data - Runtime data to be merged with initial props.
   * @returns A promise resolving to the rendered content.
   * @throws {Error} If Vue dependencies cannot be loaded or rendering fails.
   */
  async render(data: Record<string, unknown>): Promise<RenderResult> {
    // Dynamic imports to avoid hard dependencies on vue/@vue/server-renderer
    const createSSRApp = this.deps.createSSRApp ?? (await import('vue')).createSSRApp
    const h = this.deps.h ?? (await import('vue')).h
    const renderToString =
      this.deps.renderToString ?? (await import('@vue/server-renderer')).renderToString

    const mergedProps = { ...this.props, ...data }

    const app = createSSRApp({
      render: () => h(this.component, mergedProps),
    })

    const html = await renderToString(app)

    const fullHtml = html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>${html}`

    return {
      html: fullHtml,
      text: stripHtml(html),
    }
  }
}
