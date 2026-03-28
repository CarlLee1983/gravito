import { describe, test, expect } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { atlasResiliencePolicy } from '../../src/resilience'

describe('Atlas Resilience Contract Tests', () => {
  describe('atlasResiliencePolicy', () => {
    test('matches D-04 specification: retry.maxAttempts === 3', () => {
      expect(atlasResiliencePolicy.retry?.maxAttempts).toBe(3)
    })

    test('matches D-04 specification: retry.idempotent === true', () => {
      expect(atlasResiliencePolicy.retry?.idempotent).toBe(true)
    })

    test('matches D-04 specification: circuitBreaker.failureThreshold === 5', () => {
      const cb = atlasResiliencePolicy.circuitBreaker
      expect(typeof cb).toBe('object')
      expect((cb as { failureThreshold?: number }).failureThreshold).toBe(5)
    })

    test('matches D-04 specification: circuitBreaker.resetTimeout === 30_000', () => {
      const cb = atlasResiliencePolicy.circuitBreaker
      expect(typeof cb).toBe('object')
      expect((cb as { resetTimeout?: number }).resetTimeout).toBe(30_000)
    })

    test('matches D-04 specification: timeout === 5000', () => {
      expect(atlasResiliencePolicy.timeout).toBe(5000)
    })

    test('circuitBreaker has correct name for registry sharing', () => {
      const cb = atlasResiliencePolicy.circuitBreaker
      expect(typeof cb).toBe('object')
      expect((cb as { name: string }).name).toBe('atlas-db')
    })
  })

  describe('D-06 compliance: transactionWithRetry is not wrapped with external withRetry', () => {
    test('DB.ts transactionWithRetry does not contain withResilience call', () => {
      const dbSource = readFileSync(
        join(import.meta.dir, '../../src/DB.ts'),
        'utf-8'
      )

      // Find the transactionWithRetry method body
      const txWithRetryMatch = dbSource.match(
        /static async transactionWithRetry[\s\S]*?^  \}/m
      )

      // Verify withResilience does NOT appear in transactionWithRetry
      if (txWithRetryMatch) {
        expect(txWithRetryMatch[0]).not.toContain('withResilience')
        expect(txWithRetryMatch[0]).not.toContain('withRetry')
      }
      // Also check the full file does not mix them
      const hasTransactionWithRetry = dbSource.includes('transactionWithRetry')
      expect(hasTransactionWithRetry).toBe(true)
    })
  })

  describe('INTG-01: withResilience is wired at atlas connection level', () => {
    test('ConnectionManager.ts imports and uses withResilience', () => {
      const cmSource = readFileSync(
        join(import.meta.dir, '../../src/connection/ConnectionManager.ts'),
        'utf-8'
      )

      expect(cmSource).toContain("from '@gravito/resilience'")
      expect(cmSource).toContain('withResilience(')
    })

    test('atlasResiliencePolicy is imported in ConnectionManager.ts', () => {
      const cmSource = readFileSync(
        join(import.meta.dir, '../../src/connection/ConnectionManager.ts'),
        'utf-8'
      )

      expect(cmSource).toContain('atlasResiliencePolicy')
    })

    test('resilience.ts exports atlasResiliencePolicy', () => {
      const resSource = readFileSync(
        join(import.meta.dir, '../../src/resilience.ts'),
        'utf-8'
      )

      expect(resSource).toContain('atlasResiliencePolicy')
      expect(resSource).toContain("from '@gravito/resilience'")
    })
  })
})
