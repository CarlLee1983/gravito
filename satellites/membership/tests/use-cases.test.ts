import { describe, expect, it } from 'bun:test'
import { ForgotPassword } from '../src/Application/UseCases/ForgotPassword'
import { RegisterMember } from '../src/Application/UseCases/RegisterMember'
import { ResetPassword } from '../src/Application/UseCases/ResetPassword'
import { UpdateMemberLevel } from '../src/Application/UseCases/UpdateMemberLevel'
import { VerifyEmail } from '../src/Application/UseCases/VerifyEmail'
import type { IMemberRepository } from '../src/Domain/Contracts/IMemberRepository'
import { Member, MemberStatus } from '../src/Domain/Entities/Member'

/**
 * InMemoryMemberRepository - Mock 實作
 */
class InMemoryMemberRepository implements IMemberRepository {
  private members: Map<string, Member> = new Map()

  async save(member: Member): Promise<void> {
    this.members.set(member.id, member)
  }

  async findById(id: string): Promise<Member | null> {
    return this.members.get(id) ?? null
  }

  async findByEmail(email: string): Promise<Member | null> {
    for (const member of this.members.values()) {
      if (member.email === email) {
        return member
      }
    }
    return null
  }

  async findByResetToken(token: string): Promise<Member | null> {
    for (const member of this.members.values()) {
      if (member.passwordResetToken === token) {
        return member
      }
    }
    return null
  }

  async findByVerificationToken(token: string): Promise<Member | null> {
    for (const member of this.members.values()) {
      if (member.verificationToken === token) {
        return member
      }
    }
    return null
  }

  async delete(id: string): Promise<void> {
    this.members.delete(id)
  }
}

/**
 * MockPlanetCore - 模擬 Core 容器、Hook、Hasher
 */
class MockHasher {
  async make(password: string): Promise<string> {
    return `hashed_${password}`
  }

  async check(password: string, hash: string): Promise<boolean> {
    return hash === `hashed_${password}`
  }
}

class MockPlanetCore {
  private hookCalls: Array<{ action: string; payload: any }> = []
  hasher = new MockHasher()
  container = {
    make: (key: string) => {
      if (key === 'i18n') {
        return {
          t: (msgKey: string) => msgKey,
        }
      }
      return null
    },
  }

  get hooks() {
    return {
      doAction: async (action: string, payload: any) => {
        this.hookCalls.push({ action, payload })
      },
    }
  }

  getHookCalls() {
    return this.hookCalls
  }

  clearHooks() {
    this.hookCalls = []
  }
}

describe('Membership UseCases', () => {
  describe('RegisterMember', () => {
    it('應該能成功註冊新會員', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const useCase = new RegisterMember(repository, core as any)
      const result = await useCase.execute({
        name: 'John Doe',
        email: 'john@example.com',
        passwordPlain: 'password123',
      })

      expect(result.email).toBe('john@example.com')
      expect(result.name).toBe('John Doe')
      expect(result.status).toBe(MemberStatus.PENDING)
    })

    it('當 email 已存在時應拋出錯誤', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      // 先註冊一個會員
      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')
      await repository.save(member)

      const useCase = new RegisterMember(repository, core as any)
      try {
        await useCase.execute({
          name: 'Other',
          email: 'carl@example.com',
          passwordPlain: 'password',
        })
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toMatch(/already exists|member_exists/)
      }
    })

    it('應該觸發 membership:send-verification hook', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const useCase = new RegisterMember(repository, core as any)
      await useCase.execute({
        name: 'John',
        email: 'john@example.com',
        passwordPlain: 'password123',
      })

      const hooks = core.getHookCalls()
      expect(hooks.some((h) => h.action === 'membership:send-verification')).toBe(true)
      expect(hooks.some((h) => h.action === 'membership:registered')).toBe(true)
    })
  })

  describe('ForgotPassword', () => {
    it('應該能為有效的 email 生成 reset token', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')
      await repository.save(member)

      const useCase = new ForgotPassword(repository, core as any)
      await useCase.execute({ email: 'carl@example.com' })

      // 驗證 token 已生成
      const updated = await repository.findById('u1')
      expect(updated?.passwordResetToken).toBeDefined()
      expect(updated?.passwordResetExpiresAt).toBeDefined()
    })

    it('當 email 不存在時應靜默失敗（安全考量）', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const useCase = new ForgotPassword(repository, core as any)
      // 不應拋出錯誤
      await useCase.execute({ email: 'nonexistent@example.com' })

      const hooks = core.getHookCalls()
      expect(hooks.length).toBe(0)
    })

    it('應該觸發 membership:send-reset-password hook', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')
      await repository.save(member)

      const useCase = new ForgotPassword(repository, core as any)
      await useCase.execute({ email: 'carl@example.com' })

      const hooks = core.getHookCalls()
      expect(hooks.some((h) => h.action === 'membership:send-reset-password')).toBe(true)
    })
  })

  describe('ResetPassword', () => {
    it('應該能使用有效的 reset token 重設密碼', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      // 建立會員並生成 reset token
      const member = Member.create('u1', 'Carl', 'carl@example.com', 'old_hash')
      member.generatePasswordResetToken()
      await repository.save(member)

      const resetToken = member.passwordResetToken
      const useCase = new ResetPassword(repository, core as any)
      await useCase.execute({
        token: resetToken!,
        newPasswordPlain: 'new_password123',
      })

      // 驗證密碼已更改
      const updated = await repository.findById('u1')
      expect(updated?.passwordHash).toBe('hashed_new_password123')
      expect(updated?.passwordResetToken).toBeUndefined()
    })

    it('當 token 不存在時應拋出錯誤', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const useCase = new ResetPassword(repository, core as any)
      try {
        await useCase.execute({
          token: 'invalid-token',
          newPasswordPlain: 'password',
        })
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('Invalid or expired reset token')
      }
    })

    it('當 token 過期時應拋出錯誤', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')
      ;(member as any).props.passwordResetToken = 'old-token'
      ;(member as any).props.passwordResetExpiresAt = new Date(Date.now() - 1000)
      await repository.save(member)

      const useCase = new ResetPassword(repository, core as any)
      try {
        await useCase.execute({
          token: 'old-token',
          newPasswordPlain: 'password',
        })
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('Invalid or expired reset token')
      }
    })
  })

  describe('VerifyEmail', () => {
    it('應該能使用有效的驗證 token 驗證 email', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')
      const verifyToken = member.verificationToken
      await repository.save(member)

      const useCase = new VerifyEmail(repository, core as any)
      await useCase.execute({ token: verifyToken! })

      // 驗證狀態已改為 ACTIVE
      const updated = await repository.findById('u1')
      expect(updated?.status).toBe(MemberStatus.ACTIVE)
      expect(updated?.emailVerifiedAt).toBeDefined()
      expect(updated?.verificationToken).toBeUndefined()
    })

    it('當 token 無效時應拋出錯誤', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const useCase = new VerifyEmail(repository, core as any)
      try {
        await useCase.execute({ token: 'invalid-token' })
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('Invalid verification token')
      }
    })
  })

  describe('UpdateMemberLevel', () => {
    it('應該能更新會員等級', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')
      await repository.save(member)

      const useCase = new UpdateMemberLevel(repository, core as any)
      await useCase.execute({
        memberId: 'u1',
        newLevel: 'gold',
      })

      // 驗證 metadata 已更新
      const updated = await repository.findById('u1')
      expect(updated?.metadata.level).toBe('gold')
    })

    it('當會員不存在時應拋出錯誤', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const useCase = new UpdateMemberLevel(repository, core as any)
      try {
        await useCase.execute({
          memberId: 'nonexistent',
          newLevel: 'gold',
        })
        expect.unreachable('應該拋出錯誤')
      } catch (error: any) {
        expect(error.message).toContain('not found')
      }
    })

    it('應該觸發 membership:level-changed hook', async () => {
      const repository = new InMemoryMemberRepository()
      const core = new MockPlanetCore()

      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')
      await repository.save(member)

      const useCase = new UpdateMemberLevel(repository, core as any)
      await useCase.execute({
        memberId: 'u1',
        newLevel: 'gold',
      })

      const hooks = core.getHookCalls()
      expect(hooks.some((h) => h.action === 'membership:level-changed')).toBe(true)
    })
  })

  describe('Member Domain Methods', () => {
    it('應該能正確生成 password reset token', () => {
      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')

      expect(member.passwordResetToken).toBeUndefined()
      member.generatePasswordResetToken()

      expect(member.passwordResetToken).toBeDefined()
      expect(member.passwordResetExpiresAt).toBeDefined()
    })

    it('應該能正確重設密碼', () => {
      const member = Member.create('u1', 'Carl', 'carl@example.com', 'old_hash')
      member.generatePasswordResetToken()

      const oldToken = member.passwordResetToken
      member.resetPassword('new_hash')

      expect(member.passwordHash).toBe('new_hash')
      expect(member.passwordResetToken).toBeUndefined()
      expect(member.passwordResetExpiresAt).toBeUndefined()
      expect(oldToken).not.toBe(member.passwordResetToken)
    })

    it('應該能添加和移除角色', () => {
      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')

      expect(member.roles).toContain('member')
      member.addRole('admin')
      expect(member.roles).toContain('admin')

      member.removeRole('admin')
      expect(member.roles).not.toContain('admin')
    })

    it('應該能更新會員等級', () => {
      const member = Member.create('u1', 'Carl', 'carl@example.com', 'hash')

      expect(member.metadata.level).toBeUndefined()
      member.changeLevel('gold')
      expect(member.metadata.level).toBe('gold')
    })
  })
})
