import crypto from 'node:crypto'

/**
 * Payload structure for email verification tokens.
 * @public
 */
export interface EmailVerificationPayload {
  id: string | number
  email: string
  expiresAt: number
}

/**
 * Configuration options for email verification.
 * @public
 */
export interface EmailVerificationOptions {
  ttlSeconds?: number
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input).toString('base64url')
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function parseKey(key: string): Buffer {
  if (key.startsWith('base64:')) {
    return Buffer.from(key.slice('base64:'.length), 'base64')
  }
  return Buffer.from(key)
}

/**
 * Service for managing secure email verification tokens.
 *
 * This service generates signed, time-limited tokens that can be sent to
 * users via email to verify their email address. It uses HMAC-SHA256 for
 * security to ensure tokens cannot be tampered with.
 *
 * @public
 * @example
 * ```typescript
 * const service = new EmailVerificationService('my-secret');
 * const token = service.createToken({ id: 1, email: 'user@example.com' });
 * const payload = service.verifyToken(token);
 * ```
 */
export class EmailVerificationService {
  private readonly key: Buffer

  /**
   * Create a new email verification service.
   *
   * @param secret - The key used to sign tokens
   * @param options - Configuration options
   */
  constructor(
    secret: string,
    private readonly options: EmailVerificationOptions = {}
  ) {
    this.key = parseKey(secret)
  }

  /**
   * Create a signed verification token for the given payload.
   *
   * @param payload - The user data to be encoded in the token
   * @returns A base64url encoded token string
   */
  createToken(payload: Omit<EmailVerificationPayload, 'expiresAt'>): string {
    const ttlSeconds = this.options.ttlSeconds ?? 3600
    const expiresAt = Date.now() + ttlSeconds * 1000

    const data: EmailVerificationPayload = { ...payload, expiresAt }
    const encoded = base64UrlEncode(JSON.stringify(data))
    const sig = this.sign(encoded)
    return `${encoded}.${sig}`
  }

  /**
   * Verify and decode a verification token.
   *
   * @param token - The token string to verify
   * @returns The original payload or null if invalid or expired
   */
  verifyToken(token: string): EmailVerificationPayload | null {
    const [encoded, sig] = token.split('.', 2)
    if (!encoded || !sig) {
      return null
    }

    const expected = this.sign(encoded)
    if (!this.timingSafeEqual(expected, sig)) {
      return null
    }

    const payload = JSON.parse(base64UrlDecode(encoded)) as EmailVerificationPayload
    if (!payload.expiresAt || Date.now() > payload.expiresAt) {
      return null
    }

    return payload
  }

  private sign(encoded: string): string {
    return crypto.createHmac('sha256', this.key).update(encoded).digest('base64url')
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}
