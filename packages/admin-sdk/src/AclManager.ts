import type { IAdminUser } from './types'

/**
 * AclManager handles Access Control List (ACL) checks based on user permissions.
 *
 * It supports granular permission checks, SuperAdmin mode (via '*' permission),
 * and aggregate checks (ANY or ALL permissions).
 *
 * @public
 * @since 3.0.0
 */
export class AclManager {
  constructor(private userProvider: () => IAdminUser | null) {}

  /**
   * Check if user has a specific permission
   */
  can(permission: string): boolean {
    const user = this.userProvider()
    if (!user) {
      return false
    }

    // SuperAdmin mode: if user has '*' permission
    if (user.permissions.includes('*')) {
      return true
    }

    return user.permissions.includes(permission)
  }

  /**
   * Check if user has ANY of the permissions
   */
  any(permissions: string[]): boolean {
    return permissions.some((p) => this.can(p))
  }

  /**
   * Check if user has ALL of the permissions
   */
  all(permissions: string[]): boolean {
    return permissions.every((p) => this.can(p))
  }
}
