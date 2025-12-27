import type { Context } from '@gravito/photon'
import type { Authenticatable } from '../contracts/Authenticatable'
import type { StatefulGuard } from '../contracts/Guard'
import type { UserProvider } from '../contracts/UserProvider'

export class SessionGuard<User extends Authenticatable = Authenticatable>
  implements StatefulGuard<User>
{
  protected userInstance: User | null = null
  protected loggedOut = false

  constructor(
    protected name: string,
    protected provider: UserProvider<User>,
    protected ctx: Context,
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

    const session = this.ctx.get('session' as any) as any
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
    const id = this.ctx.get('session').get(this.getName())
    return id ?? (this.userInstance ? this.userInstance.getAuthIdentifier() : null)
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
    const id =
      typeof user.getAuthIdentifier === 'function' ? user.getAuthIdentifier() : (user as any).id

    this.ctx.set('auth', user)
    this.userInstance = user

    const session = this.ctx.get('session' as any) as any
    if (session) {
      session.put(this.getName(), id)
    }

    this.loggedOut = false
  }

  async logout(): Promise<void> {
    this.userInstance = null
    this.loggedOut = true
    this.ctx.get('session').forget(this.getName())
    this.ctx.get('session').regenerate()
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
