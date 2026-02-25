// Chromatic 基礎錯誤類別
export class ChromaticError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'ChromaticError'
    Object.setPrototypeOf(this, ChromaticError.prototype)
  }
}

// 無效的色彩格式
export class InvalidColorFormatError extends ChromaticError {
  constructor(input: string, supportedFormats: string[]) {
    super(
      `Invalid color format: "${input}". Supported formats: ${supportedFormats.join(', ')}`,
      'ERR_INVALID_COLOR_FORMAT'
    )
    this.name = 'InvalidColorFormatError'
    Object.setPrototypeOf(this, InvalidColorFormatError.prototype)
  }
}

// 無效的色彩值
export class InvalidColorValueError extends ChromaticError {
  constructor(value: unknown, reason: string) {
    super(`Invalid color value: ${String(value)}. ${reason}`, 'ERR_INVALID_COLOR_VALUE')
    this.name = 'InvalidColorValueError'
    Object.setPrototypeOf(this, InvalidColorValueError.prototype)
  }
}

// 無效的主題
export class InvalidThemeError extends ChromaticError {
  constructor(themeName: string, reason: string) {
    super(`Invalid theme "${themeName}": ${reason}`, 'ERR_INVALID_THEME')
    this.name = 'InvalidThemeError'
    Object.setPrototypeOf(this, InvalidThemeError.prototype)
  }
}

// 主題不存在
export class ThemeNotFoundError extends ChromaticError {
  constructor(themeName: string) {
    super(`Theme not found: "${themeName}"`, 'ERR_THEME_NOT_FOUND')
    this.name = 'ThemeNotFoundError'
    Object.setPrototypeOf(this, ThemeNotFoundError.prototype)
  }
}

// 色彩轉換失敗
export class ColorConversionError extends ChromaticError {
  constructor(fromSpace: string, toSpace: string, reason: string) {
    super(
      `Failed to convert color from ${fromSpace} to ${toSpace}: ${reason}`,
      'ERR_COLOR_CONVERSION'
    )
    this.name = 'ColorConversionError'
    Object.setPrototypeOf(this, ColorConversionError.prototype)
  }
}

// 無效的樣式選項
export class InvalidStyleError extends ChromaticError {
  constructor(option: string, validOptions: string[]) {
    super(
      `Invalid style option: "${option}". Valid options: ${validOptions.join(', ')}`,
      'ERR_INVALID_STYLE'
    )
    this.name = 'InvalidStyleError'
    Object.setPrototypeOf(this, InvalidStyleError.prototype)
  }
}
