import type { IDockerAdapter, IRouterAdapter } from '../Domain/Interfaces'
import type { Mission } from '../Domain/Mission'
import type { PayloadInjector } from './PayloadInjector'
import type { PoolManager } from './PoolManager'

/**
 * MissionControl orchestrates the high-level process of launching missions.
 *
 * it coordinates between the `PoolManager`, `PayloadInjector`, and `DockerAdapter`
 * to deploy code into containers, assign domains, and monitor execution.
 *
 * @public
 * @since 3.0.0
 */
export class MissionControl {
  constructor(
    private poolManager: PoolManager,
    private injector: PayloadInjector,
    private docker: IDockerAdapter,
    private router?: IRouterAdapter
  ) {}

  async launch(mission: Mission, onTelemetry: (type: string, data: any) => void): Promise<string> {
    console.log(`[MissionControl] 準備發射任務: ${mission.id}`)

    // 1. 從池子抓火箭
    const rocket = await this.poolManager.assignMission(mission)

    // 2. 注入代碼並點火
    await this.injector.deploy(rocket)

    // 3. 獲取真實映射端口
    const publicPort = await this.docker.getExposedPort(rocket.containerId, 3000)
    console.log(`[MissionControl] 任務 ${mission.id} 映射端口: ${publicPort}`)

    // 4. 分配域名
    const domain = `${mission.id}.dev.local`.toLowerCase()
    rocket.assignDomain(domain)

    if (this.router) {
      // 關鍵修復：Proxy 指向真實的 Host Port
      this.router.register(domain, `http://localhost:${publicPort}`)
    }

    // 5. 啟動即時遙測
    this.docker.streamLogs(rocket.containerId, (log) => {
      onTelemetry('log', { rocketId: rocket.id, text: log })
    })

    const statsTimer = setInterval(async () => {
      if (rocket.status === 'DECOMMISSIONED' || rocket.status === 'IDLE') {
        clearInterval(statsTimer)
        return
      }
      const stats = await this.docker.getStats(rocket.containerId)
      onTelemetry('stats', { rocketId: rocket.id, ...stats })
    }, 5000)
    statsTimer.unref?.()

    const ttl = 10 * 60 * 1000
    const recycleTimer = setTimeout(async () => {
      console.log(`[MissionControl] 任務 ${mission.id} TTL 已到期，執行自動回收...`)
      clearInterval(statsTimer)
      await this.poolManager.recycle(mission.id)
      onTelemetry('log', { rocketId: rocket.id, text: '--- MISSION EXPIRED (TTL) ---' })
    }, ttl)
    recycleTimer.unref?.()

    return rocket.id
  }
}
