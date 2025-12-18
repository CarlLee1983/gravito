/**
 * 資料庫類型
 */
export type DatabaseType = 'postgresql' | 'sqlite' | 'mysql' | 'auto'

/**
 * 分頁選項
 */
export interface PaginateOptions {
  page: number
  limit: number
  orderBy?: unknown
  orderDirection?: 'asc' | 'desc'
}

/**
 * 分頁結果
 */
export interface PaginateResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * 健康檢查結果
 */
export interface HealthCheckResult {
  healthy?: boolean
  status?: string
  message?: string
  duration?: number
  latency?: number
  error?: string
}

/**
 * 查詢日誌資訊
 */
export interface QueryLogInfo {
  query: string
  params: unknown[]
  duration: number
  timestamp: number
  error?: string
}

/**
 * 遷移結果
 */
export interface MigrateResult {
  success: boolean
  migrationsApplied?: number
  appliedMigrations?: string[]
  message?: string
  error?: string
}

/**
 * Seeder 函數
 */
export type SeedFunction = (db: any) => Promise<void>

/**
 * Seeder 結果
 */
export interface SeedResult {
  success: boolean
  seedName?: string
  seededFiles?: string[]
  message?: string
  error?: string
}

/**
 * 部署選項
 */
export interface DeployOptions {
  skipHealthCheck?: boolean
  skipMigrations?: boolean
  skipSeeding?: boolean
  runMigrations?: boolean
  runSeeds?: boolean
  validateBeforeDeploy?: boolean
}

/**
 * 部署結果
 */
export interface DeployResult {
  success: boolean
  healthCheck?: HealthCheckResult
  migrations?: MigrateResult
  seeding?: SeedResult[]
  seeds?: SeedResult | SeedResult[]
  message?: string
  duration?: number
  error?: string
}

/**
 * 關聯查詢選項
 */
export interface RelationOptions {
  [relationName: string]: boolean | RelationOptions
}

/**
 * Upsert 選項
 */
export interface UpsertOptions {
  conflictColumns?: string[]
  updateColumns?: string[]
  excludeColumns?: string[]
}

/**
 * Increment/Decrement 選項
 */
export interface IncrementOptions {
  amount?: number
}

/**
 * Truncate 選項
 */
export interface TruncateOptions {
  cascade?: boolean
  restartIdentity?: boolean
}

/**
 * 鎖定選項
 */
export interface LockOptions {
  nowait?: boolean
  skipLocked?: boolean
}

/**
 * Execute 選項
 */
export interface ExecuteOptions {
  params?: unknown[]
}

/**
 * 事件來源資訊
 */
export interface EventSource {
  file?: string
  line?: number
  method?: string
  stack?: string
}
