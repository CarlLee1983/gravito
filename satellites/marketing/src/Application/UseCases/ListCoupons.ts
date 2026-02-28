import { UseCase } from '@gravito/enterprise'
import type { ICouponRepository } from '../../Domain/Contracts/ICouponRepository'
import { type CouponDTO, couponsToDTO } from '../DTOs/CouponDTO'

export interface ListCouponsInput {
  limit?: number
  offset?: number
  activeOnly?: boolean
}

export class ListCoupons extends UseCase<ListCouponsInput, CouponDTO[]> {
  constructor(private couponRepository: ICouponRepository) {
    super()
  }

  async execute(input: ListCouponsInput): Promise<CouponDTO[]> {
    const limit = input.limit ?? 20
    const offset = input.offset ?? 0
    const activeOnly = input.activeOnly ?? false

    const coupons = activeOnly
      ? await this.couponRepository.listActive(limit, offset)
      : await this.couponRepository.listAll(limit, offset)

    return couponsToDTO(coupons)
  }
}
