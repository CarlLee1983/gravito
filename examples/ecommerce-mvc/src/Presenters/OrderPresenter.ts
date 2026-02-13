import type { Order, ShippingAddress } from '../models'
import { OrderItemPresenter, type OrderItemResponseDTO } from './OrderItemPresenter'

/**
 * Order Response DTO
 *
 * Type-safe API response for order data.
 * Separates persistence model from API contract.
 */
export interface OrderResponseDTO {
  id: number
  orderNumber: string
  status: string
  statusLabel: string
  userId: number
  subtotal: number
  tax: number
  shipping: number
  total: number
  formattedTotal: string
  shippingAddress: ShippingAddress | null
  notes: string | null
  canBeCancelled: boolean
  createdAt: string
  updatedAt: string
  items: OrderItemResponseDTO[]
  user?: {
    id: number
    name: string
    email: string
  }
}

/**
 * Order Presenter
 *
 * Transforms Order model to API response.
 * Includes formatted fields and computed properties.
 */
export class OrderPresenter {
  static present(order: Order): OrderResponseDTO {
    return {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      statusLabel: order.getStatusLabel(),
      userId: order.user_id,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      total: order.total,
      formattedTotal: order.getFormattedTotal(),
      shippingAddress: order.getShippingAddress(),
      notes: order.notes,
      canBeCancelled: order.canBeCancelled(),
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      items: this.presentItems(order.items ?? []),
      ...(order.user && { user: order.user }),
    }
  }

  private static presentItems(items: any): OrderItemResponseDTO[] {
    return (items ?? []).map((item: any) => OrderItemPresenter.present(item))
  }
}

// Type export for convenience
export type { OrderItemResponseDTO } from './OrderItemPresenter'
