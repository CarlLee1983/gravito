import type { GravitoContext } from '@gravito/core'
import { AuthenticationException } from '@gravito/core'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server'
import type { PasskeysService } from '../../../Application/Services/PasskeysService'
import type { IMemberRepository } from '../../../Domain/Contracts/IMemberRepository'
import type { Member } from '../../../Domain/Entities/Member'

type SessionLike = {
  get(key: string): string | null | undefined
  put(key: string, value: unknown): void
  forget?(key: string): void
}

export class PasskeyController {
  constructor(
    private passkeys: PasskeysService,
    private members: IMemberRepository
  ) {}

  async registrationOptions(c: GravitoContext) {
    const auth = c.get('auth')
    if (!auth) {
      throw new AuthenticationException('Auth manager is unavailable.')
    }
    const member = (await auth.authenticate()) as Member
    const session = this.resolveSession(c)
    const options = await this.passkeys.generateRegistrationOptions(member, session)
    return c.json(options)
  }

  async verifyRegistration(c: GravitoContext) {
    const auth = c.get('auth')
    if (!auth) {
      throw new AuthenticationException('Auth manager is unavailable.')
    }
    const member = (await auth.authenticate()) as Member
    const session = this.resolveSession(c)
    const body = (await c.req.json()) as {
      credential: RegistrationResponseJSON
      displayName?: string
    }
    await this.passkeys.verifyRegistrationResponse(
      member,
      body.credential,
      session,
      body.displayName
    )
    return c.json({ success: true })
  }

  async loginOptions(c: GravitoContext) {
    const session = this.resolveSession(c)
    const body = (await c.req.json()) as { email?: string }
    if (!body?.email) {
      return c.json({ error: 'Email is required' }, 400)
    }
    const member = await this.members.findByEmail(body.email)
    if (!member) {
      return c.json({ error: 'Member not found' }, 404)
    }
    const options = await this.passkeys.generateAuthenticationOptions(member, session)
    return c.json(options)
  }

  async verifyAuthentication(c: GravitoContext) {
    const session = this.resolveSession(c)
    const body = (await c.req.json()) as {
      email: string
      assertion: AuthenticationResponseJSON
    }
    if (!body?.email || !body.assertion) {
      return c.json({ error: 'Email and assertion are required' }, 400)
    }
    const member = await this.members.findByEmail(body.email)
    if (!member) {
      return c.json({ error: 'Member not found' }, 404)
    }
    await this.passkeys.verifyAuthenticationResponse(member, body.assertion, session)
    const auth = c.get('auth')
    if (!auth) {
      throw new AuthenticationException('Auth manager is unavailable.')
    }
    await auth.login(member)
    return c.json({ success: true })
  }

  private resolveSession(c: GravitoContext): SessionLike {
    const session = c.get('session') as SessionLike | undefined
    if (session) {
      return session
    }
    const fallback = (c.req as any).session
    if (fallback) {
      return fallback
    }
    throw new AuthenticationException('Session storage is required for Passkeys.')
  }
}
