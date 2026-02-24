import { ColorConverter } from '../core/ColorConverter'
import { ColorValue } from '../core/ColorValue'
import type { StyleOptions } from '../core/types'
import { ANSI_CODES } from '../core/types'

// 樣式建構器（鏈式建構）
export class StyleBuilder {
  private codes: string[] = []
  private text = ''

  constructor(text = '') {
    this.text = text
  }

  // 套用前景色
  fg(color: string | ColorValue): StyleBuilder {
    const hex = this.resolveColor(color)
    const rgb = ColorConverter.hexToRgb(hex)

    this.codes.push(`\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`)

    return this
  }

  // 套用背景色
  bg(color: string | ColorValue): StyleBuilder {
    const hex = this.resolveColor(color)
    const rgb = ColorConverter.hexToRgb(hex)

    this.codes.push(`\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m`)

    return this
  }

  // 加粗
  bold(): StyleBuilder {
    this.codes.push(ANSI_CODES.BOLD)

    return this
  }

  // 變暗
  dim(): StyleBuilder {
    this.codes.push(ANSI_CODES.DIM)

    return this
  }

  // 斜體
  italic(): StyleBuilder {
    this.codes.push(ANSI_CODES.ITALIC)

    return this
  }

  // 下劃線
  underline(): StyleBuilder {
    this.codes.push(ANSI_CODES.UNDERLINE)

    return this
  }

  // 閃爍
  blink(): StyleBuilder {
    this.codes.push(ANSI_CODES.BLINK)

    return this
  }

  // 反轉
  inverse(): StyleBuilder {
    this.codes.push(ANSI_CODES.INVERSE)

    return this
  }

  // 隱藏
  hidden(): StyleBuilder {
    this.codes.push(ANSI_CODES.HIDDEN)

    return this
  }

  // 刪除線
  strikethrough(): StyleBuilder {
    this.codes.push(ANSI_CODES.STRIKETHROUGH)

    return this
  }

  // 批量套用樣式選項
  apply(options: StyleOptions): StyleBuilder {
    if (options.bold) {
      this.bold()
    }
    if (options.dim) {
      this.dim()
    }
    if (options.italic) {
      this.italic()
    }
    if (options.underline) {
      this.underline()
    }
    if (options.blink) {
      this.blink()
    }
    if (options.inverse) {
      this.inverse()
    }
    if (options.hidden) {
      this.hidden()
    }
    if (options.strikethrough) {
      this.strikethrough()
    }

    if (options.fg) {
      this.fg(options.fg)
    }
    if (options.bg) {
      this.bg(options.bg)
    }

    return this
  }

  // 設定文本
  setText(text: string): StyleBuilder {
    this.text = text

    return this
  }

  // 解析色彩參數
  private resolveColor(color: string | ColorValue): string {
    if (color instanceof ColorValue) {
      return color.getHex()
    }

    return ColorConverter.toHex(color)
  }

  // 生成樣式化字符串
  build(): string {
    if (!this.text || this.codes.length === 0) {
      return this.text
    }

    return `${this.codes.join('')}${this.text}${ANSI_CODES.RESET}`
  }

  // 別名：toString
  toString(): string {
    return this.build()
  }
}
