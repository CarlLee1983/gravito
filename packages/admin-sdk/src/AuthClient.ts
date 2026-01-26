import type { ApiBridge } from './ApiBridge'
import type { IAdminUser, IAuthResponse } from './types'

/**
 * AuthClient handles authentication against the Gravito Admin API.
 *
 * It manages user sessions, provides login/logout functionality, and
 * maintains the current user's state using local storage for persistence.
 *
 * @public
 * @since 3.0.0
 */
export class AuthClient {
  private user: IAdminUser | null = null

  constructor(private api: ApiBridge) {}

  /**
   * Login to the admin system
   */
  async login(credentials: {
    email?: string
    username?: string
    password?: string
  }): Promise<IAdminUser> {
    const response = await this.api.post<IAuthResponse>('/auth/login', credentials)

    this.user = response.user
    localStorage.setItem('gravito_admin_token', response.token)

    return this.user
  }

  /**
   * Logout and clear local state
   */
  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout')
    } catch {
      // Ignore errors during logout
    } finally {
      this.user = null
      localStorage.removeItem('gravito_admin_token')
    }
  }

  /**
   * Fetch the current logged-in user profile
   */
  async me(): Promise<IAdminUser | null> {
    if (this.user) {
      return this.user
    }

    const token = localStorage.getItem('gravito_admin_token')
    if (!token) {
      return null
    }

    try {
      this.user = await this.api.get<IAdminUser>('/auth/me')
      return this.user
    } catch {
      localStorage.removeItem('gravito_admin_token')
      return null
    }
  }

  getUser() {
    return this.user
  }

  isAuthenticated(): boolean {
    return !!this.user || !!localStorage.getItem('gravito_admin_token')
  }
}
