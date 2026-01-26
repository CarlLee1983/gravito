import { describe, expect, test } from 'bun:test'
import { TwoFactorService } from '../../src/services/TwoFactorService'

describe('TwoFactorService', () => {
  const config = { enabled: true, issuer: 'TestApp' }
  const service = new TwoFactorService(config)

  test('generates secret', () => {
    const secret = service.generateSecret()
    expect(secret).toBeString()
    expect(secret.length).toBeGreaterThan(10)
  })

  test('generates qr code url', async () => {
    const secret = service.generateSecret()
    const url = await service.generateQrCodeUrl('test@example.com', secret)
    expect(url).toContain('data:image/png;base64')
  })

  test('generates recovery codes', () => {
    const codes = service.generateRecoveryCodes()
    expect(codes).toHaveLength(8)
    expect(codes[0]).toBeString()
  })
})
