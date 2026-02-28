import { UseCase } from '@gravito/enterprise'
import type { ICouponRepository } from '../../Domain/Contracts/ICouponRepository'
import { type CouponDTO, couponToDTO } from '../DTOs/CouponDTO'
import { CouponNotFoundError } from '../Errors/CouponError'

export class GetCoupon extends UseCase<string, CouponDTO> {
  constructor(private couponRepository: ICouponRepository) {
    super()
  }

  async execute(couponId: string): Promise<CouponDTO> {
    const coupon = await this.couponRepository.findById(couponId)

    if (!coupon) {
      throw new CouponNotFoundError()
    }

    return couponToDTO(coupon)
  }
}
