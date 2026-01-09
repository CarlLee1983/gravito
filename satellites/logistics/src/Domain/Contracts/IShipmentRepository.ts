import type { Repository } from '@gravito/enterprise'
import type { Shipment } from '../Entities/Shipment'

export interface IShipmentRepository extends Repository<Shipment, string> {
  findByOrderId(orderId: string): Promise<Shipment | null>
  findByTrackingNumber(trackingNumber: string): Promise<Shipment | null>
}
