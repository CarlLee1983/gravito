import { InvalidColorValueError } from './errors'
import type { HSL, HSV, RGB } from './types'

// 不可變色彩值物件
export class ColorValue {
  private readonly hex: string
  private readonly rgb: RGB
  private readonly alpha: number

  constructor(input: string | RGB | ColorValue) {
    if (input instanceof ColorValue) {
      this.hex = input.hex
      this.rgb = { ...input.rgb }
      this.alpha = input.alpha
    } else if (typeof input === 'string') {
      const normalized = this.normalizeHex(input)
      this.hex = normalized
      this.rgb = this.hexToRgb(normalized)
      this.alpha = 1
    } else if (typeof input === 'object' && input !== null) {
      const validRgb = this.validateRgb(input)
      this.rgb = validRgb
      this.hex = this.rgbToHex(validRgb)
      this.alpha = input.a ?? 1
    } else {
      throw new InvalidColorValueError(input, 'Expected string, RGB object, or ColorValue instance')
    }
  }

  private normalizeHex(hex: string): string {
    const cleaned = hex.replace(/^#/, '').toLowerCase()

    if (cleaned.length === 3) {
      return `#${cleaned[0]}${cleaned[0]}${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}`
    }

    if (cleaned.length === 6 && /^[0-9a-f]{6}$/.test(cleaned)) {
      return `#${cleaned}`
    }

    throw new InvalidColorValueError(hex, 'Expected hex format: #RGB or #RRGGBB')
  }

  private validateRgb(rgb: RGB): RGB {
    const { r, g, b } = rgb

    if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
      throw new InvalidColorValueError(rgb, 'RGB values must be numbers')
    }

    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      throw new InvalidColorValueError(rgb, 'RGB values must be between 0-255')
    }

    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) }
  }

  private hexToRgb(hex: string): RGB {
    const cleaned = hex.replace('#', '')
    const num = Number.parseInt(cleaned, 16)
    const r = (num >> 16) & 255
    const g = (num >> 8) & 255
    const b = num & 255

    return { r, g, b }
  }

  private rgbToHex(rgb: RGB): string {
    const r = rgb.r.toString(16).padStart(2, '0')
    const g = rgb.g.toString(16).padStart(2, '0')
    const b = rgb.b.toString(16).padStart(2, '0')

    return `#${r}${g}${b}`
  }

  // 獲取十六進制值
  getHex(): string {
    return this.hex
  }

  // 獲取 RGB 值
  getRgb(): RGB {
    return { ...this.rgb }
  }

  // 獲取 HSL 值
  getHsl(): HSL {
    const r = this.rgb.r / 255
    const g = this.rgb.g / 255
    const b = this.rgb.b / 255

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

  // 獲取 HSV 值
  getHsv(): HSV {
    const r = this.rgb.r / 255
    const g = this.rgb.g / 255
    const b = this.rgb.b / 255

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

  // 獲取 Alpha 值
  getAlpha(): number {
    return this.alpha
  }

  // 建立新的色彩，帶有不同的 alpha 值
  withAlpha(alpha: number): ColorValue {
    if (alpha < 0 || alpha > 1) {
      throw new InvalidColorValueError(alpha, 'Alpha must be between 0-1')
    }

    const result = new ColorValue(this.hex)
    return Object.defineProperty(result, 'alpha', {
      value: alpha,
      writable: false,
    })
  }

  // 變亮（降低飽和度，提高亮度）
  lighten(percent: number): ColorValue {
    const hsl = this.getHsl()
    const newL = Math.min(100, hsl.l + percent)

    return this.hslToColorValue({ ...hsl, l: newL })
  }

  // 變暗（提高飽和度，降低亮度）
  darken(percent: number): ColorValue {
    const hsl = this.getHsl()
    const newL = Math.max(0, hsl.l - percent)

    return this.hslToColorValue({ ...hsl, l: newL })
  }

  // 增加飽和度
  saturate(percent: number): ColorValue {
    const hsl = this.getHsl()
    const newS = Math.min(100, hsl.s + percent)

    return this.hslToColorValue({ ...hsl, s: newS })
  }

  // 降低飽和度
  desaturate(percent: number): ColorValue {
    const hsl = this.getHsl()
    const newS = Math.max(0, hsl.s - percent)

    return this.hslToColorValue({ ...hsl, s: newS })
  }

  private hslToColorValue(hsl: HSL): ColorValue {
    const rgb = this.hslToRgb(hsl)

    return new ColorValue(rgb)
  }

  private hslToRgb(hsl: HSL): RGB {
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

  // 計算對比度（相對於另一種色彩）
  contrastRatio(other: ColorValue): number {
    const lum1 = this.getLuminance()
    const lum2 = other.getLuminance()

    const lighter = Math.max(lum1, lum2)
    const darker = Math.min(lum1, lum2)

    return (lighter + 0.05) / (darker + 0.05)
  }

  private getLuminance(): number {
    const rgb = this.getRgb()
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      const normalized = val / 255
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  // 序列化為字符串
  toString(): string {
    return this.hex
  }

  // 序列化為 JSON
  toJSON(): Record<string, unknown> {
    return {
      hex: this.hex,
      rgb: this.rgb,
      hsl: this.getHsl(),
      hsv: this.getHsv(),
      alpha: this.alpha,
    }
  }
}
