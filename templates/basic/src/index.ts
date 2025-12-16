import { OrbitCache } from '@gravito/orbit-cache';
import { defineConfig, PlanetCore } from 'gravito-core';
import { serveStatic } from 'hono/bun';

// 1. Define Configuration (IoC Style)
const config = defineConfig({
  config: {
    PORT: 3000,
    APP_NAME: 'Gravito Demo',
    APP_VERSION: '1.0.0',
  },
  orbits: [
    // Cache orbit for visitor counter demo
    OrbitCache,
  ],
});

// 2. Boot the Planet
const core = await PlanetCore.boot(config);

// 3. Add hooks to demonstrate the hook system
core.hooks.addAction('app:liftoff', (args) => {
  const { port } = args as { port: number };
  core.logger.info(`🌌 ${core.config.get('APP_NAME')} is ready at http://localhost:${port}`);
});

core.hooks.addFilter('api:response', async (data) => {
  // Add metadata to all API responses
  return {
    ...data,
    _meta: {
      timestamp: new Date().toISOString(),
      poweredBy: 'Gravito',
    },
  };
});

// 4. Static file serving
core.app.use('/static/*', serveStatic({ root: './' }));
core.app.get('/favicon.ico', serveStatic({ path: './static/favicon.ico' }));

// 5. HTML Page Routes
core.app.get('/', async (c) => {
  // Increment visitor counter using cache
  const cache = c.get('cache');
  const count = ((await cache?.get<number>('visitor:count')) ?? 0) + 1;
  await cache?.set('visitor:count', count, 86400); // 24 hours TTL

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${core.config.get('APP_NAME')}</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🌌 Welcome to Gravito</h1>
      <p class="tagline">A micro-kernel framework for building modular backend applications</p>
    </header>
    
    <main>
      <section class="stats">
        <div class="stat-card">
          <span class="stat-number">${count}</span>
          <span class="stat-label">Visitors</span>
        </div>
        <div class="stat-card">
          <span class="stat-number" id="uptime">-</span>
          <span class="stat-label">Uptime</span>
        </div>
      </section>

      <section class="features">
        <h2>Core Features</h2>
        <div class="feature-grid">
          <div class="feature-card">
            <span class="icon">🪐</span>
            <h3>PlanetCore</h3>
            <p>Micro-kernel with IoC container</p>
          </div>
          <div class="feature-card">
            <span class="icon">🔌</span>
            <h3>Orbits</h3>
            <p>Modular plugin system</p>
          </div>
          <div class="feature-card">
            <span class="icon">🪝</span>
            <h3>Hooks</h3>
            <p>WordPress-style actions & filters</p>
          </div>
          <div class="feature-card">
            <span class="icon">⚡</span>
            <h3>Bun + Hono</h3>
            <p>Lightning-fast performance</p>
          </div>
        </div>
      </section>

      <section class="api-demo">
        <h2>API Endpoints</h2>
        <div class="endpoint-list">
          <a href="/api/health" class="endpoint">/api/health</a>
          <a href="/api/config" class="endpoint">/api/config</a>
          <a href="/api/stats" class="endpoint">/api/stats</a>
        </div>
      </section>
    </main>

    <footer>
      <p>Built with ❤️ using <strong>Gravito v${core.config.get('APP_VERSION')}</strong></p>
    </footer>
  </div>

  <script>
    // Fetch uptime from API
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        document.getElementById('uptime').textContent = data.uptime
      })
  </script>
</body>
</html>`;

  return c.html(html);
});

// 6. API Routes
const startTime = Date.now();

core.app.get('/api/health', async (c) => {
  const response = await core.hooks.applyFilters('api:response', {
    status: 'healthy',
    service: core.config.get('APP_NAME'),
  });
  return c.json(response);
});

core.app.get('/api/config', async (c) => {
  const response = await core.hooks.applyFilters('api:response', {
    app: {
      name: core.config.get('APP_NAME'),
      version: core.config.get('APP_VERSION'),
    },
    environment: {
      runtime: 'Bun',
      port: core.config.get('PORT'),
    },
  });
  return c.json(response);
});

core.app.get('/api/stats', async (c) => {
  const cache = c.get('cache');
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(uptimeSeconds / 60);
  const seconds = uptimeSeconds % 60;

  const response = await core.hooks.applyFilters('api:response', {
    uptime: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`,
    uptimeMs,
    visitors: (await cache?.get<number>('visitor:count')) ?? 0,
    memory: {
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
  });
  return c.json(response);
});

// 7. Liftoff! 🚀
export default core.liftoff();
