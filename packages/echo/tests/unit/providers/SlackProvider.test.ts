import { describe, expect, it } from 'bun:test'
import { SlackProvider } from '../../../src/providers/SlackProvider'
import { computeHmacSha256 } from '../../../src/receive/SignatureValidator'

const SECRET = 'test-secret'

describe('SlackProvider', () => {
  it('should verify valid signature', async () => {
    const provider = new SlackProvider()
    const timestamp = Math.floor(Date.now() / 1000)
    const payload = '{"type":"url_verification"}'

    const sigBase = `v0:${timestamp}:${payload}`
    const sigHex = await computeHmacSha256(sigBase, SECRET)
    const signature = `v0=${sigHex}`

    const result = await provider.verify(
      payload,
      {
        'x-slack-signature': signature,
        'x-slack-request-timestamp': timestamp.toString(),
      },
      SECRET
    )

    expect(result.valid).toBe(true)
  })
})
