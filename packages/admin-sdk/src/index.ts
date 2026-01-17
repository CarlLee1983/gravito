export * from './AclManager'
export * from './ApiBridge'
export * from './AuthClient'
export * from './types'

import { AclManager } from './AclManager'
import { ApiBridge } from './ApiBridge'
import { AuthClient } from './AuthClient'

/**
 * Base configuration for the Admin SDK.
 * @public
 */
export interface AdminSdkConfig {
  /** The base URL of the Gravito Admin API (e.g., 'https://api.myapp.com/admin') */
  baseUrl: string
}

/**
 * The core client for interacting with the Gravito Admin ecosystem.
 * Provides unified access to authentication, ACL checks, and raw API communication.
 *
 * @example
 * ```typescript
 * const sdk = new AdminSdk({ baseUrl: '/admin/api' });
 * await sdk.auth.login('admin', 'password');
 * if (sdk.acl.can('users.edit')) {
 *   // ... perform admin action
 * }
 * ```
 * @public
 */
export class AdminSdk {
  /** Low-level API bridge for communicating with the backend */
  public readonly api: ApiBridge
  /** Authentication and session management client */
  public readonly auth: AuthClient
  /** Access Control List manager for checking permissions */
  public readonly acl: AclManager

  constructor(config: AdminSdkConfig) {
    this.api = new ApiBridge(config.baseUrl)
    this.auth = new AuthClient(this.api)
    this.acl = new AclManager(() => this.auth.getUser())
  }
}

/**
 * Convenience factory function to instantiate the Admin SDK.
 *
 * @param config - The SDK configuration.
 * @returns A new AdminSdk instance.
 * @public
 */
export function createAdminSdk(config: AdminSdkConfig): AdminSdk {
  return new AdminSdk(config)
}
