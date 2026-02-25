import { InvalidThemeError, ThemeNotFoundError } from '../core/errors'
import type { SemanticColor, ThemeDefinition } from '../core/types'
import { DEFAULT_THEMES } from './defaultTheme'

// 主題管理系統
export class ThemeManager {
  private static instance: ThemeManager
  private themes: Map<string, ThemeDefinition> = new Map()
  private currentTheme = 'light'

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager()
      ThemeManager.instance.registerDefaultThemes()
    }

    return ThemeManager.instance
  }

  // 註冊預設主題
  private registerDefaultThemes(): void {
    for (const [name, theme] of Object.entries(DEFAULT_THEMES)) {
      this.themes.set(name, theme)
    }
  }

  // 註冊自訂主題
  register(theme: ThemeDefinition): void {
    if (!theme.name) {
      throw new InvalidThemeError('', 'Theme must have a name')
    }

    if (!theme.colors) {
      throw new InvalidThemeError(theme.name, 'Theme must have colors')
    }

    this.validateTheme(theme)
    this.themes.set(theme.name, theme)
  }

  // 驗證主題
  private validateTheme(theme: ThemeDefinition): void {
    const requiredColors = ['background', 'foreground', 'primary', 'error', 'success', 'warning']

    for (const color of requiredColors) {
      if (!(color in theme.colors)) {
        throw new InvalidThemeError(theme.name, `Missing required color: ${color}`)
      }
    }
  }

  // 設定當前主題
  setCurrentTheme(name: string): void {
    if (!this.themes.has(name)) {
      throw new ThemeNotFoundError(name)
    }

    this.currentTheme = name
  }

  // 獲取當前主題
  getCurrentTheme(): ThemeDefinition {
    const theme = this.themes.get(this.currentTheme)

    if (!theme) {
      throw new ThemeNotFoundError(this.currentTheme)
    }

    return theme
  }

  // 獲取當前主題名稱
  getCurrentThemeName(): string {
    return this.currentTheme
  }

  // 獲取指定主題
  getTheme(name: string): ThemeDefinition {
    const theme = this.themes.get(name)

    if (!theme) {
      throw new ThemeNotFoundError(name)
    }

    return theme
  }

  // 獲取色彩值
  getColor(colorName: string, themeName?: string): string {
    const theme = themeName ? this.getTheme(themeName) : this.getCurrentTheme()
    const color = theme.colors[colorName]

    if (!color) {
      throw new InvalidThemeError(theme.name, `Color not found: ${colorName}`)
    }

    return color
  }

  // 獲取語義色彩
  getSemanticColor(semanticName: string, themeName?: string): SemanticColor {
    const theme = themeName ? this.getTheme(themeName) : this.getCurrentTheme()
    const semantic = theme.semantics[semanticName]

    if (!semantic) {
      throw new InvalidThemeError(theme.name, `Semantic color not found: ${semanticName}`)
    }

    return semantic
  }

  // 列出所有主題名稱
  listThemes(): string[] {
    return Array.from(this.themes.keys())
  }

  // 檢查主題是否存在
  hasTheme(name: string): boolean {
    return this.themes.has(name)
  }

  // 移除主題（預設主題無法移除）
  removeTheme(name: string): void {
    if (DEFAULT_THEMES[name as keyof typeof DEFAULT_THEMES]) {
      throw new InvalidThemeError(name, 'Cannot remove default themes')
    }

    this.themes.delete(name)

    if (this.currentTheme === name) {
      this.currentTheme = 'light'
    }
  }

  // 複製主題（用於衍生新主題）
  cloneTheme(fromName: string, toName: string): ThemeDefinition {
    const fromTheme = this.getTheme(fromName)

    const newTheme: ThemeDefinition = {
      name: toName,
      colors: { ...fromTheme.colors },
      semantics: Object.fromEntries(
        Object.entries(fromTheme.semantics).map(([key, semantic]) => [
          key,
          {
            ...semantic,
            rgb: { ...semantic.rgb },
          },
        ])
      ),
    }

    this.register(newTheme)

    return newTheme
  }

  // 合併色彩到當前主題
  mergeColors(colors: Record<string, string>, themeName?: string): ThemeDefinition {
    const theme = themeName ? this.getTheme(themeName) : this.getCurrentTheme()

    const mergedTheme: ThemeDefinition = {
      ...theme,
      colors: {
        ...theme.colors,
        ...colors,
      },
    }

    this.register(mergedTheme)

    return mergedTheme
  }

  // 獲取主題對比度（用於無障礙檢查）
  getContrast(semanticName: string, themeName?: string): { lightBg: number; darkBg: number } {
    const semantic = this.getSemanticColor(semanticName, themeName)

    if (!semantic.contrast) {
      return { lightBg: 1, darkBg: 1 }
    }

    return semantic.contrast
  }

  // 重置為預設主題
  reset(): void {
    this.themes.clear()
    this.registerDefaultThemes()
    this.currentTheme = 'light'
  }
}
