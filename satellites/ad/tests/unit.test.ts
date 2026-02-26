import { describe, expect, it } from 'bun:test'
import { AdServiceProvider } from '../src/index'

describe('Ad Satellite', () => {
  describe('Service Provider', () => {
    it('應該能成功初始化', () => {
      const provider = new AdServiceProvider()

      expect(provider).toBeDefined()
      expect(AdServiceProvider.name).toBe('AdServiceProvider')
    })

    it('應該有 register 方法', () => {
      const provider = new AdServiceProvider()

      expect(typeof provider.register).toBe('function')
    })

    it('應該有 boot 方法', () => {
      const provider = new AdServiceProvider()

      expect(typeof provider.boot).toBe('function')
    })
  })

  describe('Core', () => {
    it('應該能實例化無錯誤', async () => {
      const provider = new AdServiceProvider()

      // 驗證基本初始化
      const register = provider.register
      expect(register).toBeDefined()

      // boot 方法在 core 為 null 時應該返回
      expect(() => provider.boot()).not.toThrow()
    })
  })
})
