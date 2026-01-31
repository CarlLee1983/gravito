import type { IDockerAdapter, RefurbishConfig } from '../Domain/Interfaces'
import { DEFAULT_REFURBISH_CONFIG } from '../Domain/Interfaces'
import type { Rocket } from '../Domain/Rocket'

/**
 * RefurbishUnit handles the cleaning and restoration of Rocket containers.
 *
 * After a mission is complete, this unit resets the container environment
 * (clearing files, stopping processes) so the container can be returned
 * to the idle pool for future reuse.
 *
 * @public
 * @since 3.0.0
 */
export class RefurbishUnit {
  private readonly config: RefurbishConfig

  constructor(
    private docker: IDockerAdapter,
    config?: Partial<RefurbishConfig>
  ) {
    this.config = { ...DEFAULT_REFURBISH_CONFIG, ...config }
  }

  /**
   * 執行火箭翻新邏輯
   */
  async refurbish(rocket: Rocket): Promise<void> {
    console.log(
      `[RefurbishUnit] 正在翻新火箭: ${rocket.id} ` +
        `(策略: ${this.config.strategy}, 容器: ${rocket.containerId})`
    )

    // 1. 進入狀態機的回收階段
    rocket.splashDown()

    try {
      // 2. 執行深度清理指令
      const commands = this.config.cleanupCommands ?? []
      const fullCommand = commands.join(' && ')

      const result = await this.docker.executeCommand(rocket.containerId, ['sh', '-c', fullCommand])

      if (result.exitCode !== 0) {
        console.error(`[RefurbishUnit] 清理失敗: ${result.stderr}`)

        if (this.config.failureAction === 'decommission') {
          rocket.decommission()
          return
        }
        // retry 策略在後續版本實現
      }

      // 3. 翻新完成，回歸池中
      rocket.finishRefurbishment()
      console.log(`[RefurbishUnit] 火箭 ${rocket.id} 翻新完成，已進入 IDLE 狀態`)
    } catch (error) {
      console.error(`[RefurbishUnit] 回收過程發生異常:`, error)
      rocket.decommission()
    }
  }
}
