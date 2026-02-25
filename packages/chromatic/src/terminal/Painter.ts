import type { ColorValue } from '../core/ColorValue'
import type { StyleOptions } from '../core/types'
import { StyleBuilder } from './StyleBuilder'
import { TerminalDetector } from './TerminalDetector'

// Painter：靜態 Facade（相容 picocolors API）
export class Painter {
  private static detector = TerminalDetector.getInstance()
  private static stripColors = false

  static {
    const capabilities = Painter.detector.detect()
    Painter.stripColors = !capabilities.hasColor
  }

  // 設定是否剝離色彩
  static setStripColors(strip: boolean): void {
    Painter.stripColors = strip
  }

  // 獲取終端能力
  static getCapabilities() {
    return Painter.detector.detect()
  }

  // 基本色彩 API（picocolors 相容）
  static reset(text: string): string {
    return Painter.style(text, { reset: true })
  }

  static bold(text: string): string {
    return Painter.style(text, { bold: true })
  }

  static dim(text: string): string {
    return Painter.style(text, { dim: true })
  }

  static italic(text: string): string {
    return Painter.style(text, { italic: true })
  }

  static underline(text: string): string {
    return Painter.style(text, { underline: true })
  }

  static inverse(text: string): string {
    return Painter.style(text, { inverse: true })
  }

  static hidden(text: string): string {
    return Painter.style(text, { hidden: true })
  }

  static strikethrough(text: string): string {
    return Painter.style(text, { strikethrough: true })
  }

  // 前景色（picocolors 相容名稱）
  static black(text: string): string {
    return Painter.style(text, { fg: '#000000' })
  }

  static red(text: string): string {
    return Painter.style(text, { fg: '#ff0000' })
  }

  static green(text: string): string {
    return Painter.style(text, { fg: '#00ff00' })
  }

  static yellow(text: string): string {
    return Painter.style(text, { fg: '#ffff00' })
  }

  static blue(text: string): string {
    return Painter.style(text, { fg: '#0000ff' })
  }

  static magenta(text: string): string {
    return Painter.style(text, { fg: '#ff00ff' })
  }

  static cyan(text: string): string {
    return Painter.style(text, { fg: '#00ffff' })
  }

  static white(text: string): string {
    return Painter.style(text, { fg: '#ffffff' })
  }

  static gray(text: string): string {
    return Painter.style(text, { fg: '#808080' })
  }

  // 背景色
  static bgBlack(text: string): string {
    return Painter.style(text, { bg: '#000000' })
  }

  static bgRed(text: string): string {
    return Painter.style(text, { bg: '#ff0000' })
  }

  static bgGreen(text: string): string {
    return Painter.style(text, { bg: '#00ff00' })
  }

  static bgYellow(text: string): string {
    return Painter.style(text, { bg: '#ffff00' })
  }

  static bgBlue(text: string): string {
    return Painter.style(text, { bg: '#0000ff' })
  }

  static bgMagenta(text: string): string {
    return Painter.style(text, { bg: '#ff00ff' })
  }

  static bgCyan(text: string): string {
    return Painter.style(text, { bg: '#00ffff' })
  }

  static bgWhite(text: string): string {
    return Painter.style(text, { bg: '#ffffff' })
  }

  // 自訂色彩樣式
  static style(text: string, options: StyleOptions & { reset?: boolean } = {}): string {
    if (Painter.stripColors || options.reset) {
      return text
    }

    const builder = new StyleBuilder(text)

    return builder.apply(options).build()
  }

  // 使用自訂色彩的進階 API
  static customize(text: string, fg?: string | ColorValue, bg?: string | ColorValue): string {
    if (Painter.stripColors) {
      return text
    }

    const builder = new StyleBuilder(text)

    if (fg) {
      builder.fg(fg)
    }

    if (bg) {
      builder.bg(bg)
    }

    return builder.build()
  }

  // 建立樣式建構器（用於複雜樣式）
  static create(text = ''): StyleBuilder {
    return new StyleBuilder(text)
  }

  // 組合多個樣式
  static compose(...styled: string[]): string {
    return styled.join('')
  }
}
