import { UseCase } from '@gravito/enterprise'
import { Coupon } from '../../Domain/Entities/Coupon'

export class AdminListCoupons extends UseCase<void, Coupon[]> {
  async execute(): Promise<Coupon[]> {
    // 模擬從資料庫讀取優惠券
    return [
      Coupon.create({
        code: 'WELCOME2025',
        name: '新年歡迎禮',
        type: 'PERCENTAGE',
        value: 10,
        minPurchase: 0,
        startsAt: new Date('2025-01-01'),
        expiresAt: new Date('2025-12-31'),
        usageLimit: 1000,
        status: 'ACTIVE',
      }),
      Coupon.create({
        code: 'SAVE500',
        name: '滿額折抵',
        type: 'FIXED',
        value: 500,
        minPurchase: 5000,
        startsAt: new Date('2025-01-01'),
        expiresAt: new Date('2025-06-30'),
        status: 'ACTIVE',
      }),
    ]
  }
}
