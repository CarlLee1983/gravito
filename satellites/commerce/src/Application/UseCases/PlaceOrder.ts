import { DB } from '@gravito/atlas'
import type { PlanetCore } from '@gravito/core'
import { UseCase } from '@gravito/enterprise'
import type { CacheManager } from '@gravito/stasis'
import { LineItem, Order } from '../../Domain/Entities/Order'
import { AdjustmentCalculator } from '../Services/AdjustmentCalculator'
import { ProductResolver } from '../Services/ProductResolver'

export interface PlaceOrderInput {
  memberId: string | null
  idempotencyKey?: string
  items: {
    variantId: string
    quantity: number
  }[]
}

export class PlaceOrder extends UseCase<PlaceOrderInput, any> {
  constructor(private core: PlanetCore) {
    super()
  }

  async execute(input: PlaceOrderInput): Promise<any> {
    const adjCalculator = new AdjustmentCalculator(this.core)
    const mode = process.env.COMMERCE_MODE || 'standard'
    const useCache = mode === 'sport'

    const cache = this.core.container.make<CacheManager>('cache')
    const productResolver = new ProductResolver(cache)

    return await DB.transaction(async (db) => {
      const order = Order.create(crypto.randomUUID(), input.memberId)

      for (const reqItem of input.items) {
        const variantInfo = await productResolver.resolve(reqItem.variantId, useCache)

        const variant = (await db
          .table('product_variants')
          .where('id', reqItem.variantId)
          .select('stock', 'version', 'sku', 'price')
          .first()) as any

        if (!variant) {
          throw new Error(`Variant ${reqItem.variantId} not found`)
        }
        if (Number(variant.stock) < reqItem.quantity) {
          throw new Error('Insufficient stock')
        }

        const affectedRows = await db
          .table('product_variants')
          .where('id', reqItem.variantId)
          .where('version', variant.version)
          .update({
            stock: Number(variant.stock) - reqItem.quantity,
            version: Number(variant.version) + 1,
            updated_at: new Date(),
          })

        if (affectedRows === 0) {
          throw new Error('Concurrency conflict: Please try again')
        }

        const lineItem = new LineItem(crypto.randomUUID(), {
          variantId: variantInfo.id,
          sku: variantInfo.sku,
          name: variantInfo.name,
          unitPrice: variantInfo.price,
          quantity: reqItem.quantity,
          totalPrice: variantInfo.price * reqItem.quantity,
        })
        order.addItem(lineItem)
      }

      await adjCalculator.calculate(order)

      await db.table('orders').insert({
        id: order.id,
        member_id: order.memberId,
        idempotency_key: input.idempotencyKey,
        status: order.status,
        subtotal_amount: order.subtotalAmount,
        adjustment_amount: order.adjustmentAmount,
        total_amount: order.totalAmount,
        created_at: order.createdAt,
      })

      for (const item of order.items) {
        await db.table('order_items').insert({
          id: item.id,
          order_id: order.id,
          variant_id: item.props.variantId,
          sku: item.props.sku,
          name: item.props.name,
          unit_price: item.props.unitPrice,
          quantity: item.props.quantity,
          total_price: item.props.totalPrice,
        })
      }

      for (const adj of order.adjustments) {
        await db.table('order_adjustments').insert({
          id: adj.id,
          order_id: order.id,
          label: adj.props.label,
          amount: adj.props.amount,
          source_type: adj.props.sourceType,
          source_id: adj.props.sourceId,
        })
      }

      await this.core.hooks.doAction('commerce:order-placed', { orderId: order.id })

      return {
        orderId: order.id,
        status: order.status,
        total: order.totalAmount,
        adjustments: order.adjustments.map((a) => a.props.label),
      }
    })
  }
}
