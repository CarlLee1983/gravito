import type { GravitoContext } from '@gravito/core'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { Guard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

/**
 * Guard implementation for simple API token authentication.
 * @public
 */
export class TokenGuard<User extends Authenticatable = Authenticatable> implements Guard<User> {
  protected userInstance: User | null = null

  constructor(
    protected provider: UserProvider<User>,
    protected ctx: GravitoContext,
    protected inputKey = 'api_token',
    protected storageKey = 'api_token',
    protected hash = false,
    protected allowQueryToken = false,
    protected hashAlgorithm: 'sha256' | 'sha512' = 'sha256'
  ) {}

  async check(): Promise<boolean> {
    return (await this.user()) !== null
  }

  async guest(): Promise<boolean> {
    return !(await this.check())
  }

  async user(): Promise<User | null> {
    if (this.userInstance) {
      return this.userInstance
    }

    let token = this.getTokenForRequest()

    if (!token) {
      return null
    }

    if (this.hash) {
      token = await this.hashToken(token)
    }

    if (this.provider.retrieveByCredentials) {
      this.userInstance = await this.provider.retrieveByCredentials({
        [this.storageKey]: token,
      })
    }

    return this.userInstance
  }

  private async hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)
    const hashBuffer = await crypto.subtle.digest(this.hashAlgorithm.toUpperCase(), data)
    return Buffer.from(hashBuffer).toString('hex')
  }

  async id(): Promise<string | number | null> {
    const user = await this.user()
    return user ? user.getAuthIdentifier() : null
  }

  async validate(credentials: Record<string, unknown>): Promise<boolean> {
    if (this.provider.retrieveByCredentials) {
      const user = await this.provider.retrieveByCredentials(credentials)
      if (user && this.provider.validateCredentials) {
        return await this.provider.validateCredentials(user, credentials)
      }
    }
    return false
  }

  setUser(user: User): this {
    this.userInstance = user
    return this
  }

  getProvider(): UserProvider<User> {
    return this.provider
  }

  setProvider(provider: UserProvider<User>): void {
    this.provider = provider
  }

  protected getTokenForRequest(): string | null {
    const header = this.ctx.req.header('Authorization')
    if (header?.startsWith('Bearer ')) {
      return header.substring(7)
    }

    if (this.allowQueryToken) {
      return this.ctx.req.query(this.inputKey) || null
    }

    return null
  }
}
