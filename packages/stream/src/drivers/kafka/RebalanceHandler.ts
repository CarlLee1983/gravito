import { EventEmitter } from 'node:events'
import type {
  PartitionAssignment,
  RebalanceConfig,
  RebalanceEvent,
  RebalanceState,
  RebalanceStatus,
} from './types'

/**
 * 回調介面：RebalanceHandler 在撤銷/分配時通知外部元件。
 */
export interface RebalanceCallbacks {
  /** 在分區撤銷前提交 offset */
  commitOffsets: () => Promise<void>
  /** 清除指定分區的緩衝訊息 */
  clearPartitionBuffers: (partitions: PartitionAssignment[]) => void
  /** 清除指定分區的 offset 追蹤 */
  clearPartitionTracking: (partitions: PartitionAssignment[]) => void
}

/**
 * 管理 Kafka 消費者群組的重新平衡事件。
 *
 * 協調 MessageBuffer、OffsetTracker 和 ConsumerLifecycleManager
 * 在分區撤銷與分配期間的狀態一致性。
 *
 * 狀態機:
 * - stable → revoking → assigning → stable
 * - any → error
 *
 * 事件:
 * - 'rebalance' - 每次狀態變更時發出 RebalanceEvent
 * - 'partitionsRevoked' - 分區被撤銷
 * - 'partitionsAssigned' - 分區被分配
 *
 * @public
 */
export class RebalanceHandler extends EventEmitter {
  private readonly revocationTimeoutMs: number
  private readonly commitOnRevoke: boolean
  private readonly clearBufferOnRevoke: boolean
  private readonly maxConcurrentRebalances: number

  private currentState: RebalanceState = 'stable'
  private previousState: RebalanceState = 'stable'
  private assignedPartitions: PartitionAssignment[] = []
  private totalRebalances = 0
  private lastRebalanceTimestamp = 0
  private activeRebalances = 0
  private callbacks: RebalanceCallbacks | null = null

  constructor(config?: RebalanceConfig) {
    super()
    this.revocationTimeoutMs = config?.revocationTimeoutMs ?? 10000
    this.commitOnRevoke = config?.commitOnRevoke ?? true
    this.clearBufferOnRevoke = config?.clearBufferOnRevoke ?? true
    this.maxConcurrentRebalances = config?.maxConcurrentRebalances ?? 1
  }

  /**
   * 註冊重新平衡回調。
   *
   * 外部元件（KafkaDriver）透過此方法提供
   * offset 提交和緩衝清除能力。
   */
  registerCallbacks(callbacks: RebalanceCallbacks): void {
    this.callbacks = callbacks
  }

  /**
   * 處理分區撤銷事件。
   *
   * 執行順序:
   * 1. 轉換到 'revoking' 狀態
   * 2. 提交已追蹤的 offset（如果啟用）
   * 3. 清除被撤銷分區的緩衝（如果啟用）
   * 4. 清除被撤銷分區的追蹤資料
   * 5. 發出事件通知
   */
  async handlePartitionsRevoked(partitions: PartitionAssignment[]): Promise<void> {
    if (this.activeRebalances >= this.maxConcurrentRebalances) {
      const error = new Error('Max concurrent rebalances exceeded')
      this.transitionTo('error', { error })
      throw error
    }

    this.activeRebalances++

    try {
      this.transitionTo('revoking', {
        revokedPartitions: partitions,
      })

      // 使用逾時保護撤銷操作
      await this.withTimeout(async () => {
        // 提交 offset
        if (this.commitOnRevoke && this.callbacks) {
          await this.callbacks.commitOffsets()
        }

        // 清除緩衝
        if (this.clearBufferOnRevoke && this.callbacks) {
          this.callbacks.clearPartitionBuffers(partitions)
        }

        // 清除追蹤
        if (this.callbacks) {
          this.callbacks.clearPartitionTracking(partitions)
        }
      }, this.revocationTimeoutMs)

      // 從已分配列表中移除被撤銷的分區
      this.assignedPartitions = this.assignedPartitions.filter(
        (assigned) =>
          !partitions.some(
            (revoked) =>
              revoked.topic === assigned.topic && revoked.partition === assigned.partition
          )
      )

      this.emit('partitionsRevoked', partitions)
    } catch (error) {
      this.transitionTo('error', {
        error: error instanceof Error ? error : new Error(String(error)),
        revokedPartitions: partitions,
      })
      throw error
    } finally {
      this.activeRebalances--
    }
  }

  /**
   * 處理分區分配事件。
   *
   * 更新已分配分區列表並發出事件。
   */
  async handlePartitionsAssigned(partitions: PartitionAssignment[]): Promise<void> {
    try {
      this.transitionTo('assigning', {
        assignedPartitions: partitions,
      })

      // 合併新分配的分區（避免重複）
      for (const newPartition of partitions) {
        const exists = this.assignedPartitions.some(
          (p) => p.topic === newPartition.topic && p.partition === newPartition.partition
        )
        if (!exists) {
          this.assignedPartitions = [...this.assignedPartitions, newPartition]
        }
      }

      this.totalRebalances++
      this.lastRebalanceTimestamp = Date.now()

      // 轉換到穩定狀態
      this.transitionTo('stable', {
        assignedPartitions: partitions,
      })

      this.emit('partitionsAssigned', partitions)
    } catch (error) {
      this.transitionTo('error', {
        error: error instanceof Error ? error : new Error(String(error)),
        assignedPartitions: partitions,
      })
      throw error
    }
  }

  /**
   * 執行完整的重新平衡流程（撤銷 + 分配）。
   */
  async handleRebalance(
    revokedPartitions: PartitionAssignment[],
    assignedPartitions: PartitionAssignment[]
  ): Promise<void> {
    if (revokedPartitions.length > 0) {
      await this.handlePartitionsRevoked(revokedPartitions)
    }

    if (assignedPartitions.length > 0) {
      await this.handlePartitionsAssigned(assignedPartitions)
    }
  }

  /**
   * 返回當前重新平衡狀態快照（不可變）。
   */
  getStatus(): RebalanceStatus {
    return {
      state: this.currentState,
      assignedPartitions: [...this.assignedPartitions],
      totalRebalances: this.totalRebalances,
      lastRebalanceTimestamp: this.lastRebalanceTimestamp,
      isRebalancing: this.currentState === 'revoking' || this.currentState === 'assigning',
    }
  }

  /**
   * 檢查是否正在重新平衡中。
   */
  isRebalancing(): boolean {
    return this.currentState === 'revoking' || this.currentState === 'assigning'
  }

  /**
   * 取得當前已分配的分區列表（不可變）。
   */
  getAssignedPartitions(): PartitionAssignment[] {
    return [...this.assignedPartitions]
  }

  /**
   * 註冊重新平衡狀態變更監聽器。
   */
  onRebalance(listener: (event: RebalanceEvent) => void): void {
    this.on('rebalance', listener)
  }

  /**
   * 重置為初始狀態。
   */
  reset(): void {
    this.currentState = 'stable'
    this.previousState = 'stable'
    this.assignedPartitions = []
    this.totalRebalances = 0
    this.lastRebalanceTimestamp = 0
    this.activeRebalances = 0
  }

  /**
   * 清理資源。
   */
  destroy(): void {
    this.reset()
    this.callbacks = null
    this.removeAllListeners()
  }

  /**
   * 內部：執行狀態轉換並發出事件。
   */
  private transitionTo(
    newState: RebalanceState,
    eventData?: Partial<Pick<RebalanceEvent, 'revokedPartitions' | 'assignedPartitions' | 'error'>>
  ): void {
    this.previousState = this.currentState
    this.currentState = newState

    const event: RebalanceEvent = {
      state: newState,
      previousState: this.previousState,
      timestamp: Date.now(),
      ...eventData,
    }

    this.emit('rebalance', event)
  }

  /**
   * 內部：使用逾時保護執行非同步操作。
   */
  private async withTimeout(fn: () => Promise<void>, timeoutMs: number): Promise<void> {
    return Promise.race([
      fn(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Revocation timeout')), timeoutMs)
      ),
    ])
  }
}
