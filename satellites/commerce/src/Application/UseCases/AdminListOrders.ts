import { UseCase } from '@gravito/enterprise'

export class AdminListOrders extends UseCase<any, any[]> {
  async execute(): Promise<any[]> {
    // 模擬從資料庫獲取所有訂單
    // 真實情境應注入 IOrderRepository
    return [
      {
        id: 'ORD-2025122901',
        customerName: 'Carl',
        totalAmount: 1250,
        paymentStatus: 'PAID',
        shippingStatus: 'SHIPPED',
        createdAt: new Date('2025-12-29T10:00:00Z'),
      },
      {
        id: 'ORD-2025122902',
        customerName: 'Alice',
        totalAmount: 3200,
        paymentStatus: 'PAID',
        shippingStatus: 'PENDING',
        createdAt: new Date('2025-12-29T11:30:00Z'),
      },
      {
        id: 'ORD-2025122903',
        customerName: 'Bob',
        totalAmount: 450,
        paymentStatus: 'UNPAID',
        shippingStatus: 'PENDING',
        createdAt: new Date('2025-12-29T14:20:00Z'),
      },
    ]
  }
}
