import { ColorValue } from './ColorValue'
import { InvalidColorFormatError, InvalidColorValueError } from './errors'
import type { RGB } from './types'
import { ColorSpace } from './types'

// CSS 命名色彩
const NAMED_COLORS: Record<string, string> = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  darkgreen: '#006400',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  grey: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  lightgreen: '#90ee90',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
}

// 色彩解析器
export class ColorParser {
  // 解析色彩字符串
  static parse(input: string): ColorValue {
    const trimmed = input.trim().toLowerCase()

    if (trimmed.startsWith('#')) {
      return new ColorValue(trimmed)
    }

    if (trimmed.startsWith('rgb')) {
      return this.parseRgb(trimmed)
    }

    if (trimmed.startsWith('hsl')) {
      return this.parseHsl(trimmed)
    }

    if (trimmed in NAMED_COLORS) {
      return new ColorValue(NAMED_COLORS[trimmed])
    }

    throw new InvalidColorFormatError(input, [
      'hex (#RGB, #RRGGBB)',
      'named (blue, red, etc)',
      'rgb(r, g, b)',
      'rgba(r, g, b, a)',
      'hsl(h, s%, l%)',
      'hsla(h, s%, l%, a)',
    ])
  }

  // 解析 RGB(A) 格式
  private static parseRgb(input: string): ColorValue {
    const match = input.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/)

    if (!match) {
      throw new InvalidColorValueError(input, 'Invalid rgb/rgba format')
    }

    const r = Number.parseInt(match[1], 10)
    const g = Number.parseInt(match[2], 10)
    const b = Number.parseInt(match[3], 10)

    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      throw new InvalidColorValueError(input, 'RGB values must be between 0-255')
    }

    const rgb: RGB = { r, g, b }
    const result = new ColorValue(rgb)

    if (match[4]) {
      const alpha = Number.parseFloat(match[4])
      if (alpha < 0 || alpha > 1) {
        throw new InvalidColorValueError(input, 'Alpha must be between 0-1')
      }

      return result.withAlpha(alpha)
    }

    return result
  }

  // 解析 HSL(A) 格式
  private static parseHsl(input: string): ColorValue {
    const match = input.match(
      /hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([\d.]+))?\s*\)/
    )

    if (!match) {
      throw new InvalidColorValueError(input, 'Invalid hsl/hsla format')
    }

    const h = Number.parseInt(match[1], 10)
    const s = Number.parseInt(match[2], 10)
    const l = Number.parseInt(match[3], 10)

    if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
      throw new InvalidColorValueError(
        input,
        'HSL values out of range (H: 0-360, S: 0-100, L: 0-100)'
      )
    }

    const result = this.hslToColorValue({ h, s, l })

    if (match[4]) {
      const alpha = Number.parseFloat(match[4])
      if (alpha < 0 || alpha > 1) {
        throw new InvalidColorValueError(input, 'Alpha must be between 0-1')
      }

      return result.withAlpha(alpha)
    }

    return result
  }

  // HSL 轉 ColorValue
  private static hslToColorValue(hsl: { h: number; s: number; l: number }): ColorValue {
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

    const rgb: RGB = {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    }

    return new ColorValue(rgb)
  }

  // 識別色彩格式
  static identify(input: string): ColorSpace {
    const trimmed = input.trim().toLowerCase()

    if (trimmed.startsWith('#')) {
      return ColorSpace.HEX
    }

    if (trimmed.startsWith('rgb')) {
      return ColorSpace.RGB
    }

    if (trimmed.startsWith('hsl')) {
      return ColorSpace.HSL
    }

    if (trimmed in NAMED_COLORS) {
      return ColorSpace.NAMED
    }

    return ColorSpace.RGB
  }

  // 列出所有命名色彩
  static getNamedColors(): Record<string, string> {
    return { ...NAMED_COLORS }
  }
}
