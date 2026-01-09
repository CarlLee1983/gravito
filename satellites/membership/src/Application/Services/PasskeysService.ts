import { AuthenticationException } from '@gravito/core'
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  WebAuthnCredential,
} from '@simplewebauthn/server'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import type { IMemberPasskeyRepository } from '../../Domain/Contracts/IMemberPasskeyRepository'
import type { Member } from '../../Domain/Entities/Member'
import { MemberPasskey } from '../../Domain/Entities/MemberPasskey'

interface SessionLike {
  get(key: string): string | null | undefined
  put(key: string, value: unknown): void
  forget?(key: string): void
}

const SESSION_KEYS = {
  registration: 'membership.passkeys.registration.challenge',
  authentication: 'membership.passkeys.authentication.challenge',
}

export interface PasskeysConfig {
  rpName: string
  rpID: string
  origin: string
  timeout?: number
  userVerification?: 'required' | 'preferred' | 'discouraged'
  attestationType?: 'direct' | 'enterprise' | 'none'
}

export class PasskeysService {
  constructor(
    private passkeyRepo: IMemberPasskeyRepository,
    private config: PasskeysConfig
  ) {}

  public async generateRegistrationOptions(member: Member, session: SessionLike) {
    const credentials = await this.passkeyRepo.findByMemberId(member.id)
    const options = await generateRegistrationOptions({
      rpName: this.config.rpName,
      rpID: this.config.rpID,
      userName: member.email,
      userID: new TextEncoder().encode(member.id),
      attestationType: this.config.attestationType ?? 'none',
      timeout: this.config.timeout || 60000,
      userDisplayName: member.name,
      authenticatorSelection: {
        userVerification: this.config.userVerification ?? 'preferred',
      },
      excludeCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        type: 'public-key',
        transports: normalizeTransports(credential.transports),
      })),
    })

    this.storeChallenge(session, SESSION_KEYS.registration, options.challenge)
    return options
  }

  public async verifyRegistrationResponse(
    member: Member,
    response: RegistrationResponseJSON,
    session: SessionLike,
    displayName?: string
  ) {
    const challenge = this.requireChallenge(session, SESSION_KEYS.registration)

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.config.origin,
      expectedRPID: this.config.rpID,
      requireUserVerification: this.config.userVerification !== 'discouraged',
    })

    this.clearChallenge(session, SESSION_KEYS.registration)

    if (!verification.verified || !verification.registrationInfo) {
      throw new AuthenticationException('Passkey registration could not be verified.')
    }

    const { credential } = verification.registrationInfo

    const passkey = MemberPasskey.create({
      memberId: member.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      transports: credential.transports,
      displayName,
    })

    await this.passkeyRepo.save(passkey)
    return passkey
  }

  public async generateAuthenticationOptions(member: Member, session: SessionLike) {
    const credentials = await this.passkeyRepo.findByMemberId(member.id)

    const options = await generateAuthenticationOptions({
      rpID: this.config.rpID,
      timeout: this.config.timeout || 60000,
      userVerification: this.config.userVerification ?? 'preferred',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credentialId,
        transports: normalizeTransports(credential.transports),
      })),
    })

    this.storeChallenge(session, SESSION_KEYS.authentication, options.challenge)
    return options
  }

  public async verifyAuthenticationResponse(
    member: Member,
    response: AuthenticationResponseJSON,
    session: SessionLike
  ) {
    const challenge = this.requireChallenge(session, SESSION_KEYS.authentication)
    const credential = await this.passkeyRepo.findByCredentialId(response.id)

    if (!credential) {
      throw new AuthenticationException('Passkey not registered.')
    }

    if (credential.memberId !== member.id) {
      throw new AuthenticationException('Passkey does not belong to the member.')
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.config.origin,
      expectedRPID: this.config.rpID,
      credential: buildWebAuthnCredential(credential),
      requireUserVerification: this.config.userVerification !== 'discouraged',
    })

    this.clearChallenge(session, SESSION_KEYS.authentication)

    if (!verification.verified) {
      throw new AuthenticationException('Passkey authentication failed.')
    }

    credential.updateCounter(verification.authenticationInfo.newCounter)
    await this.passkeyRepo.save(credential)
    return credential
  }

  private storeChallenge(session: SessionLike, key: string, challenge: string) {
    this.sessionGuard(session)
    session.put(key, challenge)
  }

  private requireChallenge(session: SessionLike, key: string): string {
    this.sessionGuard(session)
    const challenge = session.get(key)
    if (!challenge) {
      throw new AuthenticationException('Passkey challenge is missing.')
    }
    return challenge
  }

  private clearChallenge(session: SessionLike, key: string) {
    this.sessionGuard(session)
    if (typeof session.forget === 'function') {
      session.forget(key)
    }
  }

  private sessionGuard(session: SessionLike) {
    if (!session || typeof session.put !== 'function' || typeof session.get !== 'function') {
      throw new AuthenticationException('Session store is required for Passkeys.')
    }
  }
}

function normalizeTransports(transports?: string[]): AuthenticatorTransportFuture[] | undefined {
  return transports ? (transports as AuthenticatorTransportFuture[]) : undefined
}

function buildWebAuthnCredential(passkey: MemberPasskey): WebAuthnCredential {
  const publicKey = Buffer.from(passkey.publicKey, 'base64')
  return {
    id: passkey.credentialId,
    publicKey,
    counter: passkey.counter,
    transports: normalizeTransports(passkey.transports),
  }
}
