import { UseCase } from '@gravito/enterprise'
import { Coupon } from '../../Domain/Entities/Coupon'

export class AdminListCoupons extends UseCase<void, Coupon[]> {
  async execute(): Promise<Coupon[]> {
    // 模擬從資料庫讀取優惠券
    return [
      Coupon.create(
        '新年歡迎禮',
        'WELCOME2025',
        'PERCENTAGE',
        10,
        0,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        1000
      ),
      Coupon.create(
        '滿額折抵',
        'SAVE500',
        'FIXED',
        500,
        5000,
        new Date('2025-01-01'),
        new Date('2025-06-30')
      ),
    ]
  }
}
