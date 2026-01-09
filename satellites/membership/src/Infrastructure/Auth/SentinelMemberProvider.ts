import type { Authenticatable, UserProvider } from '@gravito/sentinel'
import type { IMemberRepository } from '../../Domain/Contracts/IMemberRepository'
import type { Member } from '../../Domain/Entities/Member'

/**
 * Sentinel Member Provider
 *
 * Adapts our Member Repository to Gravito Sentinel's Auth system.
 */
export class SentinelMemberProvider implements UserProvider {
  constructor(private repository: IMemberRepository) {}

  async retrieveById(id: string): Promise<Authenticatable | null> {
    const member = await this.repository.findById(id)
    return member ? this.toAuthenticatable(member) : null
  }

  async retrieveByToken(id: string, token: string): Promise<Authenticatable | null> {
    const member = await this.repository.findById(id)
    if (member && member.getRememberToken() === token) {
      return member
    }
    return null
  }

  async updateRememberToken(user: Authenticatable, token: string): Promise<void> {
    const member = await this.repository.findById(user.getAuthIdentifier() as string)
    if (member) {
      member.setRememberToken(token)
      await this.repository.save(member)
    }
  }

  async retrieveByCredentials(credentials: Record<string, any>): Promise<Authenticatable | null> {
    if (!credentials.email) {
      return null
    }
    return await this.repository.findByEmail(credentials.email)
  }

  async validateCredentials(
    _user: Authenticatable,
    _credentials: Record<string, any>
  ): Promise<boolean> {
    // Note: In a real app, you might check if account is active here
    return true
  }

  private toAuthenticatable(member: Member): Authenticatable {
    return member
  }
}
