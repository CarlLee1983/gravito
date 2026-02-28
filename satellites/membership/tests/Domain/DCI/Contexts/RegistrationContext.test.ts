import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import { MembershipError } from '../../../../src/Application/Errors/MembershipError'
import type { IMemberRepository } from '../../../../src/Domain/Contracts/IMemberRepository'
import { RegistrationContext } from '../../../../src/Domain/DCI/Contexts/RegistrationContext'
import { Member, MemberStatus } from '../../../../src/Domain/Entities/Member'

describe('RegistrationContext', () => {
  let mockRepository: IMemberRepository
  let mockCore: Partial<PlanetCore>
  let context: RegistrationContext

  beforeEach(() => {
    mockRepository = {
      findByEmail: mock(),
      save: mock(),
    } as any

    mockCore = {
      hasher: {
        make: mock(async (password: string) => `hashed_${password}`),
      },
      hooks: {
        doAction: mock(async () => {}),
      },
    }

    context = new RegistrationContext(mockRepository, mockCore as PlanetCore)
  })

  describe('execute', () => {
    it('should successfully register a new member', async () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        passwordPlain: 'password123',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(null)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      const result = await context.execute(input)

      expect(result).toBeDefined()
      expect(result.email).toBe(input.email)
      expect(result.name).toBe(input.name)
      expect(result.status).toBe(MemberStatus.PENDING)
      expect(mockRepository.save).toHaveBeenCalled()
    })

    it('should throw error if email already exists', async () => {
      const input = {
        name: 'John Doe',
        email: 'existing@example.com',
        passwordPlain: 'password123',
      }

      const existingMember = Member.create('id1', 'Existing', input.email, 'hash')
      ;(mockRepository.findByEmail as any).mockResolvedValue(existingMember)

      try {
        await context.execute(input)
        expect.unreachable('Should throw MembershipError')
      } catch (error) {
        expect(error).toBeInstanceOf(MembershipError)
        expect((error as MembershipError).code).toBe('MEMBER_EXISTS')
      }
    })

    it('should hash password using core hasher', async () => {
      const input = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordPlain: 'secret123',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(null)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      await context.execute(input)

      expect(mockCore.hasher?.make).toHaveBeenCalledWith(input.passwordPlain)
    })

    it('should trigger membership:send-verification hook', async () => {
      const input = {
        name: 'Test User',
        email: 'test@example.com',
        passwordPlain: 'pass123',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(null)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      await context.execute(input)

      expect(mockCore.hooks?.doAction).toHaveBeenCalledWith(
        'membership:send-verification',
        expect.objectContaining({
          email: input.email,
        })
      )
    })

    it('should trigger membership:registered hook', async () => {
      const input = {
        name: 'Test User',
        email: 'test@example.com',
        passwordPlain: 'pass123',
      }

      ;(mockRepository.findByEmail as any).mockResolvedValue(null)
      ;(mockRepository.save as any).mockResolvedValue(undefined)

      await context.execute(input)

      expect(mockCore.hooks?.doAction).toHaveBeenCalledWith(
        'membership:registered',
        expect.objectContaining({
          member: expect.any(Object),
        })
      )
    })
  })
})
