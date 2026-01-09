import { Entity } from '@gravito/enterprise'

export enum ShipmentStatus {
  PENDING = 'pending',
  PICKED = 'picked',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CVS_ARRIVED = 'cvs_arrived', // 台灣特色：貨到門市
  RETURNED = 'returned',
}

export interface ShipmentProps {
  orderId: string
  trackingNumber?: string
  carrier: string
  status: ShipmentStatus
  recipientName: string
  address: string
  // 台灣 CVS 擴充屬性
  cvsStoreId?: string
  cvsType?: '7-11' | 'fami'
  metadata: Record<string, any>
}

export class Shipment extends Entity<string> {
  constructor(
    id: string,
    private props: ShipmentProps
  ) {
    super(id)
  }

  static create(id: string, props: Omit<ShipmentProps, 'status' | 'metadata'>): Shipment {
    return new Shipment(id, {
      ...props,
      status: ShipmentStatus.PENDING,
      metadata: {},
    })
  }

  markAsShipped(trackingNumber: string): void {
    this.props.status = ShipmentStatus.SHIPPED
    this.props.trackingNumber = trackingNumber
  }

  get status() {
    return this.props.status
  }
  get orderId() {
    return this.props.orderId
  }
  get trackingNumber() {
    return this.props.trackingNumber
  }
}
