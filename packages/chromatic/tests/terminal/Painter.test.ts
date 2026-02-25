import { describe, expect, it } from 'bun:test'
import { ColorValue } from '../../src/core/ColorValue'
import { Painter } from '../../src/terminal/Painter'

describe('Painter', () => {
  describe('靜態 Facade 方法', () => {
    it('reset 應該返回文本', () => {
      const result = Painter.reset('test')
      expect(typeof result).toBe('string')
    })

    it('bold 應該返回文本', () => {
      const result = Painter.bold('test')
      expect(typeof result).toBe('string')
    })

    it('dim 應該返回文本', () => {
      const result = Painter.dim('test')
      expect(typeof result).toBe('string')
    })

    it('italic 應該返回文本', () => {
      const result = Painter.italic('test')
      expect(typeof result).toBe('string')
    })

    it('underline 應該返回文本', () => {
      const result = Painter.underline('test')
      expect(typeof result).toBe('string')
    })

    it('inverse 應該返回文本', () => {
      const result = Painter.inverse('test')
      expect(typeof result).toBe('string')
    })

    it('hidden 應該返回文本', () => {
      const result = Painter.hidden('test')
      expect(typeof result).toBe('string')
    })

    it('strikethrough 應該返回文本', () => {
      const result = Painter.strikethrough('test')
      expect(typeof result).toBe('string')
    })
  })

  describe('前景色', () => {
    it('black 應該應用黑色', () => {
      const result = Painter.black('test')
      expect(result).toContain('test')
    })

    it('red 應該應用紅色', () => {
      const result = Painter.red('test')
      expect(result).toContain('test')
    })

    it('green 應該應用綠色', () => {
      const result = Painter.green('test')
      expect(result).toContain('test')
    })

    it('yellow 應該應用黃色', () => {
      const result = Painter.yellow('test')
      expect(result).toContain('test')
    })

    it('blue 應該應用藍色', () => {
      const result = Painter.blue('test')
      expect(result).toContain('test')
    })

    it('magenta 應該應用洋紅色', () => {
      const result = Painter.magenta('test')
      expect(result).toContain('test')
    })

    it('cyan 應該應用青色', () => {
      const result = Painter.cyan('test')
      expect(result).toContain('test')
    })

    it('white 應該應用白色', () => {
      const result = Painter.white('test')
      expect(result).toContain('test')
    })

    it('gray 應該應用灰色', () => {
      const result = Painter.gray('test')
      expect(result).toContain('test')
    })
  })

  describe('背景色', () => {
    it('bgBlack 應該應用黑色背景', () => {
      const result = Painter.bgBlack('test')
      expect(result).toContain('test')
    })

    it('bgRed 應該應用紅色背景', () => {
      const result = Painter.bgRed('test')
      expect(result).toContain('test')
    })

    it('bgGreen 應該應用綠色背景', () => {
      const result = Painter.bgGreen('test')
      expect(result).toContain('test')
    })

    it('bgYellow 應該應用黃色背景', () => {
      const result = Painter.bgYellow('test')
      expect(result).toContain('test')
    })

    it('bgBlue 應該應用藍色背景', () => {
      const result = Painter.bgBlue('test')
      expect(result).toContain('test')
    })

    it('bgMagenta 應該應用洋紅色背景', () => {
      const result = Painter.bgMagenta('test')
      expect(result).toContain('test')
    })

    it('bgCyan 應該應用青色背景', () => {
      const result = Painter.bgCyan('test')
      expect(result).toContain('test')
    })

    it('bgWhite 應該應用白色背景', () => {
      const result = Painter.bgWhite('test')
      expect(result).toContain('test')
    })
  })

  describe('style 方法', () => {
    it('應該支援樣式選項物件', () => {
      const result = Painter.style('test', { bold: true, fg: '#ff0000' })
      expect(result).toContain('test')
    })

    it('應該支援 reset 選項', () => {
      const result = Painter.style('test', { reset: true })
      expect(result).toBe('test')
    })

    it('應該支援多個修飾符', () => {
      const result = Painter.style('test', {
        bold: true,
        italic: true,
        underline: true,
      })
      expect(result).toContain('test')
    })
  })

  describe('customize 方法', () => {
    it('應該接受前景色', () => {
      const result = Painter.customize('test', '#ff0000')
      expect(result).toContain('test')
    })

    it('應該接受背景色', () => {
      const result = Painter.customize('test', undefined, '#0000ff')
      expect(result).toContain('test')
    })

    it('應該接受兩種顏色', () => {
      const result = Painter.customize('test', '#ff0000', '#0000ff')
      expect(result).toContain('test')
    })

    it('應該接受 ColorValue 物件', () => {
      const fg = new ColorValue('#ff0000')
      const bg = new ColorValue('#0000ff')
      const result = Painter.customize('test', fg, bg)
      expect(result).toContain('test')
    })

    it('應該接受字串和 ColorValue 的混合', () => {
      const result = Painter.customize('test', new ColorValue('#ff0000'), '#0000ff')
      expect(result).toContain('test')
    })
  })

  describe('create 方法', () => {
    it('應該返回 StyleBuilder 實例', () => {
      const builder = Painter.create('test')
      expect(builder).toBeDefined()
      expect(typeof builder.build).toBe('function')
    })

    it('應該支援無文本建立', () => {
      const builder = Painter.create()
      expect(builder).toBeDefined()
    })
  })

  describe('compose 方法', () => {
    it('應該組合多個樣式字符串', () => {
      const styled1 = Painter.red('Hello')
      const styled2 = Painter.blue(' World')
      const result = Painter.compose(styled1, styled2)
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })

    it('應該支援空陣列', () => {
      const result = Painter.compose()
      expect(result).toBe('')
    })
  })

  describe('終端能力檢測', () => {
    it('getCapabilities 應該返回能力物件', () => {
      const capabilities = Painter.getCapabilities()
      expect(typeof capabilities.hasColor).toBe('boolean')
      expect(typeof capabilities.depth).toBe('number')
      expect(typeof capabilities.colorSupport).toBe('string')
      expect(typeof capabilities.isCI).toBe('boolean')
      expect(typeof capabilities.isTTY).toBe('boolean')
      expect(typeof capabilities.supportsLinks).toBe('boolean')
    })
  })

  describe('stripColors 配置', () => {
    it('setStripColors 應該改變行為', () => {
      const original = Painter.bold('test')
      Painter.setStripColors(true)
      const stripped = Painter.bold('test')
      Painter.setStripColors(false)

      expect(typeof original).toBe('string')
      expect(typeof stripped).toBe('string')
    })
  })
})
