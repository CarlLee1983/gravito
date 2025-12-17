import type { GravitoOrbit, PlanetCore } from 'gravito-core';
import { I18nManager, type I18nConfig, type I18nService } from './I18nService';

declare module 'gravito-core' {
    interface Variables {
        i18n: I18nService;
    }
}

export class I18nOrbit implements GravitoOrbit {
    constructor(private config: I18nConfig) { }

    install(core: PlanetCore): void {
        const i18n = new I18nManager(this.config);

        // Register globally if needed, or just prepare it to be used.
        // There isn't a global "services" container in PlanetCore yet other than 'Variables' injected via Config/Context.
        // Ideally we attach it to the core instance or inject it into every request.

        // Inject into every request
        core.app.use('*', async (c, next) => {
            c.set('i18n', i18n);
            await next();
        });

        // Register a helper if using Orbit View (View Rendering)
        // We can check if 'view' exists or we can register a global view helper if that API exists.
        // For now, context injection is sufficient.

        core.logger.info(`I18n Orbit initialized with locale: ${this.config.defaultLocale}`);
    }
}

export * from './I18nService';
export * from './loader';

