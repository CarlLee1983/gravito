import type { IDockerAdapter } from '../Domain/Interfaces'
import type { Rocket } from '../Domain/Rocket'

export class RefurbishUnit {
  constructor(private docker: IDockerAdapter) {}

  /**
   * 執行火箭翻新邏輯
   */
  async refurbish(rocket: Rocket): Promise<void> {
    console.log(`[RefurbishUnit] 正在翻新火箭: ${rocket.id} (容器: ${rocket.containerId})`)

    // 1. 進入狀態機的回收階段
    rocket.splashDown()

    try {
      // 2. 執行深度清理指令
      // - 刪除 /app 目錄 (注入的代碼)
      // - 殺掉所有除了 tail 以外的 bun 進程
      // - 清理暫存檔
      const cleanupCommands = ['sh', '-c', 'rm -rf /app/* && pkill -f bun || true && rm -rf /tmp/*']

      const result = await this.docker.executeCommand(rocket.containerId, cleanupCommands)

      if (result.exitCode !== 0) {
        console.error(`[RefurbishUnit] 清理失敗: ${result.stderr}`)
        // 這裡可以選擇將火箭標記為 DECOMMISSIONED
        rocket.decommission()
        return
      }

      // 3. 翻新完成，回歸池中
      rocket.finishRefurbishment()
      console.log(`[RefurbishUnit] 火箭 ${rocket.id} 翻新完成，已進入 IDLE 狀態。`)
    } catch (error) {
      console.error(`[RefurbishUnit] 回收過程發生異常:`, error)
      rocket.decommission()
    }
  }
}
