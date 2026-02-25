/**
 * @gravito/atlas - 連線配置類型
 * @description 資料庫連線、Pool 配置與 SSL 相關類型
 */

import type { AtlasMetrics, AtlasTracer } from '../observability'
import type { DriverType } from './common'

/**
 * 基礎連線介面
 */
export interface BaseConnectionConfig {
  /**
   * 使用的資料庫驅動
   */
  driver: DriverType

  /**
   * 資料庫主機位址
   * @default 'localhost'
   */
  host?: string

  /**
   * 資料庫埠號
   */
  port?: number

  /**
   * 資料庫名稱
   */
  database?: string

  /**
   * 資料庫使用者名稱
   */
  username?: string

  /**
   * 資料庫密碼
   */
  password?: string

  /**
   * 資料庫字元集
   * @default 'utf8mb4'
   */
  charset?: string

  /**
   * 資料庫時區
   * @default 'UTC'
   */
  timezone?: string

  /**
   * 連線池配置
   */
  pool?: PoolConfig

  /**
   * SSL 安全連線配置
   */
  ssl?: SSLConfig | boolean

  /**
   * 是否在可用時使用原生驅動（如 Bun.sql）
   * @default false
   */
  useNativeDriver?: boolean

  /**
   * 預先初始化的追蹤器實例
   * @internal
   */
  tracer?: AtlasTracer

  /**
   * 預先初始化的指標實例
   * @internal
   */
  metrics?: AtlasMetrics
}

/**
 * 所有連線配置的聯合類型
 */
export type ConnectionConfig =
  | PostgresConfig
  | MySQLConfig
  | SQLiteConfig
  | MongoDBConfig
  | RedisConfig
  | BaseConnectionConfig

/**
 * 讀寫複本配置
 * 定義主節點（寫入）與一個或多個讀取複本。
 */
export interface ReadWriteConnectionConfig {
  /**
   * 主要寫入節點配置
   */
  write: ConnectionConfig

  /**
   * 讀取複本配置（循環輪詢選擇）
   */
  read: ConnectionConfig[]
}

/**
 * Atlas 連線入口的聯合類型（標準或複本）
 */
export type AtlasConnectionEntry = ConnectionConfig | ReadWriteConnectionConfig

/**
 * 類型守衛：檢查連線配置是否為讀寫複本配置
 */
export function isReadWriteConfig(
  config: AtlasConnectionEntry
): config is ReadWriteConnectionConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    'write' in config &&
    'read' in config &&
    Array.isArray((config as ReadWriteConnectionConfig).read)
  )
}

/**
 * Atlas 可觀測性配置
 */
export interface AtlasObservabilityConfig {
  enabled: boolean
  tracing?: boolean
  metrics?: boolean
  serviceName?: string
}

/**
 * Atlas 主配置
 */
export interface AtlasConfig {
  default: string
  connections: Record<string, AtlasConnectionEntry>
  observability?: AtlasObservabilityConfig
}

/**
 * PostgreSQL 特定配置
 */
export interface PostgresConfig extends BaseConnectionConfig {
  /**
   * 驅動識別符
   */
  driver: 'postgres'

  /**
   * 預設資料庫 Schema
   * @default 'public'
   */
  schema?: string

  /**
   * 連線追蹤用的應用程式名稱
   */
  applicationName?: string
}

/**
 * MySQL/MariaDB 特定配置
 */
export interface MySQLConfig extends BaseConnectionConfig {
  /**
   * 驅動識別符
   */
  driver: 'mysql' | 'mariadb'

  /**
   * Unix domain socket 路徑
   */
  socketPath?: string

  /**
   * 是否允許單一查詢中包含多個 SQL 語句
   * @default false
   */
  multipleStatements?: boolean
}

/**
 * SQLite 特定配置
 */
export interface SQLiteConfig {
  /**
   * 驅動識別符
   */
  driver: 'sqlite'

  /**
   * 資料庫檔案路徑，或 ':memory:' 代表記憶體資料庫
   */
  database: string

  /**
   * 是否以唯讀模式開啟資料庫
   * @default false
   */
  readonly?: boolean

  /**
   * 是否在可用時使用原生驅動（如 Bun.sql）
   * @default false
   */
  useNativeDriver?: boolean
}

/**
 * MongoDB 特定配置
 */
export interface MongoDBConfig extends BaseConnectionConfig {
  /**
   * 驅動識別符
   */
  driver: 'mongodb'

  /**
   * MongoDB 連線 URI
   */
  uri: string

  /**
   * 額外的 MongoDB 驅動選項
   */
  options?: Record<string, unknown>
}

/**
 * Redis 特定配置
 */
export interface RedisConfig extends BaseConnectionConfig {
  /**
   * 驅動識別符
   */
  driver: 'redis'

  /**
   * Redis 伺服器主機
   */
  host: string

  /**
   * Redis 伺服器埠號
   * @default 6379
   */
  port?: number

  /**
   * Redis 伺服器密碼
   */
  password?: string

  /**
   * Redis 資料庫索引
   * @default 0
   */
  db?: number
}

/**
 * 連線池配置
 */
export interface PoolConfig {
  /**
   * 池中最小連線數
   */
  min?: number

  /**
   * 池中最大連線數
   */
  max?: number

  /**
   * 等待從池中取得連線的最長時間（毫秒）
   */
  acquireTimeout?: number

  /**
   * 連線在被釋放前可閒置的最長時間（毫秒）
   */
  idleTimeout?: number

  /**
   * 檢查閒置連線並回收的間隔（毫秒）
   */
  reapInterval?: number
}

/**
 * SSL 配置
 */
export interface SSLConfig {
  /**
   * 是否拒絕未授權的連線
   */
  rejectUnauthorized?: boolean

  /**
   * 憑證授權機構（CA）憑證
   */
  ca?: string

  /**
   * 客戶端私鑰
   */
  key?: string

  /**
   * 客戶端憑證
   */
  cert?: string
}

/**
 * 連線池統計資訊
 */
export interface PoolStats {
  /**
   * 池中閒置連線數
   */
  idle: number

  /**
   * 等待取得的連線數
   */
  pending: number

  /**
   * 目前使用中的活躍連線數
   */
  active: number

  /**
   * 池中總連線數
   */
  total: number

  /**
   * 允許的最大連線數
   */
  max: number
}

/**
 * 連線池健康狀態
 */
export interface PoolHealth {
  /**
   * 健康狀態：'healthy' | 'warning' | 'critical' | 'disconnected'
   */
  status: 'healthy' | 'warning' | 'critical' | 'disconnected'

  /**
   * 人類可讀的健康訊息
   */
  message: string

  /**
   * 池統計資訊（有時提供）
   */
  stats?: PoolStats

  /**
   * 最後一次健康檢查時間戳
   */
  lastCheck?: Date
}
