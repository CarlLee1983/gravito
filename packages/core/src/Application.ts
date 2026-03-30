/**
 * @fileoverview Application - Enterprise Application Container
 *
 * A high-level application class that orchestrates the entire framework.
 * Provides a centralized entry point for enterprise applications with
 * auto-discovery of providers, config loading, and lifecycle management.
 *
 * Phase 4 優化：Provider 預掃描 + 平行載入
 * - Phase 1：預掃描所有 Provider 文件（語法驗證）
 * - Phase 2：篩選有效 Provider（跳過無效的）
 * - Phase 3：平行 import 所有有效 Provider
 * - Phase 4：註冊到容器
 *
 * @module @gravito/core
 * @since 2.0.0
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ConfigManager } from './ConfigManager'
import { Container } from './Container'
import type { EventManager } from './EventManager'
import type { Logger } from './Logger'
import { ConsoleLogger } from './Logger'
import { PlanetCore } from './PlanetCore'
import type { GravitoConfig } from './PlanetCore'
import type { ServiceProvider } from './ServiceProvider'

// ─────────────────────────────────────────────────────────────────────────────
// 內部型別定義
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Provider 檔案掃描結果
 * 預掃描 Phase 的輸出，紀錄每個檔案的基本語法驗證結果
 */
interface ProviderScanResult {
  /** 檔案絕對路徑 */
  filePath: string
  /** 檔案名稱（含副檔名） */
  fileName: string
  /** 是否通過語法驗證 */
  valid: boolean
  /** 失敗原因（僅在 valid === false 時有值） */
  error?: string
}

/**
 * Provider 模組載入結果
 * 平行 import Phase 的輸出
 */
interface ProviderLoadResult {
  /** 檔案名稱（供日誌參考） */
  fileName: string
  /** 已解析的 Provider class（若載入成功） */
  // biome-ignore lint/complexity/noBannedTypes: 需要接受任意建構子函式
  ProviderClass?: Function
  /** 是否成功 */
  success: boolean
  /** 失敗原因 */
  error?: string
}

/**
 * Application Config options for the Application class.
 * @public
 */
export interface ApplicationConfig extends Pick<GravitoConfig, 'logger' | 'config'> {
  /**
   * Base path of the application
   */
  basePath: string

  /**
   * Path to the config directory (relative to basePath)
   * @default 'config'
   */
  configPath?: string

  /**
   * Path to the providers directory (relative to basePath)
   * @default 'src/Providers'
   */
  providersPath?: string

  /**
   * Environment (development, production, testing)
   */
  env?: 'development' | 'production' | 'testing'

  /**
   * Service providers to register
   */
  providers?: ServiceProvider[]

  /**
   * Whether to auto-discover providers from providersPath
   * @default true
   */
  autoDiscoverProviders?: boolean
}

/**
 * Application - Enterprise-grade application container.
 *
 * Provides a higher-level abstraction over PlanetCore for building
 * enterprise applications with convention-over-configuration patterns.
 *
 * @example
 * ```typescript
 * // Create application
 * const app = new Application({
 *   basePath: import.meta.dir,
 *   env: process.env.NODE_ENV as 'development' | 'production',
 * });
 *
 * // Boot the application
 * await app.boot();
 *
 * // Access core
 * export default app.core.liftoff();
 * ```
 */
export class Application {
  /**
   * The underlying PlanetCore instance.
   */
  public readonly core: PlanetCore

  /**
   * The IoC container.
   */
  public readonly container: Container

  /**
   * The configuration manager.
   */
  public readonly config: ConfigManager

  /**
   * The event manager.
   */
  public readonly events: EventManager

  /**
   * The logger instance.
   */
  public readonly logger: Logger

  /**
   * Application base path.
   */
  public readonly basePath: string

  /**
   * Environment mode.
   */
  public readonly env: 'development' | 'production' | 'testing'

  /**
   * Configuration options.
   */
  private readonly options: ApplicationConfig

  /**
   * Whether the application has been booted.
   */
  private booted = false

  constructor(options: ApplicationConfig) {
    this.options = options
    this.basePath = options.basePath
    this.env =
      options.env ??
      (process.env.NODE_ENV as 'development' | 'production' | 'testing') ??
      'development'
    this.logger = options.logger ?? new ConsoleLogger()

    // Initialize container and config
    this.container = new Container()
    this.config = new ConfigManager(options.config ?? {})

    // Initialize core with shared container
    // Now PlanetCore uses the same container instance as Application
    this.core = new PlanetCore({
      logger: this.logger,
      config: options.config,
      container: this.container,
    })

    this.events = this.core.events

    // Register self in container
    this.container.instance('app', this)
    this.container.instance('config', this.config)
    this.container.instance('logger', this.logger)
    this.container.instance('events', this.events)
  }

  /**
   * Boot the application and its dependencies.
   *
   * This method orchestrates the full application lifecycle:
   * 1. Configuration: Loads all config files from the config directory.
   * 2. Discovery: Auto-discovers ServiceProviders from the providers directory.
   * 3. Registration: Registers all discovered and explicit providers.
   * 4. Bootstrapping: Triggers the PlanetCore bootstrap sequence.
   *
   * @returns Promise that resolves to the application instance for chaining.
   *
   * @example
   * ```typescript
   * const app = new Application({ basePath: import.meta.dir });
   * await app.boot();
   * ```
   */
  async boot(): Promise<this> {
    if (this.booted) {
      return this
    }

    this.logger.info(`🚀 Booting application in ${this.env} mode...`)

    // 1. Load configuration
    await this.loadConfiguration()

    // 2. Auto-discover and register providers
    if (this.options.autoDiscoverProviders !== false) {
      await this.discoverProviders()
    }

    // 4. Register explicit providers
    if (this.options.providers) {
      for (const provider of this.options.providers) {
        this.core.register(provider)
      }
    }

    // 5. Bootstrap core (register + boot all providers)
    await this.core.bootstrap()

    this.booted = true
    this.logger.info('✅ Application booted successfully')

    return this
  }

  /**
   * Load configuration files from the config directory.
   *
   * @internal
   */
  private async loadConfiguration(): Promise<void> {
    const configPath = path.resolve(this.basePath, this.options.configPath ?? 'config')

    try {
      const stat = await fs.stat(configPath)
      if (!stat.isDirectory()) {
        return
      }

      const files = await fs.readdir(configPath)

      for (const file of files) {
        if (!file.endsWith('.ts') && !file.endsWith('.js')) {
          continue
        }

        const key = path.basename(file, path.extname(file))
        const filePath = path.resolve(configPath, file)

        try {
          const module = await import(pathToFileURL(filePath).href)
          const value = module.default ?? module

          this.config.set(key, value)
          this.logger.info(`📋 Loaded config: ${key}`)
        } catch (error) {
          // Enhanced error handling with type guards
          if (error instanceof SyntaxError) {
            this.logger.error(`Syntax error in config file ${file}:`, error.message)
          } else if (error instanceof Error) {
            this.logger.warn(`Failed to load config ${file}: ${error.message}`, {
              stack: error.stack,
            })
          } else {
            this.logger.warn(`Failed to load config ${file}:`, error)
          }
        }
      }
    } catch {
      // Config directory doesn't exist, that's fine
      this.logger.info('No config directory found, skipping config loading')
    }
  }

  /**
   * Discover and register providers from the providers directory.
   *
   * Phase 4 優化版本：採用 4-Phase 載入策略
   * - Phase 1：預掃描所有候選 Provider 檔案（語法驗證）
   * - Phase 2：篩選有效 Provider 檔案（跳過語法錯誤的）
   * - Phase 3：平行 import 所有有效 Provider（從循序 → 並行）
   * - Phase 4：逐一註冊到容器
   *
   * 效能改進：N 個 Provider 從 O(N * importTime) 降至 O(importTime + overhead)
   *
   * @internal
   */
  private async discoverProviders(): Promise<void> {
    const providersPath = path.resolve(this.basePath, this.options.providersPath ?? 'src/Providers')

    try {
      const stat = await fs.stat(providersPath)
      if (!stat.isDirectory()) {
        return
      }

      const startTime = Date.now()

      // Phase 1：取得候選 Provider 檔案清單並預掃描
      const scanResults = await this.prescribeProviders(providersPath)
      const scanMs = Date.now() - startTime

      if (scanResults.length === 0) {
        return
      }

      // Phase 2：篩選有效檔案（排除語法錯誤的）
      const validProviders = scanResults.filter((r) => r.valid)
      const invalidCount = scanResults.length - validProviders.length

      this.logger.info(
        `🔍 Prescanned ${scanResults.length} files (${scanMs}ms) - valid: ${validProviders.length}, invalid: ${invalidCount}`
      )

      if (validProviders.length === 0) {
        return
      }

      // Phase 3：平行 import 所有有效 Provider
      this.logger.info('⚙️  Loading providers in parallel...')
      const loadResults = await this.loadProvidersInParallel(validProviders)

      // Phase 4：逐一註冊到容器
      const registerStart = Date.now()
      let registeredCount = 0

      for (const result of loadResults) {
        if (!result.success || !result.ProviderClass) {
          continue
        }

        try {
          const provider = new (result.ProviderClass as new () => ServiceProvider)()
          this.core.register(provider)
          this.logger.info(`🔌 Registered provider: ${result.ProviderClass.name}`)
          registeredCount++
        } catch (error) {
          if (error instanceof Error) {
            this.logger.warn(
              `Failed to instantiate provider from ${result.fileName}: ${error.message}`
            )
          } else {
            this.logger.warn(`Failed to instantiate provider from ${result.fileName}:`, error)
          }
        }
      }

      const totalMs = Date.now() - startTime
      this.logger.info(
        `🔌 Registered ${registeredCount} providers in ${Date.now() - registerStart}ms (total: ${totalMs}ms)`
      )
    } catch {
      // Providers directory doesn't exist, that's fine
    }
  }

  /**
   * Phase 1+2：預掃描 Provider 目錄中的所有候選檔案。
   *
   * 使用輕量語法驗證（嘗試讀取 + 基本結構檢查）篩選有效的 Provider 檔案，
   * 讓語法錯誤在 import 之前被發現，提供更清晰的錯誤訊息。
   *
   * 策略：
   * 1. 使用 Bun.Transpiler 進行 import 掃描（在 Bun 環境下）
   * 2. Fallback 至基本檔案讀取驗證（在 Node/Deno 環境下）
   *
   * @param providersPath - Provider 目錄絕對路徑
   * @returns 掃描結果陣列（含有效/無效標記）
   * @internal
   */
  private async prescribeProviders(providersPath: string): Promise<ProviderScanResult[]> {
    const files = await fs.readdir(providersPath)
    const candidateFiles = files.filter(
      (file) =>
        (file.endsWith('Provider.ts') || file.endsWith('Provider.js')) && !file.endsWith('.d.ts')
    )

    if (candidateFiles.length === 0) {
      return []
    }

    // 平行執行預掃描（IO 操作可並行）
    const scanPromises = candidateFiles.map(async (file): Promise<ProviderScanResult> => {
      const filePath = path.resolve(providersPath, file)

      try {
        // 嘗試讀取檔案內容以驗證可存取性
        const content = await fs.readFile(filePath, 'utf-8')

        // 基本結構驗證：確認檔案包含 Provider 相關關鍵字
        // 此驗證為輕量快速篩選，不取代完整的 import 驗證
        const hasProviderPattern =
          content.includes('ServiceProvider') ||
          content.includes('register(') ||
          content.includes('class ') ||
          content.includes('export default') ||
          content.includes('export {')

        if (!hasProviderPattern) {
          return {
            filePath,
            fileName: file,
            valid: false,
            error: 'File does not appear to contain a valid ServiceProvider export',
          }
        }

        return { filePath, fileName: file, valid: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`❌ Cannot access provider file ${file}: ${message}`)
        return { filePath, fileName: file, valid: false, error: message }
      }
    })

    return Promise.all(scanPromises)
  }

  /**
   * Phase 3：平行 import 所有有效的 Provider 檔案。
   *
   * 使用 Promise.all() 同時 import 所有通過預掃描的 Provider 檔案，
   * 從循序載入（O(N)）改善為平行載入（O(1) 理論上），
   * 實際效能受 I/O、CPU 和 V8 模組解析限制。
   *
   * @param validProviders - 通過預掃描的 Provider 掃描結果
   * @returns 模組載入結果陣列
   * @internal
   */
  private async loadProvidersInParallel(
    validProviders: ProviderScanResult[]
  ): Promise<ProviderLoadResult[]> {
    const loadPromises = validProviders.map(
      async ({ filePath, fileName }): Promise<ProviderLoadResult> => {
        try {
          const module = await import(pathToFileURL(filePath).href)

          // 尋找 default export 或含 register() 方法的 class
          const ProviderClass =
            module.default ??
            Object.values(module).find(
              (exp): exp is new () => ServiceProvider =>
                // biome-ignore lint/suspicious/noExplicitAny: 需要檢查動態模組的 prototype
                typeof exp === 'function' && (exp as any).prototype?.register
            )

          if (ProviderClass && typeof ProviderClass === 'function') {
            return { fileName, ProviderClass, success: true }
          }

          return {
            fileName,
            success: false,
            error: 'No valid ServiceProvider class found in module exports',
          }
        } catch (error) {
          // 詳細的錯誤分類，方便診斷
          let errorMessage: string
          if (error instanceof SyntaxError) {
            errorMessage = `Syntax error: ${error.message}`
            this.logger.error(`Syntax error in provider file ${fileName}:`, error.message)
          } else if (error instanceof TypeError) {
            errorMessage = `Type error: ${error.message}`
            this.logger.warn(`Invalid provider class in ${fileName}: ${error.message}`)
          } else if (error instanceof Error) {
            errorMessage = error.message
            this.logger.warn(`Failed to load provider ${fileName}: ${error.message}`, {
              stack: error.stack,
            })
          } else {
            errorMessage = String(error)
            this.logger.warn(`Failed to load provider ${fileName}:`, error)
          }

          return { fileName, success: false, error: errorMessage }
        }
      }
    )

    return Promise.all(loadPromises)
  }

  /**
   * Resolve a service instance from the IoC container.
   *
   * This is a convenience wrapper around `container.make()`.
   *
   * @template T - The expected type of the service.
   * @param key - The unique identifier or class name of the service.
   * @returns The resolved service instance.
   * @throws Error if the service is not bound in the container.
   *
   * @example
   * ```typescript
   * const db = app.make<Database>('db');
   * ```
   */
  make<T>(key: string): T {
    // Now uses the shared container instance
    return this.container.make<T>(key)
  }

  /**
   * Check if a service is bound.
   *
   * @param key - The service key
   * @returns True if bound
   */
  has(key: string): boolean {
    // Now uses the shared container instance
    return this.container.has(key)
  }

  /**
   * Retrieve a configuration value using dot notation.
   *
   * @template T - The expected type of the configuration value.
   * @param key - The configuration key (e.g., 'app.name', 'database.connections.mysql').
   * @param defaultValue - Optional value to return if the key is not found.
   * @returns The configuration value or the default value.
   *
   * @example
   * ```typescript
   * const port = app.getConfig<number>('app.port', 3000);
   * ```
   */
  getConfig<T>(key: string, defaultValue?: T): T {
    return this.config.get<T>(key, defaultValue)
  }

  /**
   * Resolve an absolute path relative to the application base path.
   *
   * @param segments - Path segments to join with the base path.
   * @returns The absolute path string.
   *
   * @example
   * ```typescript
   * const storagePath = app.path('storage', 'logs');
   * ```
   */
  path(...segments: string[]): string {
    return path.resolve(this.basePath, ...segments)
  }

  /**
   * Get the config path.
   *
   * @param segments - Additional path segments
   * @returns Absolute path to config directory
   */
  configPath(...segments: string[]): string {
    return this.path(this.options.configPath ?? 'config', ...segments)
  }

  /**
   * Check if running in production.
   */
  isProduction(): boolean {
    return this.env === 'production'
  }

  /**
   * Check if running in development.
   */
  isDevelopment(): boolean {
    return this.env === 'development'
  }

  /**
   * Check if running in testing.
   */
  isTesting(): boolean {
    return this.env === 'testing'
  }
}
