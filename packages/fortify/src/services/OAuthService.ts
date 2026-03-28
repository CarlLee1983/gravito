import { FortifyError } from '../errors/FortifyError'
import { ErrorCodes } from '../errors/codes'
import type { OAuthProvider } from './OAuth/types'

export class OAuthService {
  private providers: Map<string, OAuthProvider> = new Map()

  register(name: string, provider: OAuthProvider) {
    this.providers.set(name, provider)
  }

  getProvider(name: string): OAuthProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new FortifyError(ErrorCodes.OAUTH_UNKNOWN_PROVIDER, 404, { name })
    }
    return provider
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name)
  }
}
