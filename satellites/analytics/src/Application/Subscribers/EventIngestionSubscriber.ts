import type { DataIngestionContext } from '../../Domain/DCI/Contexts/DataIngestionContext'

export class EventIngestionSubscriber {
  constructor(private readonly ingestionCtx: DataIngestionContext) {}

  async onOrderPlaced(payload: Record<string, unknown>): Promise<void> {
    await this.ingestionCtx.ingestEvent({
      eventName: 'commerce:order-placed',
      payload,
    })
  }

  async onOrderConfirmed(payload: Record<string, unknown>): Promise<void> {
    await this.ingestionCtx.ingestEvent({
      eventName: 'commerce:order-confirmed',
      payload,
    })
  }

  async onOrderRefunded(payload: Record<string, unknown>): Promise<void> {
    await this.ingestionCtx.ingestEvent({
      eventName: 'commerce:order-refunded',
      payload,
    })
  }

  async onMemberRegistered(payload: Record<string, unknown>): Promise<void> {
    await this.ingestionCtx.ingestEvent({
      eventName: 'membership:registered',
      payload,
    })
  }

  async onMemberAuthenticated(payload: Record<string, unknown>): Promise<void> {
    await this.ingestionCtx.ingestEvent({
      eventName: 'membership:authenticated',
      payload,
    })
  }

  async onProductCreated(payload: Record<string, unknown>): Promise<void> {
    await this.ingestionCtx.ingestEvent({
      eventName: 'catalog:product-created',
      payload,
    })
  }

  async onPaymentSucceeded(payload: Record<string, unknown>): Promise<void> {
    await this.ingestionCtx.ingestEvent({
      eventName: 'payment:succeeded',
      payload,
    })
  }
}
