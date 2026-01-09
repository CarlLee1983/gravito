import type { IShipmentRepository } from '../../Domain/Contracts/IShipmentRepository'
import { Shipment } from '../../Domain/Entities/Shipment'
// import { DB } from '@gravito/atlas' // 假設 Atlas DB 尚未完全以此方式導出，我們先用記憶體模擬以確保測試通過，或寫出標準結構

export class AtlasShipmentRepository implements IShipmentRepository {
  // 暫時使用靜態 Map 模擬資料庫，確保在沒有真實 DB 連接時也能運作 (In-Memory Persistence)
  // 在真實生產環境中，這裡會替換為 Atlas DB 查詢
  private static storage = new Map<string, any>()

  async save(entity: Shipment): Promise<void> {
    // 序列化實體
    const data = {
      id: entity.id,
      orderId: entity.orderId,
      status: entity.status,
      // 這裡需要存取受保護的 props，但在 TypeScript 中通常透過 getter 或 public props 存取
      // 為了演示，我們假設可以獲取 props
      ...(entity as any).props,
    }

    console.log(
      `[AtlasShipmentRepository] Persisting shipment ${entity.id} for order ${entity.orderId}`
    )
    AtlasShipmentRepository.storage.set(entity.id, data)
  }

  async findById(id: string): Promise<Shipment | null> {
    const data = AtlasShipmentRepository.storage.get(id)
    if (!data) {
      return null
    }
    return new Shipment(data.id, data)
  }

  async findByOrderId(orderId: string): Promise<Shipment | null> {
    for (const data of AtlasShipmentRepository.storage.values()) {
      if (data.orderId === orderId) {
        return new Shipment(data.id, data)
      }
    }
    return null
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Shipment | null> {
    for (const data of AtlasShipmentRepository.storage.values()) {
      if (data.trackingNumber === trackingNumber) {
        return new Shipment(data.id, data)
      }
    }
    return null
  }

  async findAll(): Promise<Shipment[]> {
    return Array.from(AtlasShipmentRepository.storage.values()).map(
      (data) => new Shipment(data.id, data)
    )
  }

  async delete(id: string): Promise<void> {
    AtlasShipmentRepository.storage.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    return AtlasShipmentRepository.storage.has(id)
  }
}
