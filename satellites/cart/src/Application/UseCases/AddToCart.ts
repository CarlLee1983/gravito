import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { Cart } from '../../Domain/Entities/Cart'

export interface AddToCartInput {
  memberId?: string
  guestId?: string
  variantId: string
  quantity: number
}

export class AddToCart extends UseCase<AddToCartInput, void> {
  constructor(private repository: ICartRepository) {
    super()
  }

  async execute(input: AddToCartInput): Promise<void> {
    // 1. 尋找或建立購物車
    let cart = await this.repository.find({
      memberId: input.memberId,
      guestId: input.guestId,
    })

    if (!cart) {
      cart = Cart.create(crypto.randomUUID(), input.memberId || null, input.guestId || null)
    }

    // 2. 執行領域邏輯
    cart.addItem(input.variantId, input.quantity)

    // 3. 儲存
    await this.repository.save(cart)
  }
}
