/**
 * Order DTO 與 Mapper
 *
 * 負責 Order Entity <-> OrderDTO 的雙向轉換。
 * OrderDTO 用於 API 回傳，將 Money 值物件轉換為十進位 number。
 */

import type { Order } from '../../Domain/Entities/Order'
import type { OrderStatus } from '../../Domain/Models'
import { Money } from '../../Domain/ValueObjects/Money'
import { OrderItem } from '../../Domain/ValueObjects/OrderItem'

/**
 * OrderItemDTO - 訂單項目 API 回傳格式
 */
export interface OrderItemDTO {
  productId: string
  productName: string
  quantity: number
  /** 單價（十進位） */
  unitPrice: number
  /** 小計（十進位） */
  totalPrice: number
}

/**
 * OrderDTO - 訂單 API 回傳格式
 */
export interface OrderDTO {
  id: string
  userId: string
  items: OrderItemDTO[]
  /** 總金額（十進位） */
  totalAmount: number
  status: OrderStatus
  createdAt: Date
}

/**
 * CreateOrderItemInput - 建立訂單項目的輸入格式
 */
export interface CreateOrderItemInput {
  productId: string
  productName: string
  quantity: number
  /** 單價（十進位） */
  unitPrice: number
}

/**
 * CreateOrderInput - 建立訂單的輸入格式
 */
export interface CreateOrderInput {
  userId: string
  items: CreateOrderItemInput[]
}

/**
 * OrderMapper
 *
 * 統一的 Order 轉換邏輯
 */
export class OrderMapper {
  /**
   * 將 CreateOrderInput 轉換為 Domain 參數
   *
   * @param input - API 輸入的建立訂單資料
   * @returns 包含 userId 和 OrderItem 值物件陣列的物件
   */
  static toDomain(input: CreateOrderInput): {
    userId: string
    items: OrderItem[]
  } {
    const items = input.items.map((item) =>
      OrderItem.create(item.productId, item.productName, item.quantity, Money.of(item.unitPrice))
    )

    return {
      userId: input.userId,
      items,
    }
  }

  /**
   * 將 Order Entity 轉換為 OrderDTO
   *
   * @param order - Order 聚合根
   * @returns OrderDTO（Money 轉為十進位 number）
   */
  static toDTO(order: Order): OrderDTO {
    return {
      id: order.id,
      userId: order.userId,
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.value,
        totalPrice: item.totalPrice.value,
      })),
      totalAmount: order.totalAmount.value,
      status: order.status,
      createdAt: order.createdAt,
    }
  }

  /**
   * 將 Order Entity 陣列轉換為 OrderDTO 陣列
   *
   * @param orders - Order 聚合根陣列
   * @returns OrderDTO 陣列
   */
  static toDTOList(orders: Order[]): OrderDTO[] {
    return orders.map((order) => OrderMapper.toDTO(order))
  }
}
