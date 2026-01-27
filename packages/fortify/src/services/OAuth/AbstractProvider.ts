import type { OAuthProvider, OAuthProviderConfig, OAuthUser } from './types'

export abstract class AbstractProvider implements OAuthProvider {
  constructor(protected config: OAuthProviderConfig) {}

  abstract getAuthorizationUrl(state: string, scopes?: string[]): string
  abstract getUser(code: string): Promise<OAuthUser>

  protected getScopes(scopes?: string[]): string[] {
    return scopes || this.config.scopes || []
  }
}
