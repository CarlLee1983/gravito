import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { InvalidThemeError, ThemeNotFoundError } from '../../src/core/errors'
import type { ThemeDefinition } from '../../src/core/types'
import { ThemeManager } from '../../src/theme/ThemeManager'

describe('ThemeManager', () => {
  let manager: ThemeManager

  beforeEach(() => {
    // 重設單例以確保測試隔離
    manager = ThemeManager.getInstance()
    manager.reset()
  })

  afterEach(() => {
    manager.reset()
  })

  describe('getInstance', () => {
    it('應該返回單例', () => {
      const manager1 = ThemeManager.getInstance()
      const manager2 = ThemeManager.getInstance()
      expect(manager1).toBe(manager2)
    })

    it('應該在初始化時註冊預設主題', () => {
      const themes = manager.listThemes()
      expect(themes).toContain('light')
      expect(themes).toContain('dark')
    })
  })

  describe('register', () => {
    it('應該註冊自訂主題', () => {
      const theme: ThemeDefinition = {
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
      }

      manager.register(theme)
      expect(manager.hasTheme('custom')).toBe(true)
    })

    it('應該驗證主題有名稱', () => {
      const theme: ThemeDefinition = {
        name: '',
        colors: {
          background: '#ffffff',
          foreground: '#000000',
          primary: '#0066ff',
          error: '#ff0000',
          success: '#00ff00',
          warning: '#ffff00',
        },
        semantics: {},
      }

      expect(() => manager.register(theme)).toThrow(InvalidThemeError)
    })

    it('應該驗證主題有顏色', () => {
      const theme: ThemeDefinition = {
        name: 'invalid',
        colors: {},
        semantics: {},
      }

      expect(() => manager.register(theme)).toThrow(InvalidThemeError)
    })

    it('應該驗證必需的色彩存在', () => {
      const theme: ThemeDefinition = {
        name: 'incomplete',
        colors: {
          background: '#ffffff',
          foreground: '#000000',
        },
        semantics: {},
      }

      expect(() => manager.register(theme)).toThrow(InvalidThemeError)
    })
  })

  describe('setCurrentTheme', () => {
    it('應該設定當前主題', () => {
      manager.setCurrentTheme('dark')
      expect(manager.getCurrentThemeName()).toBe('dark')
    })

    it('應該拒絕不存在的主題', () => {
      expect(() => manager.setCurrentTheme('nonexistent')).toThrow(ThemeNotFoundError)
    })
  })

  describe('getCurrentTheme', () => {
    it('應該返回當前主題', () => {
      const theme = manager.getCurrentTheme()
      expect(theme).toBeDefined()
      expect(theme.name).toBeDefined()
      expect(theme.colors).toBeDefined()
    })

    it('應該預設返回 light 主題', () => {
      const theme = manager.getCurrentTheme()
      expect(theme.name).toBe('light')
    })
  })

  describe('getCurrentThemeName', () => {
    it('應該返回當前主題名稱', () => {
      expect(manager.getCurrentThemeName()).toBe('light')
      manager.setCurrentTheme('dark')
      expect(manager.getCurrentThemeName()).toBe('dark')
    })
  })

  describe('getTheme', () => {
    it('應該按名稱取得主題', () => {
      const theme = manager.getTheme('light')
      expect(theme.name).toBe('light')
    })

    it('應該拒絕不存在的主題', () => {
      expect(() => manager.getTheme('nonexistent')).toThrow(ThemeNotFoundError)
    })
  })

  describe('getColor', () => {
    it('應該取得色彩', () => {
      const color = manager.getColor('background')
      expect(typeof color).toBe('string')
    })

    it('應該從指定主題取得色彩', () => {
      const lightColor = manager.getColor('background', 'light')
      expect(typeof lightColor).toBe('string')
    })

    it('應該拒絕無效的色彩名稱', () => {
      expect(() => manager.getColor('nonexistent')).toThrow(InvalidThemeError)
    })
  })

  describe('listThemes', () => {
    it('應該列出所有主題名稱', () => {
      const themes = manager.listThemes()
      expect(Array.isArray(themes)).toBe(true)
      expect(themes.length).toBeGreaterThan(0)
      expect(themes).toContain('light')
      expect(themes).toContain('dark')
    })
  })

  describe('hasTheme', () => {
    it('應該檢查主題存在', () => {
      expect(manager.hasTheme('light')).toBe(true)
      expect(manager.hasTheme('nonexistent')).toBe(false)
    })
  })

  describe('removeTheme', () => {
    it('應該移除自訂主題', () => {
      const theme: ThemeDefinition = {
        name: 'temporary',
        colors: {
          background: '#ffffff',
          foreground: '#000000',
          primary: '#0066ff',
          error: '#ff0000',
          success: '#00ff00',
          warning: '#ffff00',
        },
        semantics: {},
      }

      manager.register(theme)
      expect(manager.hasTheme('temporary')).toBe(true)

      manager.removeTheme('temporary')
      expect(manager.hasTheme('temporary')).toBe(false)
    })

    it('應該拒絕移除預設主題', () => {
      expect(() => manager.removeTheme('light')).toThrow(InvalidThemeError)
      expect(() => manager.removeTheme('dark')).toThrow(InvalidThemeError)
    })

    it('移除當前主題時應該回到 light', () => {
      const theme: ThemeDefinition = {
        name: 'temporary',
        colors: {
          background: '#ffffff',
          foreground: '#000000',
          primary: '#0066ff',
          error: '#ff0000',
          success: '#00ff00',
          warning: '#ffff00',
        },
        semantics: {},
      }

      manager.register(theme)
      manager.setCurrentTheme('temporary')
      manager.removeTheme('temporary')

      expect(manager.getCurrentThemeName()).toBe('light')
    })
  })

  describe('cloneTheme', () => {
    it('應該複製現有主題', () => {
      const cloned = manager.cloneTheme('light', 'light-clone')
      expect(cloned.name).toBe('light-clone')
      expect(manager.hasTheme('light-clone')).toBe(true)
    })

    it('複製的主題應該獨立', () => {
      manager.cloneTheme('light', 'light-copy')
      const original = manager.getTheme('light')
      const copy = manager.getTheme('light-copy')

      expect(original.colors).toEqual(copy.colors)
      expect(original.colors).not.toBe(copy.colors)
    })
  })

  describe('mergeColors', () => {
    it('應該合併色彩到當前主題', () => {
      const newColors = { custom: '#abcdef' }
      manager.mergeColors(newColors)

      const theme = manager.getCurrentTheme()
      expect((theme.colors as Record<string, unknown>).custom).toBe('#abcdef')
    })

    it('應該覆蓋現有色彩', () => {
      const original = manager.getColor('background')
      const newColors = { background: '#000000' }
      manager.mergeColors(newColors)

      const updated = manager.getColor('background')
      expect(updated).not.toBe(original)
      expect(updated).toBe('#000000')
    })

    it('應該到指定主題合併', () => {
      const newColors = { custom: '#abcdef' }
      manager.mergeColors(newColors, 'dark')

      const theme = manager.getTheme('dark')
      expect((theme.colors as Record<string, unknown>).custom).toBe('#abcdef')
    })
  })

  describe('getSemanticColor', () => {
    it('應該取得語義色彩', () => {
      const theme = manager.getCurrentTheme()
      if (Object.keys(theme.semantics).length > 0) {
        const semanticKey = Object.keys(theme.semantics)[0]
        const semantic = manager.getSemanticColor(semanticKey)
        expect(semantic).toBeDefined()
      }
    })

    it('應該拒絕無效的語義名稱', () => {
      expect(() => manager.getSemanticColor('nonexistent')).toThrow(InvalidThemeError)
    })
  })

  describe('getContrast', () => {
    it('應該返回對比度物件', () => {
      const theme = manager.getCurrentTheme()
      if (Object.keys(theme.semantics).length > 0) {
        const semanticKey = Object.keys(theme.semantics)[0]
        const contrast = manager.getContrast(semanticKey)
        expect(typeof contrast.lightBg).toBe('number')
        expect(typeof contrast.darkBg).toBe('number')
      }
    })
  })

  describe('reset', () => {
    it('應該重設為預設狀態', () => {
      const theme: ThemeDefinition = {
        name: 'test',
        colors: {
          background: '#ffffff',
          foreground: '#000000',
          primary: '#0066ff',
          error: '#ff0000',
          success: '#00ff00',
          warning: '#ffff00',
        },
        semantics: {},
      }

      manager.register(theme)
      manager.setCurrentTheme('test')
      manager.reset()

      expect(manager.getCurrentThemeName()).toBe('light')
      expect(manager.hasTheme('test')).toBe(false)
    })
  })
})
