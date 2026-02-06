/**
 * @gravito/core - CircuitBreaker Tests
 *
 * 測試熔斷器的所有功能與狀態轉換
 */

import { describe, expect, it, mock } from 'bun:test'
import { CircuitBreaker, CircuitBreakerState } from '../../src/events/CircuitBreaker'

/**
 * 等待指定的毫秒數
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('CircuitBreaker', () => {
  describe('建構與配置', () => {
    it('應該使用預設配置建立（匿名熔斷器）', () => {
      const breaker = new CircuitBreaker()
      expect(breaker.getName()).toBe('circuit-breaker')
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('應該使用命名建立', () => {
      const breaker = new CircuitBreaker('test-service')
      expect(breaker.getName()).toBe('test-service')
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('應該接受自訂配置', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 1,
      })
      expect(breaker).toBeDefined()
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('應該支持命名與自訂配置', () => {
      const breaker = new CircuitBreaker('my-service', {
        failureThreshold: 3,
        successThreshold: 1,
      })
      expect(breaker.getName()).toBe('my-service')
    })
  })

  describe('CLOSED → OPEN 狀態轉換', () => {
    it('達到失敗閾值時應該開啟熔斷器', async () => {
      const onOpen = mock(() => {
        /* Noop */
      })
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
        onOpen,
      })

      // 模擬 3 次失敗
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Service unavailable')
          })
        } catch {
          // 預期失敗
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
      expect(onOpen).toHaveBeenCalledWith('test-service')
    })

    it('未達閾值時應該保持 CLOSED', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 5,
      })

      // 模擬 3 次失敗（小於閾值 5）
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Service unavailable')
          })
        } catch {
          // 預期失敗
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })

    it('成功請求應該重置失敗計數', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
      })

      // 2 次失敗
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      // 1 次成功
      await breaker.execute(async () => 'success')

      // 再 2 次失敗（應該不會開啟，因為計數已重置）
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })
  })

  describe('OPEN → HALF_OPEN 狀態轉換', () => {
    it('等待超時後應該轉換到 HALF_OPEN', async () => {
      const onHalfOpen = mock(() => {
        /* Noop */
      })
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        resetTimeout: 100, // 100ms
        onHalfOpen,
      })

      // 達到失敗閾值，開啟熔斷器
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // 等待超時
      await sleep(150)

      // 嘗試執行（應該觸發 HALF_OPEN 檢查）
      try {
        await breaker.execute(async () => 'success')
      } catch {
        // 可能失敗
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)
      expect(onHalfOpen).toHaveBeenCalledWith('test-service')
    })

    it('OPEN 狀態下應該拋出錯誤', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        resetTimeout: 10000, // 長時間不轉換
      })

      // 開啟熔斷器
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      // 應該立即拋出錯誤
      await expect(breaker.execute(async () => 'should not execute')).rejects.toThrow(
        'Circuit is OPEN for test-service'
      )
    })
  })

  describe('HALF_OPEN → CLOSED 狀態轉換', () => {
    it('連續成功後應該關閉熔斷器', async () => {
      const onClose = mock(() => {
        /* Noop */
      })
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        successThreshold: 2,
        resetTimeout: 100,
        onClose,
      })

      // 開啟熔斷器
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // 等待轉換到 HALF_OPEN
      await sleep(150)

      // 2 次成功（達到 successThreshold）
      await breaker.execute(async () => 'success-1')
      await breaker.execute(async () => 'success-2')

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
      expect(onClose).toHaveBeenCalledWith('test-service')
    })

    it('未達成功閾值時應該保持 HALF_OPEN', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        successThreshold: 3,
        resetTimeout: 100,
      })

      // 開啟熔斷器
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      await sleep(150)

      // 只有 2 次成功（小於閾值 3）
      await breaker.execute(async () => 'success-1')
      await breaker.execute(async () => 'success-2')

      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN)
    })
  })

  describe('HALF_OPEN → OPEN 狀態轉換', () => {
    it('HALF_OPEN 狀態下失敗應該重新開啟熔斷器', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        resetTimeout: 100,
      })

      // 開啟熔斷器
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      await sleep(150)

      // HALF_OPEN 狀態下失敗
      try {
        await breaker.execute(async () => {
          throw new Error('Still failing')
        })
      } catch {
        // 預期失敗
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)
    })
  })

  describe('時間窗口 (Sliding Window)', () => {
    it('時間窗口過期後應該重置失敗計數', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
        windowSize: 100, // 100ms 窗口
      })

      // 2 次失敗
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      // 等待窗口過期
      await sleep(150)

      // 再 2 次失敗（應該不會開啟，因為之前的計數已過期）
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })
  })

  describe('啟用/停用', () => {
    it('當 disabled 時應該直接執行不使用熔斷', async () => {
      const breaker = new CircuitBreaker('test-service', {
        enabled: false,
        failureThreshold: 1,
      })

      // 多次失敗
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      // 應該仍然保持 CLOSED（因為 disabled）
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)

      // 應該仍然可以執行
      const result = await breaker.execute(async () => 'success')
      expect(result).toBe('success')
    })
  })

  describe('手動重置', () => {
    it('應該允許手動重置熔斷器', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
      })

      // 開啟熔斷器
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // 手動重置
      breaker.manualReset()

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)

      // 應該可以正常執行
      const result = await breaker.execute(async () => 'success')
      expect(result).toBe('success')
    })

    it('reset() 應該與 manualReset() 效果相同', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
      })

      // 開啟熔斷器
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN)

      // 使用 reset()
      breaker.reset()

      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })
  })

  describe('指標 (Metrics)', () => {
    it('應該提供準確的指標', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
      })

      // 2 次失敗，1 次成功
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      await breaker.execute(async () => 'success')

      const metrics = breaker.getMetrics()
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED)
      expect(metrics.failures).toBe(0) // 成功後已重置
      expect(metrics.successes).toBe(1)
      expect(metrics.lastSuccessAt).toBeInstanceOf(Date)
      expect(metrics.lastFailureAt).toBeInstanceOf(Date)
      expect(metrics.totalRequests).toBeGreaterThan(0)
      expect(metrics.totalFailures).toBeGreaterThan(0)
      expect(metrics.totalSuccesses).toBeGreaterThan(0)
    })

    it('OPEN 狀態應該記錄開啟時間', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
      })

      // 開啟熔斷器
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      const metrics = breaker.getMetrics()
      expect(metrics.state).toBe(CircuitBreakerState.OPEN)
      expect(metrics.openedAt).toBeInstanceOf(Date)
    })

    it('應該追蹤總請求、失敗和成功數', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 10, // 高閾值避免開啟
      })

      // 3 次失敗
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      // 2 次成功
      for (let i = 0; i < 2; i++) {
        await breaker.execute(async () => 'success')
      }

      const metrics = breaker.getMetrics()
      expect(metrics.totalRequests).toBe(5)
      expect(metrics.totalFailures).toBe(3)
      expect(metrics.totalSuccesses).toBe(2)
    })
  })

  describe('執行結果', () => {
    it('成功執行應該返回結果', async () => {
      const breaker = new CircuitBreaker('test-service')

      const result = await breaker.execute(async () => {
        return { data: 'test' }
      })

      expect(result).toEqual({ data: 'test' })
    })

    it('失敗執行應該拋出原始錯誤', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 10, // 高閾值避免開啟
      })

      await expect(
        breaker.execute(async () => {
          throw new Error('Custom error')
        })
      ).rejects.toThrow('Custom error')
    })

    it('應該支持返回不同類型的結果', async () => {
      const breaker = new CircuitBreaker('test-service')

      // 字串
      const str = await breaker.execute(async () => 'result')
      expect(str).toBe('result')

      // 數字
      const num = await breaker.execute(async () => 42)
      expect(num).toBe(42)

      // 物件
      const obj = await breaker.execute(async () => ({ key: 'value' }))
      expect(obj).toEqual({ key: 'value' })

      // 陣列
      const arr = await breaker.execute(async () => [1, 2, 3])
      expect(arr).toEqual([1, 2, 3])
    })
  })

  describe('向後相容性', () => {
    it('應該支持舊 API：getFailureCount()', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
      })

      // 2 次失敗
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Fail')
          })
        } catch {
          // 預期失敗
        }
      }

      const count = breaker.getFailureCount()
      expect(count).toBe(2)
    })

    it('應該支持舊風格的構造（僅配置）', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 40000,
        halfOpenRequests: 4,
      })

      expect(breaker).toBeDefined()
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED)
    })
  })
})
