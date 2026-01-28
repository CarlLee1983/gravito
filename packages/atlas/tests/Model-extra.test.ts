import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { DB } from '../src/DB'
import { Model } from '../src/orm/model/Model'

class Base extends Model {
  static connection = 'default'
}

class User extends Base {
  static table = 'users'
}

class Post extends Base {
  static table = 'posts'
}

class Image extends Base {
  static table = 'images'
}

describe('Model Extra Coverage', () => {
  afterEach(() => {
    mock.restore()
  })

  describe('Streaming Relations', () => {
    it('should stream hasMany results', async () => {
      const user = User.make({ id: 1 })

      const rowsBatch1 = [
        { id: 10, user_id: 1 },
        { id: 11, user_id: 1 },
      ]
      const rowsBatch2 = [{ id: 12, user_id: 1 }]

      const getMock = mock()
        .mockResolvedValueOnce(rowsBatch1)
        .mockResolvedValueOnce(rowsBatch2)
        .mockResolvedValueOnce([]) // End

      const fluentMock = {
        setModel: mock(() => fluentMock),
        where: mock(() => fluentMock),
        orderBy: mock(() => fluentMock),
        limit: mock(() => fluentMock),
        offset: mock(() => fluentMock),
        get: getMock,
        first: mock(() => Promise.resolve(null)),
      }

      spyOn(DB, 'connection').mockReturnValue({
        table: () => fluentMock,
      } as any)

      const batches = []
      for await (const batch of user.hasManyStream(Post, 'user_id', 2)) {
        batches.push(batch)
      }

      expect(batches).toHaveLength(2)
      expect(batches[0]).toHaveLength(2) // Batch 1
      expect(batches[1]).toHaveLength(1) // Batch 2
      expect(getMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('Polymorphic Relations', () => {
    it('should build morphTo query', async () => {
      const image = Image.make({
        id: 1,
        imageable_id: 10,
        imageable_type: 'User',
      })

      const ModReg = (await import('../src/orm/model/ModelRegistry')).ModelRegistry
      ModReg.register(User)

      const firstMock = mock(async () => ({ id: 10, name: 'Morph User' }))

      const fluentMock = {
        setModel: mock(() => fluentMock),
        get: mock(() => Promise.resolve([])),
        first: firstMock,
        where: mock(() => fluentMock),
        limit: mock(() => fluentMock),
      }

      spyOn(DB, 'connection').mockReturnValue({
        table: () => fluentMock,
      } as any)

      const relation = image.morphTo('imageable')
      expect(relation).not.toBeNull()

      if (relation) {
        const result = await relation.first()
        expect(result).toBeInstanceOf(User)
        // @ts-expect-error
        expect(result.id).toBe(10)
      }
    })

    it('should return null if morph type/id missing', async () => {
      const image = Image.make({ id: 1 }) // Missing imageable_id/type
      const result = await image.morphTo('imageable')
      expect(result).toBeNull()
    })
  })
})
