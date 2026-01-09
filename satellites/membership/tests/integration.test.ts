import { beforeAll, describe, expect, it } from 'bun:test'
import { DB, Schema } from '@gravito/atlas'
import { RegisterMember } from '../src/Application/UseCases/RegisterMember'
import { AtlasMemberRepository } from '../src/Infrastructure/Persistence/AtlasMemberRepository'

describe('Membership Satellite Integration', () => {
  const repo = new AtlasMemberRepository()

  // Mock Core
  const mockCore: any = {
    hasher: {
      make: async (val: string) => `hashed_${val}`,
      check: async (plain: string, hash: string) => `hashed_${plain}` === hash,
    },
    hooks: {
      doAction: async () => {},
    },
    container: {
      make: (key: string) => {
        if (key === 'i18n') {
          return { t: (k: string) => k }
        }
        return null
      },
    },
  }

  const registerUseCase = new RegisterMember(repo, mockCore)

  beforeAll(async () => {
    // 1. 配置 SQLite 記憶體資料庫
    DB.addConnection('default', {
      driver: 'sqlite',
      database: ':memory:',
    })

    // 2. 建立測試用的資料表
    await Schema.dropIfExists('members')
    await Schema.create('members', (table) => {
      table.string('id').primary()
      table.string('name')
      table.string('email').unique()
      table.string('password_hash')
      table.string('status')
      table.text('roles').default('["member"]')
      table.string('verification_token').nullable()
      table.timestamp('email_verified_at').nullable()
      table.string('password_reset_token').nullable()
      table.timestamp('password_reset_expires_at').nullable()
      table.string('current_session_id').nullable()
      table.string('remember_token').nullable()
      table.timestamp('created_at').default('CURRENT_TIMESTAMP')
      table.timestamp('updated_at').nullable()
      table.text('metadata').nullable()
    })
  })

  it('應該能成功註冊新會員', async () => {
    const input = {
      name: 'Carl',
      email: `carl-${Date.now()}@example.com`,
      passwordPlain: 'secret123',
    }

    const result = await registerUseCase.execute(input)

    expect(result.id).toBeDefined()
    expect(result.email).toBe(input.email)

    // 驗證是否真的存入 Repository
    const savedMember = await repo.findById(result.id)
    expect(savedMember).not.toBeNull()
    expect(savedMember?.name).toBe(input.name)
  })
})
