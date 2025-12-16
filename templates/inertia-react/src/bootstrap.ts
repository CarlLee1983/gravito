import { OrbitCache } from '@gravito/orbit-cache';
import { OrbitInertia } from '@gravito/orbit-inertia';
import { OrbitView } from '@gravito/orbit-view';
import { defineConfig, PlanetCore } from 'gravito-core';
import { serveStatic } from 'hono/bun';
import { registerHooks } from './hooks';
import { registerRoutes } from './routes';

export interface AppConfig {
  port?: number;
  name?: string;
  version?: string;
}

export async function bootstrap(options: AppConfig = {}) {
  const { port = 3000, name = 'Gravito App', version = '1.0.0' } = options;

  // 1. Configure
  const config = defineConfig({
    config: {
      PORT: port,
      APP_NAME: name,
      APP_VERSION: version,
      VIEW_DIR: 'src/views',
    },
    // Add OrbitInertia
    orbits: [OrbitCache, OrbitView, OrbitInertia],
  });

  // 2. Boot
  const core = await PlanetCore.boot(config);

  // 3. Static files
  core.app.use('/static/*', serveStatic({ root: './' }));
  core.app.get('/favicon.ico', serveStatic({ path: './static/favicon.ico' }));

  // 4. Hooks
  registerHooks(core);

  // 5. Routes
  registerRoutes(core);

  // 6. Liftoff!
  return core.liftoff();
}
