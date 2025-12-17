import type { GravitoOrbit, PlanetCore } from 'gravito-core';
import { ContentManager, type CollectionConfig } from './ContentManager';
import { join } from 'node:path';

declare module 'gravito-core' {
    interface Variables {
        content: ContentManager;
    }
}

export interface ContentConfig {
    root?: string; // Defaults to process.cwd()
    collections?: Record<string, CollectionConfig>;
}

export class ContentOrbit implements GravitoOrbit {
    constructor(private config: ContentConfig = {}) { }

    install(core: PlanetCore): void {
        const root = this.config.root || process.cwd();
        const manager = new ContentManager(root);

        // Register Collections from Config
        if (this.config.collections) {
            for (const [name, config] of Object.entries(this.config.collections)) {
                manager.defineCollection(name, config);
            }
        }

        // Register Default 'docs' and 'blog' if folders exist?
        // Let's stick to explicit configuration for now to avoid magic.

        // Inject into request context
        core.app.use('*', async (c, next) => {
            c.set('content', manager);
            await next();
        });

        core.logger.info('Content Orbit installed 📝');
    }
}

export * from './ContentManager';
