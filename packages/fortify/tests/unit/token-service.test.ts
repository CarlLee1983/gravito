import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { PersonalAccessTokenService } from '../../src/services/PersonalAccessTokenService'

describe('PersonalAccessTokenService', () => {
  let service: PersonalAccessTokenService
  let mockDb: any
  let mockQueryBuilder: any

  beforeEach(() => {
    mockQueryBuilder = {
      where: mock(() => mockQueryBuilder),
      orderBy: mock(() => mockQueryBuilder),
      insert: mock().mockResolvedValue([1] as any),
      update: mock().mockResolvedValue(1 as any),
      delete: mock().mockResolvedValue(1 as any),
      first: mock().mockResolvedValue(null as any),
      select: mock().mockResolvedValue([] as any),
    }

    mockDb = mock(() => mockQueryBuilder)
    service = new PersonalAccessTokenService(() => mockDb)
  })

  test('createToken generates a token and stores it hash', async () => {
    mockQueryBuilder.insert.mockResolvedValue([10] as any)

    mockQueryBuilder.first.mockResolvedValue({
      id: 10,
      tokenable_type: 'User',
      tokenable_id: 1,
      name: 'Test Token',
      token: 'hashed_token_value',
      abilities: '["*"]',
      created_at: new Date(),
      updated_at: new Date(),
    } as any)

    const result = await service.createToken(1, {
      name: 'Test Token',
      abilities: ['*'],
    })

    expect(result.accessToken.id).toBe(10)
    expect(result.accessToken.name).toBe('Test Token')
    expect(result.plainTextToken).toContain('10|')

    expect(mockQueryBuilder.insert).toHaveBeenCalledTimes(1)
    const insertCall = mockQueryBuilder.insert.mock.calls[0]
    expect(insertCall).toBeDefined()
    const args = insertCall[0]
    expect(args.tokenable_id).toBe(1)
    expect(args.name).toBe('Test Token')
    expect(args.token).not.toBe('plain_token')
    expect(args.token.length).toBeGreaterThan(0)
  })

  test('validateToken returns null for invalid format', async () => {
    const result = await service.validateToken('invalid_token')
    expect(result).toBeNull()
  })

  test('validateToken returns null for non-existent token', async () => {
    mockQueryBuilder.first.mockResolvedValue(null as any)

    const result = await service.validateToken('1|some_token')
    expect(result).toBeNull()
  })

  test('validateToken returns null for expired token', async () => {
    mockQueryBuilder.first.mockResolvedValue({
      id: 1,
      token: 'hashed',
      expires_at: new Date(Date.now() - 10000),
    } as any)

    const result = await service.validateToken('1|some_token')
    expect(result).toBeNull()
  })

  test('revokeToken deletes the token', async () => {
    mockQueryBuilder.delete.mockResolvedValue(1 as any)

    const result = await service.revokeToken(1)
    expect(result).toBe(true)
    expect(mockQueryBuilder.delete).toHaveBeenCalled()
  })

  test('listTokens returns parsed tokens', async () => {
    const dbTokens = [
      {
        id: 1,
        name: 'Token 1',
        abilities: '["*"]',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        name: 'Token 2',
        abilities: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    mockQueryBuilder.select.mockResolvedValue(dbTokens as any)

    const tokens = await service.listTokens(1)
    expect(tokens).toHaveLength(2)
    expect(tokens[0].id).toBe(1)
    expect(tokens[0].abilities).toEqual(['*'])
    expect(tokens[1].id).toBe(2)
    expect(tokens[1].abilities).toBeNull()
  })
})
