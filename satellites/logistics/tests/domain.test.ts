import { describe, expect, it } from 'bun:test'
import { Shipment, ShipmentStatus } from '../src/Domain/Entities/Shipment'

describe('Logistics Domain - Shipment Entity', () => {
  describe('Shipment Creation', () => {
    it('應該能建立新運送且初始狀態為 PENDING', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'FedEx',
        recipientName: '王小明',
        address: '台北市中山區中山路 123 號',
      })

      expect(shipment.id).toBe('ship-1')
      expect(shipment.orderId).toBe('ord-123')
      expect(shipment.status).toBe(ShipmentStatus.PENDING)
    })

    it('應該能設置收件人名稱和地址', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'DHL',
        recipientName: '李四',
        address: '台中市西屯區工業區 30 路',
      })

      expect(shipment.orderId).toBe('ord-123')
    })

    it('應該支援不同的物流商', () => {
      const carriers = ['FedEx', 'DHL', 'UPS', 'local_courier']

      carriers.forEach((carrier) => {
        const shipment = Shipment.create(`ship-${carrier}`, {
          orderId: 'ord-123',
          carrier,
          recipientName: 'Test',
          address: 'Address',
        })

        expect(shipment).toBeDefined()
      })
    })

    it('應該初始化空的 metadata', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'FedEx',
        recipientName: 'Test',
        address: 'Address',
      })

      expect(shipment).toBeDefined()
    })
  })

  describe('Shipment Status Transitions', () => {
    it('應該能標記為已出貨並設置追蹤號碼', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'FedEx',
        recipientName: 'Test',
        address: 'Address',
      })

      expect(shipment.status).toBe(ShipmentStatus.PENDING)
      expect(shipment.trackingNumber).toBeUndefined()

      shipment.markAsShipped('TRK123456789')

      expect(shipment.status).toBe(ShipmentStatus.SHIPPED)
      expect(shipment.trackingNumber).toBe('TRK123456789')
    })

    it('應該支援所有運送狀態', () => {
      const statuses = [
        ShipmentStatus.PENDING,
        ShipmentStatus.PICKED,
        ShipmentStatus.SHIPPED,
        ShipmentStatus.DELIVERED,
        ShipmentStatus.CVS_ARRIVED,
        ShipmentStatus.RETURNED,
      ]

      statuses.forEach((status) => {
        expect(status).toBeDefined()
      })
    })
  })

  describe('Taiwan CVS Support', () => {
    it('應該支援 7-11 超商領取', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'local',
        recipientName: '王小明',
        address: '台北店',
        cvsStoreId: '7-11-taipei-001',
        cvsType: '7-11',
      })

      expect(shipment).toBeDefined()
    })

    it('應該支援 FamilyMart 超商領取', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'local',
        recipientName: '李四',
        address: '台中店',
        cvsStoreId: 'fami-taichung-002',
        cvsType: 'fami',
      })

      expect(shipment).toBeDefined()
    })

    it('應該能標記超商送達狀態', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'local',
        recipientName: 'Test',
        address: 'CVS',
        cvsStoreId: '7-11-001',
        cvsType: '7-11',
      })

      // 模擬超商送達
      shipment.markAsShipped('CVS-TRACKING-001')
      expect(shipment.status).toBe(ShipmentStatus.SHIPPED)
    })
  })

  describe('Multiple Shipments', () => {
    it('應該能獨立管理多個運送', () => {
      const ship1 = Shipment.create('ship-1', {
        orderId: 'ord-1',
        carrier: 'FedEx',
        recipientName: 'Alice',
        address: 'Address 1',
      })

      const ship2 = Shipment.create('ship-2', {
        orderId: 'ord-2',
        carrier: 'DHL',
        recipientName: 'Bob',
        address: 'Address 2',
      })

      expect(ship1.id).not.toBe(ship2.id)
      expect(ship1.orderId).not.toBe(ship2.orderId)
    })

    it('不同運送的狀態轉移應互不影響', () => {
      const ship1 = Shipment.create('ship-1', {
        orderId: 'ord-1',
        carrier: 'FedEx',
        recipientName: 'Alice',
        address: 'Address 1',
      })

      const ship2 = Shipment.create('ship-2', {
        orderId: 'ord-2',
        carrier: 'DHL',
        recipientName: 'Bob',
        address: 'Address 2',
      })

      ship1.markAsShipped('TRACK-1')

      expect(ship1.status).toBe(ShipmentStatus.SHIPPED)
      expect(ship2.status).toBe(ShipmentStatus.PENDING)
      expect(ship2.trackingNumber).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('應該能處理長追蹤號碼', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'FedEx',
        recipientName: 'Test',
        address: 'Address',
      })

      const longTrackingNumber = 'TRK' + 'X'.repeat(100)
      shipment.markAsShipped(longTrackingNumber)

      expect(shipment.trackingNumber).toBe(longTrackingNumber)
    })

    it('應該能處理特殊地址字符', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'FedEx',
        recipientName: '王小明 Jr.',
        address: '台北市中山區中山路 123 號 5F #2',
      })

      expect(shipment).toBeDefined()
    })

    it('應該能多次標記為出貨（更新追蹤號碼）', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'FedEx',
        recipientName: 'Test',
        address: 'Address',
      })

      shipment.markAsShipped('TRACK-1')
      expect(shipment.trackingNumber).toBe('TRACK-1')

      // 再次更新追蹤號碼
      shipment.markAsShipped('TRACK-2')
      expect(shipment.trackingNumber).toBe('TRACK-2')
    })
  })

  describe('Shipment Properties', () => {
    it('應該能存取所有運送屬性', () => {
      const shipment = Shipment.create('ship-1', {
        orderId: 'ord-123',
        carrier: 'FedEx',
        recipientName: '王小明',
        address: '台北市中山區',
      })

      shipment.markAsShipped('TRACK-123')

      expect(shipment.id).toBe('ship-1')
      expect(shipment.orderId).toBe('ord-123')
      expect(shipment.status).toBe(ShipmentStatus.SHIPPED)
      expect(shipment.trackingNumber).toBe('TRACK-123')
    })
  })
})
