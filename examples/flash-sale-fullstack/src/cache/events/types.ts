/**
 * 事件驅動快取系統 - 事件類型定義
 *
 * 定義 Flash Sale 系統中所有快取相關的事件類型、優先級和結構
 */

/**
 * 快取事件類型枚舉
 * 定義系統中所有可能影響快取的事件
 */
export enum CacheEventType {
  // 商品相關事件
  PRODUCT_UPDATED = 'product_updated',
  PRODUCT_DELETED = 'product_deleted',
  PRODUCT_BATCH_UPDATE = 'product_batch_update',

  // 庫存相關事件
  INVENTORY_CHANGED = 'inventory_changed',
  INVENTORY_RESERVED = 'inventory_reserved',
  INVENTORY_RELEASED = 'inventory_released',

  // 價格相關事件
  PRICE_CHANGED = 'price_changed',
  PRICE_TIER_UPDATED = 'price_tier_updated',

  // 促銷相關事件
  PROMOTION_STARTED = 'promotion_started',
  PROMOTION_ENDED = 'promotion_ended',
  PROMOTION_UPDATED = 'promotion_updated',

  // 訂單相關事件
  ORDER_PLACED = 'order_placed',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_COMPLETED = 'order_completed',

  // 系統事件
  BATCH_INVALIDATION = 'batch_invalidation',
  SYSTEM_CACHE_FLUSH = 'system_cache_flush',
  CACHE_WARMUP_TRIGGERED = 'cache_warmup_triggered',
}

/**
 * 事件優先級枚舉
 * 決定事件的處理順序和失效延遲
 */
export enum EventPriority {
  CRITICAL = 'critical', // 立即處理，< 1ms
  HIGH = 'high', // 高優先級，< 50ms
  NORMAL = 'normal', // 普通優先級，< 200ms
  LOW = 'low', // 低優先級，< 500ms
}

/**
 * 事件源標識
 * 標記事件來自哪個系統模塊
 */
export enum EventSource {
  PRODUCT_SERVICE = 'product_service',
  INVENTORY_SERVICE = 'inventory_service',
  PRICE_SERVICE = 'price_service',
  ORDER_SERVICE = 'order_service',
  PROMOTION_SERVICE = 'promotion_service',
  SYSTEM = 'system',
  API = 'api',
  SCHEDULER = 'scheduler',
}

/**
 * 快取事件接口
 * 定義事件的基本結構
 */
export interface CacheEvent {
  // 事件唯一標識
  id: string

  // 事件類型
  type: CacheEventType

  // 事件優先級
  priority: EventPriority

  // 事件源
  source: EventSource

  // 失效的快取模式集合 (e.g., "product:123", "inventory:*", "price:tier:*")
  patterns: string[]

  // 事件時間戳（毫秒）
  timestamp: number

  // 事件延遲容限（毫秒）
  // 超過此時間仍未處理，自動提升優先級
  ttl?: number

  // 事件元數據（事件特定的信息）
  metadata?: Record<string, any>

  // 重試次數
  retryCount?: number

  // 最大重試次數
  maxRetries?: number
}

/**
 * 優先級配置 - 定義各優先級的處理參數
 */
export const PRIORITY_CONFIG = {
  [EventPriority.CRITICAL]: {
    delayMs: 0, // 立即處理
    windowMs: 0, // 不等待，立即發送
    aggregationLimit: 1, // 不聚合
    retryMax: 5,
  },
  [EventPriority.HIGH]: {
    delayMs: 10,
    windowMs: 50, // 50ms 窗口
    aggregationLimit: 10,
    retryMax: 4,
  },
  [EventPriority.NORMAL]: {
    delayMs: 50,
    windowMs: 200, // 200ms 窗口
    aggregationLimit: 50,
    retryMax: 3,
  },
  [EventPriority.LOW]: {
    delayMs: 200,
    windowMs: 500, // 500ms 窗口
    aggregationLimit: 100,
    retryMax: 2,
  },
} as const

/**
 * 事件優先級映射 - 根據事件類型自動分配優先級
 */
export const EVENT_PRIORITY_MAP: Record<CacheEventType, EventPriority> = {
  // CRITICAL 優先級 - 立即生效
  [CacheEventType.INVENTORY_RESERVED]: EventPriority.CRITICAL,
  [CacheEventType.INVENTORY_RELEASED]: EventPriority.CRITICAL,
  [CacheEventType.ORDER_COMPLETED]: EventPriority.CRITICAL,

  // HIGH 優先級 - 快速處理
  [CacheEventType.PRICE_CHANGED]: EventPriority.HIGH,
  [CacheEventType.PRODUCT_UPDATED]: EventPriority.HIGH,
  [CacheEventType.INVENTORY_CHANGED]: EventPriority.HIGH,
  [CacheEventType.PROMOTION_STARTED]: EventPriority.HIGH,
  [CacheEventType.PROMOTION_ENDED]: EventPriority.HIGH,

  // NORMAL 優先級 - 標準處理
  [CacheEventType.PRODUCT_BATCH_UPDATE]: EventPriority.NORMAL,
  [CacheEventType.PRICE_TIER_UPDATED]: EventPriority.NORMAL,
  [CacheEventType.PROMOTION_UPDATED]: EventPriority.NORMAL,
  [CacheEventType.ORDER_PLACED]: EventPriority.NORMAL,
  [CacheEventType.BATCH_INVALIDATION]: EventPriority.NORMAL,

  // LOW 優先級 - 後台處理
  [CacheEventType.PRODUCT_DELETED]: EventPriority.LOW,
  [CacheEventType.ORDER_CANCELLED]: EventPriority.LOW,
  [CacheEventType.CACHE_WARMUP_TRIGGERED]: EventPriority.LOW,
  [CacheEventType.SYSTEM_CACHE_FLUSH]: EventPriority.LOW,
}

/**
 * 事件分類 - 按功能分類事件
 */
export const EVENT_CATEGORIES = {
  INVENTORY: [
    CacheEventType.INVENTORY_CHANGED,
    CacheEventType.INVENTORY_RESERVED,
    CacheEventType.INVENTORY_RELEASED,
  ],
  PRODUCT: [
    CacheEventType.PRODUCT_UPDATED,
    CacheEventType.PRODUCT_DELETED,
    CacheEventType.PRODUCT_BATCH_UPDATE,
  ],
  PRICING: [CacheEventType.PRICE_CHANGED, CacheEventType.PRICE_TIER_UPDATED],
  PROMOTION: [
    CacheEventType.PROMOTION_STARTED,
    CacheEventType.PROMOTION_ENDED,
    CacheEventType.PROMOTION_UPDATED,
  ],
  ORDER: [
    CacheEventType.ORDER_PLACED,
    CacheEventType.ORDER_CANCELLED,
    CacheEventType.ORDER_COMPLETED,
  ],
  SYSTEM: [
    CacheEventType.BATCH_INVALIDATION,
    CacheEventType.SYSTEM_CACHE_FLUSH,
    CacheEventType.CACHE_WARMUP_TRIGGERED,
  ],
}

/**
 * 模式生成器工具函數
 * 根據事件類型和參數生成快取失效模式
 */
export function generateInvalidationPatterns(
  eventType: CacheEventType,
  entityId?: string | string[],
  metadata?: Record<string, any>
): string[] {
  const patterns: string[] = []

  switch (eventType) {
    case CacheEventType.PRODUCT_UPDATED:
      if (entityId) {
        const ids = Array.isArray(entityId) ? entityId : [entityId]
        patterns.push(...ids.map((id) => `product:${id}`))
        patterns.push('product:*:details')
      }
      break

    case CacheEventType.INVENTORY_CHANGED:
      if (entityId) {
        const ids = Array.isArray(entityId) ? entityId : [entityId]
        patterns.push(...ids.map((id) => `inventory:${id}`))
        patterns.push('inventory:*:count')
      }
      break

    case CacheEventType.PRICE_CHANGED:
      if (entityId) {
        const ids = Array.isArray(entityId) ? entityId : [entityId]
        patterns.push(...ids.map((id) => `price:${id}`))
        patterns.push('price:*:current')
      }
      break

    case CacheEventType.PROMOTION_STARTED:
    case CacheEventType.PROMOTION_ENDED:
      patterns.push('promotion:active:*')
      patterns.push('product:*:promotion')
      break

    case CacheEventType.ORDER_COMPLETED:
      patterns.push('order:*:recent')
      patterns.push('user:*:orders')
      break

    case CacheEventType.SYSTEM_CACHE_FLUSH:
      patterns.push('*') // 清空所有快取
      break

    default:
      // 對於其他事件類型，使用通用模式
      if (entityId) {
        const ids = Array.isArray(entityId) ? entityId : [entityId]
        patterns.push(...ids)
      }
  }

  return patterns
}

/**
 * 事件工廠函數 - 簡化事件創建
 */
export function createCacheEvent(
  type: CacheEventType,
  patterns: string[],
  options?: {
    source?: EventSource
    priority?: EventPriority
    metadata?: Record<string, any>
    ttl?: number
    maxRetries?: number
  }
): CacheEvent {
  const priority = options?.priority ?? EVENT_PRIORITY_MAP[type]

  return {
    id: `${type}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    type,
    priority,
    patterns,
    source: options?.source ?? EventSource.SYSTEM,
    timestamp: Date.now(),
    metadata: options?.metadata,
    ttl: options?.ttl,
    maxRetries: options?.maxRetries ?? PRIORITY_CONFIG[priority].retryMax,
    retryCount: 0,
  }
}
