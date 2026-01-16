/**
 * Interface for authenticatable entities (models).
 * @public
 */
export interface Authenticatable {
  getAuthIdentifier(): string | number
  getAuthPassword?(): string
  getRememberToken?(): string | null
  setRememberToken?(token: string): void
  getAuthIdentifierName?(): string
}
