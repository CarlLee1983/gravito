import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { RemoveItemContext } from '../../Domain/DCI/Contexts'
import { CartError } from '../../Domain/Errors'
import { CartItemNotFoundError, CartNotFoundError } from '../Errors/CartError'

export interface RemoveFromCartInput {
  memberId?: string
  guestId?: string
  variantId: string
}

/**
 * 從購物車移除商品 UseCase
 * 薄殼：委派給 RemoveItemContext 執行業務邏輯
 * 轉換 Domain 層錯誤為應用層錯誤
 */
export class RemoveFromCart extends UseCase<RemoveFromCartInput, void> {
  private context: RemoveItemContext

  constructor(repository: ICartRepository) {
    super()
    this.context = new RemoveItemContext(repository)
  }

  async execute(input: RemoveFromCartInput): Promise<void> {
    try {
      await this.context.execute(input)
    } catch (error) {
      if (error instanceof CartError) {
        if (error.code === 'CART_NOT_FOUND') {
          throw new CartNotFoundError()
        }
        if (error.code === 'ITEM_NOT_FOUND') {
          throw new CartItemNotFoundError(input.variantId)
        }
      }
      throw error
    }
  }
}
