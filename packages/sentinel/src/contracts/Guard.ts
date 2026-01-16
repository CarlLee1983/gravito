import type { Authenticatable } from './Authenticatable'
import type { UserProvider } from './UserProvider'

/**
 * Guard interface for handling authentication.
 * @public
 */
export interface Guard<User extends Authenticatable = Authenticatable> {
  /**
   * Determine if the current user is authenticated.
   */
  check(): Promise<boolean>

  /**
   * Determine if the current user is a guest.
   */
  guest(): Promise<boolean>

  /**
   * Get the currently authenticated user.
   */
  user(): Promise<User | null>

  /**
   * Get the ID for the currently authenticated user.
   */
  id(): Promise<string | number | null>

  /**
   * Validate a user's credentials.
   */
  validate(credentials: Record<string, unknown>): Promise<boolean>

  /**
   * Set the current user.
   */
  setUser(user: User): this

  /**
   * Get the user provider used by the guard.
   */
  getProvider(): UserProvider<User>

  /**
   * Set the user provider used by the guard.
   */
  setProvider(provider: UserProvider<User>): void
}

/**
 * Stateful Guard interface (e.g. Session).
 * Supports logging in and logging out.
 * @public
 */
export interface StatefulGuard<User extends Authenticatable = Authenticatable> extends Guard<User> {
  /**
   * Attempt to authenticate a user using the given credentials.
   */
  attempt(credentials: Record<string, unknown>, remember?: boolean): Promise<boolean>

  /**
   * Log a user into the application.
   */
  login(user: User, remember?: boolean): Promise<void>

  /**
   * Log the user out of the application.
   */
  logout(): Promise<void>
}
