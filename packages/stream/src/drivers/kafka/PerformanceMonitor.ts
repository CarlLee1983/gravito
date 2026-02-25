import { EventEmitter } from 'node:events'
import type { BackpressureController } from './BackpressureController'
import type { ConsumerLifecycleManager } from './ConsumerLifecycleManager'
import type { ErrorRecoveryManager } from './ErrorRecoveryManager'
import type { HeartbeatManager } from './HeartbeatManager'
import type { KafkaMetrics } from './KafkaMetrics'
import type { PerformanceConfig, PerformanceSnapshot } from './types'

/**
 * 效能監控元件。
 *
 * 定期收集所有子系統的指標，產生聚合快照，
 * 並維護歷史記錄以供趨勢分析。
 *
 * 健康判定邏輯:
 * - healthy: 電路 CLOSED、心跳正常、無背壓
 * - degraded: 電路 HALF_OPEN 或背壓啟動 或 錯誤率 > 5%
 * - unhealthy: 電路 OPEN 或心跳失敗 或消費者非 running
 *
 * 事件:
 * - 'snapshot': 每次快照收集時發出
 * - 'health:changed': 健康狀態變更時發出
 *
 * @public
 */
export class PerformanceMonitor extends EventEmitter {
  private readonly snapshotIntervalMs: number
  private readonly historySize: number
  private readonly enabled: boolean

  private readonly history: PerformanceSnapshot[] = []
  private lastHealth: PerformanceSnapshot['health'] = 'healthy'
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false

  private metricsRef: KafkaMetrics | null = null
  private errorRecoveryRef: ErrorRecoveryManager | null = null
  private heartbeatRef: HeartbeatManager | null = null
  private backpressureRef: BackpressureController | null = null
  private lifecycleRef: ConsumerLifecycleManager | null = null

  constructor(config?: PerformanceConfig) {
    super()
    this.snapshotIntervalMs = config?.snapshotIntervalMs ?? 5000
    this.historySize = config?.historySize ?? 60
    this.enabled = config?.enabled ?? true
  }

  /**
   * 綁定監控目標元件。
   */
  bind(components: {
    metrics: KafkaMetrics
    errorRecovery: ErrorRecoveryManager
    heartbeat: HeartbeatManager
    backpressure: BackpressureController
    lifecycle: ConsumerLifecycleManager
  }): void {
    this.metricsRef = components.metrics
    this.errorRecoveryRef = components.errorRecovery
    this.heartbeatRef = components.heartbeat
    this.backpressureRef = components.backpressure
    this.lifecycleRef = components.lifecycle
  }

  /**
   * 開始定期快照收集。
   */
  start(): void {
    if (!this.enabled || this.running) {
      return
    }

    this.running = true
    this.timer = setInterval(() => {
      this.collectSnapshot()
    }, this.snapshotIntervalMs)
  }

  /**
   * 停止快照收集並清理計時器。
   */
  stop(): void {
    if (!this.running) {
      return
    }

    this.running = false
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * 手動觸發一次快照收集。
   */
  collectSnapshot(): PerformanceSnapshot {
    const metricsSnapshot = this.metricsRef?.getSnapshot()
    const errorState = this.errorRecoveryRef?.getState()
    const heartbeatStatus = this.heartbeatRef?.getStatus()
    const backpressurePaused = this.backpressureRef?.isPaused() ?? false
    const consumerState = this.lifecycleRef?.getState() ?? 'idle'

    const circuitState = errorState?.circuitState ?? 'CLOSED'
    const heartbeatAlive = heartbeatStatus?.isAlive ?? true
    const inFlight = metricsSnapshot?.inFlight ?? 0
    const totalProcessed = metricsSnapshot?.totalProcessed ?? 0
    const totalFailed = metricsSnapshot?.totalFailed ?? 0

    const errorRate = totalProcessed > 0 ? totalFailed / totalProcessed : 0

    const health = this.evaluateHealth(
      circuitState,
      heartbeatAlive,
      backpressurePaused,
      consumerState,
      errorRate
    )

    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      throughput: metricsSnapshot?.throughput ?? {},
      latency: {
        p50: metricsSnapshot?.latency.p50 ?? 0,
        p95: metricsSnapshot?.latency.p95 ?? 0,
        p99: metricsSnapshot?.latency.p99 ?? 0,
        avg: metricsSnapshot?.latency.avg ?? 0,
      },
      errors: metricsSnapshot?.errors ?? {
        total: 0,
        serialization: 0,
        callback: 0,
        connection: 0,
        timeout: 0,
      },
      circuitState,
      heartbeatAlive,
      backpressurePaused,
      consumerState,
      bufferUtilization: metricsSnapshot?.buffer.utilization ?? 0,
      inFlight,
      totalProcessed,
      totalFailed,
      health,
    }

    // 追加到歷史記錄（FIFO 上限）
    this.history.push(snapshot)
    if (this.history.length > this.historySize) {
      this.history.shift()
    }

    this.emit('snapshot', snapshot)

    // 健康狀態變更通知
    if (health !== this.lastHealth) {
      this.emit('health:changed', {
        previous: this.lastHealth,
        current: health,
        timestamp: snapshot.timestamp,
      })
      this.lastHealth = health
    }

    return snapshot
  }

  /**
   * 取得最近 N 筆歷史快照（不可變副本）。
   */
  getHistory(count?: number): PerformanceSnapshot[] {
    if (count === undefined || count >= this.history.length) {
      return [...this.history]
    }
    return this.history.slice(-count)
  }

  /**
   * 取得最新一筆快照。
   */
  getLatestSnapshot(): PerformanceSnapshot | null {
    return this.history.length > 0 ? this.history[this.history.length - 1]! : null
  }

  /**
   * 產生文字報告摘要。
   */
  generateReport(): string {
    const snapshot = this.getLatestSnapshot()
    if (!snapshot) {
      return 'No snapshots collected yet.'
    }

    const lines: string[] = [
      `=== Kafka Performance Report ===`,
      `Timestamp: ${new Date(snapshot.timestamp).toISOString()}`,
      `Health: ${snapshot.health.toUpperCase()}`,
      ``,
      `-- Throughput --`,
      ...Object.entries(snapshot.throughput).map(([q, v]) => `  ${q}: ${v.toFixed(2)} msg/s`),
      ``,
      `-- Latency --`,
      `  p50: ${snapshot.latency.p50.toFixed(2)}ms`,
      `  p95: ${snapshot.latency.p95.toFixed(2)}ms`,
      `  p99: ${snapshot.latency.p99.toFixed(2)}ms`,
      `  avg: ${snapshot.latency.avg.toFixed(2)}ms`,
      ``,
      `-- Counts --`,
      `  Total Processed: ${snapshot.totalProcessed}`,
      `  Total Failed: ${snapshot.totalFailed}`,
      `  In-Flight: ${snapshot.inFlight}`,
      ``,
      `-- Components --`,
      `  Circuit: ${snapshot.circuitState}`,
      `  Heartbeat Alive: ${snapshot.heartbeatAlive}`,
      `  Backpressure Paused: ${snapshot.backpressurePaused}`,
      `  Consumer State: ${snapshot.consumerState}`,
      `  Buffer Utilization: ${(snapshot.bufferUtilization * 100).toFixed(1)}%`,
      ``,
      `-- Errors --`,
      `  Total: ${snapshot.errors.total}`,
      `  Serialization: ${snapshot.errors.serialization}`,
      `  Callback: ${snapshot.errors.callback}`,
      `  Connection: ${snapshot.errors.connection}`,
      `  Timeout: ${snapshot.errors.timeout}`,
    ]

    return lines.join('\n')
  }

  /**
   * 是否正在執行中。
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * 清除歷史記錄並停止。
   */
  destroy(): void {
    this.stop()
    this.history.length = 0
    this.lastHealth = 'healthy'
    this.metricsRef = null
    this.errorRecoveryRef = null
    this.heartbeatRef = null
    this.backpressureRef = null
    this.lifecycleRef = null
    this.removeAllListeners()
  }

  /**
   * 內部：評估整體健康狀態。
   *
   * 當消費者尚未啟動（idle）時，心跳未活躍是預期的，不視為 unhealthy。
   * 只有在消費者已啟動（running/restarting）的情況下，心跳死亡才算 unhealthy。
   */
  private evaluateHealth(
    circuitState: string,
    heartbeatAlive: boolean,
    backpressurePaused: boolean,
    consumerState: string,
    errorRate: number
  ): PerformanceSnapshot['health'] {
    const consumerActive = consumerState === 'running' || consumerState === 'restarting'

    // unhealthy 條件
    if (circuitState === 'OPEN') {
      return 'unhealthy'
    }
    if (consumerActive && !heartbeatAlive) {
      return 'unhealthy'
    }
    if (consumerState === 'error') {
      return 'unhealthy'
    }

    // degraded 條件
    if (circuitState === 'HALF_OPEN') {
      return 'degraded'
    }
    if (backpressurePaused) {
      return 'degraded'
    }
    if (errorRate > 0.05) {
      return 'degraded'
    }

    return 'healthy'
  }
}
