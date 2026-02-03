# Flash Sale System Architecture

搶購系統的系統設計與架構決策。

## 系統概覽

```
┌─────────────────────────────────────────────────┐
│           HTTP 層 (Photon)                      │
│     限流中間件 | 認證中間件 | 日誌中間件      │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼─────────────────────────────────────┐
│         應用層 - Satellites                      │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐             │
│  │Flash-Sale    │  │Inventory-Lock│             │
│  │Satellite     │  │Satellite     │             │
│  │              │  │              │             │
│  │- 商品管理    │  │- 庫存鎖定    │             │
│  │- 訂單建立    │  │- 預扣機制    │             │
│  │- 支付集成    │  │- 死鎖偵測    │             │
│  └──────────────┘  └──────────────┘             │
└─────────────┬───────────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────────┐
│         基礎設施層                                    │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Signal       │  │ Events       │                │
│  │ (Event Bus)  │  │ (跨 Sat.)    │                │
│  └──────────────┘  └──────────────┘                │
│                                                       │
│  ┌──────────────────────────────────────────┐       │
│  │       PlanetCore (IoC + Hooks)          │       │
│  └──────────────────────────────────────────┘       │
└─────────────┬──────────────────────────────────────────┘
              │
┌─────────────▼──────────────────────────────────────┐
│      外部依賴                                      │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │PostgreSQL│  │  Redis   │  │   Bull   │      │
│  │(Primary) │  │(Cache    │  │(Queues) │      │
│  │          │  │Locks)    │  │         │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└──────────────────────────────────────────────────┘
```

## 核心 Satellites

### 1. Flash-Sale Satellite

**責任**：搶購業務邏輯

```typescript
// 主要 Use Cases
- ListProducts()          // 查詢商品列表
- CreateOrder()           // 建立訂單（核心業務）
- ConfirmOrder()          // 訂單確認
- ProcessPayment()        // 支付處理
- HandleRefund()          // 退款處理

// 事件
- ProductViewed
- OrderCreated
- OrderConfirmed
- PaymentSucceeded
- PaymentFailed
- OrderRefunded
```

**關鍵設計**：
- 訂單建立使用「樂觀 + 鎖定」策略
- 支付成功透過異步隊列確認訂單
- 自動恢復失敗訂單的庫存

### 2. Inventory-Lock Satellite

**責任**：高效的庫存管理與併發控制

```typescript
// 主要 Use Cases
- LockInventory()         // 預扣庫存
- ReleaseInventory()      // 釋放預扣
- DeductInventory()       // 真正扣減
- DetectDeadlock()        // 死鎖偵測

// 關鍵概念
- 分佈式鎖 (Redis-based)
- 預扣機制（提前鎖定，支付確認後真正扣減）
- 自動超時釋放
```

**並發策略**：

```
User 1              User 2              User 3
  │                  │                   │
  ├─ Lock(Item, Qty=1)                  │
  │   ✅ Success                         │
  │                  │                   │
  │                  ├─ Lock(Item, Qty=1)│
  │                  │   ⏳ Wait         │
  │                  │                   │
  │                  │                   ├─ Lock(Item, Qty=1)
  │                  │                   │   ⏳ Wait
  │                  │                   │
  ├─ Payment OK      │                   │
  │                  │                   │
  ├─ Deduct()        │                   │
  │   ✅ Success     │                   │
  │                  │                   │
  ├─ Release Lock    │                   │
  │                  │                   │
  │                  ├─ Lock(Item, Qty=1)│
  │                  │   ✅ Success      │
  │                  │                   │
  │                  │                   ├─ Lock(Item, Qty=1)
  │                  │                   │   ❌ Stock = 0
  │                  │                   │   ❌ Timeout
```

## 訂單流程

### 標準流程（成功案例）

```
1. CreateOrder Request
   ├─ Validate Input ✓
   ├─ Lock Inventory (Inventory-Lock Satellite)
   │  ├─ Check Stock > 0 ✓
   │  ├─ Acquire Redis Lock ✓
   │  └─ Reserve Qty ✓
   │
   ├─ Create Order (Flash-Sale Satellite)
   │  ├─ Save Order (Status = PENDING)
   │  ├─ Save Order Items
   │  └─ Emit OrderCreated Event ✓
   │
   ├─ Queue Payment Job (Bull)
   │  └─ Job ID returned to client
   │
   └─ Return (Order ID, Payment URL)

2. User Makes Payment (External Service)
   └─ Payment Webhook Callback

3. ProcessPaymentWebhook
   ├─ Verify Signature ✓
   ├─ Update Order Status = PAID ✓
   ├─ Queue Deduct Inventory Job
   └─ Emit PaymentSucceeded Event ✓

4. Async: Deduct Inventory Job
   ├─ Deduct from Inventory ✓
   ├─ Release Lock ✓
   ├─ Update Order Status = CONFIRMED ✓
   └─ Emit OrderConfirmed Event ✓
```

### 失敗恢復

```
場景 1：支付失敗
  Order(PENDING) → Lock expires (默認 15min)
  → Inventory auto-released ✓

場景 2：扣減失敗（罕見）
  Order(PAID) → Queue retry job
  → Max retries → Manual intervention

場景 3：客戶退款
  OrderConfirmed → Refund Request
  → Restore Inventory ✓
  → Order(REFUNDED)
```

## 高併發設計決策

### 決策 1：預扣 vs 即時扣減

| 方案 | 優點 | 缺點 |
|------|------|------|
| 預扣 | 防超售，用戶體驗好 | 佔用庫存，需超時釋放 |
| 即時扣減 | 簡單 | 可能超售，用戶體驗差 |

**決策**：採用 **預扣** + 異步確認

### 決策 2：分佈式鎖 vs 樂觀鎖

| 方案 | 優點 | 缺點 |
|------|------|------|
| 分佈式鎖 | 強一致性，簡單 | 性能瓶頸，單點故障 |
| 樂觀鎖 | 高性能 | 複雜，衝突多時差 |

**決策**：採用 **分佈式鎖** + Redis（後期可升級為 Redis Cluster）

### 決策 3：同步 vs 非同步

| 階段 | 方案 | 原因 |
|------|------|------|
| 建立訂單 | 同步 | 需立即反饋訂單 ID |
| 支付確認 | 非同步 | 外部 API，可能慢 |
| 庫存扣減 | 非同步 | 批量操作，優化吞吐 |

**決策**：**混合方案** - 訂單建立同步，後續流程非同步隊列

## 外部依賴

### PostgreSQL

```sql
-- 主要表
- products (商品)
- orders (訂單)
- order_items (訂單項)
- inventory_locks (分佈式鎖狀態)
- payment_records (支付記錄)

-- 索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_inventory_locks_product_id
  ON inventory_locks(product_id, created_at);
```

### Redis

```
Key Patterns:
- lock:product:{productId}       # 分佈式鎖
- stock:product:{productId}      # 庫存快取
- session:{sessionId}            # 用戶會話
- rate_limit:user:{userId}       # 限流計數
```

### Bull (Redis-backed Queue)

```
Queues:
- payment-processing             # 支付確認
- inventory-deduction            # 庫存扣減
- order-confirmation             # 訂單確認
- analytics-events               # 數據分析
```

## 監控與可觀測性

### 關鍵指標

```
Performance:
- Orders/sec (訂單吞吐)
- P50/P95/P99 latency (延遲分佈)
- Lock wait time (鎖等待時間)
- Queue depth (隊列深度)

Reliability:
- Success rate (成功率)
- Timeout rate (超時率)
- Retry count (重試次數)
- Deadlock detected (死鎖偵測)

Business:
- Total orders
- Revenue
- Cancellation rate
- Stock accuracy
```

### 告警

```
Critical:
- Queue size > 10000
- Lock timeout rate > 5%
- Database connection pool exhausted
- Redis connection lost

Warning:
- Average latency > 500ms
- Lock wait > 1s
- Success rate < 99%
```

## 相對於 Gravito 框架的位置

```
Gravito Framework
│
├── packages/core (PlanetCore)
│   └── ✓ Container 完美支持 Satellite 注入
│
├── packages/signal (Event Bus)
│   └─ ⚠️ 高頻事件性能需驗證
│
├── packages/atlas (ORM)
│   └── ✓ 支持複雜查詢與事務
│
└─ ❓ Needs: 分佈式鎖、限流器

Flash Sale System
│
├── satellites/flash-sale
│   └── 核心業務邏輯
│
├── satellites/inventory-lock
│   └── 高併發庫存管理
│
└── examples/flash-sale-fullstack
    └── 完整可運行應用
```

## 框架改進建議

基於搶購系統開發過程中的發現（待填入）：

1. **Distributed Lock Module**
   - 在 packages/ 中加入 @gravito/distributed-lock
   - 支持 Redis、etcd 等後端

2. **Rate Limiter Middleware**
   - 標準的速率限制中間件
   - 支持多種策略（Token Bucket、Sliding Window 等）

3. **Event System Optimization**
   - 高頻事件的性能最佳化
   - 事件優先級與分類

## 部署架構

```
Production:
┌─────────────┐     ┌─────────────┐
│ Load        │     │ Load        │
│ Balancer    │     │ Balancer    │
│ (Nginx)     │     │ (Nginx)     │
└──────┬──────┘     └──────┬──────┘
       │                   │
   ┌───┴────────────────────┴──────┐
   │                               │
┌──▼──┐  ┌──────┐  ┌──────┐  ┌───▼──┐
│App 1│  │App 2 │  │App 3 │  │App 4 │
└──┬──┘  └──┬───┘  └──┬───┘  └───┬──┘
   │        │        │         │
   └────┬───┴────┬───┴──────────┘
        │        │
    ┌───▼────────▼──┐
    │  PostgreSQL   │
    │  (Primary +   │
    │   Replicas)   │
    └───────────────┘
        │
    ┌───▼──────────────────┐
    │  Redis Cluster       │
    │  (分佈式鎖 + Cache)  │
    └──────────────────────┘
```

## 結論

此搶購系統設計綜合考慮了：
- ✅ 高併發場景下的資料一致性
- ✅ 使用者體驗（快速反饋）
- ✅ 系統可靠性（故障恢復）
- ✅ 對 Gravito 框架的驗證

開發過程中發現的所有框架不足都會記錄在 `/FRAMEWORK_ISSUES.md` 中。
