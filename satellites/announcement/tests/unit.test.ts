import { describe, expect, it } from 'bun:test'
import { AnnouncementServiceProvider } from '../src/index'

describe('Announcement Satellite', () => {
  describe('Service Provider', () => {
    it('應該能成功初始化', () => {
      const provider = new AnnouncementServiceProvider()

      expect(provider).toBeDefined()
      expect(AnnouncementServiceProvider.name).toBe('AnnouncementServiceProvider')
    })

    it('應該有 register 方法', () => {
      const provider = new AnnouncementServiceProvider()

      expect(typeof provider.register).toBe('function')
    })

    it('應該有 boot 方法', () => {
      const provider = new AnnouncementServiceProvider()

      expect(typeof provider.boot).toBe('function')
    })
  })

  describe('Core', () => {
    it('應該能實例化無錯誤', async () => {
      const provider = new AnnouncementServiceProvider()

      // 驗證基本初始化
      const register = provider.register
      expect(register).toBeDefined()

      // boot 方法在 core 為 null 時應該返回
      expect(() => provider.boot()).not.toThrow()
    })
  })
})
