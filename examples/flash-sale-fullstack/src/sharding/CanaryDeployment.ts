/**
 * Canary Deployment Manager
 * 灰度發佈管理器
 *
 * 職責：
 * 1. 管理灰度發佈的多個階段 (10% → 50% → 100%)
 * 2. 監控關鍵指標
 * 3. 自動回滾決策
 * 4. 流量切換控制
 */

export interface CanaryPhase {
  name: 'canary-10' | 'rollout-50' | 'full-100'
  trafficPercentage: number
  durationMinutes: number
  successThreshold: number // 成功率閾值 (%)
  errorRateThreshold: number // 錯誤率閾值 (%)
  p99LatencyThreshold: number // P99 延遲閾值 (ms)
}

export interface CanaryMetrics {
  phase: string
  startTime: Date
  endTime?: Date
  requests: number
  successfulRequests: number
  failedRequests: number
  errorRate: number
  avgLatency: number
  p99Latency: number
  status: 'running' | 'passed' | 'failed' | 'rollback'
}

export interface CanaryConfig {
  phases: CanaryPhase[]
  metricsCheckInterval: number // 毫秒
  autoRollback: boolean
  notificationUrl?: string // 通知 webhook
}

/**
 * 灰度發佈管理器
 */
export class CanaryDeployment {
  private config: CanaryConfig
  private metrics: Map<string, CanaryMetrics> = new Map()
  private phaseIndex = 0
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(config: CanaryConfig) {
    this.config = config
  }

  /**
   * 開始灰度發佈
   */
  async startCanaryDeployment(): Promise<void> {
    this.emit('canary:start', { totalPhases: this.config.phases.length })

    for (this.phaseIndex = 0; this.phaseIndex < this.config.phases.length; this.phaseIndex++) {
      const phase = this.config.phases[this.phaseIndex]
      this.currentPhase = phase

      const success = await this.runPhase(phase)

      if (!success) {
        this.emit('canary:failed', { phase: phase.name })

        if (this.config.autoRollback) {
          await this.rollback(phase)
        }
        return
      }
    }

    this.emit('canary:completed', { status: 'success' })
  }

  /**
   * 執行灰度階段
   */
  private async runPhase(phase: CanaryPhase): Promise<boolean> {
    const phaseMetrics: CanaryMetrics = {
      phase: phase.name,
      startTime: new Date(),
      requests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errorRate: 0,
      avgLatency: 0,
      p99Latency: 0,
      status: 'running',
    }

    this.metrics.set(phase.name, phaseMetrics)
    this.emit(`canary:${phase.name}:start`, { trafficPercentage: phase.trafficPercentage })

    try {
      // 開啟流量切換
      await this.switchTraffic(phase.trafficPercentage)

      // 監控指定時間
      const durationMs = phase.durationMinutes * 60 * 1000
      const checkInterval = 10000 // 每 10 秒檢查一次

      for (let elapsed = 0; elapsed < durationMs; elapsed += checkInterval) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(checkInterval, durationMs - elapsed))
        )

        // 收集和評估指標
        await this.collectMetrics(phaseMetrics)

        const decision = this.evaluatePhase(phaseMetrics, phase)
        this.emit(`canary:${phase.name}:progress`, {
          elapsed: elapsed + checkInterval,
          duration: durationMs,
          metrics: phaseMetrics,
          decision,
        })

        if (decision === 'rollback') {
          phaseMetrics.status = 'rollback'
          return false
        }
      }

      // 階段結束，檢查最終指標
      const finalDecision = this.evaluatePhase(phaseMetrics, phase)

      if (finalDecision === 'rollback') {
        phaseMetrics.status = 'failed'
        return false
      }

      phaseMetrics.endTime = new Date()
      phaseMetrics.status = 'passed'
      this.emit(`canary:${phase.name}:passed`, phaseMetrics)

      return true
    } catch (error) {
      phaseMetrics.status = 'failed'
      phaseMetrics.endTime = new Date()
      this.emit(`canary:${phase.name}:error`, { error, metrics: phaseMetrics })
      return false
    }
  }

  /**
   * 收集階段指標
   */
  private async collectMetrics(metrics: CanaryMetrics): Promise<void> {
    // 模擬指標收集
    const newRequests = Math.floor(Math.random() * 100) + 50
    const successRate = 0.95 + Math.random() * 0.04 // 95-99%
    const successfulRequests = Math.floor(newRequests * successRate)

    metrics.requests += newRequests
    metrics.successfulRequests += successfulRequests
    metrics.failedRequests += newRequests - successfulRequests
    metrics.errorRate = (metrics.failedRequests / metrics.requests) * 100
    metrics.avgLatency = 50 + Math.random() * 30 // 50-80ms
    metrics.p99Latency = 100 + Math.random() * 50 // 100-150ms
  }

  /**
   * 評估階段是否通過
   */
  private evaluatePhase(metrics: CanaryMetrics, phase: CanaryPhase): 'continue' | 'rollback' {
    const successRate = (metrics.successfulRequests / metrics.requests) * 100

    if (successRate < phase.successThreshold) {
      return 'rollback'
    }

    if (metrics.errorRate > phase.errorRateThreshold) {
      return 'rollback'
    }

    if (metrics.p99Latency > phase.p99LatencyThreshold) {
      return 'rollback'
    }

    return 'continue'
  }

  /**
   * 切換流量到新版本
   */
  private async switchTraffic(percentage: number): Promise<void> {
    this.emit('traffic:switch', { percentage })

    // 實際應用中會通過負載均衡器或路由層切換流量
    // 這裡模擬流量切換

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  /**
   * 回滾到上一個版本
   */
  private async rollback(phase: CanaryPhase): Promise<void> {
    this.emit('canary:rollback', { phase: phase.name })

    // 切換流量回到舊版本
    await this.switchTraffic(0)

    // 記錄回滾原因
    const metrics = this.metrics.get(phase.name)
    if (metrics) {
      this.emit('rollback:completed', {
        phase: phase.name,
        reason: this.getRollbackReason(metrics, phase),
        metrics,
      })
    }
  }

  /**
   * 獲取回滾原因
   */
  private getRollbackReason(metrics: CanaryMetrics, phase: CanaryPhase): string {
    const successRate = (metrics.successfulRequests / metrics.requests) * 100

    if (successRate < phase.successThreshold) {
      return `成功率不足: ${successRate.toFixed(2)}% < ${phase.successThreshold}%`
    }

    if (metrics.errorRate > phase.errorRateThreshold) {
      return `錯誤率過高: ${metrics.errorRate.toFixed(2)}% > ${phase.errorRateThreshold}%`
    }

    if (metrics.p99Latency > phase.p99LatencyThreshold) {
      return `P99 延遲過高: ${metrics.p99Latency.toFixed(0)}ms > ${phase.p99LatencyThreshold}ms`
    }

    return '未知原因'
  }

  /**
   * 獲取階段指標
   */
  getPhaseMetrics(phaseName: string): CanaryMetrics | undefined {
    return this.metrics.get(phaseName)
  }

  /**
   * 獲取所有階段指標
   */
  getAllMetrics(): Map<string, CanaryMetrics> {
    return new Map(this.metrics)
  }

  /**
   * 生成灰度報告
   */
  generateReport(): string {
    const lines = ['='.repeat(70), 'CANARY DEPLOYMENT REPORT', '='.repeat(70), '']

    for (const [phaseName, metrics] of this.metrics) {
      lines.push(`Phase: ${phaseName}`)
      lines.push(`Status: ${metrics.status}`)
      lines.push(
        `Duration: ${metrics.endTime ? metrics.endTime.getTime() - metrics.startTime.getTime() : 'ongoing'} ms`
      )
      lines.push(`Traffic: ${this.getTrafficPercentage(phaseName)}%`)
      lines.push(
        `Requests: ${metrics.requests} (Success: ${metrics.successfulRequests}, Failed: ${metrics.failedRequests})`
      )
      lines.push(
        `Success Rate: ${((metrics.successfulRequests / metrics.requests) * 100).toFixed(2)}%`
      )
      lines.push(`Error Rate: ${metrics.errorRate.toFixed(2)}%`)
      lines.push(`Avg Latency: ${metrics.avgLatency.toFixed(2)}ms`)
      lines.push(`P99 Latency: ${metrics.p99Latency.toFixed(2)}ms`)
      lines.push('')
    }

    lines.push('='.repeat(70))
    return lines.join('\n')
  }

  /**
   * 獲取階段的流量百分比
   */
  private getTrafficPercentage(phaseName: string): number {
    const phase = this.config.phases.find((p) => p.name === phaseName)
    return phase?.trafficPercentage ?? 0
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
          console.error(`[CanaryDeployment] Event listener error for ${event}:`, error)
        }
      }
    }
  }
}
