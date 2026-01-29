import { afterEach, beforeEach, describe, expect, jest, spyOn, test } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'
import { NPlusOneDetector } from '../src/query/NPlusOneDetector'

class DetectorUser extends Model {
  static override table = 'users'
  declare id: number
}

describe('NPlusOneDetection', () => {
  let mockConnection: any
  let mockGrammar: any
  let warnSpy: any

  beforeEach(() => {
    // @ts-expect-error
    DB.initialized = false
    NPlusOneDetector.reset()
    NPlusOneDetector.setEnabled(true)

    warnSpy = spyOn(console, 'warn').mockImplementation(() => {})

    mockGrammar = {
      compileSelect: jest.fn(() => 'SELECT * FROM users WHERE id = ?'),
      getStructuralKey: jest.fn(() => 'users:id:='),
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

    spyOn(DB, 'connection').mockReturnValue(mockConnection)
    // @ts-expect-error
    DB.initialized = true
  })

  afterEach(() => {
    warnSpy.mockRestore()
    jest.restoreAllMocks()
  })

  test('it warns after 5 similar queries', async () => {
    for (let i = 1; i <= 4; i++) {
      await DetectorUser.query().where('id', i).get()
    }
    expect(warnSpy).not.toHaveBeenCalled()

    await DetectorUser.query().where('id', 5).get()
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0][0]).toContain('Potential N+1 Query Detected')
  })

  test('it resets after timeframe', async () => {
    for (let i = 1; i <= 4; i++) {
      await DetectorUser.query().where('id', i).get()
    }

    const now = Date.now()
    const dateSpy = spyOn(Date, 'now').mockReturnValue(now + 1500)

    await DetectorUser.query().where('id', 5).get()
    expect(warnSpy).not.toHaveBeenCalled()

    dateSpy.mockRestore()
  })
})
