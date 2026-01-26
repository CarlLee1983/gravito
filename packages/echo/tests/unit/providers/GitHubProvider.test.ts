import { describe, expect, it } from 'bun:test'
import { GitHubProvider } from '../../../src/providers/GitHubProvider'
import { computeHmacSha256 } from '../../../src/receive/SignatureValidator'

describe('GitHubProvider', () => {
  it('should have correct name', () => {
    const provider = new GitHubProvider()
    expect(provider.name).toBe('github')
  })

  it('should verify valid GitHub signature', async () => {
    const provider = new GitHubProvider()
    const payload = JSON.stringify({ action: 'opened' })
    const secret = 'github-secret'

    const signature = await computeHmacSha256(payload, secret)

    const result = await provider.verify(
      payload,
      {
        'x-hub-signature-256': `sha256=${signature}`,
        'x-github-event': 'pull_request',
        'x-github-delivery': 'delivery-id',
      },
      secret
    )

    expect(result.valid).toBe(true)
    expect(result.eventType).toBe('pull_request')
    expect(result.webhookId).toBe('delivery-id')
  })
})
