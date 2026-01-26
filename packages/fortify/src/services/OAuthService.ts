import type { OAuthProvider } from './OAuth/types'

export class OAuthService {
  private providers: Map<string, OAuthProvider> = new Map()

  register(name: string, provider: OAuthProvider) {
    this.providers.set(name, provider)
  }

  getProvider(name: string): OAuthProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`OAuth provider '${name}' not found`)
    }
    return provider
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name)
  }
}
