# Transactions 進階指南

## MongoDB 交易簡介

MongoDB 交易（Transactions）提供 ACID 保證，確保多個操作的原子性。適用於：
- 金融交易（轉帳、付款）
- 訂單處理（庫存扣減、訂單建立）
- 複雜的業務邏輯需要資料一致性

**系統需求：** MongoDB 4.0+ Replica Set 或 4.2+ Sharded Cluster

## 基本用法

### 簡單交易

```typescript
import { Mongo } from '@gravito/dark-matter'

await Mongo.connect()

// 執行交易
await Mongo.transaction(async (session) => {
  // 在交易中執行多個操作
  await Mongo.collection('accounts')
    .where('accountId', 'A')
    .update({ balance: 900 }, { session })

  await Mongo.collection('accounts')
    .where('accountId', 'B')
    .update({ balance: 1100 }, { session })

  // 如果任何操作失敗，整個交易會自動回滾
})
```

### 帶返回值的交易

```typescript
const transferResult = await Mongo.transaction(async (session) => {
  // 檢查餘額
  const accountA = await Mongo.collection('accounts')
    .where('accountId', 'A')
    .first({ session })

  if (!accountA || accountA.balance < 100) {
    throw new Error('餘額不足')
  }

  // 執行轉帳
  await Mongo.collection('accounts')
    .where('accountId', 'A')
    .update({ balance: accountA.balance - 100 }, { session })

  await Mongo.collection('accounts')
    .where('accountId', 'B')
    .update({ $inc: { balance: 100 } }, { session })

  // 記錄交易
  const record = await Mongo.collection('transactions').insert({
    from: 'A',
    to: 'B',
    amount: 100,
    timestamp: new Date()
  }, { session })

  return record.insertedId
})

console.log('交易 ID：', transferResult)
```

## 進階場景

### 1. 跨 Collection 交易

```typescript
await Mongo.transaction(async (session) => {
  // 建立訂單
  const order = await Mongo.collection('orders').insert({
    userId: 'user123',
    productId: 'prod456',
    quantity: 5,
    status: 'pending'
  }, { session })

  // 扣減庫存
  const product = await Mongo.collection('inventory')
    .where('productId', 'prod456')
    .first({ session })

  if (!product || product.stock < 5) {
    throw new Error('庫存不足')
  }

  await Mongo.collection('inventory')
    .where('productId', 'prod456')
    .update({ stock: product.stock - 5 }, { session })

  // 記錄庫存變更
  await Mongo.collection('inventory_logs').insert({
    productId: 'prod456',
    change: -5,
    orderId: order.insertedId,
    timestamp: new Date()
  }, { session })
})
```

### 2. 跨資料庫交易

```typescript
// 配置多個連線
Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017', database: 'app_db' },
    logs: { uri: 'mongodb://localhost:27017', database: 'logs_db' }
  }
})

await Mongo.connect()
await Mongo.connect('logs')

// 跨資料庫交易
await Mongo.transaction(async (session) => {
  // 主資料庫操作
  await Mongo.connection('main')
    .collection('users')
    .where('userId', 'user123')
    .update({ lastLogin: new Date() }, { session })

  // 日誌資料庫操作
  await Mongo.connection('logs')
    .collection('login_logs')
    .insert({
      userId: 'user123',
      timestamp: new Date(),
      ip: '192.168.1.1'
    }, { session })
})
```

### 3. 交易重試機制

```typescript
async function transferWithRetry(from: string, to: string, amount: number) {
  const maxRetries = 3
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await Mongo.transaction(async (session) => {
        // 轉帳邏輯
        await Mongo.collection('accounts')
          .where('accountId', from)
          .update({ $inc: { balance: -amount } }, { session })

        await Mongo.collection('accounts')
          .where('accountId', to)
          .update({ $inc: { balance: amount } }, { session })
      })

      return // 成功，退出
    } catch (error: any) {
      lastError = error

      // 只重試暫時性錯誤
      if (error.hasErrorLabel?.('TransientTransactionError')) {
        console.log(`交易失敗，重試 ${attempt + 1}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
        continue
      }

      // 非暫時性錯誤，直接拋出
      throw error
    }
  }

  throw new Error(`交易失敗（已重試 ${maxRetries} 次）：${lastError?.message}`)
}
```

## 錯誤處理與回滾

### 自動回滾

```typescript
try {
  await Mongo.transaction(async (session) => {
    await Mongo.collection('orders').insert({
      amount: 1000
    }, { session })

    // 發生錯誤，交易自動回滾
    throw new Error('處理失敗')
  })
} catch (error) {
  console.error('交易已回滾：', error)
  // orders collection 不會有新記錄
}
```

### 手動回滾

```typescript
await Mongo.transaction(async (session) => {
  const order = await Mongo.collection('orders').insert({
    amount: 1000
  }, { session })

  // 某些業務邏輯檢查
  const canProceed = await checkBusinessRules(order.insertedId)

  if (!canProceed) {
    // 拋出錯誤觸發回滾
    throw new Error('業務規則驗證失敗')
  }

  // 繼續處理...
})
```

### 錯誤類型判斷

```typescript
try {
  await Mongo.transaction(async (session) => {
    // 交易操作...
  })
} catch (error: any) {
  if (error.hasErrorLabel?.('TransientTransactionError')) {
    console.error('暫時性錯誤，可以重試')
  } else if (error.hasErrorLabel?.('UnknownTransactionCommitResult')) {
    console.error('Commit 結果未知')
  } else {
    console.error('永久性錯誤：', error.message)
  }
}
```

## 實用範例

### 範例 1：電商訂單處理

```typescript
async function processOrder(userId: string, items: Array<{ productId: string; quantity: number }>) {
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
        .update({
          stock: product.stock - item.quantity,
          updatedAt: new Date()
        }, { session })
    }

    // 2. 建立訂單
    const order = await Mongo.collection('orders').insert({
      userId,
      items,
      status: 'pending',
      total: items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: new Date()
    }, { session })

    // 3. 更新使用者訂單統計
    await Mongo.collection('users')
      .where('userId', userId)
      .update({
        $inc: { totalOrders: 1 },
        lastOrderAt: new Date()
      }, { session })

    return order.insertedId
  })
}
```

### 範例 2：錢包系統

```typescript
async function walletTransfer(fromWallet: string, toWallet: string, amount: number) {
  return await Mongo.transaction(async (session) => {
    // 檢查發送方餘額
    const sender = await Mongo.collection('wallets')
      .where('walletId', fromWallet)
      .first({ session })

    if (!sender || sender.balance < amount) {
      throw new Error('餘額不足')
    }

    // 扣款
    await Mongo.collection('wallets')
      .where('walletId', fromWallet)
      .update({
        balance: sender.balance - amount,
        updatedAt: new Date()
      }, { session })

    // 加款
    await Mongo.collection('wallets')
      .where('walletId', toWallet)
      .update({
        $inc: { balance: amount },
        updatedAt: new Date()
      }, { session })

    // 記錄交易
    const txn = await Mongo.collection('wallet_transactions').insert({
      from: fromWallet,
      to: toWallet,
      amount,
      status: 'completed',
      timestamp: new Date()
    }, { session })

    return txn.insertedId
  })
}
```

## 效能考量

### 交易大小限制

MongoDB 交易有大小限制（預設 16MB），避免在單一交易中處理過多資料：

```typescript
// ❌ 不好：單一交易處理 10000 筆記錄
await Mongo.transaction(async (session) => {
  for (let i = 0; i < 10000; i++) {
    await Mongo.collection('logs').insert({ data: i }, { session })
  }
})

// ✅ 好：分批處理
const batchSize = 100
for (let i = 0; i < 10000; i += batchSize) {
  await Mongo.transaction(async (session) => {
    const docs = Array.from({ length: batchSize }, (_, j) => ({ data: i + j }))
    await Mongo.collection('logs').insertMany(docs, { session })
  })
}
```

### 衝突解決

使用樂觀鎖減少交易衝突：

```typescript
await Mongo.transaction(async (session) => {
  const account = await Mongo.collection('accounts')
    .where('accountId', 'A')
    .first({ session })

  // 使用版本號進行樂觀鎖
  const result = await Mongo.collection('accounts')
    .where('accountId', 'A')
    .where('version', account.version)
    .update({
      balance: account.balance - 100,
      version: account.version + 1
    }, { session })

  if (result.modifiedCount === 0) {
    throw new Error('資料已被其他交易修改')
  }
})
```

### 索引優化

為交易中常用的查詢欄位建立索引：

```typescript
// 建立複合索引加速交易查詢
await Mongo.database().collection('accounts').createIndex({
  accountId: 1,
  status: 1
})
```

## 最佳實踐

1. **保持交易簡短：** 交易時間越短，衝突越少
2. **先讀後寫：** 在交易開始時讀取所有需要的資料
3. **使用索引：** 確保查詢有適當的索引
4. **錯誤處理：** 實作重試機制處理暫時性錯誤
5. **避免外部 API：** 交易中不要呼叫外部 API
6. **測試回滾：** 確保回滾邏輯正確運作
7. **監控效能：** 使用基準測試監控交易效能

## 相關資源

- [MongoDB Transactions 官方文檔](https://www.mongodb.com/docs/manual/core/transactions/)
- [基準測試結果](../benchmarks/transactions.bench.ts)
- [Real-world 範例：電商系統](../examples/real-world/e-commerce.ts)
