import type { Container, GravitoContext } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { ProcessPayment } from './Application/UseCases/ProcessPayment'
import { RefundPayment } from './Application/UseCases/RefundPayment'
import { StripeGateway } from './Infrastructure/Gateways/StripeGateway'
import { PaymentManager } from './Infrastructure/PaymentManager'
import { StripeWebhookController } from './Interface/Http/Controllers/StripeWebhookController'

export class PaymentServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 1. 綁定管理器
    container.singleton('payment.manager', (_c) => new PaymentManager(this.core!))

    // 2. 綁定 UseCases (傳入 Manager 而非具體 Gateway)
    container.singleton('payment.process', (c) => {
      return new ProcessPayment(c.make('payment.manager'))
    })

    container.singleton('payment.refund', (c) => {
      return new RefundPayment(c.make('payment.manager'))
    })
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    const manager = core.container.make<PaymentManager>('payment.manager')

    // 🌟 註冊 Stripe 驅動器 (這就是「掛載」動作)
    // 雖然代碼在 Infrastructure 裡，但只有這裡被呼叫時才會建立實例
    manager.extend('stripe', () => {
      const apiKey = core.config.get<string>('payment.stripe.secret') || 'mock_key'
      return new StripeGateway(apiKey)
    })

    const webhookCtrl = new StripeWebhookController()
    core.router.post('/webhooks/payment/stripe', (c: GravitoContext) => webhookCtrl.handle(c))

    core.logger.info('🛰️ Satellite Payment is operational (Manager Ready)')

    /**
     * GASS 聯動：監聽訂單建立
     */
    core.hooks.addAction('commerce:order:created', async (payload: any) => {
      const processPayment = core.container.make<ProcessPayment>('payment.process')
      try {
        const intent = await processPayment.execute({
          orderId: payload.order.id,
          amount: payload.order.totalAmount,
          currency: payload.order.currency,
          // gateway: 'stripe' // 可以由配置或 Payload 決定
        })
        await core.hooks.doAction('payment:intent:ready', { orderId: payload.order.id, intent })
      } catch (error: any) {
        core.logger.error(`[Payment] Process error: ${error.message}`)
      }
    })

    core.hooks.addAction('payment:succeeded', async (payload: any) => {
      core.logger.info(`[Payment] Order confirmed as PAID: ${payload.orderId}`)
    })
  }
}
