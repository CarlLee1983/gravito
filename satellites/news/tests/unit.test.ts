import { describe, expect, it } from 'bun:test'
import { NewsServiceProvider } from '../src/index'

describe('News Satellite', () => {
  describe('Service Provider', () => {
    it('應該能成功初始化', () => {
      const provider = new NewsServiceProvider()

      expect(provider).toBeDefined()
      expect(NewsServiceProvider.name).toBe('NewsServiceProvider')
    })

    it('應該有 register 方法', () => {
      const provider = new NewsServiceProvider()

      expect(typeof provider.register).toBe('function')
    })

    it('應該有 boot 方法', () => {
      const provider = new NewsServiceProvider()

      expect(typeof provider.boot).toBe('function')
    })
  })

  describe('Core', () => {
    it('應該能實例化無錯誤', async () => {
      const provider = new NewsServiceProvider()

      // 驗證基本初始化
      const register = provider.register
      expect(register).toBeDefined()

      // boot 方法在 core 為 null 時應該返回
      expect(() => provider.boot()).not.toThrow()
    })
  })
})
