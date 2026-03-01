import { UseCase } from '@gravito/enterprise'
import type { ICartRepository } from '../../Domain/Contracts/ICartRepository'
import { UpdateItemContext } from '../../Domain/DCI/Contexts'
import { CartError } from '../../Domain/Errors'
import { CartItemNotFoundError, CartNotFoundError, InvalidQuantityError } from '../Errors/CartError'

export interface UpdateCartItemInput {
  memberId?: string
  guestId?: string
  variantId: string
  quantity: number
}

/**
 * 更新購物車商品數量 UseCase
 * 薄殼：委派給 UpdateItemContext 執行業務邏輯
 * 轉換 Domain 層錯誤為應用層錯誤
 */
export class UpdateCartItem extends UseCase<UpdateCartItemInput, void> {
  private context: UpdateItemContext

  constructor(repository: ICartRepository) {
    super()
    this.context = new UpdateItemContext(repository)
  }

  async execute(input: UpdateCartItemInput): Promise<void> {
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
        if (error.code === 'INVALID_QUANTITY') {
          throw new InvalidQuantityError(input.quantity, error.message)
        }
      }
      throw error
    }
  }
}
