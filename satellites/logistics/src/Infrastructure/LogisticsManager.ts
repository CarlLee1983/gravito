import type { PlanetCore } from '@gravito/core'

export interface IShippingProvider {
  getName(): string
  calculateCost(weight: number, destination: string): Promise<number>
  ship(orderId: string, details: any): Promise<string> // 回傳 Tracking Number
}

class LocalShippingProvider implements IShippingProvider {
  getName(): string {
    return 'local'
  }

  async calculateCost(weight: number, _destination: string): Promise<number> {
    // 簡單的計費邏輯：基礎費 60 + 每公斤 10 元
    return 60 + weight * 10
  }

  async ship(orderId: string, _details: any): Promise<string> {
    // 產生模擬的追蹤碼
    return `LOC-${orderId}-${Date.now().toString().slice(-4)}`
  }
}

export class LogisticsManager {
  private providers = new Map<string, () => IShippingProvider>()

  constructor(private core: PlanetCore) {
    // 註冊預設的 Local Provider
    this.extend('local', () => new LocalShippingProvider())
  }

  extend(name: string, resolver: () => IShippingProvider): void {
    this.core.logger.info(`[LogisticsManager] Provider registered: ${name}`)
    this.providers.set(name, resolver)
  }

  provider(name?: string): IShippingProvider {
    // 優先使用傳入的名稱，其次讀取設定，最後 fallback 到 'local'
    const providerName = name || this.core.config.get<string>('logistics.default', 'local')
    const resolver = this.providers.get(providerName)

    if (!resolver) {
      // 若找不到，但請求的是 default，則嘗試使用 local
      if (providerName === 'local' && !this.providers.has('local')) {
        const local = new LocalShippingProvider()
        this.providers.set('local', () => local)
        return local
      }
      throw new Error(`Logistics provider [${providerName}] not found.`)
    }

    return resolver()
  }
}
