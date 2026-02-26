/**
 * Stasis Cache Configuration
 *
 * 多層級快取策略：
 * - 本地快取（L1）：熱點商品、用戶會話
 * - Redis 快取（L2）：商品詳情、庫存、訂單
 * - 分層快取（Hybrid）：結合本地和 Redis，最快的讀取速度
 *
 * 快取分類：
 * - 熱點數據（1 分鐘）：實時商品列表
 * - 標準數據（5 分鐘）：商品詳情、庫存
 * - 冷數據（1 小時）：訂單歷史、用戶設置
 */

import type { CacheConfig } from '@gravito/stasis'

export const CACHE_CONFIG: CacheConfig = {
  // 默認使用分層快取（本地 + Redis）
  default: 'tiered',

  // 全局前綴
  prefix: 'flash-sale:',

  // 默認 TTL（如果沒有指定）
  defaultTtl: 300, // 5 分鐘

  // 快取存儲定義
  stores: {
    // 本地內存快取（L1）
    // 用於高頻訪問的熱點數據
    local: {
      driver: 'memory',
      maxItems: 1000, // 最多 1000 項
    },

    // Redis 快取（L2）
    // 用於分布式共享數據
    redis: {
      driver: 'redis',
      connection: 'default',
      prefix: 'cache:',
    },

    // 分層快取（推薦）
    // 先檢查本地，再檢查 Redis，最後查詢數據庫
    tiered: {
      driver: 'tiered',
      local: 'local',
      remote: 'redis',
    },

    // 帶熔斷器的 Redis
    // 如果 Redis 故障自動降級到內存快取
    resilient_redis: {
      driver: 'circuit-breaker',
      primary: 'redis',
      fallback: 'local',
      maxFailures: 5,
      resetTimeout: 30000, // 30 秒
    },
  },
}

/**
 * 快取 TTL 預設值
 */
export const CACHE_TTLS = {
  // 實時數據（1 分鐘）
  FLASH_SALE_ACTIVE: 60,
  HOURLY_RANK: 60,

  // 熱點數據（5 分鐘）
  PRODUCT_DETAIL: 300,
  INVENTORY_TOTAL: 300,
  PRODUCT_CATEGORIES: 300,

  // 標準數據（15 分鐘）
  PRODUCT_LIST: 900,
  USER_PROFILE: 900,

  // 冷數據（1 小時）
  ORDER_HISTORY: 3600,
  USER_SETTINGS: 3600,

  // 長期快取（24 小時）
  STATIC_CONFIG: 86400,
  REGION_DATA: 86400,
}

/**
 * 快取鍵前綴定義
 *
 * 按照分層組織，便於管理和追蹤
 */
export const CACHE_KEYS = {
  // 商品相關
  PRODUCT: (id: string) => `product:${id}`,
  PRODUCT_LIST: () => 'products:list',
  PRODUCT_CATEGORIES: () => 'categories:all',

  // 庫存相關
  INVENTORY_TOTAL: (productId: string) => `inventory:${productId}:total`,
  INVENTORY_AVAILABLE: (productId: string) => `inventory:${productId}:available`,
  INVENTORY_RESERVED: (productId: string) => `inventory:${productId}:reserved`,

  // 閃購相關
  FLASH_SALE_ACTIVE: () => 'flash-sale:active',
  FLASH_SALE_DETAIL: (saleId: string) => `flash-sale:${saleId}`,
  FLASH_SALE_PRODUCTS: (saleId: string) => `flash-sale:${saleId}:products`,

  // 訂單相關
  ORDER: (orderId: string) => `order:${orderId}`,
  ORDER_USER: (userId: string) => `orders:user:${userId}`,
  ORDER_LIST: () => 'orders:list',

  // 用戶相關
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  USER_CART: (userId: string) => `user:${userId}:cart`,
  USER_SETTINGS: (userId: string) => `user:${userId}:settings`,

  // 限流相關
  RATE_LIMIT: (key: string) => `rate-limit:${key}`,

  // 查詢結果
  QUERY_RESULT: (hash: string) => `query:${hash}`,
}
