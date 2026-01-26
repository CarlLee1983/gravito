export interface OAuthProviderConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes?: string[]
}

export interface OAuthUser {
  id: string
  name: string
  email: string
  avatar?: string
  raw: any
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
}

export interface OAuthProvider {
  getAuthorizationUrl(state: string, scopes?: string[]): string
  getUser(code: string): Promise<OAuthUser>
}
