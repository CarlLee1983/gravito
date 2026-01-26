import { describe, expect, it } from 'bun:test'
import { PaddleProvider } from '../../../src/providers/PaddleProvider'
import { computeHmacSha256 } from '../../../src/receive/SignatureValidator'

const SECRET = 'test-secret'

describe('PaddleProvider', () => {
  it('should verify valid signature', async () => {
    const provider = new PaddleProvider()
    const timestamp = Math.floor(Date.now() / 1000)
    const payload = JSON.stringify({ event_type: 'subscription.created' })

    const signedPayload = `${timestamp}:${payload}`
    const signature = await computeHmacSha256(signedPayload, SECRET)
    const header = `ts=${timestamp};h1=${signature}`

    const result = await provider.verify(
      payload,
      {
        'paddle-signature': header,
      },
      SECRET
    )

    expect(result.valid).toBe(true)
    expect(result.eventType).toBe('subscription.created')
  })
})
