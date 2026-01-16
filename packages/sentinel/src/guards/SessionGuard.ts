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

export class SessionGuard<User extends Authenticatable = Authenticatable>
  implements StatefulGuard<User>
{
  protected userInstance: User | null = null
  protected loggedOut = false

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

    // Access session via unknown cast to avoid depending on specific session implementation
    const session = this.ctx.get(
      'session' as keyof import('@gravito/core').GravitoVariables
    ) as unknown as SessionContract | undefined
    const id = session?.get(this.getName())

    if (!id) {
      return null
    }

    const user = (await this.provider.retrieveById(id)) as User | null
    this.userInstance = user

    return user
  }

  async id(): Promise<string | number | null> {
    if (this.loggedOut) {
      return null
    }
    const session = this.ctx.get(
      'session' as keyof import('@gravito/core').GravitoVariables
    ) as unknown as SessionContract | undefined
    const id = session?.get(this.getName())
    return (
      (id as string | number) ?? (this.userInstance ? this.userInstance.getAuthIdentifier() : null)
    )
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

  public async login(user: User, _remember = false): Promise<void> {
    const id = user.getAuthIdentifier()

    this.ctx.set('auth' as any, user as any)
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
}
