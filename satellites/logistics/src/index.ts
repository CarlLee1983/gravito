import { type Container, ServiceProvider } from '@gravito/core'
import { ArrangeShipment } from './Application/UseCases/ArrangeShipment'
import { LogisticsManager } from './Infrastructure/LogisticsManager'
import { AtlasShipmentRepository } from './Infrastructure/Persistence/AtlasShipmentRepository'

export class LogisticsServiceProvider extends ServiceProvider {
  register(container: Container): void {
    container.singleton('logistics.manager', () => new LogisticsManager(this.core!))
    container.singleton('logistics.repository', () => new AtlasShipmentRepository())

    container.bind(
      'usecase.arrangeShipment',
      () =>
        new ArrangeShipment(
          container.make('logistics.repository'),
          container.make('logistics.manager')
        )
    )
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('🛰️ Satellite Logistics is operational')

    /**
     * GASS 聯動：監聽支付成功
     */
    core.hooks.addAction(
      'payment:succeeded',
      async (payload: { orderId: string; orderData?: any }) => {
        core.logger.info(
          `[Logistics] Payment verified for order: ${payload.orderId}. Preparing shipment...`
        )

        try {
          const useCase = core.container.make<ArrangeShipment>('usecase.arrangeShipment')

          // 假設 payload 中包含必要的收件資訊，若無則使用預設值或查詢 Order 服務
          // 這裡為了演示，使用 Payload 中的資料或 Mock 資料
          const recipientName = payload.orderData?.recipientName || 'Guest User'
          const address = payload.orderData?.address || 'Default Address'

          const result = await useCase.execute({
            orderId: payload.orderId,
            recipientName,
            address,
          })

          core.logger.info(`[Logistics] Shipment arranged: ${result.trackingNumber}`)

          // 發射物流準備完成事件
          await core.hooks.doAction('logistics:shipment:prepared', {
            orderId: payload.orderId,
            shipmentId: result.shipmentId,
            trackingNumber: result.trackingNumber,
            status: result.status,
          })
        } catch (error: any) {
          core.logger.error(`[Logistics] Failed to arrange shipment: ${error.message}`)
        }
      }
    )

    /**
     * GASS 聯動：監聽運費計算 Filter
     */
    core.hooks.addFilter('commerce:order:adjustments', async (adjustments: any[], args: any) => {
      const _payload = args as { order: any }

      // 預設運費邏輯 (可改為呼叫 Manager 計算)
      const manager = core.container.make<LogisticsManager>('logistics.manager')
      const cost = await manager.provider().calculateCost(1, 'TW') // 假設 1kg

      adjustments.push({
        label: 'Shipping Fee (Standard)',
        amount: cost,
        sourceType: 'shipping',
        sourceId: 'standard',
      })

      return adjustments
    })
  }
}
