/**
 * 電商訂單處理範例
 * 展示交易、庫存管理、訂單建立
 */

import { Mongo } from '@gravito/dark-matter'

await Mongo.connect()

// 處理訂單（使用交易確保資料一致性）
async function processOrder(
  userId: string,
  items: Array<{ productId: string; quantity: number; price: number }>
) {
  return await Mongo.transaction(async (session) => {
    // 1. 檢查並扣減庫存
    for (const item of items) {
      const product = await Mongo.collection('inventory')
        .where('productId', item.productId)
        .first({ session })

      if (!product || product.stock < item.quantity) {
        throw new Error(`產品 ${item.productId} 庫存不足`)
      }

      await Mongo.collection('inventory')
        .where('productId', item.productId)
        .update(
          {
            stock: product.stock - item.quantity,
            updatedAt: new Date(),
          },
          { session }
        )
    }

    // 2. 計算總金額
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // 3. 建立訂單
    const order = await Mongo.collection('orders').insert(
      {
        userId,
        items,
        total,
        status: 'pending',
        createdAt: new Date(),
      },
      { session }
    )

    // 4. 記錄庫存變更
    for (const item of items) {
      await Mongo.collection('inventory_logs').insert(
        {
          productId: item.productId,
          change: -item.quantity,
          orderId: order.insertedId,
          reason: 'order_created',
          timestamp: new Date(),
        },
        { session }
      )
    }

    return order.insertedId
  })
}

// 範例：處理訂單
const orderId = await processOrder('user123', [
  { productId: 'prod1', quantity: 2, price: 100 },
  { productId: 'prod2', quantity: 1, price: 200 },
])

console.log('訂單建立成功：', orderId)
