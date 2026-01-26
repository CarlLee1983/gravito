import { describe, expect, test } from 'bun:test'
import {
  type ConnectionArgs,
  createConnectionResolver,
  generateConnectionQuery,
  generateConnectionTypes,
} from '../../src/pagination/relay-connection'

describe('Relay Connection - GraphQL 類型生成', () => {
  test('生成 Connection 類型定義', () => {
    const types = generateConnectionTypes('User')

    expect(types).toContain('type UserEdge')
    expect(types).toContain('type UserConnection')
    expect(types).toContain('type PageInfo')
    expect(types).toContain('node: User!')
    expect(types).toContain('cursor: String!')
    expect(types).toContain('edges: [UserEdge!]!')
    expect(types).toContain('pageInfo: PageInfo!')
    expect(types).toContain('totalCount: Int')
  })

  test('生成 Connection 查詢定義', () => {
    const query = generateConnectionQuery('User')

    expect(query).toContain('userConnection(')
    expect(query).toContain('first: Int')
    expect(query).toContain('after: String')
    expect(query).toContain('last: Int')
    expect(query).toContain('before: String')
    expect(query).toContain(': UserConnection')
  })
})

describe('Relay Connection - Resolver', () => {
  test('創建 Connection Resolver', () => {
    const mockModel = {
      query: () => mockQueryBuilder,
      count: async () => 100,
      primaryKey: 'id',
      table: 'users',
    }

    const mockQueryBuilder = {
      conditions: [] as unknown[],
      limitValue: undefined as number | undefined,
      where(column: string, operator: string, value: unknown) {
        this.conditions.push({ column, operator, value })
        return this
      },
      limit(value: number) {
        this.limitValue = value
        return this
      },
      async get() {
        return [
          { id: 1, name: 'User 1', getKey: () => 1 },
          { id: 2, name: 'User 2', getKey: () => 2 },
          { id: 3, name: 'User 3', getKey: () => 3 },
        ]
      },
    }

    const resolver = createConnectionResolver(mockModel as unknown)

    expect(resolver).toBeInstanceOf(Function)
  })

  test('Connection Resolver 基本查詢', async () => {
    const mockModel = {
      query: () => mockQueryBuilder,
      count: async () => 100,
      primaryKey: 'id',
      table: 'users',
    }

    const mockQueryBuilder = {
      conditions: [] as unknown[],
      limitValue: undefined as number | undefined,
      where(column: string, operator: string, value: unknown) {
        this.conditions.push({ column, operator, value })
        return this
      },
      limit(value: number) {
        this.limitValue = value
        return this
      },
      async get() {
        return [
          { id: 1, name: 'User 1', getKey: () => 1 },
          { id: 2, name: 'User 2', getKey: () => 2 },
        ]
      },
    }

    const resolver = createConnectionResolver(mockModel as unknown)

    const args: ConnectionArgs = { first: 2 }
    const result = await resolver(null, args)

    expect(result).toHaveProperty('edges')
    expect(result).toHaveProperty('pageInfo')
    expect(result).toHaveProperty('totalCount')
    expect(result.edges).toHaveLength(2)
    expect(result.totalCount).toBe(100)
  })
})
