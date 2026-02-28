import { DB } from '@gravito/atlas'
import type { PlanetCore } from '@gravito/core'
import { isOrderRow } from '../../Infrastructure/Types/OrderDbTypes'

export class RewardSubscriber {
  constructor(private core: PlanetCore) {}

  async handleOrderPlaced(payload: { orderId: string }) {
    const logger = this.core.logger
    const raw = await DB.table('orders').where('id', payload.orderId).first()

    if (!raw || !isOrderRow(raw) || !raw.member_id) {
      return
    }

    const points = Math.floor(Number(raw.total_amount) / 100)

    if (points > 0) {
      logger.info(
        `🎁 [Rewards] 為會員 ${raw.member_id} 分配 ${points} 點紅利 (訂單: ${payload.orderId})`
      )
      await this.core.hooks.doAction('rewards:assigned', {
        memberId: raw.member_id,
        points,
      })
    }
  }
}
