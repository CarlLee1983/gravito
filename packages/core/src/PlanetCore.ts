import { type Context, Hono } from 'hono';
import { serve } from 'bun';
import { ConfigManager } from './ConfigManager';
import { HookManager } from './HookManager';
import { ConsoleLogger, type Logger } from './Logger';

export interface GravitoOrbit {
  install(core: PlanetCore): void | Promise<void>;
}

export type GravitoConfig = {
  logger?: Logger;
  config?: Record<string, any>;
  orbits?: (new () => GravitoOrbit)[] | GravitoOrbit[];
};

export class PlanetCore {
  public app: Hono;
  public logger: Logger;
  public config: ConfigManager;
  public hooks: HookManager;
  private isLiftedOff = false;

  constructor(options: {
    logger?: Logger,
    config?: Record<string, any>
  } = {}) {
    this.logger = options.logger || new ConsoleLogger();
    this.config = new ConfigManager(options.config);
    this.hooks = new HookManager(this.logger);

    this.app = new Hono();

    // Core Middleware for Context Injection
    this.app.use('*', async (c, next) => {
      c.set('core', this);
      c.set('logger', this.logger);
      c.set('config', this.config);
      await next();
    });

    // Standard Error Handling
    this.app.onError((err, c) => {
      this.logger.error(`[ERROR] Application Error: ${err.message}`, err);
      return c.json({
        success: false,
        error: {
          message: err.message || 'Internal Server Error',
          code: 'INTERNAL_ERROR',
        },
      }, 500);
    });

    this.app.notFound((c) => {
      this.logger.info(`[INFO] 404 Not Found: ${c.req.url}`);
      return c.json({
        success: false,
        error: {
          message: 'Route not found',
          code: 'NOT_FOUND',
        },
      }, 404);
    });
  }

  /**
   * Boot the application with a configuration object (IoC style default entry)
   */
  static async boot(config: GravitoConfig): Promise<PlanetCore> {
    const core = new PlanetCore({
      logger: config.logger,
      config: config.config
    });

    if (config.orbits) {
      for (const OrbitClassOrInstance of config.orbits) {
        let orbit: GravitoOrbit;
        if (typeof OrbitClassOrInstance === 'function') {
          // It's a constructor
          orbit = new (OrbitClassOrInstance as new () => GravitoOrbit)();
        } else {
          orbit = OrbitClassOrInstance;
        }

        await orbit.install(core);
      }
    }

    return core;
  }

  /**
   * 掛載軌道 (Orbit)
   * 將外部的 Hono app 掛載到指定路徑
   */
  mountOrbit(path: string, orbitApp: Hono): void {
    this.logger.info(`Mounting orbit at path: ${path}`);
    this.app.route(path, orbitApp);
  }

  /**
   * 啟動核心 (Liftoff)
   * 回傳用於 Bun.serve 的設定物件
   */
  liftoff(port?: number) {
    // 優先使用參數 > 設定檔 > 預設值
    const finalPort = port ?? this.config.get<number>('PORT', 3000);

    // Call hooks before liftoff
    this.hooks.doAction('app:liftoff', { port: finalPort });

    this.logger.info(`Ready to liftoff on port ${finalPort} 🚀`);

    return {
      port: finalPort,
      fetch: this.app.fetch.bind(this.app),
    };
  }
}

