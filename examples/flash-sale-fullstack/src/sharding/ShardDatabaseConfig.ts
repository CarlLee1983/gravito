/**
 * Shard Database Configuration
 * 分片數據庫配置管理
 */

export interface PostgresPoolConfig {
  min: number
  max: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
}

export interface ShardDatabaseConnectionConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
  pool?: PostgresPoolConfig
}

export interface ShardDeploymentMode {
  type: 'virtual' | 'physical'
  // virtual: 所有分片使用同一物理數據庫，通過 schema 隔離
  // physical: 每個分片一個獨立的物理數據庫實例
}

/**
 * 分片數據庫配置
 */
export class ShardDatabaseConfig {
  readonly shardCount: number
  readonly mode: ShardDeploymentMode
  private configs: Map<number, ShardDatabaseConnectionConfig> = new Map()

  constructor(shardCount: number, mode: ShardDeploymentMode = { type: 'virtual' }) {
    this.shardCount = shardCount
    this.mode = mode
  }

  /**
   * 設置分片連接配置
   */
  setShardConfig(shardId: number, config: ShardDatabaseConnectionConfig): void {
    if (shardId < 0 || shardId >= this.shardCount) {
      throw new Error(`Invalid shard ID: ${shardId}. Must be between 0 and ${this.shardCount - 1}`)
    }
    this.configs.set(shardId, config)
  }

  /**
   * 獲取分片連接配置
   */
  getShardConfig(shardId: number): ShardDatabaseConnectionConfig {
    const config = this.configs.get(shardId)
    if (!config) {
      throw new Error(`No configuration for shard ${shardId}`)
    }
    return config
  }

  /**
   * 獲取虛擬模式下的 schema 名稱
   */
  getShardSchemaName(shardId: number): string {
    return `shard_${shardId}`
  }

  /**
   * 生成虛擬模式的完整表名
   */
  getShardTableName(shardId: number, tableName: string): string {
    if (this.mode.type === 'virtual') {
      return `${this.getShardSchemaName(shardId)}.${tableName}`
    }
    return tableName
  }

  /**
   * 創建開發環境配置（單一 PostgreSQL 實例，虛擬分片）
   */
  static createDevelopmentConfig(
    baseConfig: Omit<ShardDatabaseConnectionConfig, 'database'>,
    shardCount = 8
  ): ShardDatabaseConfig {
    const config = new ShardDatabaseConfig(shardCount, { type: 'virtual' })

    // 所有分片使用同一數據庫
    for (let i = 0; i < shardCount; i++) {
      config.setShardConfig(i, {
        ...baseConfig,
        database: baseConfig.database || 'flash_sale',
      })
    }

    return config
  }

  /**
   * 創建生產環境配置（多個物理數據庫實例）
   */
  static createProductionConfig(
    configs: ShardDatabaseConnectionConfig[],
    shardCount = 8
  ): ShardDatabaseConfig {
    if (configs.length !== shardCount) {
      throw new Error(`Expected ${shardCount} database configurations, got ${configs.length}`)
    }

    const dbConfig = new ShardDatabaseConfig(shardCount, { type: 'physical' })

    configs.forEach((config, index) => {
      dbConfig.setShardConfig(index, config)
    })

    return dbConfig
  }

  /**
   * 從環境變數創建配置（開發環境友好）
   */
  static fromEnvironment(shardCount = 8): ShardDatabaseConfig {
    const mode = (process.env.SHARD_MODE || 'virtual') as 'virtual' | 'physical'

    if (mode === 'virtual') {
      return ShardDatabaseConfig.createDevelopmentConfig(
        {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
        },
        shardCount
      )
    }

    // 物理模式：從環境變數讀取多個數據庫配置
    // 格式：DB_SHARD_0_HOST, DB_SHARD_0_PORT, 等
    const configs: ShardDatabaseConnectionConfig[] = []
    for (let i = 0; i < shardCount; i++) {
      configs.push({
        host: process.env[`DB_SHARD_${i}_HOST`] || 'localhost',
        port: parseInt(process.env[`DB_SHARD_${i}_PORT`] || '5432', 10),
        username: process.env[`DB_SHARD_${i}_USER`] || 'postgres',
        password: process.env[`DB_SHARD_${i}_PASSWORD`] || 'postgres',
        database: process.env[`DB_SHARD_${i}_DATABASE`] || `flash_sale_shard_${i}`,
      })
    }

    return ShardDatabaseConfig.createProductionConfig(configs, shardCount)
  }

  /**
   * 獲取所有分片配置
   */
  getAllConfigs(): Map<number, ShardDatabaseConnectionConfig> {
    return new Map(this.configs)
  }

  /**
   * 驗證配置完整性
   */
  validate(): string[] {
    const errors: string[] = []

    if (this.configs.size !== this.shardCount) {
      errors.push(`Expected ${this.shardCount} shard configurations, got ${this.configs.size}`)
    }

    // 驗證每個分片配置
    for (let i = 0; i < this.shardCount; i++) {
      const config = this.configs.get(i)
      if (!config) {
        errors.push(`Missing configuration for shard ${i}`)
        continue
      }

      if (!config.host) {
        errors.push(`Shard ${i}: missing host`)
      }
      if (!config.username) {
        errors.push(`Shard ${i}: missing username`)
      }
      if (!config.database) {
        errors.push(`Shard ${i}: missing database`)
      }
    }

    return errors
  }
}
