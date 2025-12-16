import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { PlanetCore, GravitoOrbit } from 'gravito-core';
import type { Context, Next } from 'hono';

export interface StorageProvider {
  put(key: string, data: Blob | Buffer | string): Promise<void>;
  get(key: string): Promise<Blob | null>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  private rootDir: string;
  private baseUrl: string;

  constructor(rootDir: string, baseUrl = '/storage') {
    this.rootDir = rootDir;
    this.baseUrl = baseUrl;
  }

  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    const path = join(this.rootDir, key);
    // Ensure dir exists
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (dir && dir !== this.rootDir) {
      await mkdir(dir, { recursive: true });
    }
    await Bun.write(path, data);
  }

  async get(key: string): Promise<Blob | null> {
    const file = Bun.file(join(this.rootDir, key));
    if (!(await file.exists())) return null;
    return file;
  }

  async delete(key: string): Promise<void> {
    // Bun currently lacks a direct 'unlink' API in Bun.file, using fs/promises is safer for checking
    // But actually, Node COMPAT layer is preferred.
    // Or just use shell for "rm"? No, unsafe.
    // Let's use simple node:fs for deletion.
    const fs = await import('node:fs/promises');
    try {
      await fs.unlink(join(this.rootDir, key));
    } catch (e) {
      // Ignore if not found
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

export interface OrbitStorageOptions {
  provider?: StorageProvider;
  exposeAs?: string; // Default: 'storage'
  local?: {
    root: string;
    baseUrl?: string;
  };
}

export class OrbitStorage implements GravitoOrbit {
  constructor(private options?: OrbitStorageOptions) { }

  install(core: PlanetCore): void {
    const config = this.options || core.config.get('storage');

    if (!config) {
      throw new Error('[OrbitStorage] Configuration is required. Please provide options or set "storage" in core config.');
    }

    const { exposeAs = 'storage' } = config;
    const logger = core.logger;

    logger.info(`[OrbitStorage] Initializing Storage (Exposed as: ${exposeAs})`);

    let provider = config.provider;

    // Default to LocalStorage if not provided and local options are present
    if (!provider && config.local) {
      logger.info(`[OrbitStorage] Using LocalStorageProvider at ${config.local.root}`);
      provider = new LocalStorageProvider(config.local.root, config.local.baseUrl);
    }

    if (!provider) {
      throw new Error(
        '[OrbitStorage] No provider configured. Please provide a provider instance or local configuration.'
      );
    }

    const storageService = {
      ...provider,
      // Wrap methods if we want to add hooks later
      put: async (key: string, data: Blob | Buffer | string) => {
        // Hook: storage:upload
        const finalData = await core.hooks.applyFilters('storage:upload', data, { key });
        await provider?.put(key, finalData);
        // Action: storage:uploaded
        await core.hooks.doAction('storage:uploaded', { key });
      },
    };

    // Inject helper into context
    core.app.use('*', async (c: Context, next: Next) => {
      c.set(exposeAs, storageService);
      await next();
    });

    // Action: Storage Initialized
    core.hooks.doAction('storage:init', storageService);
  }
}

export default function orbitStorage(core: PlanetCore, options: OrbitStorageOptions) {
  const orbit = new OrbitStorage(options);
  orbit.install(core);

  // NOTE: Functional wrapper requires specific return implementation which can't be easily extracted from void install()
  // Re-implementing minimal return logic for backward compatibility
  // This duplicates the service creation/wrapping logic - acceptable for legacy support
  const { exposeAs = 'storage' } = options;
  let provider = options.provider;
  if (!provider && options.local) {
    provider = new LocalStorageProvider(options.local.root, options.local.baseUrl);
  }

  // Notice: The class version adds hooks wrapper, we should probably do the same here to be consistent
  // Or simply rely on the fact that hooks/actions were registered inside install()
  // But wait, user gets the RETURNED object. If we return the raw provider, hooks in 'put' won't fire 
  // unless user calls c.get('storage').
  // If user calls returnedService.put(), it bypasses the hooks wrapper created inside install().

  // To fix this without massive duplication, let's just return a proxy that delegates to Context? 
  // No, context is per request.

  // Let's accept that the "Returned Object" from functional API is the raw provider wrapped.
  // We duplicate the wrapper logic here for safety.

  if (!provider) throw new Error('[OrbitStorage] No provider configured.');

  return {
    ...provider,
    put: async (key: string, data: Blob | Buffer | string) => {
      const finalData = await core.hooks.applyFilters('storage:upload', data, { key });
      await provider?.put(key, finalData);
      await core.hooks.doAction('storage:uploaded', { key });
    },
  };
}
