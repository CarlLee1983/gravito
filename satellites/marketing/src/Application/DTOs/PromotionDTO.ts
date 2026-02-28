import type { Promotion } from '../../Domain/Entities/Promotion'

export interface PromotionDTO {
  id: string
  name: string
  type: string
  description: string | null
  configuration: Record<string, any>
  priority: number
  startsAt: string
  expiresAt: string
  status: string
  isActive: boolean
  isExpired: boolean
  createdAt: string
  updatedAt: string
}

export function promotionToDTO(promotion: Promotion): PromotionDTO {
  return {
    id: promotion.id,
    name: promotion.getName(),
    type: promotion.getType(),
    description: promotion.getDescription(),
    configuration: promotion.getConfiguration(),
    priority: promotion.getPriority(),
    startsAt: promotion.getStartsAt().toISOString(),
    expiresAt: promotion.getExpiresAt().toISOString(),
    status: promotion.getStatus(),
    isActive: promotion.isActive(),
    isExpired: promotion.isExpired(),
    createdAt: promotion.getCreatedAt().toISOString(),
    updatedAt: promotion.getUpdatedAt().toISOString(),
  }
}

export function promotionsToDTO(promotions: Promotion[]): PromotionDTO[] {
  return promotions.map(promotionToDTO)
}
