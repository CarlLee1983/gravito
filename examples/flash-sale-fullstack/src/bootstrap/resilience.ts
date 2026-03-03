import type { PlanetCore } from '@gravito/core'
import { setupResilienceIntegration } from '../integrations/resilience-integration'
import { initializeResilience } from '../resilience/config'

/**
 * 設置容錯與抗壓系統 (P0.2)
 */
export async function bootstrapResilience(core: PlanetCore): Promise<void> {
  // P0.2：初始化容錯機制（Resilience）
  await initializeResilience(core)

  // 設置 Resilience 整合
  setupResilienceIntegration(core)
}
