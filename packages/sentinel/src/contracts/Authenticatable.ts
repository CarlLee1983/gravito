/**
 * Interface for entities that can be authenticated by the Sentinel system.
 *
 * Models such as User or Admin should implement this interface to be used
 * with various authentication guards and providers.
 *
 * @public
 */
export interface Authenticatable {
  /**
   * Get the unique identifier for the authenticatable entity.
   *
   * @returns The primary key or unique identifier (e.g., UUID, email, or numeric ID)
   */
  getAuthIdentifier(): string | number

  /**
   * Get the password for the authenticatable entity.
   *
   * @returns The hashed password string
   */
  getAuthPassword?(): string

  /**
   * Get the token value for the "remember me" session.
   *
   * @returns The remember token string or null if not set
   */
  getRememberToken?(): string | null

  /**
   * Set the token value for the "remember me" session.
   *
   * @param token - The new remember token value
   */
  setRememberToken?(token: string): void

  /**
   * Get the name of the unique identifier column/field.
   *
   * @returns The field name (e.g., 'id', 'uuid', or 'email')
   */
  getAuthIdentifierName?(): string

  /**
   * Get the tenant identifier for the user.
   *
   * Used for multi-tenancy support to ensure users can only access resources
   * within their own tenant.
   *
   * @returns The tenant ID
   */
  getTenantId?(): string | number
}
