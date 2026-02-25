/**
 * 資料庫分片配置
 *
 * 定義 8 個分片的連接配置
 * 分片策略：基於 userId 的一致性哈希
 */

import type { ShardingConfig } from '../satellites/flash-sale/src/Infrastructure/Database/ShardingManager'

/**
 * 分片配置
 *
 * 支持 8 個分片，每個分片對應一個 PostgreSQL 數據庫實例
 * 生產環境中應該使用獨立的服務器或 RDS 實例
 */
export const shardingConfig: ShardingConfig = {
  shardCount: 8,
  shards: [
    {
      id: 0,
      driver: 'postgresql',
      host: process.env.SHARD_0_HOST || 'localhost',
      port: parseInt(process.env.SHARD_0_PORT || '5432', 10),
      database: process.env.SHARD_0_DB || 'flash_sale_shard_0',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    {
      id: 1,
      driver: 'postgresql',
      host: process.env.SHARD_1_HOST || 'localhost',
      port: parseInt(process.env.SHARD_1_PORT || '5433', 10),
      database: process.env.SHARD_1_DB || 'flash_sale_shard_1',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    {
      id: 2,
      driver: 'postgresql',
      host: process.env.SHARD_2_HOST || 'localhost',
      port: parseInt(process.env.SHARD_2_PORT || '5434', 10),
      database: process.env.SHARD_2_DB || 'flash_sale_shard_2',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    {
      id: 3,
      driver: 'postgresql',
      host: process.env.SHARD_3_HOST || 'localhost',
      port: parseInt(process.env.SHARD_3_PORT || '5435', 10),
      database: process.env.SHARD_3_DB || 'flash_sale_shard_3',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    {
      id: 4,
      driver: 'postgresql',
      host: process.env.SHARD_4_HOST || 'localhost',
      port: parseInt(process.env.SHARD_4_PORT || '5436', 10),
      database: process.env.SHARD_4_DB || 'flash_sale_shard_4',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    {
      id: 5,
      driver: 'postgresql',
      host: process.env.SHARD_5_HOST || 'localhost',
      port: parseInt(process.env.SHARD_5_PORT || '5437', 10),
      database: process.env.SHARD_5_DB || 'flash_sale_shard_5',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    {
      id: 6,
      driver: 'postgresql',
      host: process.env.SHARD_6_HOST || 'localhost',
      port: parseInt(process.env.SHARD_6_PORT || '5438', 10),
      database: process.env.SHARD_6_DB || 'flash_sale_shard_6',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
    {
      id: 7,
      driver: 'postgresql',
      host: process.env.SHARD_7_HOST || 'localhost',
      port: parseInt(process.env.SHARD_7_PORT || '5439', 10),
      database: process.env.SHARD_7_DB || 'flash_sale_shard_7',
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    },
  ],
}

export default shardingConfig
