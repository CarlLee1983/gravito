import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'

describe('Attribute Casting', () => {
  class CastModel extends Model {
    static override table = 'casts'
    declare id: number
    declare is_active: boolean
    declare is_verified: boolean
    declare meta: any
    declare options: any
    declare birthday: Date
    declare score: number

    static override casts = {
      is_active: 'boolean',
      is_verified: 'boolean',
      meta: 'json',
      options: 'object', // alias for json
      birthday: 'date',
      score: 'number',
    }
  }

  let mockConnection: any

  beforeEach(() => {
    // Mock DB connection to capture saves
    mockConnection = {
      table: () => mockConnection,
      insert: () => Promise.resolve([1]),
      update: () => Promise.resolve(1),
      getGrammar: () => ({
        compileInsert: () => ({ sql: '', bindings: [] }),
        compileUpdate: () => ({ sql: '', bindings: [] }),
      }),
      getDriver: () => ({
        getGrammar: () => ({}),
      }),
    }
    // spyOn(DB, 'connection').mockReturnValue(mockConnection)
    // We'll rely on unit tests for casting logic primarily, preventing full DB mock complexity unless needed
  })

  afterEach(async () => {
    await DB._reset()
  })

  test('it casts boolean on set', () => {
    const m = CastModel.create<CastModel>({})

    m.is_active = true
    expect(m.is_active).toBe(true)

    // @ts-expect-error
    m.is_active = 1
    expect(m.is_active).toBe(true)

    // @ts-expect-error
    m.is_active = 0
    expect(m.is_active).toBe(false)

    // @ts-expect-error
    m.is_active = 'true'
    expect(m.is_active).toBe(true)

    // @ts-expect-error
    m.is_active = 'false'
    expect(m.is_active).toBe(false)
  })

  test('it casts boolean on hydrate', () => {
    // Simulate coming from DB as 1/0
    const m = CastModel.hydrate<CastModel>({ id: 1, is_active: 1, is_verified: 0 })

    expect(m.is_active).toBe(true)
    expect(m.is_verified).toBe(false)
  })

  test('it casts json on set', () => {
    const m = CastModel.create<CastModel>({})
    const data = { foo: 'bar' }

    m.meta = data
    expect(m.meta).toEqual(data)
    // should stay object in attributes
    expect(m.getAttributes().meta).toEqual(data)
  })

  test('it casts json on hydrate (string to object)', () => {
    const data = { foo: 'bar' }
    const m = CastModel.hydrate<CastModel>({ id: 1, meta: JSON.stringify(data) })

    expect(m.meta).toEqual(data)
  })

  test('it casts date on set', () => {
    const m = CastModel.create<CastModel>({})
    const date = new Date('2023-01-01T00:00:00.000Z')

    m.birthday = date
    expect(m.birthday).toBeInstanceOf(Date)
    expect(m.birthday.getTime()).toBe(date.getTime())

    // Set as string
    // @ts-expect-error
    m.birthday = '2023-01-01T00:00:00.000Z'
    expect(m.birthday).toBeInstanceOf(Date)
    expect(m.birthday.toISOString()).toBe('2023-01-01T00:00:00.000Z')
  })

  test('it casts date on hydrate', () => {
    const dateStr = '2023-01-01T00:00:00.000Z'
    const m = CastModel.hydrate<CastModel>({ id: 1, birthday: dateStr })

    expect(m.birthday).toBeInstanceOf(Date)
    expect(m.birthday.toISOString()).toBe(dateStr)
  })

  test('it casts number on set', () => {
    const m = CastModel.create<CastModel>({})

    // @ts-expect-error
    m.score = '123'
    expect(m.score).toBe(123)

    // @ts-expect-error
    m.score = '12.34'
    expect(m.score).toBe(12.34)
  })
})
