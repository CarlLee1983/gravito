import type { ColorConfig, ColorizedResult, ShellColorScheme, ShellResult } from '../types'
import { DEFAULT_SHELL_COLORS, SYMBOLS } from './defaults'

/**
 * Formats shell command output with optional ANSI color codes.
 * Safely handles optional chromatic dependency through dynamic import.
 * @internal
 */
export class OutputFormatter {
  private _colorConfig: ColorConfig
  private _colorEnabled: boolean
  private _scheme: ShellColorScheme
  private _painter: any = null

  constructor(config?: ColorConfig) {
    this._colorConfig = config || { enabled: !process.env.NO_COLOR }
    this._scheme = this._colorConfig.scheme || DEFAULT_SHELL_COLORS
    this._colorEnabled = this._colorConfig.enabled ?? !process.env.NO_COLOR
  }

  /**
   * Format running/pending status with spinner indicator.
   */
  formatRunning(message: string): ColorizedResult {
    const symbol = this._shouldUseSymbols() ? SYMBOLS.running : '...'
    const label = `${symbol} ${message}`
    const color = this._scheme.running || DEFAULT_SHELL_COLORS.running

    return {
      formatted: this._colorEnabled ? this._colorize(label, color) : label,
      plain: label,
      hasColor: this._colorEnabled,
    }
  }

  /**
   * Format success status with checkmark.
   */
  formatSuccess(result: ShellResult): ColorizedResult {
    const symbol = this._shouldUseSymbols() ? SYMBOLS.success : '✓'
    const message = `${symbol} Success (exit code: ${result.exitCode})`
    const color = this._scheme.success || DEFAULT_SHELL_COLORS.success

    return {
      formatted: this._colorEnabled ? this._colorize(message, color) : message,
      plain: message,
      hasColor: this._colorEnabled,
    }
  }

  /**
   * Format error status with error symbol.
   */
  formatError(result: ShellResult): ColorizedResult {
    const symbol = this._shouldUseSymbols() ? SYMBOLS.error : '✗'
    const message = `${symbol} Error (exit code: ${result.exitCode})`
    const color = this._scheme.error || DEFAULT_SHELL_COLORS.error

    return {
      formatted: this._colorEnabled ? this._colorize(message, color) : message,
      plain: message,
      hasColor: this._colorEnabled,
    }
  }

  /**
   * Format stderr output with warning color.
   */
  formatStderr(stderr: string): ColorizedResult {
    const lines = stderr.split('\n')
    const stderrColor = this._scheme.stderr || DEFAULT_SHELL_COLORS.stderr

    const formatted = lines
      .map((line) => {
        if (!line.trim()) {
          return line
        }
        const prefix = `${SYMBOLS.pipe} `
        return this._colorEnabled ? prefix + this._colorize(line, stderrColor) : prefix + line
      })
      .join('\n')

    const plain = lines.map((line) => `${SYMBOLS.pipe} ${line}`).join('\n')

    return {
      formatted,
      plain,
      hasColor: this._colorEnabled,
    }
  }

  /**
   * Format complete shell command result with all components.
   */
  formatResult(result: ShellResult, command?: string, includeStdout?: boolean): ColorizedResult {
    const lines: string[] = []
    const labelColor = this._scheme.label || DEFAULT_SHELL_COLORS.label

    // Command label (if provided)
    if (command) {
      const cmdLabel = `${SYMBOLS.arrow} ${command}`
      const coloredCmd = this._colorEnabled ? this._colorize(cmdLabel, labelColor) : cmdLabel
      lines.push(coloredCmd)
    }

    // Status line
    if (result.success) {
      lines.push(this.formatSuccess(result).formatted)
    } else {
      lines.push(this.formatError(result).formatted)
    }

    // Stdout (if enabled and available)
    if (includeStdout && result.stdout) {
      lines.push('')
      lines.push('Output:')
      lines.push(result.stdout)
    }

    // Stderr (if available)
    if (result.stderr) {
      if (lines.length > 0) {
        lines.push('')
      }
      lines.push('Errors:')
      lines.push(this.formatStderr(result.stderr).formatted)
    }

    const formatted = lines.join('\n')
    const plain = this._stripColors(formatted)

    return {
      formatted,
      plain,
      hasColor: this._colorEnabled,
    }
  }

  /**
   * Apply color to text using chromatic if available, else use ANSI codes.
   */
  private _colorize(text: string, color?: string): string {
    if (!color) {
      return text
    }

    // If painter is already loaded, use it synchronously
    if (this._painter) {
      return this._painter.customize(text, color)
    }

    // Fallback to simple ANSI color codes
    return this._applyAnsiColor(text, color)
  }

  /**
   * Apply simple ANSI color codes based on hex color.
   * This is a basic fallback when chromatic is not available.
   */
  private _applyAnsiColor(text: string, hexColor: string): string {
    // Convert hex to RGB
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Use 256-color mode (fallback from true color)
    // For now, just use basic ANSI colors based on which component is dominant
    let ansiColor = 37 // Default to white

    if (r > g && r > b) {
      ansiColor = r > 128 ? 91 : 31 // Bright red or red
    } else if (g > r && g > b) {
      ansiColor = g > 128 ? 92 : 32 // Bright green or green
    } else if (b > r && b > g) {
      ansiColor = b > 128 ? 94 : 34 // Bright blue or blue
    } else if (r > 128 && g > 128 && b > 128) {
      ansiColor = 97 // Bright white
    } else if (r > 128 && g > 128) {
      ansiColor = 93 // Bright yellow
    }

    return `\x1b[${ansiColor}m${text}\x1b[0m`
  }

  /**
   * Strip ANSI color codes from text.
   */
  private _stripColors(text: string): string {
    const ESCAPE = String.fromCharCode(27)
    return text.replace(new RegExp(`${ESCAPE}\\[[0-9;]*m`, 'g'), '')
  }

  /**
   * Check if symbols should be used in output.
   */
  private _shouldUseSymbols(): boolean {
    return this._scheme.useSymbols !== false
  }
}
