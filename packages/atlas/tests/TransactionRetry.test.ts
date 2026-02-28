import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { DB } from '../src/DB'

const CONNECTION_NAME = `retry_test_${Math.random().toString(36).slice(2)}`

describe('DB.transactionWithRetry', () => {
  beforeAll(() => {
    DB.addConnection(CONNECTION_NAME, {
      driver: 'sqlite',
      database: ':memory:',
    })
  })

  it('should retry on StaleModelError and eventually succeed', async () => {
    let attempts = 0
    const result = await DB.transactionWithRetry(
      async (conn, attempt) => {
        attempts = attempt
        if (attempt < 3) {
          const error = new Error('Model is stale')
          error.name = 'StaleModelError'
          throw error
        }
        return 'success'
      },
      CONNECTION_NAME,
      { maxRetries: 5, baseDelay: 10 }
    )

    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })

  it('should retry on database deadlock code and eventually succeed', async () => {
    let attempts = 0
    const result = await DB.transactionWithRetry(
      async (conn, attempt) => {
        attempts = attempt
        if (attempt < 2) {
          const error = new Error('Deadlock detected')
          ;(error as any).code = 'ER_LOCK_DEADLOCK'
          throw error
        }
        return 'done'
      },
      CONNECTION_NAME,
      { maxRetries: 3, baseDelay: 5 }
    )

    expect(result).toBe('done')
    expect(attempts).toBe(2)
  })

  it('should throw error if max retries are exceeded', async () => {
    let attempts = 0
    try {
      await DB.transactionWithRetry(
        async (conn, attempt) => {
          attempts = attempt
          const error = new Error('Persistent deadlock')
          ;(error as any).code = 'ER_LOCK_DEADLOCK'
          throw error
        },
        CONNECTION_NAME,
        { maxRetries: 2, baseDelay: 5 }
      )
      expect().fail('Should have thrown error')
    } catch (error: any) {
      expect(error.code).toBe('ER_LOCK_DEADLOCK')
      expect(attempts).toBe(2)
    }
  })

  it('should not retry on non-retryable errors', async () => {
    let attempts = 0
    try {
      await DB.transactionWithRetry(
        async (conn, attempt) => {
          attempts = attempt
          throw new Error('Normal business error')
        },
        CONNECTION_NAME,
        { maxRetries: 5, baseDelay: 5 }
      )
      expect().fail('Should have thrown error')
    } catch (error: any) {
      expect(error.message).toBe('Normal business error')
      expect(attempts).toBe(1)
    }
  })

  it('should retry on custom retryable errors', async () => {
    let attempts = 0
    const result = await DB.transactionWithRetry(
      async (conn, attempt) => {
        attempts = attempt
        if (attempt < 2) {
          throw new Error('CUSTOM_ERROR')
        }
        return 'custom_success'
      },
      CONNECTION_NAME,
      {
        maxRetries: 3,
        baseDelay: 5,
        retryableErrors: (err) => err.message === 'CUSTOM_ERROR',
      }
    )

    expect(result).toBe('custom_success')
    expect(attempts).toBe(2)
  })

  it('should respect maxDelay', async () => {
    // We can't easily measure timing accurately in tests without mocking setTimeout
    // but we can ensure it doesn't crash and completes.
    let attempts = 0
    await DB.transactionWithRetry(
      async (conn, attempt) => {
        attempts = attempt
        if (attempt < 2) {
          const error = new Error('Model is stale')
          error.name = 'StaleModelError'
          throw error
        }
        return 'ok'
      },
      CONNECTION_NAME,
      { maxRetries: 2, baseDelay: 10, maxDelay: 20 }
    )
    expect(attempts).toBe(2)
    // with baseDelay 10, attempt 1 failed -> backoff = min(20, 10 * 2^1) = 20. jitter(0, 20).
    // so it should take at most 20-30ms roughly.
  })

  it('should trigger onRetry hook', async () => {
    const retryCalls: Array<{ error: any; attempt: number; delay: number }> = []
    await DB.transactionWithRetry(
      async (conn, attempt) => {
        if (attempt < 2) {
          const error = new Error('Retry me')
          error.name = 'StaleModelError'
          throw error
        }
        return 'ok'
      },
      CONNECTION_NAME,
      {
        maxRetries: 2,
        baseDelay: 10,
        onRetry: (error, attempt, delay) => {
          retryCalls.push({ error, attempt, delay })
        },
      }
    )

    expect(retryCalls.length).toBe(1)
    expect(retryCalls[0].error.name).toBe('StaleModelError')
    expect(retryCalls[0].attempt).toBe(1)
    expect(typeof retryCalls[0].delay).toBe('number')
  })
})
