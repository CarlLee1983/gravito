/**
 * Interface for WebAuthn authentication service.
 * @public
 */
export interface WebAuthnService {
  /**
   * Generate registration options for a new passkey.
   */
  generateRegistrationOptions(user: WebAuthnUser): Promise<PublicKeyCredentialCreationOptionsJSON>

  /**
   * Verify the registration response.
   */
  verifyRegistration(
    user: WebAuthnUser,
    response: RegistrationResponseJSON
  ): Promise<VerifiedRegistrationResponse>

  /**
   * Generate authentication options for login.
   */
  generateAuthenticationOptions(username: string): Promise<PublicKeyCredentialRequestOptionsJSON>

  /**
   * Verify the authentication response.
   */
  verifyAuthentication(
    username: string,
    response: AuthenticationResponseJSON
  ): Promise<VerifiedAuthenticationResponse>
}

/**
 * User interface compatible with WebAuthn.
 * @public
 */
export interface WebAuthnUser {
  id: string
  username: string
  displayName?: string
}

// These types are simplified representations of @simplewebauthn/typescript-types
// We define them here to avoid a hard dependency on the library in the interface.

export type PublicKeyCredentialCreationOptionsJSON = Record<string, unknown>
export type RegistrationResponseJSON = Record<string, unknown>
export type VerifiedRegistrationResponse = { verified: boolean; registrationInfo?: unknown }

export type PublicKeyCredentialRequestOptionsJSON = Record<string, unknown>
export type AuthenticationResponseJSON = Record<string, unknown>
export type VerifiedAuthenticationResponse = { verified: boolean; authenticationInfo?: unknown }
