import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Connection } from '../src/connection/Connection'
import { BunSQLDriver } from '../src/drivers/BunSQLDriver'

// biome-ignore lint/suspicious/noExplicitAny: Mocking global
const originalBunSql = (globalThis as any).Bun?.sql

describe('Connection Factory - BunSQLDriver Selection', () => {
  beforeEach(() => {
    // Mock Bun.sql existence
    // biome-ignore lint/suspicious/noExplicitAny: Mocking global
    if (!(globalThis as any).Bun) {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      ;(globalThis as any).Bun = {}
    }
    // biome-ignore lint/suspicious/noExplicitAny: Mocking global
    ;(globalThis as any).Bun.sql = {}
  })

  afterEach(() => {
    // Restore Bun.sql
    if (originalBunSql) {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      ;(globalThis as any).Bun.sql = originalBunSql
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global
      delete (globalThis as any).Bun.sql
    }
  })

  test('uses BunSQLDriver when useNativeDriver is true and Bun.sql exists', () => {
    const config = {
      driver: 'postgres' as const,
      database: 'test',
      useNativeDriver: true,
    }

    const connection = new Connection('default', config)
    const driver = connection.getDriver()

    expect(driver).toBeInstanceOf(BunSQLDriver)
    expect(driver.getDriverName()).toBe('postgres')
  })

  test('falls back to standard driver when useNativeDriver is false', () => {
    const config = {
      driver: 'postgres' as const,
      database: 'test',
      useNativeDriver: false,
    }

    const connection = new Connection('default', config)
    const driver = connection.getDriver()

    expect(driver).not.toBeInstanceOf(BunSQLDriver)
    expect(driver.constructor.name).toBe('PostgresDriver')
  })

  test('falls back to standard driver when Bun.sql is missing even if useNativeDriver is true', () => {
    // Remove Bun.sql
    // biome-ignore lint/suspicious/noExplicitAny: Mocking global
    ;(globalThis as any).Bun.sql = undefined

    const config = {
      driver: 'postgres' as const,
      database: 'test',
      useNativeDriver: true,
    }

    const connection = new Connection('default', config)
    const driver = connection.getDriver()

    expect(driver).not.toBeInstanceOf(BunSQLDriver)
    expect(driver.constructor.name).toBe('PostgresDriver')
  })

  test('uses BunSQLDriver for sqlite when configured', () => {
    const config = {
      driver: 'sqlite' as const,
      database: ':memory:',
      useNativeDriver: true,
    }

    const connection = new Connection('sqlite', config)
    const driver = connection.getDriver()

    expect(driver).toBeInstanceOf(BunSQLDriver)
  })
})
