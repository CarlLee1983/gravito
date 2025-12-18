import crypto from 'node:crypto'
import type { HashManager } from './HashManager'

export interface PasswordResetTokenRecord {
  tokenHash: string
  expiresAt: number
}

export interface PasswordResetTokenRepository {
  put(identifier: string, record: PasswordResetTokenRecord): Promise<void>
  get(identifier: string): Promise<PasswordResetTokenRecord | null>
  forget(identifier: string): Promise<void>
}

export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  private store = new Map<string, PasswordResetTokenRecord>()

  async put(identifier: string, record: PasswordResetTokenRecord): Promise<void> {
    this.store.set(identifier, record)
  }

  async get(identifier: string): Promise<PasswordResetTokenRecord | null> {
    return this.store.get(identifier) ?? null
  }

  async forget(identifier: string): Promise<void> {
    this.store.delete(identifier)
  }
}

export interface PasswordBrokerOptions {
  ttlSeconds?: number
  tokenBytes?: number
  invalidateOnSuccess?: boolean
}

export class PasswordBroker {
  constructor(
    private readonly repository: PasswordResetTokenRepository,
    private readonly hasher: HashManager,
    private readonly options: PasswordBrokerOptions = {}
  ) {}

  /**
   * Create a password reset token for a given identifier (usually an email).
   *
   * Returns the plaintext token so the caller can send it via email.
   */
  async createToken(identifier: string): Promise<string> {
    const ttlSeconds = this.options.ttlSeconds ?? 3600
    const tokenBytes = this.options.tokenBytes ?? 32

    const token = crypto.randomBytes(tokenBytes).toString('hex')
    const tokenHash = await this.hasher.make(token)

    await this.repository.put(identifier, {
      tokenHash,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })

    return token
  }

  /**
   * Verify a password reset token.
   */
  async verifyToken(identifier: string, token: string): Promise<boolean> {
    const record = await this.repository.get(identifier)
    if (!record) return false

    if (Date.now() > record.expiresAt) {
      await this.repository.forget(identifier)
      return false
    }

    const ok = await this.hasher.check(token, record.tokenHash)
    if (ok && (this.options.invalidateOnSuccess ?? true)) {
      await this.repository.forget(identifier)
    }

    return ok
  }

  async invalidate(identifier: string): Promise<void> {
    await this.repository.forget(identifier)
  }
}
