import { beforeAll, describe, expect, it } from 'bun:test'
import { DB, Schema } from '@gravito/atlas'
import { UpdateSettings } from '../src/Application/UseCases/UpdateSettings'
import { Member, MemberStatus } from '../src/Domain/Entities/Member'
import { AtlasMemberRepository } from '../src/Infrastructure/Persistence/AtlasMemberRepository'

describe('Membership UpdateSettings Integration', () => {
  const repo = new AtlasMemberRepository()
  let updateUseCase: UpdateSettings

  // Mock Core with Hasher
  const mockCore: any = {
    hasher: {
      make: async (val: string) => `hashed_${val}`,
      check: async (plain: string, hash: string) => `hashed_${plain}` === hash,
    },
    hooks: {
      doAction: async () => {},
    },
  }

  beforeAll(async () => {
    DB.addConnection('default', { driver: 'sqlite', database: ':memory:' })
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

    updateUseCase = new UpdateSettings(repo, mockCore)
  })

  it('should update profile and merge metadata', async () => {
    // 1. Create initial member
    const initialHash = await mockCore.hasher.make('old-pass')
    const member = Member.reconstitute('u1', {
      name: 'Old Name',
      email: 'test@test.com',
      passwordHash: initialHash,
      status: MemberStatus.ACTIVE,
      roles: ['member'],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { initial: 'data' },
    })
    await repo.save(member)

    // 2. Perform update
    const result = await updateUseCase.execute({
      memberId: 'u1',
      name: 'New Name',
      metadata: { theme: 'dark' },
    })

    expect(result.name).toBe('New Name')
    expect(result.metadata?.initial).toBe('data')
    expect(result.metadata?.theme).toBe('dark')
  })

  it('should securely change password', async () => {
    const pass = await mockCore.hasher.make('current-pass')
    const member = Member.create('u2', 'N', 'e2@e.com', pass)
    await repo.save(member)

    // Should throw if current password wrong
    try {
      await updateUseCase.execute({
        memberId: 'u2',
        currentPassword: 'wrong',
        newPassword: 'new',
      })
      expect(true).toBe(false) // Should not reach here
    } catch (e: any) {
      expect(e.message).toBe('Invalid current password')
    }

    // Should succeed if correct
    await updateUseCase.execute({
      memberId: 'u2',
      currentPassword: 'current-pass',
      newPassword: 'secure-new-pass',
    })

    const updated = await repo.findById('u2')
    const isNewPassValid = await mockCore.hasher.check('secure-new-pass', updated?.passwordHash)
    expect(isNewPassValid).toBe(true)
  })
})
