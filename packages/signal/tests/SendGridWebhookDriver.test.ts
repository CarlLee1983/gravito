import { describe, expect, it } from 'bun:test'
import { generateKeyPairSync, sign } from 'node:crypto'
import type { GravitoContext } from '@gravito/core'
import { SendGridWebhookDriver } from '../src/webhooks/SendGridWebhookDriver'

describe('SendGridWebhookDriver', () => {
  it('should parse batch events from request body', async () => {
    const driver = new SendGridWebhookDriver()

    const mockEvents = [
      { event: 'delivered', email: 'user1@example.com', timestamp: 123456789 },
      { event: 'opened', email: 'user1@example.com', timestamp: 123456790 },
    ]

    const mockCtx = {
      req: {
        json: async () => mockEvents,
        header: () => undefined,
      },
    } as unknown as GravitoContext

    const result = await driver.handle(mockCtx)

    expect(result).toHaveLength(2)
    expect(result?.[0].event).toBe('delivered')
    expect(result?.[1].event).toBe('opened')
    expect(result?.[0].payload.email).toBe('user1@example.com')
  })

  it('should handle single event body', async () => {
    const driver = new SendGridWebhookDriver()
    const mockEvent = { event: 'bounced', email: 'bad@example.com' }

    const mockCtx = {
      req: {
        json: async () => mockEvent,
        header: () => undefined,
      },
    } as unknown as GravitoContext

    const result = await driver.handle(mockCtx)
    expect(result).toHaveLength(1)
    expect(result?.[0].event).toBe('bounced')
  })

  it('should return null for empty body', async () => {
    const driver = new SendGridWebhookDriver()
    const mockCtx = {
      req: {
        json: async () => [],
        header: () => undefined,
      },
    } as unknown as GravitoContext

    const result = await driver.handle(mockCtx)
    expect(result).toBeNull()
  })

  it('should throw if public key is set but signature is missing', async () => {
    const driver = new SendGridWebhookDriver({ publicKey: 'some-key' })
    const mockCtx = {
      req: {
        json: async () => [{ event: 'test' }],
        header: (_name: string) => undefined,
      },
    } as unknown as GravitoContext

    expect(driver.handle(mockCtx)).rejects.toThrow('Missing SendGrid signature headers')
  })

  it('should accept valid signed payloads', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    })
    const payload = JSON.stringify([{ event: 'processed', email: 'user@example.com' }])
    const timestamp = '1710000000'
    const signature = sign('sha256', Buffer.from(`${timestamp}${payload}`), privateKey).toString(
      'base64'
    )

    const driver = new SendGridWebhookDriver({
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    })
    const mockCtx = {
      req: {
        text: async () => payload,
        header: (name: string) => {
          if (name === 'X-Twilio-Email-Event-Webhook-Signature') {
            return signature
          }
          if (name === 'X-Twilio-Email-Event-Webhook-Timestamp') {
            return timestamp
          }
          return undefined
        },
      },
    } as unknown as GravitoContext

    const result = await driver.handle(mockCtx)

    expect(result).toHaveLength(1)
    expect(result?.[0].event).toBe('processed')
  })

  it('should reject invalid signed payloads', async () => {
    const { publicKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    })
    const payload = JSON.stringify([{ event: 'processed', email: 'user@example.com' }])
    const driver = new SendGridWebhookDriver({
      publicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    })
    const mockCtx = {
      req: {
        text: async () => payload,
        header: (name: string) => {
          if (name === 'X-Twilio-Email-Event-Webhook-Signature') {
            return Buffer.from('invalid-signature').toString('base64')
          }
          if (name === 'X-Twilio-Email-Event-Webhook-Timestamp') {
            return '1710000000'
          }
          return undefined
        },
      },
    } as unknown as GravitoContext

    await expect(driver.handle(mockCtx)).rejects.toThrow('Invalid SendGrid signature')
  })
})
