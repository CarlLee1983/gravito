# Aggregate（聚合根）

## 1. 定義

聚合根是實體的分組，用於簡化複雜的領域模型。聚合根保證了其內部的一致性。聚合根是唯一可以被外部訪問的實體。

## 2. 核心特徵

```typescript
// Aggregate 結構：
// - 聚合根（Aggregate Root）是實體，有身份
// - 內部實體和值對象由聚合根管理
// - 外部只能通過聚合根訪問內部對象

// ✅ Order（訂單）是聚合根
interface Order {
  id: string                    // ⭐ Aggregate Root
  userId: string
  status: OrderStatus
  items: OrderItem[]            // ⭐ 內部實體（由 Order 管理）
  totalPrice: Money             // ⭐ 值對象
  createdAt: Date
  updatedAt: Date
}

// ✅ OrderItem 是內部實體（不能單獨存在）
interface OrderItem {
  id: string                    // 有 ID 但不是聚合根
  productId: string
  quantity: number
  price: Money                  // 值對象
}
```

### 聚合根一致性

```typescript
// ❌ 反例：外部直接修改 OrderItem
// 這違反了聚合根的邊界
const order = await orderRepository.findById('order-1')
order.items[0].quantity = 100   // ❌ 破壞聚合根的一致性

// ✅ 正確：通過聚合根修改
const order = await orderRepository.findById('order-1')
await order.updateItemQuantity('item-1', 100)  // ✅ 聚合根負責一致性
await orderRepository.save(order)
```

## 3. 進階設計

### 參照規則

在 DDD 中，**聚合根之間只能通過 ID 參照**，而不能直接持有對象參照。這是為了保持聚合的獨立性和邊界清晰，並避免載入過多數據。

```typescript
// ❌ 壞設計：持有物件參照
class Order {
  constructor(
    public readonly id: string,
    public readonly user: User, // ❌ 持有 User 實體參照
    // ...
  ) {}
}

// ✅ 好設計：持有 ID
class Order {
  constructor(
    public readonly id: string,
    public readonly userId: string, // ✅ 僅持有 ID
    // ...
  ) {}
}
```

### 並發控制

由於聚合根負責維護一致性，在並發環境下修改聚合根可能會發生衝突。常見的解決方案是**樂觀鎖 (Optimistic Locking)**。

我們在聚合根上增加一個 `version` 欄位：

```typescript
class Order {
  id: string;
  version: number; // ⭐ 版本號
  // ...

  addItem(item: OrderItem) {
    // 修改狀態
    this.items.push(item);
    // 版本號不需手動修改，通常由 ORM 或 Repository 處理
  }
}
```

在保存時，檢查版本號是否與讀取時一致：

```sql
UPDATE orders 
SET items = '...', version = version + 1 
WHERE id = 'order-1' AND version = 5; -- 如果 rows affected = 0，表示並發衝突
```
