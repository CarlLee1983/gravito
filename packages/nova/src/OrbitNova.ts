import type { GravitoContext, GravitoNext, GravitoOrbit, PlanetCore } from '@gravito/core'
import { Shell } from './Shell'

/**
 * Configuration options for OrbitNova shell execution orbit.
 * @public
 */
export interface OrbitNovaOptions {
  /**
   * The key used to expose the Shell instance in the context (default: 'shell').
   * Allows accessing the service via `ctx.get('shell')`.
   */
  exposeAs?: string
}

/**
 * OrbitNova is the shell command execution orbit for Gravito.
 * It provides type-safe, shell-injection-resistant shell command execution
 * integrated with Gravito's lifecycle management.
 *
 * Features:
 * - Template literal-based syntax with automatic escaping
 * - Pipeline composition support
 * - Integration with PlanetCore container and context
 * - No stateful connections (stateless design)
 *
 * @example
 * ```typescript
 * const nova = new OrbitNova({ exposeAs: 'shell' });
 * core.addOrbit(nova);
 *
 * // Usage in controller
 * async handle(ctx: GravitoContext) {
 *   const shell = ctx.get('shell');
 *   const result = await shell.run`ls -la ${dir}`;
 * }
 * ```
 * @public
 */
export class OrbitNova implements GravitoOrbit {
  constructor(private options: OrbitNovaOptions = {}) {}

  /**
   * Factory method for fluent configuration.
   *
   * @param options - Orbit configuration
   * @returns Configured OrbitNova instance ready for installation
   *
   * @example
   * ```typescript
   * const nova = OrbitNova.configure({ exposeAs: 'shell' });
   * core.addOrbit(nova);
   * ```
   */
  static configure(options: OrbitNovaOptions): OrbitNova {
    return new OrbitNova(options)
  }

  /**
   * Lifecycle hook for Gravito orbit registration.
   *
   * Integrates Shell facade into the framework by:
   * - Registering Shell in the IoC container
   * - Injecting Shell into request context for controller access
   *
   * @param core - PlanetCore instance
   */
  install(core: PlanetCore): void {
    const exposeAs = this.options.exposeAs ?? 'shell'

    // 1. Register Shell in container for global access
    core.container.instance(exposeAs, Shell)

    // 2. Inject Shell into request context
    core.adapter.use('*', async (ctx: GravitoContext, next: GravitoNext) => {
      ctx.set(exposeAs, Shell)
      return next()
    })

    // 3. No shutdown hook needed - Shell is stateless
  }
}

/**
 * Module augmentation for GravitoContext to include shell variable.
 */
declare module '@gravito/core' {
  interface GravitoVariables {
    /**
     * Shell facade for executing commands.
     * Available via ctx.get('shell') or container.resolve('shell').
     */
    shell?: typeof Shell
  }
}
