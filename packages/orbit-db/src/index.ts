import type { GravitoOrbit, PlanetCore } from 'gravito-core'
import type { Context, Next } from 'hono'
import type { DBService } from './DBService'
import { DBServiceImpl, detectDatabaseType } from './DBService'
import { ModelRegistry } from './Model'
import type { DatabaseType } from './types'

export interface OrbitDBOptions<TSchema extends Record<string, unknown> = Record<string, unknown>> {
  // biome-ignore lint/suspicious/noExplicitAny: generic db instance
  db: any
  schema?: TSchema
  exposeAs?: string
  enableQueryLogging?: boolean
  queryLogLevel?: 'debug' | 'info' | 'warn' | 'error'
  enableHealthCheck?: boolean
  healthCheckQuery?: string
  databaseType?: DatabaseType
}

/**
 * Standard Database Orbit (Class Implementation)
 */
export class OrbitDB implements GravitoOrbit {
  constructor(private options?: OrbitDBOptions) {}

  install(core: PlanetCore): void {
    // Try to resolve config from core if not provided in constructor
    const config = this.options || core.config.get('db')

    if (!config || !config.db) {
      throw new Error(
        '[OrbitDB] No database configuration found. Please provide options or set "db" in core config.'
      )
    }

    const {
      db,
      exposeAs = 'db',
      enableQueryLogging = false,
      queryLogLevel = 'debug',
      enableHealthCheck = true,
      healthCheckQuery,
      databaseType: providedDatabaseType,
    } = config

    // 檢測資料庫類型
    const databaseType =
      providedDatabaseType === 'auto' || !providedDatabaseType
        ? detectDatabaseType(db)
        : providedDatabaseType

    // 根據資料庫類型設定健康檢查查詢（PostgreSQL 優先）
    const defaultHealthCheckQuery =
      healthCheckQuery || (databaseType === 'postgresql' ? 'SELECT 1' : 'SELECT 1')

    core.logger.info(
      `[OrbitDB] Initializing database integration (Exposed as: ${exposeAs}, Type: ${databaseType})`
    )

    // 建立 DBService
    const dbService = new DBServiceImpl(
      db,
      core,
      databaseType,
      enableQueryLogging,
      queryLogLevel,
      enableHealthCheck,
      defaultHealthCheckQuery
    )

    // 1. 初始化所有已註冊的 Model
    ModelRegistry.initialize(dbService)

    // 2. 設定所有 Model 的 core 實例（用於觸發事件）
    if (core) {
      ModelRegistry.setCore(core)
    }

    // 3. Action: Database Connected
    core.hooks.doAction('db:connected', { db, dbService, databaseType })

    // 3. Middleware injection - 注入 DBService，同時保持向後相容（可透過 raw 存取原始實例）
    core.app.use('*', async (c: Context, next: Next) => {
      c.set(exposeAs, dbService)
      await next()
    })
  }
}

/**
 * Standard Database Orbit (Functional Wrapper)
 */
export default function orbitDB<TSchema extends Record<string, unknown>>(
  core: PlanetCore,
  options: OrbitDBOptions<TSchema>
) {
  const orbit = new OrbitDB(options)
  orbit.install(core)
  // 返回原始 db 實例以保持向後相容
  return { db: options.db }
}

export type { DBService } from './DBService'
export { DBServiceImpl, detectDatabaseType } from './DBService'
export type { ModelStatic } from './Model'
export { Model, ModelRegistry } from './Model'
// 匯出型別和服務
export type {
  DatabaseType,
  DeployOptions,
  DeployResult,
  HealthCheckResult,
  MigrateResult,
  PaginateOptions,
  PaginateResult,
  QueryLogInfo,
  RelationOptions,
  SeedFunction,
  SeedResult,
} from './types'
