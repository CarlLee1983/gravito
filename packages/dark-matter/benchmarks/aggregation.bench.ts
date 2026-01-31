/**
 * Aggregation Pipeline Performance Benchmark
 *
 * 測試 Aggregation Pipeline 在不同場景下的效能
 */

import { afterAll, beforeAll, bench, describe } from 'bun:test'
import { Mongo } from '../src'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const describeBench = process.env.MONGODB_URI ? describe : describe.skip

describeBench('Aggregation Pipeline Performance', () => {
  beforeAll(async () => {
    Mongo.configure({
      default: 'bench',
      connections: {
        bench: { uri: MONGODB_URI, database: 'aggregation_benchmark' },
      },
    })
    await Mongo.connect()

    // 準備測試資料
    await Mongo.collection('orders').deleteMany()
    await Mongo.collection('products').deleteMany()
    await Mongo.collection('users').deleteMany()

    // 插入訂單資料
    const orders = Array.from({ length: 10000 }, (_, i) => ({
      orderId: i,
      userId: i % 1000,
      productId: i % 500,
      amount: Math.floor(Math.random() * 1000) + 10,
      quantity: Math.floor(Math.random() * 10) + 1,
      status: ['pending', 'shipped', 'delivered', 'cancelled'][i % 4],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    }))

    await Mongo.collection('orders').insertMany(orders)

    // 插入產品資料
    const products = Array.from({ length: 500 }, (_, i) => ({
      productId: i,
      name: `Product ${i}`,
      category: ['Electronics', 'Clothing', 'Food', 'Books'][i % 4],
      price: Math.floor(Math.random() * 500) + 10,
    }))

    await Mongo.collection('products').insertMany(products)

    // 插入使用者資料
    const users = Array.from({ length: 1000 }, (_, i) => ({
      userId: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      country: ['US', 'UK', 'JP', 'TW'][i % 4],
    }))

    await Mongo.collection('users').insertMany(users)
  })

  afterAll(async () => {
    await Mongo.collection('orders').deleteMany()
    await Mongo.collection('products').deleteMany()
    await Mongo.collection('users').deleteMany()
    await Mongo.disconnect()
  })

  describe('基本聚合操作', () => {
    bench('$match: 過濾訂單狀態', async () => {
      await Mongo.collection('orders').aggregate().match({ status: 'delivered' }).get()
    })

    bench('$group: 按狀態分組計數', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .group({
          _id: '$status',
          total: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        })
        .get()
    })

    bench('$sort: 按金額排序', async () => {
      await Mongo.collection('orders').aggregate().sort({ amount: -1 }).limit(100).get()
    })

    bench('$project: 欄位投影', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .project({
          orderId: 1,
          amount: 1,
          totalPrice: { $multiply: ['$amount', '$quantity'] },
        })
        .limit(100)
        .get()
    })
  })

  describe('複雜聚合操作', () => {
    bench('多階段 pipeline: $match + $group + $sort', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .match({ status: 'delivered' })
        .group({
          _id: '$userId',
          totalSpent: { $sum: '$amount' },
          orderCount: { $sum: 1 },
        })
        .sort({ totalSpent: -1 })
        .limit(10)
        .get()
    })

    bench('$lookup: JOIN 訂單和產品', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .lookup({
          from: 'products',
          localField: 'productId',
          foreignField: 'productId',
          as: 'product',
        })
        .limit(100)
        .get()
    })

    bench('多層 $lookup: 訂單 + 產品 + 使用者', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .lookup({
          from: 'products',
          localField: 'productId',
          foreignField: 'productId',
          as: 'product',
        })
        .lookup({
          from: 'users',
          localField: 'userId',
          foreignField: 'userId',
          as: 'user',
        })
        .limit(100)
        .get()
    })
  })

  describe('資料分析聚合', () => {
    bench('銷售報表：按日期和類別統計', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .lookup({
          from: 'products',
          localField: 'productId',
          foreignField: 'productId',
          as: 'product',
        })
        .unwind('$product')
        .group({
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            category: '$product.category',
          },
          totalSales: { $sum: '$amount' },
          orderCount: { $sum: 1 },
        })
        .sort({ '_id.date': -1 })
        .get()
    })

    bench('使用者消費排行：前 100 名', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .match({ status: { $ne: 'cancelled' } })
        .group({
          _id: '$userId',
          totalSpent: { $sum: '$amount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$amount' },
        })
        .sort({ totalSpent: -1 })
        .limit(100)
        .get()
    })

    bench('產品銷售統計', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .match({ status: 'delivered' })
        .group({
          _id: '$productId',
          totalSold: { $sum: '$quantity' },
          revenue: { $sum: '$amount' },
          avgPrice: { $avg: '$amount' },
        })
        .lookup({
          from: 'products',
          localField: '_id',
          foreignField: 'productId',
          as: 'product',
        })
        .unwind('$product')
        .sort({ revenue: -1 })
        .limit(50)
        .get()
    })
  })

  describe('$facet 多維度分析', () => {
    bench('$facet: 同時進行多個聚合', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .facet({
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byAmount: [
            {
              $bucket: {
                groupBy: '$amount',
                boundaries: [0, 100, 500, 1000, 5000],
                default: 'Other',
                output: { count: { $sum: 1 }, total: { $sum: '$amount' } },
              },
            },
          ],
          topUsers: [
            {
              $group: {
                _id: '$userId',
                total: { $sum: '$amount' },
              },
            },
            { $sort: { total: -1 } },
            { $limit: 10 },
          ],
        })
        .get()
    })
  })

  describe('大數據聚合', () => {
    bench('處理 10K 訂單：完整聚合', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .group({
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          avgOrderValue: { $avg: '$amount' },
          minOrder: { $min: '$amount' },
          maxOrder: { $max: '$amount' },
        })
        .get()
    })

    bench('分組聚合 + 排序（無索引）', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .group({
          _id: {
            userId: '$userId',
            status: '$status',
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        })
        .sort({ total: -1 })
        .limit(100)
        .get()
    })
  })

  describe('Pipeline 優化比較', () => {
    bench('未優化：先 JOIN 後過濾', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .lookup({
          from: 'products',
          localField: 'productId',
          foreignField: 'productId',
          as: 'product',
        })
        .match({ status: 'delivered' })
        .limit(100)
        .get()
    })

    bench('已優化：先過濾後 JOIN', async () => {
      await Mongo.collection('orders')
        .aggregate()
        .match({ status: 'delivered' })
        .lookup({
          from: 'products',
          localField: 'productId',
          foreignField: 'productId',
          as: 'product',
        })
        .limit(100)
        .get()
    })
  })
})
