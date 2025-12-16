import type { Context } from 'hono';

export interface InertiaConfig {
  rootView?: string;
  version?: string;
}

export class InertiaService {
  constructor(
    private context: Context,
    private config: InertiaConfig = {}
  ) {}

  /**
   * Render an Inertia component
   */
  public render(component: string, props: Record<string, unknown> = {}) {
    const page = {
      component,
      props,
      url: this.context.req.url,
      version: this.config.version,
    };

    // 1. If it's an Inertia request, return JSON
    if (this.context.req.header('X-Inertia')) {
      this.context.header('X-Inertia', 'true');
      this.context.header('Vary', 'Accept');
      return this.context.json(page);
    }

    // 2. Otherwise return the root HTML with data-page attribute
    // We assume there is a ViewService that handles the root template
    // The rootView should contain: <div id="app" data-page='{{ page }}'></div>
    const view = this.context.get('view');
    const rootView = this.config.rootView ?? 'app';

    if (!view) {
      throw new Error('OrbitView is required for the initial page load in OrbitInertia');
    }

    return this.context.html(
      view.render(rootView, {
        page: JSON.stringify(page),
      })
    );
  }

  /**
   * Share data with all responses
   * (This ideally should be handled via middleware injecting into a shared props object)
   */
  // public share(key: string, value: any) {}
}
