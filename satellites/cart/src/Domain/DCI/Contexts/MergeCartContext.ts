import type { ICartRepository } from '../../Contracts/ICartRepository'
import { injectMergeDonor, injectMergeReceiver } from '../Roles'

/**
 * 購物車合併的上下文
 * DCI Context：協調 MergeDonor、MergeReceiver、Cart 與 Repository
 * 這取代了之前的 MergeCart UseCase 中的 as any hack
 */
export class MergeCartContext {
  constructor(private repository: ICartRepository) {}

  /**
   * 執行購物車合併流程
   * 場景 1: 會員無購物車 → 訪客購物車轉正為會員購物車
   * 場景 2: 會員有購物車 → 合併訪客購物車到會員購物車，刪除訪客購物車
   */
  async execute(input: { memberId: string; guestId: string }): Promise<void> {
    // 1. 查找兩個購物車
    const guestCart = await this.repository.find({ guestId: input.guestId })
    if (!guestCart) {
      // 沒有訪客購物車，無需合併
      return
    }

    const memberCart = await this.repository.find({ memberId: input.memberId })

    if (!memberCart) {
      // 場景 1：會員無購物車，直接將訪客購物車轉正
      // 無需 as any hack：使用 Domain 方法
      guestCart.reassignToMember(input.memberId)
      await this.repository.save(guestCart)
    } else {
      // 場景 2：會員有購物車，執行合併
      // 2a. 注入角色
      const donor = injectMergeDonor(guestCart)
      const receiver = injectMergeReceiver(memberCart)

      // 2b. 執行合併流程
      const itemsToMerge = donor.getItemsForMerge()
      receiver.receiveItems(itemsToMerge)

      // 2c. 持久化
      await this.repository.save(memberCart)
      await this.repository.delete(guestCart.id)
    }
  }
}
