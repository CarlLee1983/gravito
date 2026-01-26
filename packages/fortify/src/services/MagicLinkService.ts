import type { FortifyConfig } from '../config'
import type { PersonalAccessTokenService } from './PersonalAccessTokenService'

export class MagicLinkService {
  constructor(
    private config: FortifyConfig,
    private tokenService: PersonalAccessTokenService
  ) {}

  async createToken(user: any): Promise<string> {
    const { plainTextToken } = await this.tokenService.createToken(user.id, {
      name: 'Magic Link',
      abilities: ['magic-link'],
      expiresInMinutes: this.config.magicLink?.expiresInMinutes || 15,
    })

    return plainTextToken
  }

  async verify(token: string): Promise<any | null> {
    const result = await this.tokenService.validateToken(token)
    if (!result) return null

    // Check ability
    const abilities = result.token.abilities
    if (!abilities || (!abilities.includes('*') && !abilities.includes('magic-link'))) {
      return null
    }

    // Revoke token (one-time use)
    await this.tokenService.revokeToken(result.token.id)

    return result.user
  }
}
