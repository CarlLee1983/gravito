import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'
import { Factory } from '../src/seed/Factory'

class User extends Model {
  static table = 'users'
}

describe('Factory Extra', () => {
  afterEach(() => {
    mock.restore()
    // Clean up registry if possible, although it's private static.
    // The tests should be isolated enough by using unique names or models if needed.
  })

  describe('Registry', () => {
    it('should register and retrieve factory by model', () => {
      Factory.define(User, () => ({ name: 'Test' }))

      const userFactory = Factory.model(User)
      expect(userFactory).toBeDefined()
      expect(userFactory.makeOne()).toEqual({ name: 'Test' })
    })

    it('should throw if factory not defined for model', () => {
      class UnknownModel extends Model {}
      expect(() => Factory.model(UnknownModel)).toThrow('No factory defined')
    })
  })

  describe('Create (DB Interaction)', () => {
    it('should insert records into DB', async () => {
      const insertMock = mock(() => Promise.resolve([{ id: 1, name: 'Stored' }]))

      spyOn(DB, 'table').mockReturnValue({
        insert: insertMock,
      } as any)

      const f = new Factory(() => ({ name: 'Stored' }), { table: 'users' })
      const result = await f.create()

      expect(DB.table).toHaveBeenCalledWith('users')
      expect(insertMock).toHaveBeenCalled()
      expect(result).toEqual([{ id: 1, name: 'Stored' }] as any)
    })

    it('should handle state overrides in create', async () => {
      const insertMock = mock(() => Promise.resolve([{ id: 2, name: 'Override' }]))
      spyOn(DB, 'table').mockReturnValue({ insert: insertMock } as any)

      const f = new Factory(() => ({ name: 'Original' }), { table: 'users' })
      await f.create({ name: 'Override' })

      expect(insertMock).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Override' })])
      )
    })

    it('should throw if no table specified', async () => {
      const f = new Factory(() => ({ name: 'Test' }))
      expect(f.create()).rejects.toThrow('No table or model specified')
    })
  })

  describe('Sequence', () => {
    it('should generate sequential values', () => {
      const f = new Factory<{ id: number; name: string }>(() => ({
        id: 0,
        name: 'Item',
      }))

      f.sequence('id', (n) => n + 1)

      const results = f.count(3).make()

      expect(results[0].id).toBe(1)
      expect(results[1].id).toBe(2)
      expect(results[2].id).toBe(3)
    })
  })

  describe('Raw Aliases', () => {
    it('should alias make to raw', () => {
      const f = new Factory(() => ({ a: 1 }))
      expect(f.raw()).toEqual(f.make())
      expect(f.rawOne()).toEqual(f.makeOne())
    })
  })
})
