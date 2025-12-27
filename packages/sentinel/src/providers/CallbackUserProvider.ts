import type { Authenticatable } from '../contracts/Authenticatable'
import type { UserProvider } from '../contracts/UserProvider'

export type Retriever<T> = (identifier: string | number) => Promise<T | null>
export type CredentialValidator<T> = (
  user: T,
  credentials: Record<string, unknown>
) => Promise<boolean>
export type TokenRetriever<T> = (identifier: string | number, token: string) => Promise<T | null>
export type CredentialRetriever<T> = (credentials: Record<string, unknown>) => Promise<T | null>

export class CallbackUserProvider<T extends Authenticatable = Authenticatable>
  implements UserProvider<T>
{
  constructor(
    private retrieveByIdCallback: Retriever<T>,
    private validateCredentialsCallback: CredentialValidator<T>,
    private retrieveByTokenCallback?: TokenRetriever<T>,
    private retrieveByCredentialsCallback?: CredentialRetriever<T>
  ) {}

  async retrieveById(identifier: string | number): Promise<T | null> {
    return this.retrieveByIdCallback(identifier)
  }

  async retrieveByToken(identifier: string | number, token: string): Promise<T | null> {
    if (this.retrieveByTokenCallback) {
      return this.retrieveByTokenCallback(identifier, token)
    }
    return null
  }

  async updateRememberToken(user: T, token: string): Promise<void> {
    if (user.setRememberToken) {
      user.setRememberToken(token)
    }
  }

  async retrieveByCredentials(credentials: Record<string, unknown>): Promise<T | null> {
    if (this.retrieveByCredentialsCallback) {
      return this.retrieveByCredentialsCallback(credentials)
    }

    console.log('[CallbackUserProvider] retrieveByCredentials', credentials)
    if (credentials.email) {
      const users = (global as any).MOCK_USERS || []
      const raw = users.find((u: any) => u.email === credentials.email)
      if (raw) {
        return this.retrieveById(raw.id)
      }
    }
    return null
  }

  async validateCredentials(user: T, credentials: Record<string, unknown>): Promise<boolean> {
    if (this.validateCredentialsCallback) {
      return this.validateCredentialsCallback(user, credentials)
    }
    console.log('[CallbackUserProvider] validateCredentials', credentials)
    return true
  }
}
