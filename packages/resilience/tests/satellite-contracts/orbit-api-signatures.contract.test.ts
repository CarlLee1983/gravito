import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

// ─────────────────────────────────────────────────────────────────────────────
// Satellite API signature contract tests
//
// These tests verify that Orbit public APIs consumed by Satellites have not
// regressed after the Phase 16-19 error model migration.
//
// Strategy: source-scanning (NOT runtime instantiation) — we read the actual
// source files and verify method signatures and exports are still present.
// This is intentional: these tests must pass without a running DB or Redis
// connection, and they verify the compile-time API surface.
//
// Per D-10: Contract tests must run in isolation without external services.
// ─────────────────────────────────────────────────────────────────────────────

// Resolve source paths relative to this test file's location
const PACKAGES_DIR = join(import.meta.dir, '../../../')

describe('Satellite API compat: @gravito/atlas', () => {
  const atlasDBSrc = readFileSync(join(PACKAGES_DIR, 'atlas/src/DB.ts'), 'utf-8')

  it('exports DB.transaction static method', () => {
    // Satellites call DB.transaction(callback) for standard transactions
    expect(atlasDBSrc).toContain('static async transaction<T>(')
  })

  it('exports DB.transactionWithRetry static method', () => {
    // Satellites call DB.transactionWithRetry for optimistic-locking retry
    expect(atlasDBSrc).toContain('static async transactionWithRetry<T>(')
  })
})

describe('Satellite API compat: @gravito/plasma', () => {
  const plasmaClientSrc = readFileSync(
    join(PACKAGES_DIR, 'plasma/src/clients/BunRedisClient.ts'),
    'utf-8'
  )

  it('exports get(key) method', () => {
    // Satellites call client.get(key) for cache reads
    expect(plasmaClientSrc).toContain('async get(key: string)')
  })

  it('exports set(key, value) method', () => {
    // Satellites call client.set(key, value) for cache writes
    expect(plasmaClientSrc).toContain('async set(key: string, value: string')
  })

  it('exports del(...keys) method', () => {
    // Satellites call client.del(key) for cache invalidation
    expect(plasmaClientSrc).toContain('async del(')
  })
})

describe('Satellite API compat: @gravito/signal', () => {
  const signalBarrelSrc = readFileSync(join(PACKAGES_DIR, 'signal/src/index.ts'), 'utf-8')

  it('exports OrbitSignal (mail service entry point)', () => {
    // Satellites use OrbitSignal to send transactional emails
    expect(signalBarrelSrc).toContain('OrbitSignal')
  })

  it('exports Mailable class', () => {
    // Satellites extend Mailable for typed email messages
    expect(signalBarrelSrc).toContain("export { Mailable }")
  })
})

describe('Satellite API compat: @gravito/resilience', () => {
  const resilienceBarrelSrc = readFileSync(join(PACKAGES_DIR, 'resilience/src/index.ts'), 'utf-8')

  it('exports withResilience', () => {
    // Satellites (and Orbits) wrap calls with withResilience for CB + timeout
    expect(resilienceBarrelSrc).toContain('withResilience')
  })

  it('exports CircuitOpenException', () => {
    // Satellites catch CircuitOpenException to detect open circuit
    expect(resilienceBarrelSrc).toContain('CircuitOpenException')
  })

  it('exports RetryExhaustedException', () => {
    // Satellites catch RetryExhaustedException after retry storms
    expect(resilienceBarrelSrc).toContain('RetryExhaustedException')
  })

  it('exports withRetry', () => {
    // Satellites call withRetry for idempotent retriable operations
    expect(resilienceBarrelSrc).toContain('withRetry')
  })
})
