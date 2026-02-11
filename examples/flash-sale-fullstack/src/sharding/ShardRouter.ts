/**
 * Shard Router - HTTP Middleware
 * 分片路由中間件，用於自動計算請求的分片 ID
 *
 * 職責：
 * 1. 從請求中提取分片鍵（如 userId）
 * 2. 計算分片 ID
 * 3. 將分片信息注入到請求上下文
 * 4. 支持自動分片路由和手動控制
 */

import type { Context } from 'hono'
import type { ShardingManager } from './ShardingManager'

export interface ShardContext {
  shardId: number
  shardKey: string
  shardKeyValue: string
}

export interface ShardRouterOptions {
  shardKeyField?: string // 分片鍵欄位名稱（默認 'userId'）
  headerName?: string // HTTP 請求頭名稱（默認 'X-Shard-Key'）
  queryParamName?: string // 查詢參數名稱（默認 'shardKey'）
}

/**
 * 分片路由中間件
 */
export class ShardRouter {
  private shardingManager: ShardingManager
  private options: Required<ShardRouterOptions>

  constructor(shardingManager: ShardingManager, options: ShardRouterOptions = {}) {
    this.shardingManager = shardingManager
    this.options = {
      shardKeyField: options.shardKeyField || 'userId',
      headerName: options.headerName || 'X-Shard-Key',
      queryParamName: options.queryParamName || 'shardKey',
    }
  }

  /**
   * Hono 中間件實現
   */
  middleware() {
    return async (ctx: Context, next: () => Promise<void>) => {
      try {
        const shardContext = this.extractShardContext(ctx)
        if (shardContext) {
          // 將分片信息附加到請求上下文
          ;(ctx as any).shardContext = shardContext
        }
      } catch (error) {
        console.error('[ShardRouter] Failed to extract shard context:', error)
      }

      await next()
    }
  }

  /**
   * 從請求中提取分片上下文
   */
  private extractShardContext(ctx: Context): ShardContext | null {
    // 優先級：
    // 1. HTTP 請求頭
    // 2. 查詢參數
    // 3. 請求體

    let shardKeyValue: string | null = null
    let source = 'unknown'

    // 1. 嘗試從請求頭獲取
    shardKeyValue = ctx.req.header(this.options.headerName)
    if (shardKeyValue) {
      source = `header(${this.options.headerName})`
    }

    // 2. 嘗試從查詢參數獲取
    if (!shardKeyValue) {
      shardKeyValue = ctx.req.query(this.options.queryParamName)
      if (shardKeyValue) {
        source = `query(${this.options.queryParamName})`
      }
    }

    // 3. 嘗試從請求體獲取（POST/PUT）
    if (!shardKeyValue && ['POST', 'PUT', 'PATCH'].includes(ctx.req.method)) {
      try {
        const body = (ctx as any).req.body as Record<string, any>
        if (body?.[this.options.shardKeyField]) {
          shardKeyValue = String(body[this.options.shardKeyField])
          source = `body(${this.options.shardKeyField})`
        }
      } catch {
        // 忽略解析錯誤
      }
    }

    if (!shardKeyValue) {
      return null
    }

    try {
      const shardId = this.shardingManager.getShardId(shardKeyValue)
      console.log(
        `[ShardRouter] Route request to shard ${shardId} (from ${source}): ${shardKeyValue}`
      )

      return {
        shardId,
        shardKey: this.options.shardKeyField,
        shardKeyValue,
      }
    } catch (error) {
      console.error(`[ShardRouter] Failed to compute shard ID:`, error)
      return null
    }
  }

  /**
   * 手動計算分片 ID
   */
  computeShardId(shardKeyValue: string): number {
    return this.shardingManager.getShardId(shardKeyValue)
  }

  /**
   * 獲取分片信息
   */
  getShardInfo(shardKeyValue: string) {
    return this.shardingManager.getShardInfo(shardKeyValue)
  }
}

/**
 * 幫助函數：從 Hono Context 獲取分片上下文
 */
export function getShardContext(ctx: Context): ShardContext | undefined {
  return (ctx as any).shardContext
}

/**
 * 幫助函數：檢查是否有分片上下文
 */
export function hasShardContext(ctx: Context): boolean {
  return (ctx as any).shardContext !== undefined
}

/**
 * 幫助函數：要求分片上下文存在
 */
export function requireShardContext(ctx: Context): ShardContext {
  const shardContext = (ctx as any).shardContext
  if (!shardContext) {
    throw new Error('Shard context is required but not found in request')
  }
  return shardContext
}
