import { describe, expect, it } from 'bun:test'
import { TwilioProvider } from '../../../src/providers/TwilioProvider'
import { computeHmacSha1Base64 } from '../../../src/receive/SignatureValidator'

const SECRET = 'test-secret'

describe('TwilioProvider', () => {
  it('should verify valid signature', async () => {
    const provider = new TwilioProvider({ baseUrl: 'https://example.com/webhook' })
    const params = new URLSearchParams({ Body: 'hello', From: '+123' })
    const payload = params.toString()

    // url + sorted params
    const sigPayload = 'https://example.com/webhook' + 'BodyhelloFrom+123'
    const signature = await computeHmacSha1Base64(sigPayload, SECRET)

    const result = await provider.verify(
      payload,
      {
        'x-twilio-signature': signature,
      },
      SECRET
    )

    expect(result.valid).toBe(true)
    expect((result.payload as any).Body).toBe('hello')
  })
})
