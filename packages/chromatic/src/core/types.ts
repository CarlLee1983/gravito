// 色彩空間類型
export enum ColorSpace {
  RGB = 'rgb',
  HEX = 'hex',
  HSL = 'hsl',
  HSV = 'hsv',
  NAMED = 'named',
  ANSI = 'ansi',
}

// RGB 色彩值
export interface RGB {
  r: number
  g: number
  b: number
  a?: number
}

// HSL 色彩值
export interface HSL {
  h: number
  s: number
  l: number
  a?: number
}

// HSV 色彩值
export interface HSV {
  h: number
  s: number
  v: number
  a?: number
}

// 終端色彩深度級別
export enum ColorDepth {
  NONE = 0,
  BASIC = 2,
  ANSI16 = 16,
  ANSI256 = 256,
  TRUECOLOR = 16777216,
}

// 終端樣式標籤
export enum StyleTag {
  RESET = 'reset',
  BOLD = 'bold',
  DIM = 'dim',
  ITALIC = 'italic',
  UNDERLINE = 'underline',
  BLINK = 'blink',
  INVERSE = 'inverse',
  HIDDEN = 'hidden',
  STRIKETHROUGH = 'strikethrough',
}

// 色彩物件（解析後）
export interface ColorObject {
  space: ColorSpace
  value: RGB | HSL | HSV | string | number
  alpha?: number
}

// 語義色彩定義
export interface SemanticColor {
  name: string
  hex: string
  rgb: RGB
  aliases?: string[]
  contrast?: {
    lightBg: number
    darkBg: number
  }
}

// 主題定義
export interface ThemeDefinition {
  name: string
  colors: Record<string, string>
  semantics: Record<string, SemanticColor>
}

// 樣式選項
export interface StyleOptions {
  bold?: boolean
  dim?: boolean
  italic?: boolean
  underline?: boolean
  blink?: boolean
  inverse?: boolean
  hidden?: boolean
  strikethrough?: boolean
  fg?: string
  bg?: string
}

// ANSI 逃脫序列常數
export const ANSI_CODES = {
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  BLINK: '\x1b[5m',
  INVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m',
  STRIKETHROUGH: '\x1b[9m',
} as const

// 終端檢測結果
export interface TerminalCapabilities {
  hasColor: boolean
  depth: ColorDepth
  colorSupport: 'none' | 'basic' | 'ansi16' | 'ansi256' | 'truecolor'
  isCI: boolean
  isTTY: boolean
  supportsLinks: boolean
}
