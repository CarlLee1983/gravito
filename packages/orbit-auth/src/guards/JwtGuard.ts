import type { Context } from 'hono'
import { verify } from 'hono/jwt'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { Guard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

export class JwtGuard<User extends Authenticatable = Authenticatable> implements Guard<User> {
  protected userInstance: User | null = null

  constructor(
    protected provider: UserProvider<User>,
    protected ctx: Context,
    protected secret: string,
    protected algo = 'HS256'
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

    try {
      const payload = await verify(token, this.secret, this.algo as Parameters<typeof verify>[2])
      if (payload?.sub) {
        this.userInstance = await this.provider.retrieveById(payload.sub as string)
      }
    } catch (_e) {
      // Token expired or invalid
      return null
    }

    return this.userInstance
  }

  async id(): Promise<string | number | null> {
    const user = await this.user()
    return user ? user.getAuthIdentifier() : null
  }

  async validate(credentials: Record<string, unknown>): Promise<boolean> {
    const user = await this.provider.retrieveByCredentials(credentials)
    return user ? await this.provider.validateCredentials(user, credentials) : false
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
    if (!header || !header.startsWith('Bearer ')) {
      return this.ctx.req.query('token') || null
    }
    return header.substring(7)
  }
}
