/**
 * Multi-Region Manager
 * 多區域管理系統
 *
 * 職責：
 * 1. 管理多個區域的配置
 * 2. 實現區域間複製
 * 3. 故障轉移管理
 * 4. 地域路由
 */

export interface RegionConfig {
  regionId: string // us-east-1, eu-west-1, ap-southeast-1, us-west-2
  regionName: string
  location: string
  isPrimary: boolean
  endpoint: string
  port: number
  replicationLag?: number // 毫秒
  capacity?: number // QPS
}

export interface ReplicationStrategy {
  type: 'single-master' | 'multi-master' | 'active-active'
  primaryRegion: string
  secondaryRegions: string[]
  replicationMode: 'sync' | 'async' | 'semi-sync'
  conflictResolution: 'last-write-wins' | 'master-wins' | 'manual'
}

export interface FailoverPolicy {
  regionId: string
  priority: number
  threshold: {
    errorRate: number // %
    latency: number // ms
    unavailableTime: number // 秒
  }
  action: 'automatic' | 'manual'
  recoveryTime: number // 秒
}

export interface RegionHealth {
  regionId: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastCheck: Date
  errorRate: number
  avgLatency: number
  availabilityPercentage: number
  activeConnections: number
}

export interface GeoRoutingRule {
  name: string
  pattern: string // IP 或地區代碼
  targetRegion: string
  weight: number // 流量權重
  enabled: boolean
}

/**
 * 多區域管理器
 */
export class MultiRegionManager {
  private regions: Map<string, RegionConfig> = new Map()
  private replicationStrategy: ReplicationStrategy | null = null
  private failoverPolicies: Map<string, FailoverPolicy> = new Map()
  private regionHealth: Map<string, RegionHealth> = new Map()
  private geoRoutingRules: GeoRoutingRule[] = []
  private eventListeners: Map<string, Function[]> = new Map()
  private activeRegion = ''

  /**
   * 初始化多區域配置
   */
  initialize(regionConfigs: RegionConfig[]): void {
    for (const config of regionConfigs) {
      this.regions.set(config.regionId, config)

      // 初始化健康檢查
      this.regionHealth.set(config.regionId, {
        regionId: config.regionId,
        status: 'healthy',
        lastCheck: new Date(),
        errorRate: 0,
        avgLatency: 0,
        availabilityPercentage: 100,
        activeConnections: 0,
      })
    }

    // 設置初始活躍區域為主區域
    const primaryRegion = regionConfigs.find((r) => r.isPrimary)
    if (primaryRegion) {
      this.activeRegion = primaryRegion.regionId
    }

    this.emit('regions:initialized', {
      regionCount: regionConfigs.length,
      primaryRegion: this.activeRegion,
    })
  }

  /**
   * 配置複製策略
   */
  setReplicationStrategy(strategy: ReplicationStrategy): void {
    this.replicationStrategy = strategy
    this.emit('replication:configured', strategy)

    console.log(`[MultiRegionManager] 複製策略已配置:`)
    console.log(`  類型: ${strategy.type}`)
    console.log(`  模式: ${strategy.replicationMode}`)
    console.log(`  衝突解決: ${strategy.conflictResolution}`)
  }

  /**
   * 設置故障轉移策略
   */
  setFailoverPolicy(regionId: string, policy: FailoverPolicy): void {
    this.failoverPolicies.set(regionId, policy)
    this.emit('failover:policy-set', { regionId, policy })

    console.log(`[MultiRegionManager] 故障轉移策略已設置 (${regionId}):`)
    console.log(`  優先級: ${policy.priority}`)
    console.log(`  錯誤率閾值: ${policy.threshold.errorRate}%`)
    console.log(`  延遲閾值: ${policy.threshold.latency}ms`)
  }

  /**
   * 添加地域路由規則
   */
  addGeoRoutingRule(rule: GeoRoutingRule): void {
    this.geoRoutingRules.push(rule)
    this.emit('routing:rule-added', rule)
  }

  /**
   * 地域路由：根據 IP 或地區選擇區域
   */
  selectRegionByGeo(ip: string, country?: string): string {
    // 檢查精確規則
    for (const rule of this.geoRoutingRules) {
      if (rule.enabled && this.matchesPattern(ip, rule.pattern)) {
        return rule.targetRegion
      }
    }

    // 按地區選擇
    if (country) {
      const regionId = this.getRegionByCountry(country)
      if (regionId) {
        return regionId
      }
    }

    // 默認返回活躍區域
    return this.activeRegion
  }

  /**
   * 執行健康檢查
   */
  async performHealthCheck(regionId: string): Promise<RegionHealth> {
    const config = this.regions.get(regionId)
    if (!config) {
      throw new Error(`區域不存在: ${regionId}`)
    }

    // 模擬健康檢查
    const errorRate = Math.random() * 5 // 0-5% 錯誤率
    const latency = Math.random() * 100 + 10 // 10-110ms 延遲

    const updatedHealth: RegionHealth = {
      regionId,
      status: this.calculateHealth(errorRate, latency),
      lastCheck: new Date(),
      errorRate,
      avgLatency: latency,
      availabilityPercentage: 100 - errorRate,
      activeConnections: Math.floor(Math.random() * 10000),
    }

    this.regionHealth.set(regionId, updatedHealth)
    this.emit('health:checked', updatedHealth)

    return updatedHealth
  }

  /**
   * 執行故障轉移
   */
  async performFailover(fromRegion: string, toRegion: string): Promise<boolean> {
    console.log(`[MultiRegionManager] 執行故障轉移: ${fromRegion} -> ${toRegion}`)

    this.emit('failover:start', { fromRegion, toRegion })

    try {
      // 1. 驗證目標區域健康
      const targetHealth = await this.performHealthCheck(toRegion)
      if (targetHealth.status === 'unhealthy') {
        throw new Error(`目標區域不健康: ${toRegion}`)
      }

      // 2. 切換 DNS/路由
      await this.switchRouting(fromRegion, toRegion)

      // 3. 更新活躍區域
      this.activeRegion = toRegion
      this.regionHealth.get(fromRegion)!.status = 'degraded'

      // 4. 觸發複製同步
      await this.syncReplication(fromRegion, toRegion)

      this.emit('failover:completed', { fromRegion, toRegion })
      return true
    } catch (error) {
      console.error('[MultiRegionManager] 故障轉移失敗:', error)
      this.emit('failover:failed', { fromRegion, toRegion, error })
      return false
    }
  }

  /**
   * 計算區域健康狀態
   */
  private calculateHealth(errorRate: number, latency: number): RegionHealth['status'] {
    if (errorRate > 10 || latency > 500) {
      return 'unhealthy'
    } else if (errorRate > 5 || latency > 250) {
      return 'degraded'
    } else {
      return 'healthy'
    }
  }

  /**
   * 匹配 IP 模式
   */
  private matchesPattern(ip: string, pattern: string): boolean {
    // 簡單的模式匹配（生產環境可使用 IP 地理定位庫）
    return ip.includes(pattern)
  }

  /**
   * 根據國家代碼選擇區域
   */
  private getRegionByCountry(country: string): string | undefined {
    const countryRegionMap: Record<string, string> = {
      US: 'us-east-1',
      CA: 'us-east-1',
      GB: 'eu-west-1',
      DE: 'eu-west-1',
      FR: 'eu-west-1',
      CN: 'ap-southeast-1',
      JP: 'ap-southeast-1',
      SG: 'ap-southeast-1',
      AU: 'ap-southeast-1',
    }

    return countryRegionMap[country]
  }

  /**
   * 切換路由
   */
  private async switchRouting(fromRegion: string, toRegion: string): Promise<void> {
    console.log(`[MultiRegionManager] 切換路由: ${fromRegion} -> ${toRegion}`)
    // 實際應用中會更新 DNS 或負載均衡器配置
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  /**
   * 複製同步
   */
  private async syncReplication(fromRegion: string, toRegion: string): Promise<void> {
    console.log(`[MultiRegionManager] 複製同步: ${fromRegion} -> ${toRegion}`)

    if (!this.replicationStrategy) {
      return
    }

    // 根據複製模式執行
    switch (this.replicationStrategy.replicationMode) {
      case 'sync':
        // 同步複製，等待所有副本寫入
        await new Promise((resolve) => setTimeout(resolve, 200))
        break
      case 'async':
        // 非同步複製，立即返回
        await new Promise((resolve) => setTimeout(resolve, 50))
        break
      case 'semi-sync':
        // 半同步複製，等待至少一個副本
        await new Promise((resolve) => setTimeout(resolve, 100))
        break
    }
  }

  /**
   * 獲取區域信息
   */
  getRegionConfig(regionId: string): RegionConfig | undefined {
    return this.regions.get(regionId)
  }

  /**
   * 獲取所有區域
   */
  getAllRegions(): RegionConfig[] {
    return Array.from(this.regions.values())
  }

  /**
   * 獲取區域健康狀態
   */
  getRegionHealth(regionId: string): RegionHealth | undefined {
    return this.regionHealth.get(regionId)
  }

  /**
   * 獲取複製策略
   */
  getReplicationStrategy(): ReplicationStrategy | null {
    return this.replicationStrategy
  }

  /**
   * 獲取故障轉移策略
   */
  getFailoverPolicy(regionId: string): FailoverPolicy | undefined {
    return this.failoverPolicies.get(regionId)
  }

  /**
   * 生成架構報告
   */
  generateArchitectureReport(): string {
    const lines = [
      '='.repeat(70),
      'MULTI-REGION ARCHITECTURE REPORT',
      '='.repeat(70),
      '',
      '--- REGIONS ---',
    ]

    for (const region of this.regions.values()) {
      const health = this.regionHealth.get(region.regionId)
      lines.push(`${region.regionId} (${region.regionName}):`)
      lines.push(`  Location: ${region.location}`)
      lines.push(`  Primary: ${region.isPrimary ? '✅' : '❌'}`)
      lines.push(`  Endpoint: ${region.endpoint}:${region.port}`)
      if (health) {
        lines.push(`  Health: ${health.status}`)
        lines.push(`  Latency: ${health.avgLatency.toFixed(0)}ms`)
        lines.push(`  Error Rate: ${health.errorRate.toFixed(2)}%`)
      }
      lines.push('')
    }

    lines.push('--- REPLICATION STRATEGY ---')
    if (this.replicationStrategy) {
      lines.push(`Type: ${this.replicationStrategy.type}`)
      lines.push(`Mode: ${this.replicationStrategy.replicationMode}`)
      lines.push(`Primary: ${this.replicationStrategy.primaryRegion}`)
      lines.push(`Secondaries: ${this.replicationStrategy.secondaryRegions.join(', ')}`)
    }

    lines.push('')
    lines.push('--- GEO-ROUTING RULES ---')
    for (const rule of this.geoRoutingRules) {
      lines.push(`${rule.name}:`)
      lines.push(`  Pattern: ${rule.pattern}`)
      lines.push(`  Target: ${rule.targetRegion}`)
      lines.push(`  Weight: ${rule.weight}%`)
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
    this.eventListeners.get(event)!.push(callback)
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
          console.error(`[MultiRegionManager] Event listener error for ${event}:`, error)
        }
      }
    }
  }
}
