import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'

export interface MergeCartInput {
  memberId: string
  guestId: string
}

export class MergeCart extends UseCase<MergeCartInput, void> {
  constructor(private repository: ICartRepository) {
    super()
  }

  async execute(input: MergeCartInput): Promise<void> {
    const guestCart = await this.repository.find({ guestId: input.guestId })
    if (!guestCart) {
      return
    }

    const memberCart = await this.repository.find({ memberId: input.memberId })

    if (!memberCart) {
      // 透過 (any) 完全繞過私有檢查與工具鏈衝突
      const rawCart = guestCart as any
      rawCart.props.memberId = input.memberId
      rawCart.props.guestId = null
      await this.repository.save(guestCart)
    } else {
      memberCart.merge(guestCart)
      await this.repository.save(memberCart)
      await this.repository.delete(guestCart.id)
    }
  }
}
