/**
 * CircuitBreaker 單元測試
 *
 * 測試熔斷器的所有狀態轉換和行為
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { CircuitBreaker } from '../../../src/resilience/CircuitBreaker'
import type { CircuitBreakerState } from '../../../src/types'

/**
 * 等待指定的毫秒數
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('CircuitBreaker', () => {
  describe('建構與配置', () => {
    it('應該使用預設配置建立', () => {
      const breaker = new CircuitBreaker('test-service')
      expect(breaker.getName()).toBe('test-service')
      expect(breaker.getState()).toBe('CLOSED')
    })

    it('應該接受自訂配置', () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
        successThreshold: 1,
      })
      expect(breaker).toBeDefined()
    })
  })

  describe('CLOSED → OPEN 狀態轉換', () => {
    it('達到失敗閾值時應該開啟熔斷器', async () => {
      const onOpen = mock(() => {})
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

      expect(breaker.getState()).toBe('OPEN')
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

      expect(breaker.getState()).toBe('CLOSED')
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

      expect(breaker.getState()).toBe('CLOSED')
    })
  })

  describe('OPEN → HALF_OPEN 狀態轉換', () => {
    it('等待超時後應該轉換到 HALF_OPEN', async () => {
      const onHalfOpen = mock(() => {})
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        openTimeout: 100, // 100ms
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

      expect(breaker.getState()).toBe('OPEN')

      // 等待超時
      await sleep(150)

      // 嘗試執行（應該觸發 HALF_OPEN 檢查）
      try {
        await breaker.execute(async () => 'success')
      } catch {
        // 可能失敗
      }

      expect(breaker.getState()).toBe('HALF_OPEN')
      expect(onHalfOpen).toHaveBeenCalledWith('test-service')
    })

    it('OPEN 狀態下應該拋出錯誤', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        openTimeout: 10000, // 長時間不轉換
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
        'Circuit breaker is OPEN for test-service'
      )
    })
  })

  describe('HALF_OPEN → CLOSED 狀態轉換', () => {
    it('連續成功後應該關閉熔斷器', async () => {
      const onClose = mock(() => {})
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        successThreshold: 2,
        openTimeout: 100,
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

      expect(breaker.getState()).toBe('OPEN')

      // 等待轉換到 HALF_OPEN
      await sleep(150)

      // 2 次成功（達到 successThreshold）
      await breaker.execute(async () => 'success-1')
      await breaker.execute(async () => 'success-2')

      expect(breaker.getState()).toBe('CLOSED')
      expect(onClose).toHaveBeenCalledWith('test-service')
    })

    it('未達成功閾值時應該保持 HALF_OPEN', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        successThreshold: 3,
        openTimeout: 100,
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

      expect(breaker.getState()).toBe('HALF_OPEN')
    })
  })

  describe('HALF_OPEN → OPEN 狀態轉換', () => {
    it('HALF_OPEN 狀態下失敗應該重新開啟熔斷器', async () => {
      const breaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        openTimeout: 100,
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

      expect(breaker.getState()).toBe('OPEN')
    })
  })

  describe('時間窗口', () => {
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

      expect(breaker.getState()).toBe('CLOSED')
    })
  })

  describe('disabled 狀態', () => {
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
      expect(breaker.getState()).toBe('CLOSED')

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

      expect(breaker.getState()).toBe('OPEN')

      // 手動重置
      breaker.manualReset()

      expect(breaker.getState()).toBe('CLOSED')

      // 應該可以正常執行
      const result = await breaker.execute(async () => 'success')
      expect(result).toBe('success')
    })
  })

  describe('指標', () => {
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
      expect(metrics.state).toBe('CLOSED')
      expect(metrics.failures).toBe(0) // 成功後已重置
      expect(metrics.successes).toBe(1)
      expect(metrics.lastSuccessAt).toBeInstanceOf(Date)
      expect(metrics.lastFailureAt).toBeInstanceOf(Date)
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
      expect(metrics.state).toBe('OPEN')
      expect(metrics.openedAt).toBeInstanceOf(Date)
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
  })
})
