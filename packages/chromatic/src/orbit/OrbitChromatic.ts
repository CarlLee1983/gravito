import type { GravitoOrbit, PlanetCore } from '@gravito/core'
import type { ThemeDefinition } from '../core/types'
import { ThemeManager } from '../theme/ThemeManager'

/**
 * OrbitChromatic：Chromatic 的 PlanetCore 整合層
 *
 * 提供主題配置與 Logger 增強功能，在容器中註冊 ThemeManager
 */
export class OrbitChromatic implements GravitoOrbit {
  private themeConfig?: Record<string, ThemeDefinition>

  constructor(themeConfig?: Record<string, ThemeDefinition>) {
    this.themeConfig = themeConfig
  }

  async install(core: PlanetCore): Promise<void> {
    // 註冊 ThemeManager 單例到容器中
    const themeManager = ThemeManager.getInstance()
    core.container.singleton('@gravito/chromatic:ThemeManager', () => themeManager)

    // 如果提供了自訂主題配置，註冊它們
    if (this.themeConfig) {
      for (const [_name, theme] of Object.entries(this.themeConfig)) {
        themeManager.register(theme)
      }
    }

    core.logger.info('[Chromatic] OrbitChromatic installed successfully')
  }
}
