import { describe, expect, it } from 'bun:test'
import { ColorParser } from '../../src/core/ColorParser'
import { InvalidColorFormatError } from '../../src/core/errors'

describe('ColorParser', () => {
  describe('parse 方法', () => {
    it('應該解析 hex 色彩', () => {
      const color = ColorParser.parse('#ff0000')
      expect(color.getHex()).toBe('#ff0000')
    })

    it('應該解析 CSS 命名色彩', () => {
      const color = ColorParser.parse('red')
      expect(color.getHex()).toBe('#ff0000')
    })

    it('應該解析 RGB 字串', () => {
      const color = ColorParser.parse('rgb(255, 0, 0)')
      const rgb = color.getRgb()
      expect(rgb.r).toBe(255)
      expect(rgb.g).toBe(0)
      expect(rgb.b).toBe(0)
    })

    it('應該解析 RGBA 字串', () => {
      const color = ColorParser.parse('rgba(255, 0, 0, 0.5)')
      expect(color.getAlpha()).toBe(0.5)
    })

    it('應該解析 HSL 字串', () => {
      const color = ColorParser.parse('hsl(0, 100%, 50%)')
      expect(color.getHex()).toBe('#ff0000')
    })

    it('應該解析 HSLA 字串', () => {
      const color = ColorParser.parse('hsla(0, 100%, 50%, 0.5)')
      expect(color.getAlpha()).toBe(0.5)
    })

    it('應該拒絕無效的格式', () => {
      expect(() => ColorParser.parse('invalid-color')).toThrow(InvalidColorFormatError)
    })

    it('應該接受 3 位數 hex 碼', () => {
      const color = ColorParser.parse('#f00')
      expect(color.getHex()).toBe('#ff0000')
    })

    it('應該不區分 CSS 命名色彩的大小寫', () => {
      const color1 = ColorParser.parse('Red')
      const color2 = ColorParser.parse('RED')
      const color3 = ColorParser.parse('red')
      expect(color1.getHex()).toBe(color2.getHex())
      expect(color2.getHex()).toBe(color3.getHex())
    })

    it('應該處理 RGB 中的空格變化', () => {
      const color1 = ColorParser.parse('rgb(255,0,0)')
      const color2 = ColorParser.parse('rgb( 255 , 0 , 0 )')
      expect(color1.getHex()).toBe(color2.getHex())
    })

    it('應該解析 RGB 值（限制在有效範圍）', () => {
      const color = ColorParser.parse('rgb(200, 50, 100)')
      const rgb = color.getRgb()
      expect(rgb.r).toBe(200)
      expect(rgb.g).toBe(50)
      expect(rgb.b).toBe(100)
    })

    it('應該解析 HSL 值（限制在有效百分比）', () => {
      const color = ColorParser.parse('hsl(180, 50%, 50%)')
      const hsl = color.getHsl()
      expect(hsl.h).toBeGreaterThanOrEqual(0)
      expect(hsl.s).toBeGreaterThanOrEqual(0)
      expect(hsl.l).toBeGreaterThanOrEqual(0)
    })
  })

  describe('常見色彩', () => {
    const colors = [
      { name: 'black', hex: '#000000' },
      { name: 'white', hex: '#ffffff' },
      { name: 'red', hex: '#ff0000' },
      { name: 'green', hex: '#008000' },
      { name: 'blue', hex: '#0000ff' },
      { name: 'yellow', hex: '#ffff00' },
      { name: 'cyan', hex: '#00ffff' },
      { name: 'magenta', hex: '#ff00ff' },
    ]

    for (const { name, hex } of colors) {
      it(`應該正確解析 ${name}`, () => {
        const color = ColorParser.parse(name)
        expect(color.getHex()).toBe(hex)
      })
    }
  })

  describe('Alpha 通道', () => {
    it('RGBA 應該正確設定 alpha', () => {
      const color = ColorParser.parse('rgba(255, 0, 0, 0.25)')
      expect(color.getAlpha()).toBe(0.25)
    })

    it('HSLA 應該正確設定 alpha', () => {
      const color = ColorParser.parse('hsla(0, 100%, 50%, 0.75)')
      expect(color.getAlpha()).toBe(0.75)
    })

    it('不含 alpha 的格式應該預設為 1', () => {
      const color = ColorParser.parse('#ff0000')
      expect(color.getAlpha()).toBe(1)
    })
  })
})
