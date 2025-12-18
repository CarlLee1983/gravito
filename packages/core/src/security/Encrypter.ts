import crypto from 'node:crypto'

export interface EncrypterOptions {
  key: string
  cipher?: string
}

export class Encrypter {
  private algorithm: string
  private key: Buffer

  constructor(options: EncrypterOptions) {
    this.algorithm = options.cipher || 'aes-256-cbc'

    if (options.key.startsWith('base64:')) {
      this.key = Buffer.from(options.key.substring(7), 'base64')
    } else {
      this.key = Buffer.from(options.key)
    }

    // Verify key length
    if (this.algorithm === 'aes-128-cbc' && this.key.length !== 16) {
      throw new Error('The key must be 16 bytes (128 bits) for AES-128-CBC.')
    }
    if (this.algorithm === 'aes-256-cbc' && this.key.length !== 32) {
      throw new Error('The key must be 32 bytes (256 bits) for AES-256-CBC.')
    }
  }

  /**
   * Encrypt a value
   */
  encrypt(value: unknown, serialize = true): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)

    const stringValue = serialize ? JSON.stringify(value) : String(value)

    let encrypted = cipher.update(stringValue, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const mac = this.hash(iv.toString('base64'), encrypted)

    const payload = {
      iv: iv.toString('base64'),
      value: encrypted,
      mac,
      tag: '', // AES-CBC doesn't produce an auth tag, but GCM does. Keeping structure standard.
    }

    return Buffer.from(JSON.stringify(payload)).toString('base64')
  }

  /**
   * Decrypt a value
   */
  decrypt(payload: string, deserialize = true): unknown {
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))

    if (!this.validPayload(json)) {
      throw new Error('The payload is invalid.')
    }

    if (!this.validMac(json)) {
      throw new Error('The MAC is invalid.')
    }

    const iv = Buffer.from(json.iv, 'base64')
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)

    let decrypted = decipher.update(json.value, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return deserialize ? JSON.parse(decrypted) : decrypted
  }

  private hash(iv: string, value: string): string {
    const hmac = crypto.createHmac('sha256', this.key)
    hmac.update(iv + value)
    return hmac.digest('hex')
  }

  private validPayload(payload: any): boolean {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'iv' in payload &&
      'value' in payload &&
      'mac' in payload
    )
  }

  private validMac(payload: any): boolean {
    const calculated = this.hash(payload.iv, payload.value)
    return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(payload.mac))
  }

  /**
   * Generate a new key
   */
  static generateKey(cipher = 'aes-256-cbc'): string {
    const bytes = cipher === 'aes-128-cbc' ? 16 : 32
    return 'base64:' + crypto.randomBytes(bytes).toString('base64')
  }
}
