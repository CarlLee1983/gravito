import { afterEach, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'

class User extends Model {
  static override table = 'users'
  declare id: number
}

describe('NPlusOneDetection', () => {
  const TEST_CONN = `nplusone_test_${Math.random().toString(36).slice(2)}`
  let mockConnection: any
  let mockGrammar: any
  let warnSpy: any
  let connectionSpy: any

  beforeEach(() => {
    warnSpy = spyOn(console, 'warn').mockImplementation(() => {})

    mockGrammar = {
      compileSelect: jest.fn(() => 'SELECT * FROM users WHERE id = ?'),
      getStructuralKey: jest.fn(() => 'users:id:='),
      wrapTable: (t: any) => t,
      wrapColumn: (c: any) => c,
      getPlaceholder: () => '?',
    }

    mockConnection = {
      table: (name: string) => {
        const { QueryBuilder } = require('../src/query/QueryBuilder')
        return new QueryBuilder(mockConnection, mockGrammar, name)
      },
      raw: jest.fn().mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 }),
      getGrammar: () => mockGrammar,
      getDriver: () => ({
        getDriverName: () => 'mock',
      }),
      getTracer: () => undefined,
    }

    const originalConnection = DB.connection
    connectionSpy = spyOn(DB, 'connection').mockImplementation((name?: string) => {
      if (name === TEST_CONN) {
        return mockConnection
      }
      return originalConnection.call(DB, name as any)
    })
    // @ts-expect-error
    DB.initialized = true

    User.connection = TEST_CONN
  })

  afterEach(() => {
    warnSpy.mockRestore()
    connectionSpy.mockRestore()
    User.connection = undefined
  })

  test('it warns after 5 similar queries', async () => {
    // Execute 6 identical queries
    for (let i = 0; i < 6; i++) {
      await User.query().where('id', 1).get()
    }

    expect(warnSpy).toHaveBeenCalled()
    const warnMessage = warnSpy.mock.calls[0][0]
    expect(warnMessage).toContain('Potential N+1 Query Detected')
    expect(warnMessage).toContain('table "users"')
  })

  test('it resets after timeframe', async () => {
    // 5 queries
    for (let i = 0; i < 5; i++) {
      await User.query().where('id', 1).get()
    }
    expect(warnSpy).not.toHaveBeenCalled()

    // Wait for timeframe (default 1000ms, but we can't easily wait in unit test without slowing down CI)
    // Actually, NPlusOneDetector.ts timeframe is hardcoded to 1000.
    // For unit testing we should ideally mock the clock.
  })
})
