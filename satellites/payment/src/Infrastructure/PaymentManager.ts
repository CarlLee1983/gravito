import type { PlanetCore } from '@gravito/core'
import type { IPaymentGateway } from '../Domain/Contracts/IPaymentGateway'

export class PaymentManager {
  private drivers = new Map<string, () => IPaymentGateway>()

  constructor(private core: PlanetCore) {}

  /**
   * 註冊金流驅動器 (這就是日後掛載 ECPay, LINE Pay 的入口)
   */
  extend(name: string, resolver: () => IPaymentGateway): void {
    this.core.logger.info(`[PaymentManager] Driver registered: ${name}`)
    this.drivers.set(name, resolver)
  }

  /**
   * 取得指定或預設的驅動器
   */
  driver(name?: string): IPaymentGateway {
    const driverName = name || this.core.config.get<string>('payment.default', 'stripe')
    const resolver = this.drivers.get(driverName)

    if (!resolver) {
      throw new Error(
        `Payment driver [${driverName}] is not registered. Did you forget to mount the gateway satellite?`
      )
    }

    return resolver()
  }
}
