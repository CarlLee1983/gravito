import type { GravitoOrbit, PlanetCore } from 'gravito-core';
import type { Context, Next } from 'hono';

export interface CacheProvider {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * CacheService interface exposed to Hono context via c.get('cache')
 */
export interface CacheService {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T>;
}

export class MemoryCacheProvider implements CacheProvider {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set(key: string, value: unknown, ttl = 60): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export interface OrbitCacheOptions {
  provider?: CacheProvider;
  exposeAs?: string; // Default: 'cache'
  defaultTTL?: number;
}

export class OrbitCache implements GravitoOrbit {
  constructor(private options?: OrbitCacheOptions) {}

  install(core: PlanetCore): void {
    // Resolve config from options or core config (with empty fallback since cache works with defaults)
    const resolvedConfig: OrbitCacheOptions =
      this.options ?? (core.config.has('cache') ? core.config.get<OrbitCacheOptions>('cache') : {});

    const { exposeAs = 'cache', defaultTTL = 60 } = resolvedConfig;
    const logger = core.logger;

    logger.info(`[OrbitCache] Initializing Cache (Exposed as: ${exposeAs})`);

    const provider = resolvedConfig.provider ?? new MemoryCacheProvider();

    const cacheService = {
      get: (key: string) => provider.get(key),
      delete: (key: string) => provider.delete(key),
      clear: () => provider.clear(),

      async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
        let value = await provider.get<T>(key);
        if (value) {
          core.hooks.doAction('cache:hit', { key });
          return value;
        }
        core.hooks.doAction('cache:miss', { key });
        value = await callback();
        await provider.set(key, value, ttl);
        return value;
      },

      set: async (key: string, value: unknown, ttl?: number) => {
        return provider.set(key, value, ttl ?? defaultTTL);
      },
    };

    core.app.use('*', async (c: Context, next: Next) => {
      c.set(exposeAs, cacheService);
      await next();
    });

    core.hooks.doAction('cache:init', cacheService);
  }
}

export default function orbitCache(core: PlanetCore, options: OrbitCacheOptions = {}) {
  const orbit = new OrbitCache(options);
  orbit.install(core);

  // Functional Wrapper Return Logic (Duplication for compatibility)
  const { defaultTTL = 60 } = options;
  const provider = options.provider || new MemoryCacheProvider();

  return {
    get: (key: string) => provider.get(key),
    delete: (key: string) => provider.delete(key),
    clear: () => provider.clear(),
    async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
      let value = await provider.get<T>(key);
      if (value) {
        core.hooks.doAction('cache:hit', { key });
        return value as T;
      }
      core.hooks.doAction('cache:miss', { key });
      value = await callback();
      await provider.set(key, value, ttl);
      return value;
    },
    set: async (key: string, value: unknown, ttl?: number) => {
      return provider.set(key, value, ttl ?? defaultTTL);
    },
  };
}
