import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { AddItemContext } from '../../Domain/DCI/Contexts'

export interface AddToCartInput {
  memberId?: string
  guestId?: string
  variantId: string
  quantity: number
}

/**
 * 新增商品到購物車 UseCase
 * 薄殼：委派給 AddItemContext 執行業務邏輯
 */
export class AddToCart extends UseCase<AddToCartInput, void> {
  private context: AddItemContext

  constructor(repository: ICartRepository) {
    super()
    this.context = new AddItemContext(repository)
  }

  async execute(input: AddToCartInput): Promise<void> {
    await this.context.execute(input)
  }
}
