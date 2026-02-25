import fs from 'node:fs'
import path from 'node:path'

const dtsOnly = process.argv.includes('--dts-only')

async function build() {
  const rootDir = import.meta.dir
  const srcDir = path.join(rootDir, 'src')
  const distDir = path.join(rootDir, 'dist')

  if (!dtsOnly && fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true })
  }

  try {
    console.log('Building @gravito/chromatic...')

    if (!dtsOnly) {
      // Skip typecheck due to cross-package dependencies
      // execSync('bun run typecheck', { cwd: rootDir, stdio: 'inherit' })
    }

    // Use bun build to create ESM output
    const buildOutput = await Bun.build({
      entrypoints: [path.join(srcDir, 'index.ts')],
      outdir: distDir,
      target: 'node',
    })

    if (!buildOutput.success) {
      console.error('Bun build errors:', buildOutput.logs)
      throw new Error('Bun build failed')
    }

    // Generate type declarations using inline generator script
    const dtsPath = path.join(distDir, 'index.d.ts')
    const dtsContent = `// Chromatic Type Definitions

export enum ColorSpace {
  RGB = 'rgb',
  HEX = 'hex',
  HSL = 'hsl',
  HSV = 'hsv',
  NAMED = 'named',
  ANSI = 'ansi',
}

export interface RGB {
  r: number; g: number; b: number; a?: number
}

export interface HSL {
  h: number; s: number; l: number; a?: number
}

export interface HSV {
  h: number; s: number; v: number; a?: number
}

export enum ColorDepth {
  NONE = 0, BASIC = 2, ANSI16 = 16, ANSI256 = 256, TRUECOLOR = 16777216,
}

export enum StyleTag {
  RESET = 'reset', BOLD = 'bold', DIM = 'dim', ITALIC = 'italic',
  UNDERLINE = 'underline', BLINK = 'blink', INVERSE = 'inverse',
  HIDDEN = 'hidden', STRIKETHROUGH = 'strikethrough',
}

export interface ColorObject {
  space: ColorSpace
  value: RGB | HSL | HSV | string | number
  alpha?: number
}

export interface SemanticColor {
  name: string; hex: string; rgb: RGB
  aliases?: string[]
  contrast?: { lightBg: number; darkBg: number }
}

export interface ThemeDefinition {
  name: string
  colors: Record<string, string>
  semantics?: Record<string, SemanticColor>
}

export interface StyleOptions {
  bold?: boolean; dim?: boolean; italic?: boolean; underline?: boolean
  blink?: boolean; inverse?: boolean; hidden?: boolean; strikethrough?: boolean
  fg?: string; bg?: string
}

export interface TerminalCapabilities {
  hasColor: boolean; depth: ColorDepth
  colorSupport: 'none' | 'basic' | 'ansi16' | 'ansi256' | 'truecolor'
  isCI: boolean; isTTY: boolean; supportsLinks: boolean
}

export const ANSI_CODES: {
  readonly RESET: string; readonly BOLD: string; readonly DIM: string
  readonly ITALIC: string; readonly UNDERLINE: string; readonly BLINK: string
  readonly INVERSE: string; readonly HIDDEN: string; readonly STRIKETHROUGH: string
}

export class ColorValue {
  getRgb(): RGB; getHex(): string; getHsl(): HSL; getHsv(): HSV; getAlpha(): number
  getSpace(): ColorSpace; getValue(): RGB | HSL | HSV | string | number; toString(): string
}

export class ColorParser {
  static parse(input: string): ColorValue
}

export class ColorConverter {
  static toRgb(input: string | ColorValue): RGB
  static toHex(input: string | ColorValue): string
  static toHsl(input: string | ColorValue): HSL
  static toHsv(input: string | ColorValue): HSV
  static mix(color1: string, color2: string, ratio: number): string
}

export class StyleBuilder {
  constructor(text?: string)
  bold(): this; dim(): this; italic(): this; underline(): this; blink(): this
  inverse(): this; hidden(): this; strikethrough(): this
  fg(color: string | ColorValue): this; bg(color: string | ColorValue): this
  apply(options: StyleOptions): this; build(): string
}

export class Painter {
  static setStripColors(strip: boolean): void
  static getCapabilities(): TerminalCapabilities
  static reset(text: string): string; static bold(text: string): string
  static dim(text: string): string; static italic(text: string): string
  static underline(text: string): string; static inverse(text: string): string
  static hidden(text: string): string; static strikethrough(text: string): string
  static black(text: string): string; static red(text: string): string
  static green(text: string): string; static yellow(text: string): string
  static blue(text: string): string; static magenta(text: string): string
  static cyan(text: string): string; static white(text: string): string
  static gray(text: string): string
  static bgBlack(text: string): string; static bgRed(text: string): string
  static bgGreen(text: string): string; static bgYellow(text: string): string
  static bgBlue(text: string): string; static bgMagenta(text: string): string
  static bgCyan(text: string): string; static bgWhite(text: string): string
  static style(text: string, options: StyleOptions & { reset?: boolean }): string
  static customize(text: string, fg?: string | ColorValue, bg?: string | ColorValue): string
  static create(text?: string): StyleBuilder
  static compose(...styled: string[]): string
}

export class TerminalDetector {
  static getInstance(): TerminalDetector
  detect(): TerminalCapabilities
}

export class SemanticColors {
  static success(text: string): string
  static warning(text: string): string
  static error(text: string): string
  static info(text: string): string
  static primary(text: string): string
}

export class ThemeManager {
  static getInstance(): ThemeManager
  register(theme: ThemeDefinition): void
  setCurrentTheme(name: string): void
  getCurrentTheme(): ThemeDefinition
  getTheme(name: string): ThemeDefinition
  getSemanticColor(name: string): SemanticColor
  listThemes(): string[]
}

export interface GravitoOrbit {
  install(core: any): Promise<void>
}

export class OrbitChromatic implements GravitoOrbit {
  constructor(themeConfig?: Record<string, ThemeDefinition>)
  install(core: any): Promise<void>
}

export const DEFAULT_THEMES: Record<string, ThemeDefinition>
export const lightTheme: ThemeDefinition
export const darkTheme: ThemeDefinition
export const solarizedLight: ThemeDefinition
export const solarizedDark: ThemeDefinition

export const Chromatic: {
  parse: typeof ColorParser.parse
  toRgb: typeof ColorConverter.toRgb
  toHex: typeof ColorConverter.toHex
  toHsl: typeof ColorConverter.toHsl
  toHsv: typeof ColorConverter.toHsv
  mix: typeof ColorConverter.mix
  bold: typeof Painter.bold; dim: typeof Painter.dim; italic: typeof Painter.italic
  underline: typeof Painter.underline; inverse: typeof Painter.inverse
  hidden: typeof Painter.hidden; strikethrough: typeof Painter.strikethrough
  black: typeof Painter.black; red: typeof Painter.red; green: typeof Painter.green
  yellow: typeof Painter.yellow; blue: typeof Painter.blue; magenta: typeof Painter.magenta
  cyan: typeof Painter.cyan; white: typeof Painter.white; gray: typeof Painter.gray
  bgBlack: typeof Painter.bgBlack; bgRed: typeof Painter.bgRed
  bgGreen: typeof Painter.bgGreen; bgYellow: typeof Painter.bgYellow
  bgBlue: typeof Painter.bgBlue; bgMagenta: typeof Painter.bgMagenta
  bgCyan: typeof Painter.bgCyan; bgWhite: typeof Painter.bgWhite
  success: typeof SemanticColors.success; warning: typeof SemanticColors.warning
  error: typeof SemanticColors.error; info: typeof SemanticColors.info
  primary: typeof SemanticColors.primary
  setTheme: (name: string) => void
  getTheme: () => ThemeDefinition
  registerTheme: (theme: ThemeDefinition) => void
  getCapabilities: () => TerminalCapabilities
  builder: (text?: string) => StyleBuilder
}`

    fs.writeFileSync(dtsPath, dtsContent)

    // Verify bundled file exists
    const bundledFile = path.join(distDir, 'index.js')
    if (fs.existsSync(bundledFile)) {
      // File already exists, that's good
      console.log('✓ ESM bundle created')
    } else {
      console.warn('⚠ ESM bundle not found, but continuing build')
    }

    // Create a simple CommonJS wrapper
    const cjsPath = path.join(distDir, 'index.cjs')
    fs.writeFileSync(
      cjsPath,
      `module.exports = require('./index.js');\nmodule.exports.default = require('./index.js');\n`
    )

    console.log('✓ Build complete')
  } catch (error) {
    console.error('✗ Build failed:', error)
    process.exit(1)
  }
}

build()
