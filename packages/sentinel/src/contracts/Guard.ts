import type { Authenticatable } from './Authenticatable'
import type { UserProvider } from './UserProvider'

/**
 * Core interface for authentication guards.
 *
 * Guards are responsible for determining if a request is authenticated
 * and retrieving the currently authenticated user instance.
 *
 * @public
 */
export interface Guard<User extends Authenticatable = Authenticatable> {
  /**
   * Determine if the current user is authenticated.
   *
   * @returns True if a user is logged in, false otherwise
   */
  check(): Promise<boolean>

  /**
   * Determine if the current user is a guest (not authenticated).
   *
   * @returns True if no user is logged in, false otherwise
   */
  guest(): Promise<boolean>

  /**
   * Get the currently authenticated user instance.
   *
   * @returns The user instance or null if not authenticated
   */
  user(): Promise<User | null>

  /**
   * Get the unique identifier for the currently authenticated user.
   *
   * @returns The user ID or null if not authenticated
   */
  id(): Promise<string | number | null>

  /**
   * Validate a user's credentials without logging them in.
   *
   * @param credentials - Key-value pairs of credentials (e.g., email and password)
   * @returns True if credentials are valid, false otherwise
   */
  validate(credentials: Record<string, unknown>): Promise<boolean>

  /**
   * Manually set the current user for the guard.
   *
   * @param user - The user instance to set as authenticated
   * @returns The guard instance for chaining
   */
  setUser(user: User): this

  /**
   * Get the user provider instance used by the guard.
   *
   * @returns The UserProvider implementation
   */
  getProvider(): UserProvider<User>

  /**
   * Set the user provider instance for the guard.
   *
   * @param provider - The new UserProvider implementation
   */
  setProvider(provider: UserProvider<User>): void
}

/**
 * Interface for stateful guards that support session-based authentication.
 *
 * Stateful guards provide methods for managing the lifecycle of an
 * authentication session, including login, logout, and persistent sessions.
 *
 * @public
 */
export interface StatefulGuard<User extends Authenticatable = Authenticatable> extends Guard<User> {
  /**
   * Attempt to authenticate a user using the given credentials and start a session.
   *
   * @param credentials - Key-value pairs for authentication
   * @param remember - Whether to enable a long-lived "remember me" session
   * @returns True if authentication succeeded and session started, false otherwise
   */
  attempt(credentials: Record<string, unknown>, remember?: boolean): Promise<boolean>

  /**
   * Log a specific user instance into the application.
   *
   * @param user - The user to log in
   * @param remember - Whether to enable a long-lived "remember me" session
   */
  login(user: User, remember?: boolean): Promise<void>

  /**
   * Log the user out of the application and terminate the session.
   */
  logout(): Promise<void>
}
