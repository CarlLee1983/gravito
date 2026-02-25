import { describe, expect, it } from 'bun:test'
import { ColorValue } from '../../src/core/ColorValue'
import { StyleBuilder } from '../../src/terminal/StyleBuilder'

describe('StyleBuilder', () => {
  describe('Constructor', () => {
    it('應該使用文本初始化', () => {
      const builder = new StyleBuilder('hello')
      const result = builder.build()
      expect(result).toContain('hello')
    })

    it('應該支援無文本初始化', () => {
      const builder = new StyleBuilder()
      expect(builder).toBeDefined()
    })
  })

  describe('鏈式調用', () => {
    it('應該支援鏈式調用', () => {
      const result = new StyleBuilder('test').bold().italic().fg('#ff0000').build()
      expect(typeof result).toBe('string')
      expect(result).toContain('test')
    })

    it('鏈式調用應該同時作用於同一實例', () => {
      const builder = new StyleBuilder('test')
      builder.bold()
      const result = builder.italic().build()
      expect(result).toContain('\x1b[1m')
      expect(result).toContain('\x1b[3m')
    })
  })

  describe('文本修飾符', () => {
    it('bold 應該應用粗體', () => {
      const result = new StyleBuilder('test').bold().build()
      expect(result).toContain('\x1b[1m')
    })

    it('dim 應該應用暗淡', () => {
      const result = new StyleBuilder('test').dim().build()
      expect(result).toContain('\x1b[2m')
    })

    it('italic 應該應用斜體', () => {
      const result = new StyleBuilder('test').italic().build()
      expect(result).toContain('\x1b[3m')
    })

    it('underline 應該應用下劃線', () => {
      const result = new StyleBuilder('test').underline().build()
      expect(result).toContain('\x1b[4m')
    })

    it('inverse 應該應用反轉', () => {
      const result = new StyleBuilder('test').inverse().build()
      expect(result).toContain('\x1b[7m')
    })

    it('hidden 應該應用隱藏', () => {
      const result = new StyleBuilder('test').hidden().build()
      expect(result).toContain('\x1b[8m')
    })

    it('strikethrough 應該應用刪除線', () => {
      const result = new StyleBuilder('test').strikethrough().build()
      expect(result).toContain('\x1b[9m')
    })
  })

  describe('前景色', () => {
    it('應該設定前景色為 hex', () => {
      const result = new StyleBuilder('test').fg('#ff0000').build()
      expect(result).toContain('\x1b[')
      expect(result).toContain('test')
    })

    it('應該接受 ColorValue', () => {
      const color = new ColorValue('#00ff00')
      const result = new StyleBuilder('test').fg(color).build()
      expect(result).toContain('\x1b[')
      expect(result).toContain('test')
    })

    it('應該返回同一實例以支援鏈式調用', () => {
      const original = new StyleBuilder('test')
      const withFg = original.fg('#ff0000')

      expect(original).toBe(withFg)
    })
  })

  describe('背景色', () => {
    it('應該設定背景色為 hex', () => {
      const result = new StyleBuilder('test').bg('#0000ff').build()
      expect(result).toContain('\x1b[')
      expect(result).toContain('test')
    })

    it('應該接受 ColorValue', () => {
      const color = new ColorValue('#ffff00')
      const result = new StyleBuilder('test').bg(color).build()
      expect(result).toContain('\x1b[')
      expect(result).toContain('test')
    })

    it('應該返回同一實例以支援鏈式調用', () => {
      const original = new StyleBuilder('test')
      const withBg = original.bg('#0000ff')

      expect(original).toBe(withBg)
    })
  })

  describe('複合樣式', () => {
    it('應該組合多個修飾符', () => {
      const result = new StyleBuilder('test').bold().italic().underline().build()
      expect(result).toContain('\x1b[1m')
      expect(result).toContain('\x1b[3m')
      expect(result).toContain('\x1b[4m')
    })

    it('應該組合顏色和修飾符', () => {
      const result = new StyleBuilder('test').fg('#ff0000').bold().bg('#00ff00').build()
      expect(result).toContain('test')
    })
  })

  describe('reset', () => {
    it('應該終止樣式', () => {
      const result = new StyleBuilder('test').bold().build()
      expect(result).toContain('\x1b[0m')
    })
  })

  describe('apply 方法', () => {
    it('應該應用傳入的選項', () => {
      const result = new StyleBuilder('test')
        .apply({
          bold: true,
          fg: '#ff0000',
        })
        .build()
      expect(result).toContain('\x1b[1m')
      expect(result).toContain('test')
    })

    it('應該支援所有修飾符選項', () => {
      const result = new StyleBuilder('test')
        .apply({
          bold: true,
          dim: true,
          italic: true,
          underline: true,
          inverse: true,
          hidden: true,
          strikethrough: true,
        })
        .build()

      expect(result).toContain('\x1b[')
      expect(result).toContain('test')
    })
  })

  describe('setText', () => {
    it('應該設定文本內容', () => {
      const builder = new StyleBuilder('original')
      const updated = builder.setText('updated')
      const result = updated.build()
      expect(result).toContain('updated')
      expect(result).not.toContain('original')
    })

    it('應該返回同一實例以支援鏈式調用', () => {
      const original = new StyleBuilder('test')
      const updated = original.setText('new')

      expect(original).toBe(updated)
    })
  })
})
