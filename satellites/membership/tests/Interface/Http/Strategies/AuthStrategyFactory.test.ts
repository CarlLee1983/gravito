import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { PlanetCore } from '@gravito/core'
import type { IMemberRepository } from '../../../../src/Domain/Contracts/IMemberRepository'
import { AuthStrategyFactory } from '../../../../src/Interface/Http/Strategies/AuthStrategyFactory'
import { JwtAuthStrategy } from '../../../../src/Interface/Http/Strategies/JwtAuthStrategy'
import { SessionAuthStrategy } from '../../../../src/Interface/Http/Strategies/SessionAuthStrategy'

describe('AuthStrategyFactory', () => {
  let mockRepository: IMemberRepository
  let mockCore: Partial<PlanetCore>

  beforeEach(() => {
    mockRepository = {} as any

    mockCore = {
      config: {
        get: mock((key: string) => {
          if (key === 'membership.auth.mode') return 'session'
          if (key === 'membership.jwt.secret') return 'test-secret'
          return undefined
        }),
      },
      container: {
        make: mock(() => ({})),
      },
    }
  })

  describe('create', () => {
    it('should create JWT strategy when mode is jwt', () => {
      ;(mockCore.config?.get as any).mockImplementation((key: string) => {
        if (key === 'membership.auth.mode') return 'jwt'
        if (key === 'membership.jwt.secret') return 'test-secret-key'
        return undefined
      })

      const strategy = AuthStrategyFactory.create(mockCore as PlanetCore, mockRepository)

      expect(strategy).toBeInstanceOf(JwtAuthStrategy)
    })

    it('should create Session strategy when mode is session', () => {
      ;(mockCore.config?.get as any).mockImplementation((key: string) => {
        if (key === 'membership.auth.mode') return 'session'
        return undefined
      })

      const strategy = AuthStrategyFactory.create(mockCore as PlanetCore, mockRepository)

      expect(strategy).toBeInstanceOf(SessionAuthStrategy)
    })

    it('should default to Session strategy when mode not specified', () => {
      ;(mockCore.config?.get as any).mockImplementation((key: string) => {
        return undefined
      })

      const strategy = AuthStrategyFactory.create(mockCore as PlanetCore, mockRepository)

      expect(strategy).toBeInstanceOf(SessionAuthStrategy)
    })

    it('should create JWT strategy in dual mode with JWT secret', () => {
      ;(mockCore.config?.get as any).mockImplementation((key: string) => {
        if (key === 'membership.auth.mode') return 'dual'
        if (key === 'membership.jwt.secret') return 'test-secret-key'
        return undefined
      })

      const strategy = AuthStrategyFactory.create(mockCore as PlanetCore, mockRepository)

      expect(strategy).toBeInstanceOf(JwtAuthStrategy)
    })

    it('should fallback to Session strategy in dual mode without JWT secret', () => {
      ;(mockCore.config?.get as any).mockImplementation((key: string) => {
        if (key === 'membership.auth.mode') return 'dual'
        return undefined
      })

      const strategy = AuthStrategyFactory.create(mockCore as PlanetCore, mockRepository)

      expect(strategy).toBeInstanceOf(SessionAuthStrategy)
    })

    it('should throw error if JWT mode without secret', () => {
      ;(mockCore.config?.get as any).mockImplementation((key: string) => {
        if (key === 'membership.auth.mode') return 'jwt'
        return undefined
      })

      expect(() => {
        AuthStrategyFactory.create(mockCore as PlanetCore, mockRepository)
      }).toThrow('membership.jwt.secret not configured')
    })

    it('should throw error for unknown auth mode', () => {
      ;(mockCore.config?.get as any).mockImplementation((key: string) => {
        if (key === 'membership.auth.mode') return 'invalid-mode'
        return undefined
      })

      expect(() => {
        AuthStrategyFactory.create(mockCore as PlanetCore, mockRepository)
      }).toThrow('Unknown auth mode')
    })
  })
})
