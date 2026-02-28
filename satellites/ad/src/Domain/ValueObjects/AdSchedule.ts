import { ValueObject } from '@gravito/enterprise'
import { AdError } from '../Errors/AdError'

/** 一天的毫秒數 */
const MS_PER_DAY = 86_400_000

/**
 * 廣告排程值物件
 *
 * 驗證並管理廣告排程（startsAt + endsAt）。
 * 提供判斷排程狀態（活躍中、已過期、即將開始）的方法。
 */
export class AdSchedule extends ValueObject<{
  startsAt: Date
  endsAt: Date
}> {
  private constructor(startsAt: Date, endsAt: Date) {
    super({
      startsAt: new Date(startsAt.getTime()),
      endsAt: new Date(endsAt.getTime()),
    })
  }

  /**
   * 建立 AdSchedule 實例
   *
   * @param startsAt - 開始時間
   * @param endsAt - 結束時間（必須晚於 startsAt）
   * @throws AdError.invalidSchedule 當 endsAt <= startsAt 時
   */
  static of(startsAt: Date, endsAt: Date): AdSchedule {
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw AdError.invalidSchedule('結束時間必須晚於開始時間')
    }
    return new AdSchedule(startsAt, endsAt)
  }

  /**
   * 從資料庫重建 AdSchedule（無驗證）
   *
   * @param startsAt - 開始時間
   * @param endsAt - 結束時間
   */
  static reconstitute(startsAt: Date, endsAt: Date): AdSchedule {
    return new AdSchedule(startsAt, endsAt)
  }

  /**
   * 開始時間
   */
  get startsAt(): Date {
    return new Date(this.props.startsAt.getTime())
  }

  /**
   * 結束時間
   */
  get endsAt(): Date {
    return new Date(this.props.endsAt.getTime())
  }

  /**
   * 判斷 now 是否在 [startsAt, endsAt] 內
   */
  isActive(now?: Date): boolean {
    const current = now ?? new Date()
    const t = current.getTime()
    return t >= this.props.startsAt.getTime() && t <= this.props.endsAt.getTime()
  }

  /**
   * 判斷 now 是否已超過 endsAt
   */
  isExpired(now?: Date): boolean {
    const current = now ?? new Date()
    return current.getTime() > this.props.endsAt.getTime()
  }

  /**
   * 判斷 now 是否早於 startsAt
   */
  isUpcoming(now?: Date): boolean {
    const current = now ?? new Date()
    return current.getTime() < this.props.startsAt.getTime()
  }

  /**
   * 從 now 到 endsAt 的剩餘天數（向下取整，最小為 0）
   */
  daysRemaining(now?: Date): number {
    const current = now ?? new Date()
    const diff = this.props.endsAt.getTime() - current.getTime()
    if (diff <= 0) {
      return 0
    }
    return Math.floor(diff / MS_PER_DAY)
  }
}
