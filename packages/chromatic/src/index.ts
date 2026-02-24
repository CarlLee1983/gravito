// Core types

export { ColorConverter } from './core/ColorConverter'
export { ColorParser } from './core/ColorParser'
// Core: Color utilities
export { ColorValue } from './core/ColorValue'
// Core errors
export {
  ChromaticError,
  ColorConversionError,
  InvalidColorFormatError,
  InvalidColorValueError,
  InvalidStyleError,
  InvalidThemeError,
  ThemeNotFoundError,
} from './core/errors'
export type {
  ColorObject,
  HSL,
  HSV,
  RGB,
  SemanticColor,
  StyleOptions,
  TerminalCapabilities,
  ThemeDefinition,
} from './core/types'
export {
  ANSI_CODES,
  ColorDepth,
  ColorSpace,
  StyleTag,
} from './core/types'
// PlanetCore integration
export { OrbitChromatic } from './orbit/OrbitChromatic'
export { Painter } from './terminal/Painter'
export { StyleBuilder } from './terminal/StyleBuilder'
// Terminal: Color output
export { TerminalDetector } from './terminal/TerminalDetector'
export {
  DEFAULT_THEMES,
  darkTheme,
  lightTheme,
  solarizedDark,
  solarizedLight,
} from './theme/defaultTheme'
export { SemanticColors } from './theme/SemanticColors'
// Theme: Color theming
export { ThemeManager } from './theme/ThemeManager'

import { ColorConverter } from './core/ColorConverter'
import { ColorParser } from './core/ColorParser'
// 導入所有模組以構建 Chromatic Facade
import type { ThemeDefinition } from './core/types'
import { Painter } from './terminal/Painter'
import { StyleBuilder } from './terminal/StyleBuilder'
import { TerminalDetector } from './terminal/TerminalDetector'
import { SemanticColors } from './theme/SemanticColors'
import { ThemeManager } from './theme/ThemeManager'

// Convenience exports (re-exports for easy access)
export const Chromatic = {
  // Color conversion
  parse: ColorParser.parse.bind(ColorParser),
  toRgb: ColorConverter.toRgb.bind(ColorConverter),
  toHex: ColorConverter.toHex.bind(ColorConverter),
  toHsl: ColorConverter.toHsl.bind(ColorConverter),
  toHsv: ColorConverter.toHsv.bind(ColorConverter),
  mix: ColorConverter.mix.bind(ColorConverter),

  // Terminal styling (picocolors API)
  bold: Painter.bold.bind(Painter),
  dim: Painter.dim.bind(Painter),
  italic: Painter.italic.bind(Painter),
  underline: Painter.underline.bind(Painter),
  inverse: Painter.inverse.bind(Painter),
  hidden: Painter.hidden.bind(Painter),
  strikethrough: Painter.strikethrough.bind(Painter),

  // Colors
  black: Painter.black.bind(Painter),
  red: Painter.red.bind(Painter),
  green: Painter.green.bind(Painter),
  yellow: Painter.yellow.bind(Painter),
  blue: Painter.blue.bind(Painter),
  magenta: Painter.magenta.bind(Painter),
  cyan: Painter.cyan.bind(Painter),
  white: Painter.white.bind(Painter),
  gray: Painter.gray.bind(Painter),

  // Background colors
  bgBlack: Painter.bgBlack.bind(Painter),
  bgRed: Painter.bgRed.bind(Painter),
  bgGreen: Painter.bgGreen.bind(Painter),
  bgYellow: Painter.bgYellow.bind(Painter),
  bgBlue: Painter.bgBlue.bind(Painter),
  bgMagenta: Painter.bgMagenta.bind(Painter),
  bgCyan: Painter.bgCyan.bind(Painter),
  bgWhite: Painter.bgWhite.bind(Painter),

  // Semantic colors
  success: SemanticColors.success.bind(SemanticColors),
  warning: SemanticColors.warning.bind(SemanticColors),
  error: SemanticColors.error.bind(SemanticColors),
  info: SemanticColors.info.bind(SemanticColors),
  primary: SemanticColors.primary.bind(SemanticColors),

  // Theme management
  setTheme: (name: string) => ThemeManager.getInstance().setCurrentTheme(name),
  getTheme: () => ThemeManager.getInstance().getCurrentTheme(),
  registerTheme: (theme: ThemeDefinition) => ThemeManager.getInstance().register(theme),

  // Terminal detection
  getCapabilities: () => TerminalDetector.getInstance().detect(),

  // Builder
  builder: (text?: string) => new StyleBuilder(text),
} as const
