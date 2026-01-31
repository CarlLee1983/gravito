/**
 * 分析儀表板範例（Aggregation）
 */

import { Mongo } from '@gravito/dark-matter'

await Mongo.connect()

// 使用者活躍度分析
async function getUserActivityStats() {
  return await Mongo.collection('events')
    .aggregate()
    .match({ eventType: { $in: ['login', 'action', 'logout'] } })
    .group({
      _id: {
        userId: '$userId',
        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
      },
      loginCount: { $sum: { $cond: [{ $eq: ['$eventType', 'login'] }, 1, 0] } },
      actionCount: { $sum: { $cond: [{ $eq: ['$eventType', 'action'] }, 1, 0] } },
      duration: { $sum: '$duration' },
    })
    .sort({ '_id.date': -1 })
    .limit(100)
    .get()
}

// 銷售趨勢分析
async function getSalesTrend(startDate: Date, endDate: Date) {
  return await Mongo.collection('orders')
    .aggregate()
    .match({
      createdAt: { $gte: startDate, $lte: endDate },
      status: 'completed',
    })
    .group({
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      totalSales: { $sum: '$amount' },
      orderCount: { $sum: 1 },
      avgOrderValue: { $avg: '$amount' },
    })
    .sort({ _id: 1 })
    .get()
}

const stats = await getUserActivityStats()
console.log('使用者活躍度：', stats)

// 銷售趨勢範例
const startDate = new Date('2024-01-01')
const endDate = new Date('2024-12-31')
const salesTrend = await getSalesTrend(startDate, endDate)
console.log('銷售趨勢：', salesTrend)
