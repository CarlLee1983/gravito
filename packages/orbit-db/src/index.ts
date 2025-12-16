import type { PlanetCore, GravitoOrbit } from 'gravito-core';
import type { Context, Next } from 'hono';

export interface OrbitDBOptions<TSchema extends Record<string, unknown> = Record<string, unknown>> {
  // biome-ignore lint/suspicious/noExplicitAny: generic db instance
  db: any;
  schema?: TSchema;
  exposeAs?: string;
}

/**
 * Standard Database Orbit (Class Implementation)
 */
export class OrbitDB implements GravitoOrbit {
  constructor(private options?: OrbitDBOptions) { }

  install(core: PlanetCore): void {
    // Try to resolve config from core if not provided in constructor
    const config = this.options || core.config.get('db');

    if (!config || !config.db) {
      throw new Error('[OrbitDB] No database configuration found. Please provide options or set "db" in core config.');
    }

    const { db, exposeAs = 'db' } = config;

    core.logger.info(`[OrbitDB] Initializing database integration (Exposed as: ${exposeAs})`);

    // 1. Action: Database Connected
    core.hooks.doAction('db:connected', { db });

    // 2. Middleware injection
    core.app.use('*', async (c: Context, next: Next) => {
      c.set(exposeAs, db);
      await next();
    });
  }
}

/**
 * Standard Database Orbit (Functional Wrapper)
 */
export default function orbitDB<TSchema extends Record<string, unknown>>(
  core: PlanetCore,
  options: OrbitDBOptions<TSchema>
) {
  const orbit = new OrbitDB(options);
  orbit.install(core);
  return { db: options.db };
}

