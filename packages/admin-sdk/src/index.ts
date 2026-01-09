export * from './AclManager'
export * from './ApiBridge'
export * from './AuthClient'
export * from './types'

import { AclManager } from './AclManager'
import { ApiBridge } from './ApiBridge'
import { AuthClient } from './AuthClient'

export interface AdminSdkConfig {
  baseUrl: string
}

/**
 * Gravito Admin SDK Main Entry
 */
export class AdminSdk {
  public readonly api: ApiBridge
  public readonly auth: AuthClient
  public readonly acl: AclManager

  constructor(config: AdminSdkConfig) {
    this.api = new ApiBridge(config.baseUrl)
    this.auth = new AuthClient(this.api)
    this.acl = new AclManager(() => this.auth.getUser())
  }
}

/**
 * Factory function to create SDK instance
 */
export function createAdminSdk(config: AdminSdkConfig): AdminSdk {
  return new AdminSdk(config)
}
