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
import { ConfigManager } from './ConfigManager'
import { Container } from './Container'
import type { EventManager } from './EventManager'
import type { Logger } from './Logger'
import { PlanetCore } from './PlanetCore'
import type { ServiceProvider } from './ServiceProvider'
/**
 * Application Config options for the Application class.
 * @public
 */
export interface ApplicationConfig {
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
   * Logger instance
   */
  logger?: Logger
  /**
   * Initial configuration values
   */
  config?: Record<string, unknown>
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
export declare class Application {
  /**
   * The underlying PlanetCore instance.
   */
  readonly core: PlanetCore
  /**
   * The IoC container.
   */
  readonly container: Container
  /**
   * The configuration manager.
   */
  readonly config: ConfigManager
  /**
   * The event manager.
   */
  readonly events: EventManager
  /**
   * The logger instance.
   */
  readonly logger: Logger
  /**
   * Application base path.
   */
  readonly basePath: string
  /**
   * Environment mode.
   */
  readonly env: 'development' | 'production' | 'testing'
  /**
   * Configuration options.
   */
  private readonly options
  /**
   * Whether the application has been booted.
   */
  private booted
  constructor(options: ApplicationConfig)
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
  boot(): Promise<this>
  /**
   * Load configuration files from the config directory.
   *
   * @internal
   */
  private loadConfiguration
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
  private discoverProviders
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
  private prescribeProviders
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
  private loadProvidersInParallel
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
  make<T>(key: string): T
  /**
   * Check if a service is bound.
   *
   * @param key - The service key
   * @returns True if bound
   */
  has(key: string): boolean
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
  getConfig<T>(key: string, defaultValue?: T): T
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
  path(...segments: string[]): string
  /**
   * Get the config path.
   *
   * @param segments - Additional path segments
   * @returns Absolute path to config directory
   */
  configPath(...segments: string[]): string
  /**
   * Check if running in production.
   */
  isProduction(): boolean
  /**
   * Check if running in development.
   */
  isDevelopment(): boolean
  /**
   * Check if running in testing.
   */
  isTesting(): boolean
}
