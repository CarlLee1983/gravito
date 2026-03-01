import type { PlanetCore } from '@gravito/core'
import type { IMemberRepository } from '../../../Domain/Contracts/IMemberRepository'
import { JwtTokenBlacklist } from '../../../Infrastructure/TokenBlacklist'
import type { IAuthStrategy } from './IAuthStrategy'
import { JwtAuthStrategy } from './JwtAuthStrategy'
import { SessionAuthStrategy } from './SessionAuthStrategy'

/**
 * 認證策略工廠
 * 根據設定創建對應的認證策略
 */
export class AuthStrategyFactory {
  /**
   * 創建認證策略
   * @param core Gravito 核心容器
   * @param repository 會員資料庫存取層
   * @returns 對應的認證策略實例
   */
  static create(core: PlanetCore, repository: IMemberRepository): IAuthStrategy {
    const mode = (core.config.get('membership.auth.mode') ?? 'session') as string

    switch (mode) {
      case 'jwt': {
        const secret = core.config.get('membership.jwt.secret') as string
        if (!secret) {
          throw new Error('membership.jwt.secret not configured')
        }
        const blacklist = new JwtTokenBlacklist(core)
        return new JwtAuthStrategy(repository, secret, blacklist)
      }

      case 'session': {
        return new SessionAuthStrategy(core)
      }

      case 'dual': {
        // 雙模式：預設使用 JWT，支援 Session fallback
        // 在 middleware 中實現雙模式邏輯
        const jwtSecret = core.config.get('membership.jwt.secret')
        if (jwtSecret) {
          const blacklist = new JwtTokenBlacklist(core)
          return new JwtAuthStrategy(repository, jwtSecret as string, blacklist)
        }
        return new SessionAuthStrategy(core)
      }

      default:
        throw new Error(`Unknown auth mode: ${mode}`)
    }
  }
}
