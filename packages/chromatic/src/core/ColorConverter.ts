import { ColorParser } from './ColorParser'
import { ColorValue } from './ColorValue'
import { ColorConversionError } from './errors'
import type { ColorObject, HSL, HSV, RGB } from './types'
import { ColorSpace } from './types'

// 色彩轉換器（薄封裝 Bun.color()）
export class ColorConverter {
  // 轉換任意格式到 RGB
  static toRgb(input: string | ColorValue): RGB {
    if (input instanceof ColorValue) {
      return input.getRgb()
    }

    if (typeof input === 'string') {
      const color = ColorParser.parse(input)
      return color.getRgb()
    }

    throw new ColorConversionError('unknown', 'rgb', 'Invalid input type')
  }

  // 轉換任意格式到十六進制
  static toHex(input: string | ColorValue): string {
    if (input instanceof ColorValue) {
      return input.getHex()
    }

    if (typeof input === 'string') {
      const color = ColorParser.parse(input)
      return color.getHex()
    }

    throw new ColorConversionError('unknown', 'hex', 'Invalid input type')
  }

  // 轉換任意格式到 HSL
  static toHsl(input: string | ColorValue): HSL {
    if (input instanceof ColorValue) {
      return input.getHsl()
    }

    if (typeof input === 'string') {
      const color = ColorParser.parse(input)
      return color.getHsl()
    }

    throw new ColorConversionError('unknown', 'hsl', 'Invalid input type')
  }

  // 轉換任意格式到 HSV
  static toHsv(input: string | ColorValue): HSV {
    if (input instanceof ColorValue) {
      return input.getHsv()
    }

    if (typeof input === 'string') {
      const color = ColorParser.parse(input)
      return color.getHsv()
    }

    throw new ColorConversionError('unknown', 'hsv', 'Invalid input type')
  }

  // 轉換 RGB 到十六進制
  static rgbToHex(rgb: RGB): string {
    const r = rgb.r.toString(16).padStart(2, '0')
    const g = rgb.g.toString(16).padStart(2, '0')
    const b = rgb.b.toString(16).padStart(2, '0')

    return `#${r}${g}${b}`
  }

  // 轉換十六進制到 RGB
  static hexToRgb(hex: string): RGB {
    const cleaned = hex.replace('#', '')

    if (cleaned.length === 3) {
      const r = Number.parseInt(cleaned[0] + cleaned[0], 16)
      const g = Number.parseInt(cleaned[1] + cleaned[1], 16)
      const b = Number.parseInt(cleaned[2] + cleaned[2], 16)
      return { r, g, b }
    }

    const num = Number.parseInt(cleaned, 16)
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255

    return { r, g, b }
  }

  // 轉換 RGB 到 HSL
  static rgbToHsl(rgb: RGB): HSL {
    const r = rgb.r / 255
    const g = rgb.g / 255
    const b = rgb.b / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1))

      if (max === r) {
        h = 60 * (((g - b) / delta) % 6)
      } else if (max === g) {
        h = 60 * ((b - r) / delta + 2)
      } else {
        h = 60 * ((r - g) / delta + 4)
      }
    }

    h = h < 0 ? h + 360 : h

    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    }
  }

  // 轉換 HSL 到 RGB
  static hslToRgb(hsl: HSL): RGB {
    const h = hsl.h / 360
    const s = hsl.s / 100
    const l = hsl.l / 100

    let r = 0
    let g = 0
    let b = 0

    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        let t2 = t
        if (t2 < 0) {
          t2 += 1
        }
        if (t2 > 1) {
          t2 -= 1
        }
        if (t2 < 1 / 6) {
          return p + (q - p) * 6 * t2
        }
        if (t2 < 1 / 2) {
          return q
        }
        if (t2 < 2 / 3) {
          return p + (q - p) * (2 / 3 - t2) * 6
        }
        return p
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    }
  }

  // 轉換 RGB 到 HSV
  static rgbToHsv(rgb: RGB): HSV {
    const r = rgb.r / 255
    const g = rgb.g / 255
    const b = rgb.b / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min

    let h = 0
    const s = max === 0 ? 0 : delta / max
    const v = max

    if (delta !== 0) {
      if (max === r) {
        h = 60 * (((g - b) / delta) % 6)
      } else if (max === g) {
        h = 60 * ((b - r) / delta + 2)
      } else {
        h = 60 * ((r - g) / delta + 4)
      }
    }

    h = h < 0 ? h + 360 : h

    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      v: Math.round(v * 100),
    }
  }

  // 轉換 HSV 到 RGB
  static hsvToRgb(hsv: HSV): RGB {
    const h = hsv.h / 360
    const s = hsv.s / 100
    const v = hsv.v / 100

    let r = 0
    let g = 0
    let b = 0

    const i = Math.floor(h * 6)
    const f = h * 6 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)

    switch (i % 6) {
      case 0: {
        r = v
        g = t
        b = p
        break
      }

      case 1: {
        r = q
        g = v
        b = p
        break
      }

      case 2: {
        r = p
        g = v
        b = t
        break
      }

      case 3: {
        r = p
        g = q
        b = v
        break
      }

      case 4: {
        r = t
        g = p
        b = v
        break
      }

      default: {
        r = v
        g = p
        b = q
      }
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    }
  }

  // 使用 Bun.color() API 的超過採樣色彩（如果可用）
  static sample(hex: string): RGB {
    try {
      if (
        typeof Bun !== 'undefined' &&
        typeof (Bun as unknown as { color?: unknown }).color === 'function'
      ) {
        const colorFn = (Bun as unknown as { color: (hex: string) => unknown }).color
        const color = colorFn(hex)
        if (typeof color === 'number' && color) {
          return {
            r: (color >> 16) & 255,
            g: (color >> 8) & 255,
            b: color & 255,
          }
        }
      }
    } catch {
      // 降級回標準轉換
    }

    return this.hexToRgb(hex)
  }

  // 混合兩種色彩
  static mix(color1: string | ColorValue, color2: string | ColorValue, ratio: number): ColorValue {
    if (ratio < 0 || ratio > 1) {
      throw new ColorConversionError('mix', 'result', 'Ratio must be between 0-1')
    }

    const rgb1 = this.toRgb(color1)
    const rgb2 = this.toRgb(color2)

    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * ratio)
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * ratio)
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * ratio)

    return new ColorValue({ r, g, b })
  }

  // 獲取色彩轉換物件
  static createColorObject(input: string | ColorValue): ColorObject {
    const color = input instanceof ColorValue ? input : ColorParser.parse(input)

    return {
      space: ColorSpace.HEX,
      value: color.getHex(),
    }
  }
}
