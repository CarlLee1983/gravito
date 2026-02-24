import type { TerminalCapabilities } from '../core/types'
import { ColorDepth } from '../core/types'

// 終端色彩能力偵測器
export class TerminalDetector {
  private static instance: TerminalDetector
  private cached: TerminalCapabilities | null = null

  static getInstance(): TerminalDetector {
    if (!TerminalDetector.instance) {
      TerminalDetector.instance = new TerminalDetector()
    }

    return TerminalDetector.instance
  }

  // 偵測終端色彩能力
  detect(): TerminalCapabilities {
    if (this.cached) {
      return this.cached
    }

    const capabilities: TerminalCapabilities = {
      hasColor: this.hasColorSupport(),
      depth: this.detectColorDepth(),
      colorSupport: this.detectColorSupport(),
      isCI: this.isCI(),
      isTTY: this.isTTY(),
      supportsLinks: this.supportsLinks(),
    }

    this.cached = capabilities

    return capabilities
  }

  // 清除快取（用於測試）
  clearCache(): void {
    this.cached = null
  }

  // 檢查是否有色彩支援
  private hasColorSupport(): boolean {
    if (this.isCI() || this.isTTY()) {
      return true
    }

    if (typeof process !== 'undefined' && process.env) {
      const env = process.env
      if (env.NO_COLOR) {
        return false
      }
      if (env.FORCE_COLOR) {
        return true
      }
      if (env.COLORTERM === 'truecolor') {
        return true
      }
    }

    return false
  }

  // 偵測色彩深度
  private detectColorDepth(): ColorDepth {
    if (typeof process !== 'undefined' && process.env) {
      const env = process.env

      if (env.COLORTERM === 'truecolor') {
        return ColorDepth.TRUECOLOR
      }

      if (env.TERM?.includes('256color')) {
        return ColorDepth.ANSI256
      }

      if (
        env.TERM === 'screen' ||
        env.TERM === 'xterm' ||
        env.TERM === 'vt100' ||
        env.TERM === 'dumb'
      ) {
        return ColorDepth.ANSI16
      }
    }

    if (!this.hasColorSupport()) {
      return ColorDepth.NONE
    }

    return ColorDepth.ANSI256
  }

  // 偵測色彩支援等級
  private detectColorSupport(): 'none' | 'basic' | 'ansi16' | 'ansi256' | 'truecolor' {
    const depth = this.detectColorDepth()

    switch (depth) {
      case ColorDepth.TRUECOLOR:
        return 'truecolor'
      case ColorDepth.ANSI256:
        return 'ansi256'
      case ColorDepth.ANSI16:
        return 'ansi16'
      case ColorDepth.BASIC:
        return 'basic'
      default:
        return 'none'
    }
  }

  // 檢查是否在 CI 環境
  private isCI(): boolean {
    if (typeof process !== 'undefined' && process.env) {
      const env = process.env

      if (env.CI === 'true') {
        return true
      }
      if (env.GITHUB_ACTIONS === 'true') {
        return true
      }
      if (env.GITLAB_CI === 'true') {
        return true
      }
      if (env.CIRCLECI === 'true') {
        return true
      }
      if (env.TRAVIS === 'true') {
        return true
      }
      if (env.BUILDKITE === 'true') {
        return true
      }
      if (env.DRONE === 'true') {
        return true
      }
      if (env.APPVEYOR === 'true') {
        return true
      }
    }

    return false
  }

  // 檢查是否為 TTY
  private isTTY(): boolean {
    try {
      if (typeof process !== 'undefined' && process.stdout && process.stderr) {
        return !!(process.stdout.isTTY || process.stderr.isTTY)
      }
    } catch {
      // 忽略錯誤
    }

    return false
  }

  // 檢查是否支援連結
  private supportsLinks(): boolean {
    if (typeof process !== 'undefined' && process.env) {
      const env = process.env

      if (env.VTE_VERSION) {
        return true
      }
      if (env.ITERM_SESSION_ID) {
        return true
      }
      if (env.TERM_PROGRAM === 'iTerm.app') {
        return true
      }
      if (env.TERM_PROGRAM === 'Apple_Terminal') {
        return true
      }
      if (env.TERM_PROGRAM === 'WezTerm') {
        return true
      }
      if (env.TERM_PROGRAM === 'kitty') {
        return true
      }
    }

    return false
  }
}
