import { generateSecret, generateURI, verify } from 'otplib'
import QRCode from 'qrcode'
import type { TwoFactorConfig } from '../config'

export class TwoFactorService {
  constructor(private config: TwoFactorConfig) {
    // otplib v13 is zero-config/functional, options passed to functions usually
    // But we can't easily set global options like window.
    // verify({ ..., window: config.window })
  }

  generateSecret(): string {
    return generateSecret()
  }

  async generateQrCodeUrl(email: string, secret: string): Promise<string> {
    const otpauth = generateURI({
      issuer: this.config.issuer || 'Gravito',
      label: email,
      secret,
    })
    return await QRCode.toDataURL(otpauth)
  }

  async verify(token: string, secret: string): Promise<boolean> {
    const result = await verify({
      token,
      secret,
      // @ts-expect-error window option might be named differently in this version
      window: this.config.window,
    })
    return typeof result === 'boolean' ? result : result?.valid
  }

  generateRecoveryCodes(): string[] {
    return Array.from({ length: 8 }, () =>
      crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
    )
  }
}
