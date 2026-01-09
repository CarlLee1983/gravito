import type { Context } from '@gravito/photon'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { Guard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

export class TokenGuard<User extends Authenticatable = Authenticatable> implements Guard<User> {
  protected userInstance: User | null = null

  constructor(
    protected provider: UserProvider<User>,
    protected ctx: Context,
    protected inputKey = 'api_token',
    protected storageKey = 'api_token',
    protected hash = false,
    protected allowQueryToken = false
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

    const token = this.getTokenForRequest()

    if (!token) {
      return null
    }

    if (this.provider.retrieveByCredentials) {
      this.userInstance = await this.provider.retrieveByCredentials({
        [this.storageKey]: token,
      })
    }

    return this.userInstance
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
