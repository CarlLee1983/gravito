# Satellite 跨模組整合指南

搶購系統的核心在於多個 Satellite 之間的協作。本文檔說明 Week 1-3 實現的整合模式。

## 事件流序列

### 場景：用戶成功購買

```
1. 用戶提交訂單
   ↓
   Flash-Sale Satellite
   ├─ 驗證商品存在
   ├─ 檢查庫存充足
   ├─ 建立訂單（狀態：PENDING）
   └─ 發送 OrderCreated 事件

2. 用戶支付（外部支付服務）
   ↓
   Payment Webhook

3. Commerce Satellite 監聽支付成功
   ├─ 觸發 DeductInventory Use Case
   ├─ 扣減 Flash-Sale 的庫存
   ├─ 更新訂單狀態（PENDING → CONFIRMED）
   └─ 發送 OrderConfirmed 事件

4. Inventory-Lock Satellite 監聽
   ├─ 釋放之前鎖定的庫存
   └─ 記錄扣減日誌
```

## 實現的 Satellites

### Week 1：Flash-Sale Satellite ✅
- ✅ 商品管理（Product CRUD）
- ✅ 訂單建立（CreateOrder Use Case）
- ✅ 庫存檢查（庫存充足驗證）
- ✅ 事件發送（OrderCreated 事件）

### Week 2：Commerce Satellite ✅
- ✅ 庫存扣減協調（DeductInventory Use Case）
- ✅ 訂單狀態管理
- ✅ 事件監聽（支付成功）
- ✅ 事件發送（OrderConfirmed 事件）

### Week 3：Inventory-Lock Satellite ✅
- ✅ 分佈式鎖機制（LockInventory Use Case）
- ✅ 庫存預扣（鎖定庫存）
- ✅ 超時自動釋放（DetectDeadlock + 定時任務）
- ✅ 死鎖偵測（DetectDeadlock Use Case）

## 事件通訊模式

### 模式 1：Hook-based 通訊（同步）

```typescript
// Payment Service 通知支付成功
core.hooks.executeAction('payment:succeeded', {
  orderId: 'ORD-123',
  amount: 500,
  paymentId: 'PAY-456',
})

// Commerce 監聽
core.hooks.addAction('payment:succeeded', async (data) => {
  const deductInventory = container.make('commerce.usecase.deductInventory')
  await deductInventory.execute(...)
})
```

### 模式 2：Event-based 通訊（非同步）

```typescript
// Flash-Sale 發送事件
core.events.dispatch(new OrderCreated(order))

// Commerce 監聽
core.events.listen(OrderCreated, (event) => {
  // 保存訂單到 Commerce 數據庫
})
```

## 測試策略

### 單位測試（Unit Tests）✅
- Flash-Sale ListProducts: 4 tests
- Flash-Sale CreateOrder: 6 tests
- Commerce DeductInventory: 5 tests

### 集成測試（Integration Tests）⏳ Week 3
- 跨 Satellite 事件流
- Catalog ↔ Commerce ↔ Inventory-Lock
- 支付流程端到端

### 性能測試（Load Tests）⏳ Week 3
- 100 → 1000 QPS 漸進測試
- 事件吞吐量驗證
- 鎖競爭分析

## Inventory-Lock Satellite 整合

### 完整事件流（含鎖定）

```
1. 訂單建立時 - LockInventory
   Flash-Sale Satellite 建立訂單
   → 觸發 OrderCreated 事件
   → Inventory-Lock 監聽
   → 執行 LockInventory Use Case
   → 鎖定庫存，預扣數量
   → 發送 InventoryLocked 事件

2. 支付確認時 - DeductInventory
   Payment Webhook
   → Commerce Satellite 監聽
   → 執行 DeductInventory Use Case
   → 樂觀鎖驗證版本號
   → 真正扣減庫存
   → 發送 InventoryDeducted 事件

3. 支付失敗時 - ReleaseInventory
   Payment Webhook (failed)
   → Commerce Satellite 監聽
   → 執行 ReleaseInventory Use Case
   → 釋放鎖定的庫存
   → 發送 InventoryReleased 事件

4. 定期清理 - DetectDeadlock
   每 5 分鐘執行
   → 掃描過期的鎖定
   → 自動標記為 EXPIRED
   → 記錄死鎖事件
```

### Use Cases 說明

| Use Case | 責任 | 事件 |
|----------|------|------|
| **LockInventory** | 鎖定庫存，檢查充足性 | InventoryLocked / LockFailed |
| **ReleaseInventory** | 釋放鎖定，記錄原因 | InventoryReleased |
| **DeductInventory** | 真正扣減，樂觀鎖檢查 | InventoryDeducted |
| **DetectDeadlock** | 清理過期鎖，自動釋放 | (無直接事件) |

### 樂觀鎖機制

```typescript
// 版本號檢查
expectedVersion = 1  // 鎖定時的版本
updateWithVersion(id, data, expectedVersion)
  → 如果 lock.version === expectedVersion，更新成功
  → 如果不符合，返回 null（版本衝突）
```

## 發現的架構模式

### 成功的實踐
1. ✅ **Clean Architecture 分層** - 領域層 → 應用層 → 介面層
2. ✅ **事件驅動** - Satellites 透過事件鬆耦合
3. ✅ **Repository 模式** - 數據訪問邏輯隔離
4. ✅ **Use Cases 聚焦** - 單一職責原則
5. ✅ **樂觀鎖實現** - 版本號機制防止並發衝突
6. ✅ **定時任務** - ServiceProvider 內置清理機制

### 驗證完成的機制
1. ✅ 事件系統可靠性（已測試）
2. ✅ 分佈式鎖設計（24 個單元測試通過）
3. ✅ 版本控制機制（樂觀鎖）

## 下週計畫

Week 4-5 將進行性能測試和優化：
1. ✅ Week 3 - Inventory-Lock Satellite 完成
2. ⏳ Week 4 - 集成測試（端到端事件流）
3. ⏳ Week 5 - 性能基準測試（K6 100-1000 QPS）
