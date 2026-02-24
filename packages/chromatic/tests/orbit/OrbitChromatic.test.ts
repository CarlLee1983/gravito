import { describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { ThemeDefinition } from '../../src/core/types'
import { OrbitChromatic } from '../../src/orbit/OrbitChromatic'
import { ThemeManager } from '../../src/theme/ThemeManager'

describe('OrbitChromatic', () => {
  describe('Constructor', () => {
    it('應該無配置初始化', () => {
      const orbit = new OrbitChromatic()
      expect(orbit).toBeDefined()
    })

    it('應該使用主題配置初始化', () => {
      const themeConfig: Record<string, ThemeDefinition> = {
        custom: {
          name: 'custom',
          colors: {
            background: '#ffffff',
            foreground: '#000000',
            primary: '#0066ff',
            error: '#ff0000',
            success: '#00ff00',
            warning: '#ffff00',
          },
          semantics: {},
        },
      }

      const orbit = new OrbitChromatic(themeConfig)
      expect(orbit).toBeDefined()
    })
  })

  describe('install 方法', () => {
    it('應該是非同步方法', async () => {
      const orbit = new OrbitChromatic()
      const mockLogger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      }

      const mockContainer = {
        singleton: mock(() => {}),
      }

      const mockCore = {
        container: mockContainer,
        logger: mockLogger,
      } as unknown as PlanetCore

      const result = orbit.install(mockCore)
      expect(result instanceof Promise).toBe(true)

      await result
    })

    it('應該在容器中註冊 ThemeManager', async () => {
      const orbit = new OrbitChromatic()
      let registeredClass: unknown
      let registeredInstance: unknown

      const mockLogger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      }

      const mockContainer = {
        singleton: mock((cls: unknown, factory: unknown) => {
          registeredClass = cls
          if (typeof factory === 'function') {
            registeredInstance = factory()
          } else {
            registeredInstance = factory
          }
        }),
      }

      const mockCore = {
        container: mockContainer,
        logger: mockLogger,
      } as unknown as PlanetCore

      await orbit.install(mockCore)

      expect(registeredClass).toBe('@gravito/chromatic:ThemeManager')
      expect(registeredInstance).toBe(ThemeManager.getInstance())
    })

    it('應該註冊自訂主題', async () => {
      const themeConfig: Record<string, ThemeDefinition> = {
        custom: {
          name: 'custom',
          colors: {
            background: '#ffffff',
            foreground: '#000000',
            primary: '#0066ff',
            error: '#ff0000',
            success: '#00ff00',
            warning: '#ffff00',
          },
          semantics: {},
        },
      }

      const orbit = new OrbitChromatic(themeConfig)

      const mockLogger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      }

      const mockContainer = {
        singleton: mock(() => {}),
      }

      const mockCore = {
        container: mockContainer,
        logger: mockLogger,
      } as unknown as PlanetCore

      // 重設 ThemeManager 以隔離測試
      ThemeManager.getInstance().reset()

      await orbit.install(mockCore)

      const manager = ThemeManager.getInstance()
      expect(manager.hasTheme('custom')).toBe(true)
    })

    it('應該記錄安裝完成', async () => {
      const orbit = new OrbitChromatic()
      const loggedMessages: string[] = []

      const mockLogger = {
        info: mock((msg: string) => loggedMessages.push(msg)),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      }

      const mockContainer = {
        singleton: mock(() => {}),
      }

      const mockCore = {
        container: mockContainer,
        logger: mockLogger,
      } as unknown as PlanetCore

      await orbit.install(mockCore)

      expect(loggedMessages.some((msg) => msg.includes('Chromatic'))).toBe(true)
      expect(loggedMessages.some((msg) => msg.includes('installed'))).toBe(true)
    })

    it('應該在沒有主題配置時正常工作', async () => {
      const orbit = new OrbitChromatic()

      const mockLogger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      }

      const mockContainer = {
        singleton: mock(() => {}),
      }

      const mockCore = {
        container: mockContainer,
        logger: mockLogger,
      } as unknown as PlanetCore

      ThemeManager.getInstance().reset()
      const themes = ThemeManager.getInstance().listThemes()

      await orbit.install(mockCore)

      const afterThemes = ThemeManager.getInstance().listThemes()
      expect(afterThemes.length).toBeGreaterThanOrEqual(themes.length)
    })
  })

  describe('GravitoOrbit 介面符合', () => {
    it('應該實作 GravitoOrbit 介面', () => {
      const orbit = new OrbitChromatic()
      expect(typeof orbit.install).toBe('function')
    })

    it('install 方法簽名應該正確', async () => {
      const orbit = new OrbitChromatic()
      const mockLogger = {
        info: mock(() => {}),
        debug: mock(() => {}),
        warn: mock(() => {}),
        error: mock(() => {}),
      }

      const mockContainer = {
        singleton: mock(() => {}),
      }

      const mockCore = {
        container: mockContainer,
        logger: mockLogger,
      } as unknown as PlanetCore

      const result = orbit.install(mockCore)

      expect(result instanceof Promise).toBe(true)
      await result
    })
  })
})
