/**
 * Geographic Cache Layer
 * 地域快取層實現
 *
 * 職責：
 * 1. 地理位置感知的快取路由
 * 2. 多層快取管理 (L1/L2/L3)
 * 3. 跨區域快取複製和同步
 * 4. 智能快取驅逐和預熱
 */

export interface CacheEntry {
  key: string
  value: any
  regionId: string
  tier: 'L1' | 'L2' | 'L3'
  createdAt: Date
  expiresAt: Date
  accessCount: number
  lastAccessedAt: Date
  size: number // bytes
  replicationStatus: 'local' | 'replicating' | 'replicated'
}

export interface CacheStats {
  regionId: string
  totalSize: number // bytes
  entryCount: number
  hitRate: number // 0-100%
  missRate: number
  avgAccessLatency: number // ms
  evictionCount: number
  replicationLatency: number // ms
}

export interface GeoCacheConfig {
  regionId: string
  location: { lat: number; lng: number }
  maxSize: number // bytes
  maxEntries: number
  defaultTtl: number // ms
  replicationMode: 'sync' | 'async'
  tierDistribution: {
    L1: number // %
    L2: number
    L3: number
  }
}

export interface GeoLocation {
  latitude: number
  longitude: number
  country: string
  city: string
}

export interface CacheReplicationEvent {
  cacheKey: string
  sourceRegion: string
  targetRegions: string[]
  eventType: 'create' | 'update' | 'delete'
  timestamp: Date
  replicationStatus: 'pending' | 'in-progress' | 'completed' | 'failed'
}

export interface EvictionPolicy {
  strategy: 'LRU' | 'LFU' | 'FIFO'
  triggerThreshold: number // % of max size
  evictionBatch: number // entries per batch
  protectedTiers: ('L1' | 'L2' | 'L3')[] // tiers protected from eviction
}

/**
 * 地理位置感知快取管理器
 */
export class GeographicCacheManager {
  private caches: Map<string, Map<string, CacheEntry>> = new Map() // regionId -> key -> entry
  private stats: Map<string, CacheStats> = new Map()
  private replicationQueue: CacheReplicationEvent[] = []
  private evictionPolicy: EvictionPolicy
  private eventListeners: Map<string, Function[]> = new Map()
  private regionConfigs: Map<string, GeoCacheConfig> = new Map()

  constructor() {
    this.evictionPolicy = {
      strategy: 'LRU',
      triggerThreshold: 80,
      evictionBatch: 10,
      protectedTiers: ['L1'],
    }
  }

  /**
   * 初始化區域快取配置
   */
  initializeRegion(config: GeoCacheConfig): void {
    this.regionConfigs.set(config.regionId, config)
    this.caches.set(config.regionId, new Map())

    this.stats.set(config.regionId, {
      regionId: config.regionId,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      missRate: 100,
      avgAccessLatency: 0,
      evictionCount: 0,
      replicationLatency: 0,
    })

    this.emit('region:initialized', config)

    console.log(`[GeographicCacheManager] 區域快取已初始化: ${config.regionId}`)
    console.log(`  位置: (${config.location.lat.toFixed(2)}, ${config.location.lng.toFixed(2)})`)
    console.log(`  最大容量: ${(config.maxSize / 1024 / 1024).toFixed(0)} MB`)
    console.log(`  最大條目數: ${config.maxEntries}`)
  }

  /**
   * 根據地理位置選擇最近的區域
   */
  selectClosestRegion(userLocation: GeoLocation): string {
    let closestRegion = ''
    let minDistance = Number.MAX_VALUE

    for (const config of this.regionConfigs.values()) {
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        config.location.lat,
        config.location.lng
      )

      if (distance < minDistance) {
        minDistance = distance
        closestRegion = config.regionId
      }
    }

    console.log(
      `[GeographicCacheManager] 選擇最近區域: ${closestRegion} (距離: ${minDistance.toFixed(0)}km)`
    )
    return closestRegion
  }

  /**
   * 計算兩點間距離 (Haversine 公式)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // 地球半徑 (km)
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * 寫入快取
   */
  set(
    regionId: string,
    key: string,
    value: any,
    tier: 'L1' | 'L2' | 'L3' = 'L2',
    ttl?: number
  ): void {
    const config = this.regionConfigs.get(regionId)
    if (!config) {
      throw new Error(`區域不存在: ${regionId}`)
    }

    const cache = this.caches.get(regionId)!
    const size = JSON.stringify(value).length
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (ttl ?? config.defaultTtl))

    const entry: CacheEntry = {
      key,
      value,
      regionId,
      tier,
      createdAt: now,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: now,
      size,
      replicationStatus: 'local',
    }

    // 檢查容量
    const currentStats = this.stats.get(regionId)!
    const wouldExceed =
      currentStats.totalSize + size > config.maxSize || cache.size >= config.maxEntries

    if (wouldExceed) {
      this.evictEntries(regionId, size)
    }

    cache.set(key, entry)
    currentStats.totalSize += size
    currentStats.entryCount = cache.size

    this.emit('cache:set', { regionId, key, tier })

    console.log(`[GeographicCacheManager] 快取寫入: ${regionId}/${key} (${tier}, ${size} bytes)`)

    // 觸發跨區域複製
    if (config.replicationMode === 'async') {
      this.queueReplication('create', key, regionId)
    } else {
      this.replicateSynchronously(key, 'create', regionId)
    }
  }

  /**
   * 讀取快取
   */
  get(regionId: string, key: string): any | null {
    const cache = this.caches.get(regionId)
    if (!cache) {
      return null
    }

    const entry = cache.get(key)
    if (!entry) {
      this.updateStats(regionId, 'miss', 0)
      this.emit('cache:miss', { regionId, key })
      return null
    }

    // 檢查過期
    if (entry.expiresAt < new Date()) {
      cache.delete(key)
      const stats = this.stats.get(regionId)!
      stats.totalSize -= entry.size
      stats.entryCount = cache.size
      this.updateStats(regionId, 'miss', 0)
      this.emit('cache:expired', { regionId, key })
      return null
    }

    // 更新訪問統計
    entry.accessCount++
    entry.lastAccessedAt = new Date()
    const startTime = Date.now()
    const latency = Date.now() - startTime

    this.updateStats(regionId, 'hit', latency)
    this.emit('cache:hit', { regionId, key, tier: entry.tier })

    console.log(`[GeographicCacheManager] 快取讀取: ${regionId}/${key} (${entry.tier})`)
    return entry.value
  }

  /**
   * 刪除快取
   */
  delete(regionId: string, key: string): boolean {
    const cache = this.caches.get(regionId)
    if (!cache) {
      return false
    }

    const entry = cache.get(key)
    if (!entry) {
      return false
    }

    cache.delete(key)
    const stats = this.stats.get(regionId)!
    stats.totalSize -= entry.size
    stats.entryCount = cache.size

    this.emit('cache:delete', { regionId, key })

    // 觸發跨區域刪除
    this.queueReplication('delete', key, regionId)

    console.log(`[GeographicCacheManager] 快取刪除: ${regionId}/${key}`)
    return true
  }

  /**
   * 清空特定區域快取
   */
  clearRegion(regionId: string): void {
    const cache = this.caches.get(regionId)
    if (!cache) {
      return
    }

    cache.clear()
    const stats = this.stats.get(regionId)!
    stats.totalSize = 0
    stats.entryCount = 0

    this.emit('region:cleared', { regionId })
    console.log(`[GeographicCacheManager] 區域快取已清空: ${regionId}`)
  }

  /**
   * 驅逐快取條目
   */
  private evictEntries(regionId: string, requiredSpace: number): void {
    const cache = this.caches.get(regionId)!
    const stats = this.stats.get(regionId)!

    console.log(`[GeographicCacheManager] 開始驅逐: ${regionId} (需要 ${requiredSpace} bytes)`)

    let freedSpace = 0
    const entriesToEvict: CacheEntry[] = []

    // 根據策略選擇驅逐的條目
    if (this.evictionPolicy.strategy === 'LRU') {
      const entries = Array.from(cache.values())
        .filter((e) => !this.evictionPolicy.protectedTiers.includes(e.tier))
        .sort((a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime())

      for (const entry of entries) {
        if (freedSpace >= requiredSpace) {
          break
        }
        entriesToEvict.push(entry)
        freedSpace += entry.size
      }
    } else if (this.evictionPolicy.strategy === 'LFU') {
      const entries = Array.from(cache.values())
        .filter((e) => !this.evictionPolicy.protectedTiers.includes(e.tier))
        .sort((a, b) => a.accessCount - b.accessCount)

      for (const entry of entries) {
        if (freedSpace >= requiredSpace) {
          break
        }
        entriesToEvict.push(entry)
        freedSpace += entry.size
      }
    }

    // 執行驅逐
    for (const entry of entriesToEvict) {
      cache.delete(entry.key)
      stats.totalSize -= entry.size
      stats.evictionCount++
    }

    stats.entryCount = cache.size

    this.emit('cache:evicted', {
      regionId,
      evictedCount: entriesToEvict.length,
      freedSpace,
    })

    console.log(
      `[GeographicCacheManager] 已驅逐 ${entriesToEvict.length} 個條目，釋放 ${(freedSpace / 1024).toFixed(0)} KB`
    )
  }

  /**
   * 隊列複製事件
   */
  private queueReplication(
    eventType: 'create' | 'update' | 'delete',
    cacheKey: string,
    sourceRegion: string
  ): void {
    const targetRegions = Array.from(this.regionConfigs.keys()).filter((r) => r !== sourceRegion)

    const event: CacheReplicationEvent = {
      cacheKey,
      sourceRegion,
      targetRegions,
      eventType,
      timestamp: new Date(),
      replicationStatus: 'pending',
    }

    this.replicationQueue.push(event)
    this.emit('replication:queued', event)

    console.log(
      `[GeographicCacheManager] 複製事件已隊列: ${cacheKey} → ${targetRegions.join(', ')}`
    )
  }

  /**
   * 同步複製
   */
  private replicateSynchronously(
    cacheKey: string,
    eventType: 'create' | 'update' | 'delete',
    sourceRegion: string
  ): void {
    const sourceCache = this.caches.get(sourceRegion)
    if (!sourceCache) {
      return
    }

    const entry = sourceCache.get(cacheKey)
    if (!entry) {
      return
    }

    console.log(`[GeographicCacheManager] 開始同步複製: ${cacheKey}`)

    const targetRegions = Array.from(this.regionConfigs.keys()).filter((r) => r !== sourceRegion)

    for (const targetRegion of targetRegions) {
      const targetCache = this.caches.get(targetRegion)
      if (!targetCache) {
        continue
      }

      if (eventType === 'delete') {
        targetCache.delete(cacheKey)
      } else {
        targetCache.set(cacheKey, {
          ...entry,
          regionId: targetRegion,
          replicationStatus: 'replicated',
        })
      }

      const stats = this.stats.get(targetRegion)!
      stats.replicationLatency = Math.random() * 50 + 10 // 10-60ms 模擬
    }

    this.emit('replication:completed', { cacheKey, targetRegions })
    console.log(`[GeographicCacheManager] 複製完成: ${cacheKey}`)
  }

  /**
   * 處理複製隊列
   */
  async processReplicationQueue(): Promise<void> {
    console.log(`[GeographicCacheManager] 處理複製隊列 (${this.replicationQueue.length} 個事件)`)

    for (const event of this.replicationQueue) {
      const sourceCache = this.caches.get(event.sourceRegion)
      if (!sourceCache) {
        continue
      }

      const entry = sourceCache.get(event.cacheKey)
      if (!entry && event.eventType !== 'delete') {
        continue
      }

      event.replicationStatus = 'in-progress'

      for (const targetRegion of event.targetRegions) {
        const targetCache = this.caches.get(targetRegion)
        if (!targetCache) {
          continue
        }

        if (event.eventType === 'delete') {
          targetCache.delete(event.cacheKey)
        } else if (entry) {
          targetCache.set(event.cacheKey, {
            ...entry,
            regionId: targetRegion,
            replicationStatus: 'replicated',
          })
        }
      }

      event.replicationStatus = 'completed'
      this.emit('replication:completed', event)

      // 模擬複製延遲
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    this.replicationQueue = []
    console.log(`[GeographicCacheManager] 複製隊列已清空`)
  }

  /**
   * 更新統計信息
   */
  private updateStats(regionId: string, type: 'hit' | 'miss', latency: number): void {
    const stats = this.stats.get(regionId)
    if (!stats) {
      return
    }

    const totalOps = stats.hitRate + stats.missRate
    if (type === 'hit') {
      stats.hitRate = ((stats.hitRate + 1) / (totalOps + 1)) * 100
    } else {
      stats.missRate = ((stats.missRate + 1) / (totalOps + 1)) * 100
    }

    stats.avgAccessLatency = latency
  }

  /**
   * 預熱快取
   */
  async warmupCache(regionId: string, keys: Array<{ key: string; value: any }>): Promise<void> {
    console.log(`[GeographicCacheManager] 開始預熱快取: ${regionId} (${keys.length} 個條目)`)

    for (const item of keys) {
      this.set(regionId, item.key, item.value, 'L2', 24 * 60 * 60 * 1000) // 24 小時 TTL
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    this.emit('cache:warmup-completed', { regionId, count: keys.length })
    console.log(`[GeographicCacheManager] 快取預熱完成: ${regionId}`)
  }

  /**
   * 獲取快取統計
   */
  getStats(regionId: string): CacheStats | undefined {
    return this.stats.get(regionId)
  }

  /**
   * 獲取所有快取統計
   */
  getAllStats(): CacheStats[] {
    return Array.from(this.stats.values())
  }

  /**
   * 生成快取報告
   */
  generateCacheReport(): string {
    const lines = [
      '='.repeat(70),
      'GEOGRAPHIC CACHE LAYER REPORT',
      '='.repeat(70),
      '',
      '--- REGIONAL CONFIGURATIONS ---',
    ]

    for (const config of this.regionConfigs.values()) {
      lines.push(`${config.regionId}:`)
      lines.push(
        `  Location: (${config.location.lat.toFixed(2)}, ${config.location.lng.toFixed(2)})`
      )
      lines.push(`  Max Size: ${(config.maxSize / 1024 / 1024).toFixed(0)} MB`)
      lines.push(`  Max Entries: ${config.maxEntries}`)
      lines.push(`  Default TTL: ${(config.defaultTtl / 1000).toFixed(0)}s`)
      lines.push(`  Replication Mode: ${config.replicationMode}`)
      lines.push('')
    }

    lines.push('--- CACHE STATISTICS ---')
    for (const stats of this.stats.values()) {
      lines.push(`${stats.regionId}:`)
      lines.push(`  Total Size: ${(stats.totalSize / 1024).toFixed(0)} KB`)
      lines.push(`  Entry Count: ${stats.entryCount}`)
      lines.push(`  Hit Rate: ${stats.hitRate.toFixed(2)}%`)
      lines.push(`  Miss Rate: ${stats.missRate.toFixed(2)}%`)
      lines.push(`  Avg Latency: ${stats.avgAccessLatency.toFixed(2)}ms`)
      lines.push(`  Evictions: ${stats.evictionCount}`)
      lines.push(`  Replication Latency: ${stats.replicationLatency.toFixed(2)}ms`)
      lines.push('')
    }

    lines.push('--- EVICTION POLICY ---')
    lines.push(`Strategy: ${this.evictionPolicy.strategy}`)
    lines.push(`Trigger Threshold: ${this.evictionPolicy.triggerThreshold}%`)
    lines.push(`Eviction Batch: ${this.evictionPolicy.evictionBatch}`)
    lines.push(`Protected Tiers: ${this.evictionPolicy.protectedTiers.join(', ')}`)
    lines.push('')

    lines.push('--- REPLICATION QUEUE ---')
    lines.push(`Pending Events: ${this.replicationQueue.length}`)
    for (const event of this.replicationQueue.slice(0, 5)) {
      lines.push(`  ${event.eventType.toUpperCase()}: ${event.cacheKey}`)
    }

    lines.push('')
    lines.push('='.repeat(70))
    return lines.join('\n')
  }

  /**
   * 事件監聽
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)?.push(callback)
  }

  /**
   * 觸發事件
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(data)
        } catch (error) {
          console.error(`[GeographicCacheManager] Event listener error for ${event}:`, error)
        }
      }
    }
  }
}
