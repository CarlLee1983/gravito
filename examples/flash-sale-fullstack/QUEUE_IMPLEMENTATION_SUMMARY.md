# Week 4: 異步隊列整合實施摘要

## 完成狀態

✅ **Phase 1: 基礎設施** - 完成
✅ **Phase 2: Job 定義** - 完成
✅ **Phase 3: Consumer 服務** - 完成
✅ **Phase 4: Satellites 整合** - 部分完成
⏳ **Phase 5: 測試與驗證** - 待進行

---

## 實施內容

### Phase 1: 基礎設施 ✅

#### 1.1 依賴安裝
- ✅ `@gravito/stream` - 隊列系統
- ✅ `ioredis@5.4.1` - Redis 客戶端
- ✅ `@types/ioredis` - TypeScript 類型

#### 1.2 環境變數
創建 `.env` 文件（用戶需要手動創建）：
```env
REDIS_URL=redis://localhost:6379
REDIS_QUEUE_PREFIX=flash-sale:queue:
QUEUE_CONCURRENCY=3
QUEUE_MAX_ATTEMPTS=3
```

#### 1.3 Package.json 更新
- ✅ 添加 `consumer` 和 `test:queue` scripts
- ✅ 添加必要的依賴

---

### Phase 2: Job 定義 ✅

#### 2.1 共享類型定義
📁 `src/types/queue.ts`
- LockInventoryJobPayload
- DeductInventoryJobPayload
- ConfirmOrderJobPayload
- ReleaseInventoryJobPayload

#### 2.2 四個 Job 類別

**📁 `src/queue/jobs/LockInventoryJob.ts`**
- 執行庫存鎖定
- 成功：發送 `order:ready_for_payment` hook
- 失敗：發送 `order:lock_failed` hook
- 永久失敗：發送 `order:lock_permanent_failure` hook

**📁 `src/queue/jobs/DeductInventoryJob.ts`**
- 執行庫存扣減
- 成功：推送 `ConfirmOrderJob`
- 失敗：推送補償 `ReleaseInventoryJob`
- 永久失敗：發送告警 hook

**📁 `src/queue/jobs/ConfirmOrderJob.ts`**
- 確認訂單狀態
- 成功：發送 `order:confirmed` hook
- 失敗：發送 `order:confirm_failed` hook
- 永久失敗：發送 `order:confirm_permanent_failure` hook（需人工介入）

**📁 `src/queue/jobs/ReleaseInventoryJob.ts`**
- 補償邏輯：釋放鎖定的庫存
- 成功：發送 `inventory:released` hook
- 失敗：發送 `inventory:release_failed` hook
- 永久失敗：發送 `inventory:release_permanent_failure` hook（嚴重告警）

---

### Phase 3: Consumer 服務 ✅

#### 3.1 隊列初始化
📁 `src/queue/index.ts`
- 初始化 QueueManager（Redis 驅動）
- 設置隊列前綴：`flash-sale:queue:`
- 註冊所有 Job 類別

#### 3.2 Consumer 類
📁 `src/queue/consumer.ts`
- ConsumerService 類
- 監聽隊列：`inventory` 和 `orders`
- 並發度：可配置（環境變數 `QUEUE_CONCURRENCY`）
- 最大重試次數：可配置（環境變數 `QUEUE_MAX_ATTEMPTS`）
- 事件監聽：job:started、job:processed、job:failed、job:retried

#### 3.3 啟動腳本
📁 `scripts/start-consumer.ts`
- 啟動應用並初始化隊列
- 優雅關閉處理（SIGINT、SIGTERM）

#### 3.4 測試腳本
📁 `scripts/test-queue.ts`
- 推送測試 Job
- 查詢 Redis 隊列統計
- 檢查 DLQ（Dead Letter Queue）

---

### Phase 4: Satellites 整合 ✅

#### 4.1 Payment Satellite 修改
- ✅ `ProcessPayment.ts` - 支援自定義 metadata（lockId）
- ✅ `StripeGateway.ts` - 在 Stripe Payment Intent 中包含自定義 metadata

#### 4.2 Flash-Sale Satellite 修改
- ✅ `CreateOrder.ts` - 接受 eventBus 參數，在建立訂單後發送 `order:created` hook
- ✅ `ConfirmOrder.ts` - 新增 Use Case，確認訂單狀態

#### 4.3 整合層
📁 `src/integrations/`

**order-queue-handler.ts**
- 監聽 `order:created` hook
- 推送 `LockInventoryJob` 到隊列

**payment-queue-handler.ts**
- 監聽 `payment:succeeded` hook
- 推送 `DeductInventoryJob` 到隊列
- ⚠️ 當前需要從訂單中查詢 `lockId` 和其他信息

#### 4.4 應用啟動修改
📁 `src/app.ts`
- ✅ 初始化 QueueManager
- ✅ 導出 `getCore()` 和 `getQueueManager()` 全局函數
- ✅ 設置整合層（order-queue-handler、payment-queue-handler）

📁 `src/gravito.config.ts`
- ✅ 添加 Satellites：flash-sale、inventory-lock、payment

---

## 文件清單

### 新增文件（10 個）
```
examples/flash-sale-fullstack/
├── src/
│   ├── queue/
│   │   ├── index.ts                    # QueueManager 初始化
│   │   ├── consumer.ts                 # Consumer 服務
│   │   └── jobs/
│   │       ├── LockInventoryJob.ts
│   │       ├── DeductInventoryJob.ts
│   │       ├── ConfirmOrderJob.ts
│   │       └── ReleaseInventoryJob.ts
│   ├── types/
│   │   └── queue.ts                    # 共享類型定義
│   └── integrations/
│       ├── order-queue-handler.ts
│       └── payment-queue-handler.ts
└── scripts/
    ├── start-consumer.ts               # Consumer 啟動腳本
    └── test-queue.ts                   # 測試腳本
```

### 修改文件（6 個）
```
examples/flash-sale-fullstack/
├── package.json                        # 新增 scripts 和依賴
├── src/app.ts                          # 初始化隊列、設置整合
└── src/gravito.config.ts               # 添加 Satellites

satellites/payment/src/
├── Application/UseCases/ProcessPayment.ts        # 支援 metadata
└── Infrastructure/Gateways/StripeGateway.ts      # 包含自定義 metadata

satellites/flash-sale/src/
├── Application/UseCases/CreateOrder.ts           # 發送 order:created hook
└── Application/UseCases/ConfirmOrder.ts          # 新增 Use Case
```

---

## 異步流程

```
1. 用戶下單
   ├─ Flash-Sale: CreateOrder
   └─ 發送 order:created hook
      └─ order-queue-handler 推送 LockInventoryJob

2. LockInventoryJob 執行
   ├─ Inventory-Lock: LockInventory
   ├─ 成功 → 發送 order:ready_for_payment hook
   └─ 失敗 → 發送 order:lock_failed hook

3. 使用者完成支付
   ├─ 支付網關（Stripe）
   └─ Webhook → Payment: StripeWebhookController

4. Payment Webhook 成功
   ├─ 觸發 payment:succeeded hook
   └─ payment-queue-handler 推送 DeductInventoryJob

5. DeductInventoryJob 執行
   ├─ Inventory-Lock: DeductInventory
   ├─ 成功 → 推送 ConfirmOrderJob
   └─ 失敗 → 推送補償 ReleaseInventoryJob

6. ConfirmOrderJob 執行
   ├─ Flash-Sale: ConfirmOrder
   ├─ 成功 → 發送 order:confirmed hook
   └─ 失敗 → 發送 order:confirm_failed hook

7. ReleaseInventoryJob 執行（補償）
   ├─ Inventory-Lock: ReleaseInventory
   └─ 成功或失敗 → 發送相應的 hook
```

---

## 運行方式

### 1. 設置環境
```bash
# 創建 .env 文件
cp .env.example .env
# 編輯 .env 添加 Redis 配置

# 啟動 Docker Compose（Redis + PostgreSQL）
docker-compose up -d
```

### 2. 啟動應用
```bash
# Terminal 1: 啟動 HTTP 服務器
bun run dev

# Terminal 2: 啟動 Consumer（處理隊列）
bun run consumer

# Terminal 3: 測試隊列
bun run test:queue
```

### 3. 監控隊列
```bash
# 查看 Redis 隊列
redis-cli LLEN flash-sale:queue:inventory
redis-cli LRANGE flash-sale:queue:inventory 0 -1

# 查看失敗的 Job（DLQ）
redis-cli LLEN flash-sale:queue:inventory:failed
```

---

## 已知限制與待辦事項

### ⚠️ 待完成
1. **Payment → Deduct 整合**
   - payment-queue-handler 目前無法從 Payment Webhook 中取得 `lockId`
   - 需要實現：從訂單中查詢 lockId 或存儲在 Payment metadata 中

2. **Inventory-Lock Use Cases 容器註冊**
   - Job 中使用的 Use Cases 需要確保已在 Inventory-Lock Satellite 的 Service Provider 中註冊：
     - `inventory-lock.lock-inventory`
     - `inventory-lock.deduct-inventory`
     - `inventory-lock.release-inventory`

3. **Flash-Sale Use Cases 容器註冊**
   - Job 中使用的 Use Cases 需要確保已在 Flash-Sale Satellite 的 Service Provider 中註冊：
     - `flash-sale.confirm-order`

4. **CreateOrder 與 eventBus 整合**
   - 需要在 Flash-Sale Satellite 的 Service Provider 中配置 CreateOrder 的實例化，傳入 eventBus

### ✅ 類型檢查
- 所有 TypeScript 編譯通過
- 無類型錯誤

### ✅ 隊列基礎設施
- Redis 支持
- Job 序列化/反序列化
- Consumer 事件監聽
- 重試機制

---

## 下一步

### Phase 5: 測試與驗證

1. **運行測試**
   ```bash
   bun run test:queue
   ```

2. **檢查 Consumer 日誌**
   - 觀察 Job 執行日誌
   - 驗證重試機制

3. **E2E 測試**
   - 創建完整的訂單流程測試
   - 驗證補償邏輯

4. **性能測試**
   - 使用 load tests 驗證吞吐量
   - 測試並發度配置

---

## 框架決策與設計

### 1. 隊列框架選擇
- **為什麼選擇 @gravito/stream？**
  - Gravito 原生支持
  - 多驅動器支持（Redis、RabbitMQ、Kafka）
  - 強大的重試和錯誤處理機制

### 2. Satellites 間通訊
- **為什麼使用 Hooks + Events？**
  - 最小化耦合
  - 支持異步操作
  - 易於擴展

### 3. Job 序列化
- **為什麼只傳遞 ID？**
  - 避免序列化問題
  - 減少隊列大小
  - 確保最新數據（查詢時獲取）

### 4. 補償邏輯
- **為什麼在 DeductInventoryJob 失敗時推送 ReleaseInventoryJob？**
  - 確保庫存一致性
  - 防止超賣
  - 自動恢復機制

---

## 故障排查

### Consumer 無法啟動
```
Error: QueueManager not initialized
```
→ 確保 `src/app.ts` 的 bootstrap() 已執行

### Job 反序列化失敗
```
Error: Job class not found: LockInventoryJob
```
→ 檢查 `src/queue/index.ts` 中的 registerJobClasses()

### Redis 連接失敗
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
→ 確保 Redis 運行：`docker-compose up -d redis`

### 容器無法 make() Use Cases
```
Error: Service not found: inventory-lock.lock-inventory
```
→ 檢查 Satellite Service Provider 是否正確註冊

---

## 參考資源

- Gravito 白皮書：`WHITEPAPER_ZH_TW.md`
- Flux-Enterprise 示例：`examples/flux-enterprise/`
- @gravito/stream 文檔：`packages/stream/README.md`
- Payment Satellite：`satellites/payment/`
- Flash-Sale Satellite：`satellites/flash-sale/`
- Inventory-Lock Satellite：`satellites/inventory-lock/`

---

## 版本信息

- 實施日期：2026-02-02
- Gravito Core：0.1.0+
- Node/Bun：最新版本
- Redis：7+
- PostgreSQL：15+

---

**狀態**：✅ 基礎實施完成，待集成測試和性能驗證
