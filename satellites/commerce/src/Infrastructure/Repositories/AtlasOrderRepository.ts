import { DB } from '@gravito/atlas'
import type { IOrderRepository } from '../../Domain/Contracts/IOrderRepository'
import { Order, type OrderStatus } from '../../Domain/Entities/Order'
import { Adjustment, type AdjustmentType } from '../../Domain/ValueObjects/Adjustment'
import { LineItem } from '../../Domain/ValueObjects/LineItem'
import { Money } from '../../Domain/ValueObjects/Money'
import {
  isOrderAdjustmentRow,
  isOrderItemRow,
  isOrderRow,
  type OrderRow,
} from '../Types/OrderDbTypes'

/**
 * Atlas ORM 訂單 Repository 實作
 */
export class AtlasOrderRepository implements IOrderRepository {
  /**
   * 根據 ID 查找訂單
   */
  async findById(id: string): Promise<Order | null> {
    const raw = await DB.table('orders').where('id', id).first()
    if (!raw || !isOrderRow(raw)) {
      return null
    }
    return this.reconstitute(raw)
  }

  /**
   * 根據會員 ID 查找訂單列表
   */
  async findByUserId(userId: string): Promise<Order[]> {
    const raw = await DB.table('orders').where('member_id', userId).get()
    const rows = Array.isArray(raw) ? (raw as unknown[]).filter(isOrderRow) : []
    return Promise.all(rows.map((row) => this.reconstitute(row)))
  }

  /**
   * 根據冪等性鑰匙查找訂單
   */
  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const raw = await DB.table('orders').where('idempotency_key', key).first()
    if (!raw || !isOrderRow(raw)) {
      return null
    }
    return this.reconstitute(raw)
  }

  /**
   * 查找所有訂單（支援分頁和過濾）
   */
  async findAll(filters?: {
    status?: string
    memberId?: string
    limit?: number
    offset?: number
  }): Promise<{ items: Order[]; total: number }> {
    let query = DB.table('orders')

    if (filters?.status) {
      query = query.where('status', filters.status)
    }

    if (filters?.memberId) {
      query = query.where('member_id', filters.memberId)
    }

    // 計算總數
    const total = await query.clone().count()

    // 分頁
    const limit = filters?.limit || 20
    const offset = filters?.offset || 0
    const raw = await query.limit(limit).offset(offset).get()

    const rows = Array.isArray(raw) ? (raw as unknown[]).filter(isOrderRow) : []
    const items = await Promise.all(rows.map((row) => this.reconstitute(row)))

    return { items, total }
  }

  /**
   * 檢查訂單是否存在
   */
  async exists(id: string): Promise<boolean> {
    return DB.table('orders').where('id', id).exists()
  }

  /**
   * 保存訂單（新建或更新）
   */
  async save(order: Order): Promise<void> {
    await DB.transaction(async (db) => {
      const props = order.toProps()

      // 檢查訂單是否存在
      const existing = await db.table('orders').where('id', order.id).first()

      if (existing) {
        // 更新訂單
        await db.table('orders').where('id', order.id).update({
          member_id: props.memberId,
          status: props.status,
          subtotal_amount: props.subtotal.amountInCents,
          adjustment_amount: props.adjustmentAmount.amountInCents,
          total_amount: props.total.amountInCents,
          updated_at: props.updatedAt,
        })

        // 刪除舊的明細和調整項目
        await db.table('order_items').where('order_id', order.id).delete()
        await db.table('order_adjustments').where('order_id', order.id).delete()
      } else {
        // 新建訂單
        await db.table('orders').insert({
          id: order.id,
          member_id: props.memberId,
          idempotency_key: props.idempotencyKey,
          status: props.status,
          subtotal_amount: props.subtotal.amountInCents,
          adjustment_amount: props.adjustmentAmount.amountInCents,
          total_amount: props.total.amountInCents,
          currency: props.currency,
          created_at: props.createdAt,
          updated_at: props.updatedAt,
        })
      }

      // 插入明細項目
      for (const item of props.items) {
        await db.table('order_items').insert({
          id: `item-${order.id}-${item.variantId}`,
          order_id: order.id,
          product_id: item.productId,
          variant_id: item.variantId,
          sku: item.sku,
          name: item.name,
          unit_price: item.unitPrice.amountInCents,
          quantity: item.quantity,
          total_price: item.totalPrice.amountInCents,
          options: item.options ? JSON.stringify(item.options) : null,
        })
      }

      // 插入調整項目
      for (const adjustment of props.adjustments) {
        await db.table('order_adjustments').insert({
          id: `adj-${order.id}-${adjustment.type}`,
          order_id: order.id,
          type: adjustment.type,
          label: adjustment.label,
          amount: adjustment.amount.amountInCents,
          source_type: adjustment.sourceType,
          source_id: adjustment.sourceId,
        })
      }
    })
  }

  /**
   * 刪除訂單
   */
  async delete(id: string): Promise<void> {
    await DB.transaction(async (db) => {
      await db.table('order_items').where('order_id', id).delete()
      await db.table('order_adjustments').where('order_id', id).delete()
      await db.table('orders').where('id', id).delete()
    })
  }

  /**
   * 從 DB 行重建 Order 實例
   */
  private async reconstitute(orderRow: OrderRow): Promise<Order> {
    // 載入明細項目
    const rawItems = await DB.table('order_items').where('order_id', orderRow.id).get()
    const itemRows = Array.isArray(rawItems) ? (rawItems as unknown[]).filter(isOrderItemRow) : []

    const items = itemRows.map((row) =>
      LineItem.reconstitute({
        productId: row.product_id,
        variantId: row.variant_id ?? '',
        sku: row.sku,
        name: row.name,
        unitPrice: Money.of(row.unit_price / 100, orderRow.currency),
        quantity: row.quantity,
        options: row.options ? (JSON.parse(row.options) as Record<string, string>) : undefined,
      })
    )

    // 載入調整項目
    const rawAdj = await DB.table('order_adjustments').where('order_id', orderRow.id).get()
    const adjustmentRows = Array.isArray(rawAdj)
      ? (rawAdj as unknown[]).filter(isOrderAdjustmentRow)
      : []

    const adjustments = adjustmentRows.map((row) =>
      Adjustment.reconstitute({
        type: row.type as AdjustmentType,
        label: row.label,
        amount: Money.of(row.amount / 100, orderRow.currency),
        sourceType: row.source_type ?? undefined,
        sourceId: row.source_id ?? undefined,
      })
    )

    // 重建 Order
    return Order.reconstitute(orderRow.id, {
      memberId: orderRow.member_id,
      idempotencyKey: orderRow.idempotency_key ?? undefined,
      status: orderRow.status as OrderStatus,
      subtotal: Money.of(orderRow.subtotal_amount / 100, orderRow.currency),
      adjustmentAmount: Money.of(orderRow.adjustment_amount / 100, orderRow.currency),
      total: Money.of(orderRow.total_amount / 100, orderRow.currency),
      currency: orderRow.currency,
      items,
      adjustments,
      createdAt: new Date(orderRow.created_at),
      updatedAt: new Date(orderRow.updated_at),
    })
  }
}
