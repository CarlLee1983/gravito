import { ValueObject } from '@gravito/enterprise'
import type { Money } from './Money'

/**
 * 調整類型
 */
export enum AdjustmentType {
  DISCOUNT = 'discount',
  SHIPPING = 'shipping',
  TAX = 'tax',
  SURCHARGE = 'surcharge',
}

/**
 * Adjustment 值物件屬性
 */
interface AdjustmentProps {
  type: AdjustmentType
  label: string
  amount: Money
  sourceType?: string
  sourceId?: string
}

/**
 * Adjustment 值物件
 *
 * 訂單金額調整項目（折扣、運費、稅務等）。
 * 不可變，表示調整的具體內容和來源。
 */
export class Adjustment extends ValueObject<AdjustmentProps> {
  private constructor(props: AdjustmentProps) {
    super(props)
  }

  /**
   * 建立 Adjustment 實例
   */
  static create(
    type: AdjustmentType,
    label: string,
    amount: Money,
    sourceType?: string,
    sourceId?: string
  ): Adjustment {
    return new Adjustment({
      type,
      label,
      amount,
      sourceType,
      sourceId,
    })
  }

  /**
   * 從 DB 重建 Adjustment
   */
  static reconstitute(props: AdjustmentProps): Adjustment {
    return new Adjustment(props)
  }

  get type(): AdjustmentType {
    return this.props.type
  }

  get label(): string {
    return this.props.label
  }

  get amount(): Money {
    return this.props.amount
  }

  get sourceType(): string | undefined {
    return this.props.sourceType
  }

  get sourceId(): string | undefined {
    return this.props.sourceId
  }

  /**
   * 判斷是否為折扣
   */
  isDiscount(): boolean {
    return this.props.type === AdjustmentType.DISCOUNT
  }

  /**
   * 判斷是否為運費
   */
  isShipping(): boolean {
    return this.props.type === AdjustmentType.SHIPPING
  }

  /**
   * 判斷是否為稅務
   */
  isTax(): boolean {
    return this.props.type === AdjustmentType.TAX
  }
}
