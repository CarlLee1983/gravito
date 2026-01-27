import { stripHtml } from '../utils/html'
import type { Renderer, RenderResult } from './Renderer'

/**
 * Renderer for React component-based emails.
 *
 * Renders React components to static HTML using server-side rendering (SSR).
 * It lazily loads React and ReactDOM dependencies only when needed, preventing
 * unnecessary bundle bloat for users who do not use React renderers.
 *
 * @example
 * ```typescript
 * const renderer = new ReactRenderer(MyComponent, { title: 'Welcome' });
 * const result = await renderer.render({ name: 'John' });
 * ```
 *
 * @typeParam P - Props type for the React component.
 * @public
 * @since 3.0.0
 */
export class ReactRenderer<P extends object = object> implements Renderer {
  /**
   * Creates an instance of ReactRenderer.
   *
   * @param component - The React component to render.
   * @param props - Initial props for the component.
   * @param deps - Optional dependency injection for testing.
   */
  constructor(
    private component: any, // Use any to avoid hard React dependency in types
    private props?: P,
    private deps: {
      createElement?: (...args: any[]) => any
      renderToStaticMarkup?: (element: any) => string
    } = {}
  ) {}

  /**
   * Renders the React component to a static HTML string.
   *
   * This method performs dynamic imports of `react` and `react-dom/server`
   * to ensure they are only loaded if this renderer is actually used.
   *
   * @param data - Runtime data to be merged with initial props.
   * @returns A promise resolving to the rendered content.
   * @throws {Error} If React dependencies cannot be loaded or rendering fails.
   */
  async render(data: Record<string, unknown>): Promise<RenderResult> {
    // Dynamic imports to avoid hard dependencies on react/react-dom
    const createElement = this.deps.createElement ?? (await import('react')).createElement
    const renderToStaticMarkup =
      this.deps.renderToStaticMarkup ?? (await import('react-dom/server')).renderToStaticMarkup

    const mergedProps = { ...this.props, ...data } as P

    const element = createElement(this.component, mergedProps)
    const html = renderToStaticMarkup(element)

    const fullHtml = html.startsWith('<!DOCTYPE') ? html : `<!DOCTYPE html>${html}`

    return {
      html: fullHtml,
      text: stripHtml(html),
    }
  }
}
