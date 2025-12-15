import { type Context, Hono } from 'hono';
import { ConfigManager } from './ConfigManager';
import { HookManager } from './HookManager';
import { ConsoleLogger, type Logger } from './Logger';

export interface PlanetCoreOptions {
  logger?: Logger;
  config?: Record<string, unknown>;
}

export class PlanetCore {
  public app: Hono;
  public hooks: HookManager;
  public logger: Logger;
  public config: ConfigManager;

  constructor(options: PlanetCoreOptions = {}) {
    this.app = new Hono();
    this.hooks = new HookManager();

    // 初始化 Phase 2 組件
    this.logger = options.logger || new ConsoleLogger();
    this.config = new ConfigManager(options.config);

    this.setupDefaults();
  }

  private setupDefaults() {
    // 1. 掛載 Logger Middleware
    this.app.use('*', async (c, next) => {
      this.logger.info(`${c.req.method} ${c.req.url}`);
      await next();
    });

    // 2. 統一錯誤處理
    this.app.onError((err: Error, c: Context) => {
      this.logger.error(`Application Error: ${err.message}`, err.stack);

      return c.json(
        {
          success: false,
          error: {
            message: err.message || 'Internal Server Error',
            code: 'INTERNAL_ERROR',
          },
        },
        500
      );
    });

    this.app.notFound((c) => {
      return c.json(
        {
          success: false,
          error: {
            message: 'Route not found',
            code: 'NOT_FOUND',
          },
        },
        404
      );
    });
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

    this.logger.info(`Ready to liftoff on port ${finalPort} 🚀`);

    return {
      port: finalPort,
      fetch: this.app.fetch.bind(this.app),
    };
  }
}
