import type {
  IDockerAdapter,
  IRocketRepository,
  IRouterAdapter,
  PoolConfig,
} from '../Domain/Interfaces'
import { DEFAULT_POOL_CONFIG } from '../Domain/Interfaces'
import type { Mission } from '../Domain/Mission'
import { Rocket } from '../Domain/Rocket'
import { RocketStatus } from '../Domain/RocketStatus'
import { MissionQueue, PoolExhaustedException } from './MissionQueue'
import type { RefurbishUnit } from './RefurbishUnit'

/**
 * PoolManager handles the lifecycle and pooling of Rocket containers.
 *
 * It manages a pool of pre-warmed containers to ensure fast deployment of
 * new missions. It also handles rocket assignment and recycling (refurbishment).
 *
 * @public
 * @since 3.0.0
 */
export class PoolManager {
  private readonly config: PoolConfig
  private readonly missionQueue: MissionQueue
  private dynamicRocketCount = 0

  constructor(
    private dockerAdapter: IDockerAdapter,
    private rocketRepository: IRocketRepository,
    private refurbishUnit?: RefurbishUnit,
    private router?: IRouterAdapter,
    config?: Partial<PoolConfig>
  ) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config }
    this.missionQueue = new MissionQueue(this.config.maxQueueSize, this.config.queueTimeoutMs)
  }

  /**
   * 取得當前 Pool 狀態
   */
  async getPoolStatus(): Promise<{
    total: number
    idle: number
    orbiting: number
    refurbishing: number
    decommissioned: number
    dynamicCount: number
    maxRockets: number
    queueLength: number
  }> {
    const rockets = await this.rocketRepository.findAll()
    const statusCounts = {
      total: rockets.length,
      idle: 0,
      orbiting: 0,
      refurbishing: 0,
      decommissioned: 0,
    }

    for (const rocket of rockets) {
      switch (rocket.status) {
        case RocketStatus.IDLE:
          statusCounts.idle++
          break
        case RocketStatus.PREPARING:
        case RocketStatus.ORBITING:
          statusCounts.orbiting++
          break
        case RocketStatus.REFURBISHING:
          statusCounts.refurbishing++
          break
        case RocketStatus.DECOMMISSIONED:
          statusCounts.decommissioned++
          break
      }
    }

    return {
      ...statusCounts,
      dynamicCount: this.dynamicRocketCount,
      maxRockets: this.config.maxRockets,
      queueLength: this.missionQueue.length,
    }
  }

  /**
   * 初始化發射場：預先準備指定數量的火箭
   */
  async warmup(count?: number): Promise<void> {
    const targetCount = count ?? this.config.warmupCount
    const currentRockets = await this.rocketRepository.findAll()
    const activeRockets = currentRockets.filter((r) => r.status !== RocketStatus.DECOMMISSIONED)
    const needed = Math.min(
      targetCount - activeRockets.length,
      this.config.maxRockets - activeRockets.length
    )

    if (needed <= 0) {
      console.log(`[PoolManager] 無需熱機，當前已有 ${activeRockets.length} 架火箭`)
      return
    }

    console.log(`[PoolManager] 正在熱機，準備發射 ${needed} 架新火箭...`)

    for (let i = 0; i < needed; i++) {
      const containerId = await this.dockerAdapter.createBaseContainer()
      const rocketId = `rocket-${crypto.randomUUID()}`
      const rocket = new Rocket(rocketId, containerId)
      await this.rocketRepository.save(rocket)
    }

    console.log(`[PoolManager] 熱機完成，Pool 當前共 ${activeRockets.length + needed} 架火箭`)
  }

  /**
   * 獲取一架可用的火箭並分配任務
   *
   * @throws {PoolExhaustedException} 當 Pool 耗盡且無法處理請求時
   */
  async assignMission(mission: Mission): Promise<Rocket> {
    // 1. 嘗試從池中獲取閒置火箭
    let rocket = await this.rocketRepository.findIdle()

    if (rocket) {
      rocket.assignMission(mission)
      await this.rocketRepository.save(rocket)
      return rocket
    }

    // 2. 池子空了，根據策略處理
    const poolStatus = await this.getPoolStatus()
    const activeCount = poolStatus.total - poolStatus.decommissioned

    console.log(
      `[PoolManager] 無可用火箭，當前狀態: ` +
        `總數=${activeCount}/${this.config.maxRockets}, ` +
        `隊列=${this.missionQueue.length}/${this.config.maxQueueSize}`
    )

    switch (this.config.exhaustionStrategy) {
      case 'reject':
        throw new PoolExhaustedException(`Rocket Pool 已耗盡，無法處理任務 ${mission.id}`)

      case 'dynamic': {
        // 嘗試動態建立（有限制）
        if (
          activeCount < this.config.maxRockets &&
          this.dynamicRocketCount < (this.config.dynamicLimit ?? 5)
        ) {
          console.log(`[PoolManager] 動態建立後援火箭...`)
          const containerId = await this.dockerAdapter.createBaseContainer()
          rocket = new Rocket(`rocket-dynamic-${Date.now()}`, containerId)
          this.dynamicRocketCount++
          rocket.assignMission(mission)
          await this.rocketRepository.save(rocket)
          return rocket
        }
        // 超過動態限制，使用隊列策略
        if (this.missionQueue.isFull) {
          throw new PoolExhaustedException(`Rocket Pool 與隊列均已滿，無法處理任務 ${mission.id}`)
        }
        console.log(`[PoolManager] 任務 ${mission.id} 進入等待隊列`)
        return this.missionQueue.enqueue(mission)
      }

      case 'queue':
      default:
        if (this.missionQueue.isFull) {
          throw new PoolExhaustedException(`Rocket Pool 與隊列均已滿，無法處理任務 ${mission.id}`)
        }
        console.log(`[PoolManager] 任務 ${mission.id} 進入等待隊列`)
        return this.missionQueue.enqueue(mission)
    }
  }

  /**
   * 回收指定任務的火箭
   */
  async recycle(missionId: string): Promise<void> {
    const allRockets = await this.rocketRepository.findAll()
    const rocket = allRockets.find((r) => r.currentMission?.id === missionId)

    if (!rocket) {
      console.warn(`[PoolManager] 找不到屬於任務 ${missionId} 的火箭`)
      return
    }

    // 註銷域名映射
    if (this.router && rocket.assignedDomain) {
      this.router.unregister(rocket.assignedDomain)
    }

    if (this.refurbishUnit) {
      await this.refurbishUnit.refurbish(rocket)
    } else {
      rocket.splashDown()
      rocket.finishRefurbishment()
    }

    await this.rocketRepository.save(rocket)

    // 火箭回歸後，檢查是否有等待的任務
    await this.processQueue()
  }

  /**
   * 處理等待隊列中的任務
   */
  private async processQueue(): Promise<void> {
    const queuedItem = this.missionQueue.dequeue()
    if (!queuedItem) {
      return
    }

    try {
      const rocket = await this.rocketRepository.findIdle()
      if (rocket) {
        rocket.assignMission(queuedItem.mission)
        await this.rocketRepository.save(rocket)
        queuedItem.resolve(rocket)
        console.log(`[PoolManager] 隊列任務 ${queuedItem.mission.id} 已分配火箭 ${rocket.id}`)
      } else {
        // 重新入隊（不太可能發生，但作為防護）
        console.warn(`[PoolManager] 處理隊列時仍無可用火箭，任務重新入隊`)
        this.missionQueue
          .enqueue(queuedItem.mission)
          .then(queuedItem.resolve)
          .catch(queuedItem.reject)
      }
    } catch (error) {
      queuedItem.reject(error as Error)
    }
  }

  /**
   * 取得隊列統計資訊
   */
  getQueueStats() {
    return this.missionQueue.getStats()
  }
}
