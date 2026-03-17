import { afterEach, describe, expect, it } from 'bun:test'
import { ColorDepth } from '../../src/core/types'
import { TerminalDetector } from '../../src/terminal/TerminalDetector'

describe('TerminalDetector', () => {
  afterEach(() => {
    delete process.env.NO_COLOR
    delete process.env.FORCE_COLOR
    TerminalDetector.getInstance().clearCache()
  })

  describe('getInstance', () => {
    it('應該返回單例', () => {
      const detector1 = TerminalDetector.getInstance()
      const detector2 = TerminalDetector.getInstance()
      expect(detector1).toBe(detector2)
    })
  })

  describe('detect', () => {
    it('應該返回有效的終端能力物件', () => {
      const capabilities = TerminalDetector.getInstance().detect()
      expect(typeof capabilities.hasColor).toBe('boolean')
      expect(typeof capabilities.depth).toBe('number')
      expect(typeof capabilities.colorSupport).toBe('string')
      expect(typeof capabilities.isCI).toBe('boolean')
      expect(typeof capabilities.isTTY).toBe('boolean')
      expect(typeof capabilities.supportsLinks).toBe('boolean')
    })

    it('應該有合理的色彩深度', () => {
      const capabilities = TerminalDetector.getInstance().detect()
      expect([
        ColorDepth.NONE,
        ColorDepth.BASIC,
        ColorDepth.ANSI16,
        ColorDepth.ANSI256,
        ColorDepth.TRUECOLOR,
      ]).toContain(capabilities.depth)
    })

    it('colorSupport 應該有有效的值', () => {
      const capabilities = TerminalDetector.getInstance().detect()
      expect(['none', 'basic', 'ansi16', 'ansi256', 'truecolor']).toContain(
        capabilities.colorSupport
      )
    })

    it('應該檢測環境變數', () => {
      const capabilities = TerminalDetector.getInstance().detect()
      expect(capabilities).toBeDefined()
      expect(typeof capabilities.depth).toBe('number')
    })

    it('應該讓 NO_COLOR 優先於 TTY/CI 色彩推斷', () => {
      process.env.NO_COLOR = '1'

      const detector = TerminalDetector.getInstance()
      const originalStdoutIsTTY = process.stdout.isTTY

      Object.defineProperty(process.stdout, 'isTTY', {
        configurable: true,
        value: true,
      })

      try {
        const capabilities = detector.detect()
        expect(capabilities.hasColor).toBe(false)
      } finally {
        Object.defineProperty(process.stdout, 'isTTY', {
          configurable: true,
          value: originalStdoutIsTTY,
        })
      }
    })
  })

  describe('clearCache', () => {
    it('應該清除快取', () => {
      const detector = TerminalDetector.getInstance()
      detector.detect()
      detector.clearCache()
      expect(detector).toBeDefined()
    })
  })
})
