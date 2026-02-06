import { describe, expect, it, mock } from 'bun:test'
import type { GravitoContext, PlanetCore } from '@gravito/core'
import { OrbitSignal } from '../src/OrbitSignal'
import { SendGridWebhookDriver } from '../src/webhooks/SendGridWebhookDriver'

describe('OrbitSignal Webhooks', () => {
  it('should register webhook routes and trigger events', async () => {
    const mockDriver = new SendGridWebhookDriver()
    const signal = new OrbitSignal({
      webhookPrefix: '/webhooks/mail',
      webhookDrivers: {
        sendgrid: mockDriver,
      },
    })

    const handlers: any[] = []
    const mockCore = {
      logger: { info: mock(), error: mock() },
      container: { instance: mock() },
      adapter: {
        use: mock(),
        post: mock((path, handler) => {
          handlers.push({ path, handler })
        }),
      },
    } as unknown as PlanetCore

    signal.install(mockCore)

    // Check if post route was registered
    expect(mockCore.adapter.post).toHaveBeenCalled()
    const registration = handlers.find((h) => h.path.includes(':driver'))
    expect(registration).toBeDefined()

    // Mock an incoming request
    const webhookReceivedHandler = mock()
    signal.on('webhookReceived', webhookReceivedHandler)

    const mockCtx = {
      req: {
        param: (name: string) => (name === 'driver' ? 'sendgrid' : undefined),
        json: async () => [{ event: 'delivered', id: '123' }],
      },
      json: mock(() => ({ success: true })),
    } as unknown as GravitoContext

    // Simulate route call
    await registration.handler(mockCtx)

    expect(webhookReceivedHandler).toHaveBeenCalled()
    const event = webhookReceivedHandler.mock.calls[0][0]
    expect(event.webhook.driver).toBe('sendgrid')
    expect(event.webhook.event).toBe('delivered')
    expect(mockCtx.json).toHaveBeenCalledWith({ success: true })
  })
})
