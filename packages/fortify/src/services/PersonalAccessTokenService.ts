import { timingSafeEqual } from 'node:crypto'
import type { ConnectionContract } from '@gravito/atlas'
import { FortifyError } from '../errors/FortifyError'
import { ErrorCodes } from '../errors/codes'

export interface PersonalAccessToken {
  id: number
  tokenable_type: string
  tokenable_id: number
  name: string
  token: string
  abilities: string[] | null
  last_used_at: Date | null
  expires_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface CreateTokenOptions {
  name: string
  abilities?: string[]
  expiresAt?: Date
  expiresInMinutes?: number
}

export interface TokenValidationResult {
  token: PersonalAccessToken
  user: any
}

export class PersonalAccessTokenService {
  constructor(private db: () => ConnectionContract) {}

  async createToken(
    userId: number,
    options: CreateTokenOptions
  ): Promise<{ plainTextToken: string; accessToken: PersonalAccessToken }> {
    const plainToken = this.generatePlainToken()
    const hashedToken = await this.hashToken(plainToken)

    const expiresAt = options.expiresAt || this.calculateExpiration(options.expiresInMinutes)

    const [id] = (await this.db()
      .table('personal_access_tokens')
      .insert({
        tokenable_type: 'User',
        tokenable_id: userId,
        name: options.name,
        token: hashedToken,
        abilities: options.abilities ? JSON.stringify(options.abilities) : null,
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      })) as unknown as [number]

    const accessToken = await this.findById(id as any)
    if (!accessToken) {
      throw new FortifyError(ErrorCodes.INTERNAL_ERROR, 500)
    }

    const plainTextToken = `${id}|${plainToken}`

    return {
      plainTextToken,
      accessToken,
    }
  }

  async validateToken(bearerToken: string): Promise<TokenValidationResult | null> {
    const parts = bearerToken.split('|')
    if (parts.length !== 2) {
      return null
    }

    const [id, plainToken] = parts
    const tokenId = Number.parseInt(id, 10)

    if (Number.isNaN(tokenId)) {
      return null
    }

    const accessToken = await this.findById(tokenId)
    if (!accessToken) {
      return null
    }

    if (accessToken.expires_at && new Date() > new Date(accessToken.expires_at)) {
      return null
    }

    const valid = await this.verifyToken(plainToken, accessToken.token)
    if (!valid) {
      return null
    }

    await this.updateLastUsed(tokenId)

    const user = await this.findUser(accessToken.tokenable_id)

    return {
      token: accessToken,
      user,
    }
  }

  async revokeToken(tokenId: number): Promise<boolean> {
    const deleted = await this.db().table('personal_access_tokens').where('id', tokenId).delete()

    return deleted > 0
  }

  async revokeAllTokens(userId: number): Promise<number> {
    return await this.db()
      .table('personal_access_tokens')
      .where('tokenable_type', 'User')
      .where('tokenable_id', userId)
      .delete()
  }

  async listTokens(userId: number): Promise<PersonalAccessToken[]> {
    const tokens = await this.db()
      .table('personal_access_tokens')
      .where('tokenable_type', 'User')
      .where('tokenable_id', userId)
      .orderBy('created_at', 'desc')
      .get()

    return tokens.map((token: any) => this.parseToken(token))
  }

  async findById(id: number): Promise<PersonalAccessToken | null> {
    const token = await this.db().table('personal_access_tokens').where('id', id).first()

    return token ? this.parseToken(token) : null
  }

  async cleanExpiredTokens(): Promise<number> {
    return await this.db()
      .table('personal_access_tokens')
      .where('expires_at', '<', new Date())
      .delete()
  }

  private generatePlainToken(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  private async hashToken(plainToken: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(plainToken)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  private async verifyToken(plainToken: string, hashedToken: string): Promise<boolean> {
    const computedHash = await this.hashToken(plainToken)
    if (computedHash.length !== hashedToken.length) {
      return false
    }

    return timingSafeEqual(Buffer.from(computedHash), Buffer.from(hashedToken))
  }

  private calculateExpiration(minutes?: number): Date | null {
    if (!minutes) {
      return null
    }

    const expiration = new Date()
    expiration.setMinutes(expiration.getMinutes() + minutes)
    return expiration
  }

  private async updateLastUsed(tokenId: number): Promise<void> {
    await this.db().table('personal_access_tokens').where('id', tokenId).update({
      last_used_at: new Date(),
      updated_at: new Date(),
    })
  }

  private async findUser(userId: number): Promise<any> {
    return await this.db().table('users').where('id', userId).first()
  }

  private parseToken(row: any): PersonalAccessToken {
    return {
      id: row.id,
      tokenable_type: row.tokenable_type,
      tokenable_id: row.tokenable_id,
      name: row.name,
      token: row.token,
      abilities: row.abilities ? JSON.parse(row.abilities) : null,
      last_used_at: row.last_used_at ? new Date(row.last_used_at) : null,
      expires_at: row.expires_at ? new Date(row.expires_at) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }
  }
}
