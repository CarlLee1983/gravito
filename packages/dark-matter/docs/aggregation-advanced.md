# Aggregation 進階範例

## 資料分析範例

### 銷售報表

```typescript
const salesReport = await Mongo.collection('orders')
  .aggregate()
  .match({ status: 'completed' })
  .lookup({
    from: 'products',
    localField: 'productId',
    foreignField: '_id',
    as: 'product'
  })
  .unwind('$product')
  .group({
    _id: {
      date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      category: '$product.category'
    },
    totalSales: { $sum: '$amount' },
    orderCount: { $sum: 1 }
  })
  .sort({ '_id.date': -1 })
  .get()
```

### 使用者行為分析

```typescript
const userBehavior = await Mongo.collection('events')
  .aggregate()
  .match({ eventType: { $in: ['view', 'click', 'purchase'] } })
  .group({
    _id: '$userId',
    views: { $sum: { $cond: [{ $eq: ['$eventType', 'view'] }, 1, 0] } },
    clicks: { $sum: { $cond: [{ $eq: ['$eventType', 'click'] }, 1, 0] } },
    purchases: { $sum: { $cond: [{ $eq: ['$eventType', 'purchase'] }, 1, 0] } }
  })
  .addFields({
    conversionRate: {
      $multiply: [{ $divide: ['$purchases', '$views'] }, 100]
    }
  })
  .sort({ conversionRate: -1 })
  .limit(100)
  .get()
```

## JOIN 操作

### 多層巢狀 JOIN

```typescript
const orders = await Mongo.collection('orders')
  .aggregate()
  .lookup({
    from: 'users',
    localField: 'userId',
    foreignField: '_id',
    as: 'user'
  })
  .lookup({
    from: 'products',
    localField: 'productId',
    foreignField: '_id',
    as: 'product'
  })
  .lookup({
    from: 'shipping',
    localField: '_id',
    foreignField: 'orderId',
    as: 'shipping'
  })
  .get()
```

## 效能優化技巧

1. **$match 前置**：盡早過濾資料
2. **索引支援**：為 $match 和 $sort 建立索引
3. **$project 精簡**：只投影需要的欄位
4. **避免 $lookup**：能在應用層 JOIN 就不要在資料庫層

參考：[Aggregation 基準測試](../benchmarks/aggregation.bench.ts)
