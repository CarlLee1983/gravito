import { describe, expect, it } from 'bun:test'
import { ColorConverter } from '../../src/core/ColorConverter'
import { ColorValue } from '../../src/core/ColorValue'

describe('ColorConverter', () => {
  describe('toRgb', () => {
    it('應該從 hex 轉換為 RGB', () => {
      const rgb = ColorConverter.toRgb('#ff0000')
      expect(rgb.r).toBe(255)
      expect(rgb.g).toBe(0)
      expect(rgb.b).toBe(0)
    })

    it('應該接受字串或 ColorValue', () => {
      const rgb1 = ColorConverter.toRgb('#00ff00')
      const rgb2 = ColorConverter.toRgb(new ColorValue('#00ff00'))
      expect(rgb1).toEqual(rgb2)
    })

    it('應該往返一致', () => {
      const original = { r: 128, g: 64, b: 32 }
      const color = new ColorValue(original)
      const rgb = ColorConverter.toRgb(color)
      expect(rgb).toEqual(original)
    })
  })

  describe('toHex', () => {
    it('應該從字串轉換為 hex', () => {
      const hex = ColorConverter.toHex('#ff0000')
      expect(hex).toBe('#ff0000')
    })

    it('應該接受字串或 ColorValue', () => {
      const hex1 = ColorConverter.toHex('#00ff00')
      const hex2 = ColorConverter.toHex(new ColorValue('#00ff00'))
      expect(hex1).toBe(hex2)
    })

    it('應該正規化 3 位數 hex 碼', () => {
      const hex = ColorConverter.toHex('#f00')
      expect(hex).toBe('#ff0000')
    })
  })

  describe('toHsl', () => {
    it('應該從字串轉換為 HSL', () => {
      const hsl = ColorConverter.toHsl('#ff0000')
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(100)
      expect(hsl.l).toBe(50)
    })

    it('應該從 ColorValue 轉換為 HSL', () => {
      const color = new ColorValue('#0000ff')
      const hsl = ColorConverter.toHsl(color)
      expect(hsl.h).toBe(240)
      expect(hsl.s).toBe(100)
      expect(hsl.l).toBe(50)
    })

    it('灰色應該有 0% 飽和度', () => {
      const color = new ColorValue({ r: 128, g: 128, b: 128 })
      const hsl = ColorConverter.toHsl(color)
      expect(hsl.s).toBe(0)
    })

    it('應該返回有效的 HSL 範圍', () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#804020']

      for (const colorStr of colors) {
        const hsl = ColorConverter.toHsl(colorStr)
        expect(hsl.h).toBeGreaterThanOrEqual(0)
        expect(hsl.h).toBeLessThanOrEqual(360)
        expect(hsl.s).toBeGreaterThanOrEqual(0)
        expect(hsl.s).toBeLessThanOrEqual(100)
        expect(hsl.l).toBeGreaterThanOrEqual(0)
        expect(hsl.l).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('toHsv', () => {
    it('應該從字串轉換為 HSV', () => {
      const hsv = ColorConverter.toHsv('#ff0000')
      expect(hsv.h).toBe(0)
      expect(hsv.s).toBe(100)
      expect(hsv.v).toBe(100)
    })

    it('應該返回有效的 HSV 範圍', () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#000000']

      for (const color of colors) {
        const hsv = ColorConverter.toHsv(color)
        expect(hsv.h).toBeGreaterThanOrEqual(0)
        expect(hsv.h).toBeLessThanOrEqual(360)
        expect(hsv.s).toBeGreaterThanOrEqual(0)
        expect(hsv.s).toBeLessThanOrEqual(100)
        expect(hsv.v).toBeGreaterThanOrEqual(0)
        expect(hsv.v).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('mix', () => {
    it('應該混合兩種顏色', () => {
      const mixed = ColorConverter.mix('#ff0000', '#0000ff', 0.5)
      const rgb = ColorConverter.toRgb(mixed)
      expect(rgb.r).toBe(128)
      expect(rgb.b).toBe(128)
      expect(rgb.g).toBe(0)
    })

    it('應該支援自訂混合比例', () => {
      const mix25 = ColorConverter.mix('#ff0000', '#0000ff', 0.25)
      const mix75 = ColorConverter.mix('#ff0000', '#0000ff', 0.75)

      const rgb25 = ColorConverter.toRgb(mix25)
      const rgb75 = ColorConverter.toRgb(mix75)

      expect(rgb25.r).toBeGreaterThan(rgb75.r)
      expect(rgb25.b).toBeLessThan(rgb75.b)
    })

    it('比例 0 應該返回第一種顏色', () => {
      const mixed = ColorConverter.mix('#ff0000', '#0000ff', 0)
      expect(mixed.getHex()).toBe('#ff0000')
    })

    it('比例 1 應該返回第二種顏色', () => {
      const mixed = ColorConverter.mix('#ff0000', '#0000ff', 1)
      expect(mixed.getHex()).toBe('#0000ff')
    })

    it('應該接受 ColorValue 或字串', () => {
      const color1 = ColorConverter.mix(new ColorValue('#ff0000'), '#0000ff', 0.5)
      const color2 = ColorConverter.mix('#ff0000', new ColorValue('#0000ff'), 0.5)
      const color3 = ColorConverter.mix(new ColorValue('#ff0000'), new ColorValue('#0000ff'), 0.5)

      expect(color1.getHex()).toBe(color2.getHex())
      expect(color2.getHex()).toBe(color3.getHex())
    })

    it('應該返回新的 ColorValue 實例', () => {
      const mixed1 = ColorConverter.mix('#ff0000', '#0000ff', 0.5)
      const mixed2 = ColorConverter.mix('#ff0000', '#0000ff', 0.5)

      expect(mixed1.getHex()).toBe(mixed2.getHex())
      expect(mixed1).not.toBe(mixed2)
    })
  })

  describe('轉換鏈', () => {
    it('Hex -> RGB -> ColorValue -> Hex 應該一致', () => {
      const original = '#ff6347'
      const rgb = ColorConverter.toRgb(original)
      const converted = ColorConverter.toHex(new ColorValue(rgb))
      expect(converted).toBe(original)
    })

    it('ColorValue -> HSL 轉換應該一致', () => {
      const color = new ColorValue('#ff6347')
      const hsl = ColorConverter.toHsl(color)
      const colorHsl = color.getHsl()
      expect(hsl).toEqual(colorHsl)
    })
  })
})
