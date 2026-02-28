import type { MarketingAdjustment } from '../../Domain/DCI/Roles/PromotionApplierRole'

export type MarketingAdjustmentDTO = MarketingAdjustment

export function adjustmentToDTO(adjustment: MarketingAdjustment): MarketingAdjustmentDTO {
  return {
    label: adjustment.label,
    amount: adjustment.amount,
    sourceType: adjustment.sourceType,
    sourceId: adjustment.sourceId,
  }
}

export function adjustmentsToDTO(adjustments: MarketingAdjustment[]): MarketingAdjustmentDTO[] {
  return adjustments.map(adjustmentToDTO)
}
