import { describe, expect, it } from 'bun:test'
import { ColorValue } from '../../src/core/ColorValue'
import { InvalidColorValueError } from '../../src/core/errors'

describe('ColorValue', () => {
  describe('Constructor', () => {
    it('應該使用 hex 字串初始化', () => {
      const color = new ColorValue('#ff0000')
      expect(color.getHex()).toBe('#ff0000')
    })

    it('應該使用 RGB 物件初始化', () => {
      const color = new ColorValue({ r: 255, g: 0, b: 0 })
      expect(color.getHex()).toBe('#ff0000')
    })

    it('應該使用另一個 ColorValue 初始化', () => {
      const original = new ColorValue('#00ff00')
      const copy = new ColorValue(original)
      expect(copy.getHex()).toBe('#00ff00')
    })

    it('應該正規化 3 位數 hex 碼', () => {
      const color = new ColorValue('#f00')
      expect(color.getHex()).toBe('#ff0000')
    })

    it('應該不區分大小寫', () => {
      const color = new ColorValue('#FF00FF')
      expect(color.getHex()).toBe('#ff00ff')
    })

    it('應該接受 # 前綴或不帶前綴', () => {
      const color1 = new ColorValue('ff0000')
      const color2 = new ColorValue('#ff0000')
      expect(color1.getHex()).toBe(color2.getHex())
    })

    it('應該拒絕無效的 hex 格式', () => {
      expect(() => new ColorValue('#gg0000')).toThrow(InvalidColorValueError)
      expect(() => new ColorValue('#ff00')).toThrow(InvalidColorValueError)
      expect(() => new ColorValue('invalid')).toThrow(InvalidColorValueError)
    })

    it('應該驗證 RGB 值範圍', () => {
      expect(() => new ColorValue({ r: 256, g: 0, b: 0 })).toThrow(InvalidColorValueError)
      expect(() => new ColorValue({ r: -1, g: 0, b: 0 })).toThrow(InvalidColorValueError)
    })
  })

  describe('Getter 方法', () => {
    const color = new ColorValue('#ff6347')

    it('應該返回 hex 值', () => {
      expect(color.getHex()).toBe('#ff6347')
    })

    it('應該返回 RGB 物件', () => {
      const rgb = color.getRgb()
      expect(rgb.r).toBe(255)
      expect(rgb.g).toBe(99)
      expect(rgb.b).toBe(71)
    })

    it('應該返回 HSL 值', () => {
      const hsl = color.getHsl()
      expect(typeof hsl.h).toBe('number')
      expect(typeof hsl.s).toBe('number')
      expect(typeof hsl.l).toBe('number')
      expect(hsl.h).toBeGreaterThanOrEqual(0)
      expect(hsl.h).toBeLessThanOrEqual(360)
    })

    it('應該返回 HSV 值', () => {
      const hsv = color.getHsv()
      expect(typeof hsv.h).toBe('number')
      expect(typeof hsv.s).toBe('number')
      expect(typeof hsv.v).toBe('number')
    })

    it('應該預設返回 alpha 為 1', () => {
      expect(color.getAlpha()).toBe(1)
    })
  })

  describe('不可變性', () => {
    it('應該返回 RGB 的新複本', () => {
      const color = new ColorValue({ r: 255, g: 0, b: 0 })
      const rgb1 = color.getRgb()
      const rgb2 = color.getRgb()
      expect(rgb1).toEqual(rgb2)
      expect(rgb1).not.toBe(rgb2)
    })

    it('應該在修改複本後保持原值', () => {
      const color = new ColorValue({ r: 255, g: 0, b: 0 })
      const rgb = color.getRgb()
      rgb.r = 128
      expect(color.getRgb().r).toBe(255)
    })
  })

  describe('色彩操作', () => {
    it('withAlpha 應該建立新的 ColorValue', () => {
      const original = new ColorValue('#ff0000')
      const withAlpha = original.withAlpha(0.5)
      expect(withAlpha.getAlpha()).toBe(0.5)
      expect(original.getAlpha()).toBe(1)
    })

    it('withAlpha 應該驗證範圍', () => {
      const color = new ColorValue('#ff0000')
      expect(() => color.withAlpha(1.5)).toThrow(InvalidColorValueError)
      expect(() => color.withAlpha(-0.1)).toThrow(InvalidColorValueError)
    })

    it('lighten 應該增加亮度', () => {
      const color = new ColorValue('#808080')
      const lighter = color.lighten(10)
      const originalL = color.getHsl().l
      const lighterL = lighter.getHsl().l
      expect(lighterL).toBeGreaterThan(originalL)
    })

    it('darken 應該降低亮度', () => {
      const color = new ColorValue('#808080')
      const darker = color.darken(10)
      const originalL = color.getHsl().l
      const darkerL = darker.getHsl().l
      expect(darkerL).toBeLessThan(originalL)
    })

    it('saturate 應該增加飽和度', () => {
      const color = new ColorValue('#808080')
      const saturated = color.saturate(20)
      const originalS = color.getHsl().s
      const saturatedS = saturated.getHsl().s
      expect(saturatedS).toBeGreaterThanOrEqual(originalS)
    })

    it('desaturate 應該降低飽和度', () => {
      const color = new ColorValue('#ff0000')
      const desaturated = color.desaturate(20)
      const originalS = color.getHsl().s
      const desaturatedS = desaturated.getHsl().s
      expect(desaturatedS).toBeLessThan(originalS)
    })
  })

  describe('色彩計算', () => {
    it('contrastRatio 應該計算兩種色彩間的對比度', () => {
      const white = new ColorValue('#ffffff')
      const black = new ColorValue('#000000')
      const ratio = white.contrastRatio(black)
      expect(ratio).toBeGreaterThan(20)
    })

    it('相同色彩的對比度應該接近 1', () => {
      const color = new ColorValue('#808080')
      const ratio = color.contrastRatio(color)
      expect(ratio).toBeLessThanOrEqual(1.1)
    })
  })

  describe('序列化', () => {
    it('toString 應該返回 hex 值', () => {
      const color = new ColorValue('#ff0000')
      expect(color.toString()).toBe('#ff0000')
    })

    it('toJSON 應該返回完整的色彩資訊', () => {
      const color = new ColorValue('#ff0000')
      const json = color.toJSON()
      expect(json.hex).toBe('#ff0000')
      expect(json.rgb).toBeDefined()
      expect(json.hsl).toBeDefined()
      expect(json.hsv).toBeDefined()
      expect(json.alpha).toBe(1)
    })
  })

  describe('轉換準確性', () => {
    it('hex -> RGB -> hex 應該往返相同的值', () => {
      const original = '#ff6347'
      const color = new ColorValue(original)
      const rgb = color.getRgb()
      const converted = new ColorValue(rgb).getHex()
      expect(converted).toBe(original)
    })

    it('RGB -> HSL 轉換應該有效', () => {
      const rgb = { r: 255, g: 99, b: 71 }
      const color = new ColorValue(rgb)
      const hsl = color.getHsl()
      expect(hsl.h).toBeGreaterThanOrEqual(0)
      expect(hsl.h).toBeLessThanOrEqual(360)
      expect(hsl.s).toBeGreaterThanOrEqual(0)
      expect(hsl.s).toBeLessThanOrEqual(100)
      expect(hsl.l).toBeGreaterThanOrEqual(0)
      expect(hsl.l).toBeLessThanOrEqual(100)
    })
  })
})
