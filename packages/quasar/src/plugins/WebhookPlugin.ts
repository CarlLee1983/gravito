import type { QuasarAgent } from '../QuasarAgent'
import type { QuasarPlugin } from './QuasarPlugin'

export interface WebhookConfig {
  url: string
  events: string[]
  headers?: Record<string, string>
}

export interface WebhookPluginOptions {
  webhooks: WebhookConfig[]
}

export class WebhookPlugin implements QuasarPlugin {
  name = 'webhook'

  constructor(private options: WebhookPluginOptions) {}

  onRegister(agent: QuasarAgent): void {
    const allEvents = new Set(this.options.webhooks.flatMap((w) => w.events))

    allEvents.forEach((event) => {
      agent.on(event, (payload: any) => {
        this.triggerWebhooks(event, payload)
      })
    })
  }

  private async triggerWebhooks(event: string, payload: any): Promise<void> {
    const relevantWebhooks = this.options.webhooks.filter((w) => w.events.includes(event))

    const promises = relevantWebhooks.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Quasar-Event': event,
            ...webhook.headers,
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            payload,
          }),
        })

        if (!response.ok) {
          console.error(
            `[WebhookPlugin] Failed to send webhook to ${webhook.url}: ${response.statusText}`
          )
        }
      } catch (err) {
        console.error(`[WebhookPlugin] Error sending webhook to ${webhook.url}:`, err)
      }
    })

    await Promise.all(promises)
  }
}
