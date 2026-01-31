import type { Mission } from '../Domain/Mission'
import type { Rocket } from '../Domain/Rocket'

interface QueuedMission {
  mission: Mission
  resolve: (rocket: Rocket) => void
  reject: (error: Error) => void
  enqueuedAt: number
  timeoutId: ReturnType<typeof setTimeout>
}

/**
 * MissionQueue manages pending mission requests when pool is exhausted.
 *
 * Implements FIFO queue with timeout handling and backpressure support.
 *
 * @public
 * @since 1.3.0
 */
export class MissionQueue {
  private queue: QueuedMission[] = []
  private readonly maxSize: number
  private readonly timeoutMs: number

  constructor(maxSize = 50, timeoutMs = 30000) {
    this.maxSize = maxSize
    this.timeoutMs = timeoutMs
  }

  get length(): number {
    return this.queue.length
  }

  get isFull(): boolean {
    return this.queue.length >= this.maxSize
  }

  /**
   * 將任務加入隊列，返回 Promise 等待分配
   */
  enqueue(mission: Mission): Promise<Rocket> {
    if (this.isFull) {
      return Promise.reject(
        new PoolExhaustedException(`任務隊列已滿（${this.maxSize}），無法接受新任務`)
      )
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeFromQueue(mission.id)
        reject(new QueueTimeoutException(`任務 ${mission.id} 等待超時`))
      }, this.timeoutMs)

      this.queue.push({
        mission,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        timeoutId,
      })

      console.log(
        `[MissionQueue] 任務 ${mission.id} 已加入隊列，當前隊列長度: ${this.queue.length}`
      )
    })
  }

  /**
   * 取出下一個等待的任務
   */
  dequeue(): QueuedMission | null {
    const item = this.queue.shift()
    if (item) {
      clearTimeout(item.timeoutId)
    }
    return item ?? null
  }

  /**
   * 從隊列中移除指定任務
   */
  private removeFromQueue(missionId: string): void {
    const index = this.queue.findIndex((q) => q.mission.id === missionId)
    if (index >= 0) {
      const [removed] = this.queue.splice(index, 1)
      clearTimeout(removed.timeoutId)
    }
  }

  /**
   * 清空隊列並拒絕所有等待的任務
   */
  clear(reason: string): void {
    for (const item of this.queue) {
      clearTimeout(item.timeoutId)
      item.reject(new Error(reason))
    }
    this.queue = []
  }

  /**
   * 取得隊列統計資訊
   */
  getStats(): {
    length: number
    maxSize: number
    oldestWaitMs: number | null
  } {
    const oldestWaitMs = this.queue.length > 0 ? Date.now() - this.queue[0].enqueuedAt : null

    return {
      length: this.queue.length,
      maxSize: this.maxSize,
      oldestWaitMs,
    }
  }
}

/**
 * Pool 資源耗盡異常
 *
 * @public
 * @since 1.3.0
 */
export class PoolExhaustedException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PoolExhaustedException'
  }
}

/**
 * 隊列等待超時異常
 *
 * @public
 * @since 1.3.0
 */
export class QueueTimeoutException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueueTimeoutException'
  }
}
