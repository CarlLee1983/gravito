import { describe, expect, it } from 'bun:test'
import { LinearProvider } from '../../../src/providers/LinearProvider'
import { computeHmacSha256 } from '../../../src/receive/SignatureValidator'

const SECRET = 'test-secret'

describe('LinearProvider', () => {
  it('should verify valid signature', async () => {
    const provider = new LinearProvider()
    const payload = JSON.stringify({ action: 'create', type: 'Issue' })
    const signature = await computeHmacSha256(payload, SECRET)

    const result = await provider.verify(
      payload,
      {
        'linear-signature': signature,
        'linear-delivery': 'del-1',
      },
      SECRET
    )

    expect(result.valid).toBe(true)
    expect(result.webhookId).toBe('del-1')
  })
})
