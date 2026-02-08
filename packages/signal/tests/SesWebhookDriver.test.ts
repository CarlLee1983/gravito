import { describe, expect, it } from 'bun:test'
import type { GravitoContext } from '@gravito/core'
import { SesWebhookDriver } from '../src/webhooks/SesWebhookDriver'

describe('SesWebhookDriver', () => {
  it('should parse SNS notification events', async () => {
    const driver = new SesWebhookDriver()

    const mockSnsBody = {
      Type: 'Notification',
      Message: JSON.stringify({
        notificationType: 'Bounce',
        bounce: { bounceType: 'Permanent', bounceSubType: 'General' },
      }),
    }

    const mockCtx = {
      req: {
        json: async () => mockSnsBody,
      },
    } as unknown as GravitoContext

    const result = await driver.handle(mockCtx)

    expect(result).toHaveLength(1)
    expect(result?.[0].event).toBe('bounce')
    expect(result?.[0].payload.bounce.bounceType).toBe('Permanent')
  })

  it('should handle subscription confirmation', async () => {
    const driver = new SesWebhookDriver()
    const mockSnsBody = {
      Type: 'SubscriptionConfirmation',
      SubscribeURL: 'https://sns.aws.com/confirm',
    }

    const mockCtx = {
      req: {
        json: async () => mockSnsBody,
      },
    } as unknown as GravitoContext

    const result = await driver.handle(mockCtx)
    expect(result?.[0].event).toBe('sns:subscription')
  })
})
