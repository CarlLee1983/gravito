import { ColorValue } from '../core/ColorValue'
import { Painter } from '../terminal/Painter'
import { ThemeManager } from './ThemeManager'

// 語義色彩工具（便利方法）
export class SemanticColors {
  private static manager = ThemeManager.getInstance()

  // 成功色
  static success(text: string, themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('success', themeName)

    return Painter.customize(text, color.hex)
  }

  static getSuccessColor(themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('success', themeName)

    return color.hex
  }

  // 警告色
  static warning(text: string, themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('warning', themeName)

    return Painter.customize(text, color.hex)
  }

  static getWarningColor(themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('warning', themeName)

    return color.hex
  }

  // 錯誤色
  static error(text: string, themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('error', themeName)

    return Painter.customize(text, color.hex)
  }

  static getErrorColor(themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('error', themeName)

    return color.hex
  }

  // 信息色
  static info(text: string, themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('info', themeName)

    return Painter.customize(text, color.hex)
  }

  static getInfoColor(themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('info', themeName)

    return color.hex
  }

  // 主色彩
  static primary(text: string, themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('primary', themeName)

    return Painter.customize(text, color.hex)
  }

  static getPrimaryColor(themeName?: string): string {
    const color = SemanticColors.manager.getSemanticColor('primary', themeName)

    return color.hex
  }

  // 取得全部語義色彩物件
  static getAllSemanticColors(themeName?: string) {
    const theme = themeName
      ? SemanticColors.manager.getTheme(themeName)
      : SemanticColors.manager.getCurrentTheme()

    return theme.semantics
  }

  // 計算對比度是否合格（WCAG AA）
  static hasGoodContrast(
    semanticName: string,
    isLightBackground: boolean,
    themeName?: string
  ): boolean {
    const semantic = SemanticColors.manager.getSemanticColor(semanticName, themeName)

    if (!semantic.contrast) {
      return true
    }

    const contrast = isLightBackground ? semantic.contrast.lightBg : semantic.contrast.darkBg

    return contrast >= 4.5
  }

  // 快取色彩值物件
  private static colorCache = new Map<string, ColorValue>()

  static getColorValue(semanticName: string, themeName?: string): ColorValue {
    const key = `${semanticName}:${themeName || 'current'}`

    if (SemanticColors.colorCache.has(key)) {
      return SemanticColors.colorCache.get(key)!
    }

    const color = SemanticColors.manager.getSemanticColor(semanticName, themeName)
    const colorValue = new ColorValue(color.hex)

    SemanticColors.colorCache.set(key, colorValue)

    return colorValue
  }

  // 清除色彩快取
  static clearColorCache(): void {
    SemanticColors.colorCache.clear()
  }
}
