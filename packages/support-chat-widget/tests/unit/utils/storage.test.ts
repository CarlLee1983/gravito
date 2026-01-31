import { beforeEach, describe, expect, it, vi } from 'vitest'
import { secureStorage } from '../../../src/utils/storage'
import { localStorageMock } from '../../setup'

describe('secureStorage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('get', () => {
    it('應該正確讀取儲存的值', () => {
      const testData = { foo: 'bar', num: 123 }
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          value: testData,
          timestamp: Date.now(),
        })
      )

      expect(secureStorage.get('test')).toEqual(testData)
    })

    it('讀取不存在的鍵應該回傳 null', () => {
      localStorageMock.getItem.mockReturnValue(null)
      expect(secureStorage.get('nonexistent')).toBeNull()
    })

    it('讀取無效的 JSON 應該回傳 null', () => {
      localStorageMock.getItem.mockReturnValue('invalid json{')
      expect(secureStorage.get('invalid')).toBeNull()
    })

    it('過期的項目應該回傳 null 並自動刪除', () => {
      vi.useFakeTimers()
      const timestamp = Date.now()

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          value: 'test',
          timestamp,
          expiry: 1000,
        })
      )

      // 前進 1001 毫秒
      vi.advanceTimersByTime(1001)

      expect(secureStorage.get('expiring')).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gravito_support_expiring')

      vi.useRealTimers()
    })

    it('未過期的項目應該正常回傳', () => {
      vi.useFakeTimers()
      const timestamp = Date.now()

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          value: 'test',
          timestamp,
          expiry: 1000,
        })
      )

      // 前進 500 毫秒（未過期）
      vi.advanceTimersByTime(500)

      expect(secureStorage.get('valid')).toBe('test')

      vi.useRealTimers()
    })
  })

  describe('set', () => {
    it('應該正確儲存值', () => {
      const testData = { foo: 'bar' }
      secureStorage.set('test', testData)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gravito_support_test',
        expect.any(String)
      )

      // 驗證儲存的資料結構
      const storedValue = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(storedValue).toEqual({
        value: testData,
        timestamp: expect.any(Number),
      })
    })

    it('應該設置過期時間', () => {
      secureStorage.set('test', 'value', { expiry: 5000 })

      const storedValue = JSON.parse(localStorageMock.setItem.mock.calls[0][1])
      expect(storedValue.expiry).toBe(5000)
    })

    it('應該處理複雜的資料類型', () => {
      const complexData = {
        str: 'string',
        num: 123,
        bool: true,
        arr: [1, 2, 3],
        nested: { a: 1, b: 2 },
      }

      secureStorage.set('complex', complexData)

      localStorageMock.getItem.mockReturnValue(localStorageMock.setItem.mock.calls[0][1])

      expect(secureStorage.get('complex')).toEqual(complexData)
    })
  })

  describe('remove', () => {
    it('應該刪除指定的鍵', () => {
      secureStorage.remove('test')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gravito_support_test')
    })
  })

  describe('clear', () => {
    it('應該清除所有 gravito_support_ 前綴的項目', () => {
      // Mock localStorage.length 和 localStorage.key
      Object.defineProperty(localStorageMock, 'length', { value: 5, writable: true })
      localStorageMock.key.mockImplementation((index: number) => {
        const keys = [
          'gravito_support_foo',
          'other_key',
          'gravito_support_bar',
          'gravito_support_baz',
          'another_key',
        ]
        return keys[index]
      })

      secureStorage.clear()

      // 應該只刪除 gravito_support_ 前綴的鍵
      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(3)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gravito_support_foo')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gravito_support_bar')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('gravito_support_baz')
    })
  })

  describe('錯誤處理', () => {
    it('當 localStorage 不可用時應該降級處理', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      // 不應該拋出錯誤
      expect(() => secureStorage.set('test', 'value')).not.toThrow()
    })

    it('當 localStorage.getItem 拋出錯誤時應該回傳 null', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(secureStorage.get('test')).toBeNull()
    })
  })
})
