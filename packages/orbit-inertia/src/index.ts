import type { GravitoOrbit, PlanetCore } from 'gravito-core';
import { InertiaService } from './InertiaService';

export * from './InertiaService';

declare module 'hono' {
  interface ContextVariableMap {
    inertia: InertiaService;
  }
}

export class OrbitInertia implements GravitoOrbit {
  install(core: PlanetCore): void {
    core.logger.info('🛰️ Orbit Inertia installed');

    const appVersion = core.config.get('APP_VERSION', '1.0.0');

    // Register middleware to inject Inertia helper
    core.app.use('*', async (c, next) => {
      // Initialize with config
      const inertia = new InertiaService(c, {
        version: String(appVersion),
        rootView: 'app', // Default to src/views/app.html
      });

      c.set('inertia', inertia);
      await next();
    });
  }
}
