import { UseCase } from '@gravito/enterprise'
import type { IShipmentRepository } from '../../Domain/Contracts/IShipmentRepository'
import { Shipment } from '../../Domain/Entities/Shipment'
import type { LogisticsManager } from '../../Infrastructure/LogisticsManager'

export interface ArrangeShipmentInput {
  orderId: string
  recipientName: string
  address: string
  providerName?: string // 指定物流商，可選
  items?: any[] // 用於計算重量等
}

export interface ArrangeShipmentOutput {
  shipmentId: string
  trackingNumber: string
  status: string
}

export class ArrangeShipment extends UseCase<ArrangeShipmentInput, ArrangeShipmentOutput> {
  constructor(
    private repository: IShipmentRepository,
    private manager: LogisticsManager
  ) {
    super()
  }

  async execute(input: ArrangeShipmentInput): Promise<ArrangeShipmentOutput> {
    // 1. 檢查是否已存在運單
    const existing = await this.repository.findByOrderId(input.orderId)
    if (existing) {
      throw new Error(`Shipment for order ${input.orderId} already exists.`)
    }

    // 2. 取得物流供應商
    const provider = this.manager.provider(input.providerName)

    // 3. 向供應商請求出貨 (取得追蹤碼)
    const trackingNumber = await provider.ship(input.orderId, {
      recipient: input.recipientName,
      address: input.address,
    })

    // 4. 建立 Shipment 實體
    const shipmentId = crypto.randomUUID()
    const shipment = Shipment.create(shipmentId, {
      orderId: input.orderId,
      recipientName: input.recipientName,
      address: input.address,
      carrier: provider.getName(),
      cvsType: undefined, // 暫時未處理超商
      cvsStoreId: undefined,
    })

    // 5. 更新狀態為已出貨 (或根據供應商回應決定)
    shipment.markAsShipped(trackingNumber)

    // 6. 儲存
    await this.repository.save(shipment)

    return {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber!,
      status: shipment.status,
    }
  }
}
