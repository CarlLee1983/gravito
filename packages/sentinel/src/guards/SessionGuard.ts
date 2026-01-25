import type { GravitoContext } from '@gravito/core'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { StatefulGuard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

interface SessionContract {
  get(key: string): string | number | undefined
  put(key: string, value: unknown): void
  forget(key: string): void
  regenerate?(): Promise<void>
}

/**
 * Guard implementation for session-based authentication.
 * @public
 */
export class SessionGuard<User extends Authenticatable = Authenticatable>
  implements StatefulGuard<User>
{
  protected userInstance: User | null = null
  protected loggedOut = false
  protected rememberCookieName = 'remember_token'
  protected rememberDuration = 60 * 60 * 24 * 30

  constructor(
    protected name: string,
    protected provider: UserProvider<User>,
    protected ctx: GravitoContext,
    protected sessionKey = 'auth_session'
  ) {}

  async check(): Promise<boolean> {
    return (await this.user()) !== null
  }

  async guest(): Promise<boolean> {
    return !(await this.check())
  }

  public async user(): Promise<User | null> {
    if (this.loggedOut) {
      return null
    }

    if (this.userInstance) {
      return this.userInstance
    }

    const session = this.ctx.get(
      'session' as keyof import('@gravito/core').GravitoVariables
    ) as unknown as SessionContract | undefined
    const id = session?.get(this.getName())

    if (id) {
      this.userInstance = (await this.provider.retrieveById(id)) as User | null
      return this.userInstance
    }

    this.userInstance = await this.retrieveFromRememberCookie()

    return this.userInstance
  }

  async id(): Promise<string | number | null> {
    if (this.loggedOut) {
      return null
    }
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

  async attempt(credentials: Record<string, unknown>, remember = false): Promise<boolean> {
    const user = await this.provider.retrieveByCredentials(credentials)

    if (!user || !(await this.provider.validateCredentials(user, credentials))) {
      return false
    }

    await this.login(user, remember)
    return true
  }

  public async login(user: User, remember = false): Promise<void> {
    const id = user.getAuthIdentifier()

    this.userInstance = user

    const session = this.ctx.get(
      'session' as keyof import('@gravito/core').GravitoVariables
    ) as unknown as SessionContract | undefined
    if (session) {
      if (typeof session.regenerate === 'function') {
        await session.regenerate()
      }
      session.put(this.getName(), id)
    }

    if (remember && user.setRememberToken) {
      const token = this.generateRememberToken()
      user.setRememberToken(token)
      if (this.provider.updateRememberToken) {
        await this.provider.updateRememberToken(user, token)
      }
      this.setRememberCookie(id, token)
    }

    this.loggedOut = false
  }

  async logout(): Promise<void> {
    this.userInstance = null
    this.loggedOut = true
    const session = this.ctx.get(
      'session' as keyof import('@gravito/core').GravitoVariables
    ) as unknown as SessionContract | undefined
    if (session) {
      session.forget(this.getName())
      if (typeof session.regenerate === 'function') {
        await session.regenerate()
      }
    }
    this.ctx.header('Set-Cookie', `${this.rememberCookieName}=; Path=/; HttpOnly; Max-Age=0`)
  }

  getProvider(): UserProvider<User> {
    return this.provider
  }

  setProvider(provider: UserProvider<User>): void {
    this.provider = provider
  }

  protected getName(): string {
    return `login_${this.name}_${this.sessionKey}`
  }

  private generateRememberToken(): string {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`
  }

  private setRememberCookie(id: string | number, token: string): void {
    const value = `${id}|${token}`
    this.ctx.header(
      'Set-Cookie',
      `${this.rememberCookieName}=${value}; Path=/; HttpOnly; Max-Age=${this.rememberDuration}`
    )
  }

  private async retrieveFromRememberCookie(): Promise<User | null> {
    const cookieString = this.ctx.req.header('Cookie')
    if (!cookieString) return null

    const cookies = cookieString.split(';').reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      },
      {} as Record<string, string>
    )

    const rememberToken = cookies[this.rememberCookieName]
    if (!rememberToken) return null

    const [id, token] = rememberToken.split('|')
    if (!id || !token) return null

    if (this.provider.retrieveByToken) {
      const user = await this.provider.retrieveByToken(id, token)
      return user as User | null
    }

    return null
  }
}
