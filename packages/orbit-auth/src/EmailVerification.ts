import crypto from 'node:crypto'

export interface EmailVerificationPayload {
  id: string | number
  email: string
  expiresAt: number
}

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

export class EmailVerificationService {
  private readonly key: Buffer

  constructor(
    secret: string,
    private readonly options: EmailVerificationOptions = {}
  ) {
    this.key = parseKey(secret)
  }

  createToken(payload: Omit<EmailVerificationPayload, 'expiresAt'>): string {
    const ttlSeconds = this.options.ttlSeconds ?? 3600
    const expiresAt = Date.now() + ttlSeconds * 1000

    const data: EmailVerificationPayload = { ...payload, expiresAt }
    const encoded = base64UrlEncode(JSON.stringify(data))
    const sig = this.sign(encoded)
    return `${encoded}.${sig}`
  }

  verifyToken(token: string): EmailVerificationPayload | null {
    const [encoded, sig] = token.split('.', 2)
    if (!encoded || !sig) return null

    const expected = this.sign(encoded)
    if (!this.timingSafeEqual(expected, sig)) return null

    const payload = JSON.parse(base64UrlDecode(encoded)) as EmailVerificationPayload
    if (!payload.expiresAt || Date.now() > payload.expiresAt) return null

    return payload
  }

  private sign(encoded: string): string {
    return crypto.createHmac('sha256', this.key).update(encoded).digest('base64url')
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  }
}
