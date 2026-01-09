import { describe, expect, it } from 'bun:test'
import type { PasskeysConfig } from '../src/Application/Services/PasskeysService'
import { PasskeysService } from '../src/Application/Services/PasskeysService'
import type { IMemberPasskeyRepository } from '../src/Domain/Contracts/IMemberPasskeyRepository'
import { Member } from '../src/Domain/Entities/Member'
import { MemberPasskey } from '../src/Domain/Entities/MemberPasskey'

class InMemoryPasskeyRepository implements IMemberPasskeyRepository {
  private store = new Map<string, MemberPasskey>()

  async save(entity: MemberPasskey): Promise<void> {
    this.store.set(entity.id, entity)
  }

  async findById(id: string): Promise<MemberPasskey | null> {
    return this.store.get(id) ?? null
  }

  async findAll(): Promise<MemberPasskey[]> {
    return Array.from(this.store.values())
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return this.store.has(id)
  }

  async findByMemberId(memberId: string): Promise<MemberPasskey[]> {
    return Array.from(this.store.values()).filter((entry) => entry.memberId === memberId)
  }

  async findByCredentialId(credentialId: string): Promise<MemberPasskey | null> {
    return (
      Array.from(this.store.values()).find((entry) => entry.credentialId === credentialId) ?? null
    )
  }

  async deleteByCredentialId(credentialId: string): Promise<void> {
    const entry = await this.findByCredentialId(credentialId)
    if (entry) {
      this.store.delete(entry.id)
    }
  }
}

function createSession() {
  const store = new Map<string, string>()
  return {
    get(key: string) {
      return store.get(key)
    },
    put(key: string, value: string) {
      store.set(key, value)
    },
    forget(key: string) {
      store.delete(key)
    },
    __store: store,
  }
}

const config: PasskeysConfig = {
  rpName: 'Test Membership',
  rpID: 'localhost',
  origin: 'http://localhost:3000',
  timeout: 45000,
  userVerification: 'preferred' as const,
  attestationType: 'none' as const,
}

function createService() {
  return new PasskeysService(new InMemoryPasskeyRepository(), config)
}

describe('PasskeysService', () => {
  it('stores the generated registration challenge in the session', async () => {
    const member = Member.create('member-1', 'Test User', 'test@example.com', 'hash')
    const session = createSession()
    const service = createService()

    const options = await service.generateRegistrationOptions(member, session)
    expect(options.challenge).toBeTruthy()
    expect(session.__store.get('membership.passkeys.registration.challenge')).toBe(
      options.challenge
    )
  })

  it('includes stored credentials when generating authentication options', async () => {
    const member = Member.create('member-2', 'Verifier', 'verify@example.com', 'hash')
    const passkeyRepo = new InMemoryPasskeyRepository()
    const service = new PasskeysService(passkeyRepo, config)
    const credential = MemberPasskey.create({
      memberId: member.id,
      credentialId: Buffer.from('credential-123').toString('base64url'),
      publicKey: Buffer.from('public-key').toString('base64'),
      counter: 0,
      transports: ['usb'],
    })
    await passkeyRepo.save(credential)

    const session = createSession()
    const options = await service.generateAuthenticationOptions(member, session)

    expect(options.allowCredentials?.length).toBeGreaterThan(0)
    expect(session.__store.get('membership.passkeys.authentication.challenge')).toBe(
      options.challenge
    )
    expect(options.allowCredentials?.[0].id).toBe(credential.credentialId)
  })
})
