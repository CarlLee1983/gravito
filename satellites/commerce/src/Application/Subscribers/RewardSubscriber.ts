import { DB } from '@gravito/atlas'
import type { PlanetCore } from '@gravito/core'

export class RewardSubscriber {
  constructor(private core: PlanetCore) {}

  async handleOrderPlaced(payload: { orderId: string }) {
    const logger = this.core.logger
    const order = (await DB.table('orders').where('id', payload.orderId).first()) as any

    if (!order || !order.member_id) {
      return
    }

    const points = Math.floor(Number(order.total_amount) / 100)

    if (points > 0) {
      logger.info(
        `🎁 [Rewards] 為會員 ${order.member_id} 分配 ${points} 點紅利 (訂單: ${payload.orderId})`
      )
      await this.core.hooks.doAction('rewards:assigned', {
        memberId: order.member_id,
        points,
      })
    }
  }
}
