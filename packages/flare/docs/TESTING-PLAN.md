# 測試改善計劃

> **目標版本**: v3.2.0
> **預估工時**: 包含在各階段工時內

---

## 1. 測試覆蓋目標

### 1.1 覆蓋率目標

| 類型 | 現況 | 目標 |
|------|------|------|
| 語句覆蓋率 | ~65% | 80% |
| 分支覆蓋率 | ~55% | 75% |
| 函數覆蓋率 | ~70% | 85% |

### 1.2 測試執行命令

```bash
# 執行所有測試
bun test

# 執行並生成覆蓋率報告
bun test --coverage

# 執行特定測試檔案
bun test tests/error-handling.test.ts

# 監視模式
bun test --watch
```

---

## 2. 新增測試清單

### 2.1 P1 階段測試

| 測試檔案 | 測試內容 | 優先級 |
|----------|----------|--------|
| `tests/error-handling.test.ts` | 錯誤處理與結果返回 | P1 |
| `tests/serialization.test.ts` | 序列化工具函數 | P1 |

### 2.2 P2 階段測試

| 測試檔案 | 測試內容 | 優先級 |
|----------|----------|--------|
| `tests/hooks.test.ts` | 通知生命週期 Hook | P2 |
| `tests/parallel-send.test.ts` | 並行發送功能 | P2 |
| `tests/batch-send.test.ts` | 批次發送功能 | P2 |
| `tests/configuration.test.ts` | 配置驗證 | P2 |

### 2.3 P3 階段測試

| 測試檔案 | 測試內容 | 優先級 |
|----------|----------|--------|
| `tests/retry.test.ts` | 重試機制 | P3 |
| `tests/metrics.test.ts` | 指標收集 | P3 |
| `tests/aws-sns.test.ts` | AWS SNS SMS | P3 |

---

## 3. 測試範例

### 3.1 錯誤處理測試

```typescript
// tests/error-handling.test.ts
import { describe, expect, it, jest, beforeEach } from 'bun:test'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable } from '../src/types'

const notifiable: Notifiable = {
  getNotifiableId: () => '123',
  getNotifiableType: () => 'user',
}

const mockCore = {
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
  hooks: { emit: jest.fn(async () => {}) },
}

describe('NotificationManager error handling', () => {
  let manager: NotificationManager

  beforeEach(() => {
    manager = new NotificationManager(mockCore as any)
    jest.clearAllMocks()
  })

  describe('send() return value', () => {
    it('should return NotificationResult with all channel results', async () => {
      manager.channel('mail', { send: async () => {} })
      manager.channel('slack', { send: async () => {} })

      class TestNotification extends Notification {
        via() { return ['mail', 'slack'] }
        toMail() { return { subject: 'Test', to: 'test@example.com' } }
        toSlack() { return { text: 'Test' } }
      }

      const result = await manager.send(notifiable, new TestNotification())

      expect(result.notification).toBe('TestNotification')
      expect(result.notifiable).toBe('123')
      expect(result.results).toHaveLength(2)
      expect(result.allSuccess).toBe(true)
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should mark allSuccess as false when any channel fails', async () => {
      manager.channel('mail', { send: async () => {} })
      manager.channel('broken', { 
        send: async () => { throw new Error('Channel error') } 
      })

      class TestNotification extends Notification {
        via() { return ['mail', 'broken'] }
        toMail() { return { subject: 'Test', to: 'test@example.com' } }
      }

      const result = await manager.send(notifiable, new TestNotification())

      expect(result.allSuccess).toBe(false)
      expect(result.results[0].success).toBe(true)
      expect(result.results[1].success).toBe(false)
      expect(result.results[1].error).toBeDefined()
    })

    it('should include duration for each channel', async () => {
      manager.channel('slow', { 
        send: async () => { 
          await new Promise(r => setTimeout(r, 50)) 
        } 
      })

      class TestNotification extends Notification {
        via() { return ['slow'] }
      }

      const result = await manager.send(notifiable, new TestNotification())

      expect(result.results[0].duration).toBeGreaterThanOrEqual(50)
    })
  })

  describe('throwOnError option', () => {
    it('should throw AggregateError when throwOnError is true and channel fails', async () => {
      manager.channel('broken', { 
        send: async () => { throw new Error('fail') } 
      })

      class TestNotification extends Notification {
        via() { return ['broken'] }
      }

      await expect(
        manager.send(notifiable, new TestNotification(), { throwOnError: true })
      ).rejects.toBeInstanceOf(AggregateError)
    })

    it('should not throw when throwOnError is false', async () => {
      manager.channel('broken', { 
        send: async () => { throw new Error('fail') } 
      })

      class TestNotification extends Notification {
        via() { return ['broken'] }
      }

      const result = await manager.send(notifiable, new TestNotification(), { 
        throwOnError: false 
      })

      expect(result.allSuccess).toBe(false)
    })
  })

  describe('missing channel handling', () => {
    it('should return error result for missing channel', async () => {
      class TestNotification extends Notification {
        via() { return ['nonexistent'] }
      }

      const result = await manager.send(notifiable, new TestNotification())

      expect(result.allSuccess).toBe(false)
      expect(result.results[0].error?.message).toContain('not registered')
    })
  })
})
```

### 3.2 Hook 測試

```typescript
// tests/hooks.test.ts
import { describe, expect, it, jest, beforeEach } from 'bun:test'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable } from '../src/types'

describe('Notification Hooks', () => {
  let manager: NotificationManager
  let hookCalls: Array<{ name: string; payload: any }>

  const notifiable: Notifiable = {
    getNotifiableId: () => '123',
    getNotifiableType: () => 'user',
  }

  beforeEach(() => {
    hookCalls = []
    const mockCore = {
      logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
      hooks: { 
        emit: jest.fn(async (name: string, payload: any) => {
          hookCalls.push({ name, payload })
        }) 
      },
    }
    manager = new NotificationManager(mockCore as any)
  })

  it('should emit notification:sending before sending', async () => {
    manager.channel('mail', { send: async () => {} })

    class TestNotification extends Notification {
      via() { return ['mail'] }
      toMail() { return { subject: 'Test', to: 'test@example.com' } }
    }

    await manager.send(notifiable, new TestNotification())

    const sendingHook = hookCalls.find(h => h.name === 'notification:sending')
    expect(sendingHook).toBeDefined()
    expect(sendingHook?.payload.channels).toEqual(['mail'])
  })

  it('should emit notification:sent after all channels complete', async () => {
    manager.channel('mail', { send: async () => {} })
    manager.channel('slack', { send: async () => {} })

    class TestNotification extends Notification {
      via() { return ['mail', 'slack'] }
      toMail() { return { subject: 'Test', to: 'test@example.com' } }
      toSlack() { return { text: 'Test' } }
    }

    await manager.send(notifiable, new TestNotification())

    const sentHook = hookCalls.find(h => h.name === 'notification:sent')
    expect(sentHook).toBeDefined()
    expect(sentHook?.payload.allSuccess).toBe(true)
    expect(sentHook?.payload.results).toHaveLength(2)
  })

  it('should emit notification:channel:failed when channel fails', async () => {
    manager.channel('broken', { 
      send: async () => { throw new Error('Channel error') } 
    })

    class TestNotification extends Notification {
      via() { return ['broken'] }
    }

    await manager.send(notifiable, new TestNotification())

    const failedHook = hookCalls.find(h => h.name === 'notification:channel:failed')
    expect(failedHook).toBeDefined()
    expect(failedHook?.payload.channel).toBe('broken')
    expect(failedHook?.payload.error).toBeInstanceOf(Error)
  })

  it('should emit hooks in correct order', async () => {
    manager.channel('mail', { send: async () => {} })

    class TestNotification extends Notification {
      via() { return ['mail'] }
      toMail() { return { subject: 'Test', to: 'test@example.com' } }
    }

    await manager.send(notifiable, new TestNotification())

    const hookOrder = hookCalls.map(h => h.name)
    expect(hookOrder).toEqual([
      'notification:sending',
      'notification:channel:sending',
      'notification:channel:sent',
      'notification:sent'
    ])
  })
})
```

### 3.3 批次發送測試

```typescript
// tests/batch-send.test.ts
import { describe, expect, it, jest, beforeEach } from 'bun:test'
import { Notification } from '../src/Notification'
import { NotificationManager } from '../src/NotificationManager'
import type { Notifiable } from '../src/types'

describe('Batch Send', () => {
  let manager: NotificationManager
  let sendCount: number

  beforeEach(() => {
    sendCount = 0
    const mockCore = {
      logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
      hooks: { emit: jest.fn(async () => {}) },
    }
    manager = new NotificationManager(mockCore as any)
    manager.channel('mail', { 
      send: async () => { sendCount++ } 
    })
  })

  const createNotifiables = (count: number): Notifiable[] => {
    return Array.from({ length: count }, (_, i) => ({
      getNotifiableId: () => String(i + 1),
      getNotifiableType: () => 'user',
    }))
  }

  describe('sendBatch()', () => {
    it('should send to all notifiables', async () => {
      const notifiables = createNotifiables(5)

      class TestNotification extends Notification {
        via() { return ['mail'] }
        toMail() { return { subject: 'Test', to: 'test@example.com' } }
      }

      const result = await manager.sendBatch(notifiables, new TestNotification())

      expect(result.total).toBe(5)
      expect(result.success).toBe(5)
      expect(result.failed).toBe(0)
      expect(sendCount).toBe(5)
    })

    it('should respect batchConcurrency option', async () => {
      const notifiables = createNotifiables(10)
      const concurrentCalls: number[] = []
      let currentConcurrency = 0

      manager.channel('tracking', {
        send: async () => {
          currentConcurrency++
          concurrentCalls.push(currentConcurrency)
          await new Promise(r => setTimeout(r, 10))
          currentConcurrency--
        }
      })

      class TestNotification extends Notification {
        via() { return ['tracking'] }
      }

      await manager.sendBatch(notifiables, new TestNotification(), {
        batchConcurrency: 3
      })

      // 最大並發不應超過 3
      expect(Math.max(...concurrentCalls)).toBeLessThanOrEqual(3)
    })

    it('should return partial success results', async () => {
      const notifiables = createNotifiables(4)
      let callCount = 0

      manager.channel('flaky', {
        send: async () => {
          callCount++
          if (callCount % 2 === 0) {
            throw new Error('Flaky error')
          }
        }
      })

      class TestNotification extends Notification {
        via() { return ['flaky'] }
      }

      const result = await manager.sendBatch(notifiables, new TestNotification())

      expect(result.total).toBe(4)
      expect(result.success).toBe(2)
      expect(result.failed).toBe(2)
    })
  })

  describe('sendBatchStream()', () => {
    it('should yield results as they complete', async () => {
      const notifiables = createNotifiables(5)

      class TestNotification extends Notification {
        via() { return ['mail'] }
        toMail() { return { subject: 'Test', to: 'test@example.com' } }
      }

      const results: any[] = []
      for await (const result of manager.sendBatchStream(
        notifiables, 
        new TestNotification()
      )) {
        results.push(result)
      }

      expect(results).toHaveLength(5)
    })

    it('should work with async iterables', async () => {
      async function* generateNotifiables() {
        for (let i = 0; i < 3; i++) {
          yield {
            getNotifiableId: () => String(i + 1),
            getNotifiableType: () => 'user',
          }
        }
      }

      class TestNotification extends Notification {
        via() { return ['mail'] }
        toMail() { return { subject: 'Test', to: 'test@example.com' } }
      }

      const results: any[] = []
      for await (const result of manager.sendBatchStream(
        generateNotifiables(), 
        new TestNotification()
      )) {
        results.push(result)
      }

      expect(results).toHaveLength(3)
    })
  })
})
```

### 3.4 重試測試

```typescript
// tests/retry.test.ts
import { describe, expect, it, jest, beforeEach } from 'bun:test'
import { withRetry, isRetryableError } from '../src/utils/retry'

describe('Retry Utility', () => {
  describe('withRetry()', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success')

      const result = await withRetry(fn, { maxAttempts: 3 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      const result = await withRetry(fn, { 
        maxAttempts: 3, 
        baseDelay: 10 
      })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw after max attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('always fail'))

      await expect(
        withRetry(fn, { maxAttempts: 3, baseDelay: 10 })
      ).rejects.toThrow('always fail')

      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should respect shouldRetry predicate', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('non-retryable'))

      await expect(
        withRetry(fn, {
          maxAttempts: 3,
          baseDelay: 10,
          shouldRetry: () => false
        })
      ).rejects.toThrow('non-retryable')

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should call onRetry callback', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      const onRetry = jest.fn()

      await withRetry(fn, { 
        maxAttempts: 3, 
        baseDelay: 10,
        onRetry 
      })

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(Error),
        1,
        expect.any(Number)
      )
    })

    it('should apply exponential backoff', async () => {
      const delays: number[] = []
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')

      await withRetry(fn, {
        maxAttempts: 3,
        baseDelay: 100,
        backoff: 'exponential',
        maxDelay: 10000,
        onRetry: (_, __, delay) => delays.push(delay)
      })

      // 指數退避：~100ms, ~200ms（加上 jitter）
      expect(delays[0]).toBeGreaterThanOrEqual(100)
      expect(delays[0]).toBeLessThan(150) // 100 + 10% jitter
      expect(delays[1]).toBeGreaterThanOrEqual(200)
      expect(delays[1]).toBeLessThan(250)
    })
  })

  describe('isRetryableError()', () => {
    it('should return true for network errors', () => {
      expect(isRetryableError(new Error('network error'))).toBe(true)
      expect(isRetryableError(new Error('timeout'))).toBe(true)
    })

    it('should return true for rate limit errors', () => {
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true)
      expect(isRetryableError(new Error('too many requests'))).toBe(true)
    })

    it('should return false for other errors', () => {
      expect(isRetryableError(new Error('invalid input'))).toBe(false)
      expect(isRetryableError(new Error('not found'))).toBe(false)
    })
  })
})
```

---

## 4. 測試覆蓋率報告範例

```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   82.35 |   76.47  |   87.50 |   82.35 |
 Notification.ts |   100   |   100    |   100   |   100   |
 NotificationM.. |   85.71 |   80.00  |   90.00 |   85.71 | 45-48, 112
 OrbitFlare.ts   |   75.00 |   66.67  |   80.00 |   75.00 | 92-95, 140-142
 types.ts        |   100   |   100    |   100   |   100   |
 channels/       |   80.00 |   75.00  |   85.00 |   80.00 |
  MailChannel.ts |   100   |   100    |   100   |   100   |
  SlackChannel.ts|   90.00 |   85.00  |   100   |   90.00 | 42-43
  SmsChannel.ts  |   60.00 |   50.00  |   66.67 |   60.00 | 46-73, 79-82
-----------------|---------|----------|---------|---------|-------------------
```

---

## 5. CI 整合

### 5.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests
        run: bun test --coverage
        working-directory: packages/flare
      
      - name: Check coverage threshold
        run: |
          COVERAGE=$(bun test --coverage | grep "All files" | awk '{print $4}')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold 80%"
            exit 1
          fi
        working-directory: packages/flare
```

---

## 6. 測試最佳實踐

### 6.1 命名規範

```typescript
describe('ComponentName', () => {
  describe('methodName()', () => {
    it('should [expected behavior] when [condition]', () => {
      // ...
    })
  })
})
```

### 6.2 Mock 使用原則

- 優先使用 `jest.fn()` 創建 mock 函數
- 使用 `beforeEach` 重置 mock 狀態
- 避免 mock 過多，保持測試可讀性

### 6.3 異步測試

```typescript
// 使用 async/await
it('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toBe('expected')
})

// 測試 rejection
it('should reject with error', async () => {
  await expect(asyncFunction()).rejects.toThrow('error message')
})
```

---

**文檔版本**: 1.0
**最後更新**: 2025-01-23
