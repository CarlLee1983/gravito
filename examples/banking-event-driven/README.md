# 🏦 Banking Event-Driven - 完整教程

這是一個展示 **事件驅動架構 (Event-Driven Architecture, EDA)** + **領域驅動設計 (Domain-Driven Design, DDD)** + **CQRS (Command Query Responsibility Segregation)** 的完整銀行系統範例。

## ✨ 核心特性

- 🎯 **事件驅動架構**：所有業務邏輯變化都通過領域事件驅動
- 📝 **領域驅動設計**：聚合根、值對象、領域事件、Saga 等 DDD 核心概念
- 🔀 **CQRS 模式**：命令層和查詢層完全分離
- 💾 **事件溯源 (Event Sourcing) 預備**：完整的事件記錄，可以重放歷史
- 🔄 **Saga 模式**：多步驟分佈式事務的編排與補償
- 🎤 **Server-Sent Events (SSE)**：實時事件推送到前端
- 🚨 **死信隊列 (DLQ)**：失敗事件的可靠處理
- 📊 **讀取模型 (Read Model)**：優化查詢性能的投影層

## 🚀 快速開始

### 前置要求

- Node.js 18+（推薦使用 Bun 3.0+）
- Gravito 框架已安裝

### 安裝依賴

```bash
cd examples/banking-event-driven
bun install
```

### 開發模式

```bash
bun run dev
```

服務將在 `http://localhost:3000` 啟動

### 生產構建

```bash
bun run build
bun start
```

## 📚 完整文檔結構

| 文件 | 內容 | 適合讀者 |
|------|------|--------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | 系統架構概覽、分層設計、數據流 | 架構師、技術主管 |
| **[DDD_GUIDE.md](./DDD_GUIDE.md)** | 領域驅動設計的詳細講解和實現 | 開發者、架構設計者 |
| **[EVENT_DRIVEN_GUIDE.md](./EVENT_DRIVEN_GUIDE.md)** | 事件驅動架構、Saga 模式、補償機制 | 開發者、系統設計者 |
| **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** | 完整的 API 參考和使用示例 | 前端開發者、API 集成者 |
| **[BEST_PRACTICES.md](./BEST_PRACTICES.md)** | 最佳實踐、常見陷阱、性能優化 | 所有開發者 |

## 🏗️ 系統架構簡圖

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Presentation Layer                  │
│  (Controllers, Routes, Request/Response Handling)            │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                   Application Layer                          │
│  (Commands, Queries, Command Handlers, Query Handlers)      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Domain Layer (DDD)                        │
│  (Aggregate Roots, Value Objects, Domain Events, Services)  │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              Infrastructure Layer                            │
│  (Repositories, Event Store, Read Models, Event Listeners)  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 核心概念速查表

### 1. 聚合根 (Aggregate Root)

**帳戶 (Account)** 是主要的聚合根，管理帳戶的所有狀態和業務邏輯：

```typescript
// 創建新帳戶（工廠方法）
const account = Account.open(
  'account-123',           // 帳戶 ID
  'user-456',              // 帳戶所有者 ID
  '張三',                   // 所有者名稱
  'TWD',                   // 貨幣
  10000                    // 初始存款（單位：分）
)

// 執行業務操作
account.deposit(5000)      // 存款
account.withdraw(2000)     // 提款
account.freeze()           // 凍結帳戶
account.initiateTransfer(transferId, toAccountId, amount)  // 發起轉帳
```

### 2. 領域事件 (Domain Events)

每個業務操作都產生對應的領域事件：

```typescript
// 帳戶打開時發出 AccountOpened 事件
// 存款時發出 MoneyDeposited 事件
// 轉帳時發出一系列事件：
//   1. TransferInitiated
//   2. TransferDebitApplied
//   3. TransferCreditApplied
//   4. TransferCompleted
```

### 3. 命令處理 (Command Handlers)

命令代表請求，命令處理器執行業務邏輯：

```typescript
// 命令：OpenAccountCommand
const command = new OpenAccountCommand(
  'account-123',
  'user-456',
  '張三',
  'TWD',
  10000
)

// 命令處理器執行並返回結果
const accountId = await openAccountHandler.handle(command)
```

### 4. Saga 模式（分佈式事務）

多步驟操作通過 Saga 協調，確保最終一致性：

```typescript
// 轉帳 Saga 流程：
1. TransferInitiated   → 發起轉帳
2. TransferDebitApplied  → 源帳戶扣款
3. TransferCreditApplied → 目標帳戶入款
4. TransferCompleted    → 轉帳完成

// 如果任何步驟失敗，自動觸發補償機制
// 例如：入款失敗 → 自動退款
```

### 5. 讀取模型 (Read Models)

針對查詢優化的投影層，與寫模型 (命令層) 完全分離：

```typescript
// 寫模型（命令）：修改帳戶餘額
account.deposit(5000)

// 讀模型（查詢）：快速讀取優化的數據
const accountBalance = readModel.getAccountBalance('account-123')
```

## 📡 API 端點速查

### 帳戶管理

```bash
# 創建帳戶
POST /api/accounts
Body: { ownerId, ownerName, currency, initialDepositCents }

# 獲取所有帳戶
GET /api/accounts

# 獲取帳戶詳情
GET /api/accounts/:id

# 獲取帳戶餘額
GET /api/accounts/:id/balance

# 存款
POST /api/accounts/:id/deposit
Body: { amountCents }

# 提款
POST /api/accounts/:id/withdraw
Body: { amountCents }

# 凍結帳戶
POST /api/accounts/:id/freeze
Body: { reason? }

# 解凍帳戶
POST /api/accounts/:id/unfreeze
```

### 轉帳

```bash
# 發起轉帳
POST /api/transfers
Body: { fromAccountId, toAccountId, amountCents }

# 查詢轉帳狀態
GET /api/transfers/:id

# 獲取交易歷史
GET /api/accounts/:id/transactions
```

### 實時事件推送

```bash
# 訂閱 SSE 事件流
GET /api/events/stream

# 查詢死信隊列
GET /api/dlq
```

## 🧪 測試範例

### 基本流程測試

```bash
# 1. 創建兩個帳戶
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-1",
    "ownerName": "Alice",
    "currency": "TWD",
    "initialDepositCents": 100000
  }'

curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-2",
    "ownerName": "Bob",
    "currency": "TWD",
    "initialDepositCents": 50000
  }'

# 2. 進行轉帳
curl -X POST http://localhost:3000/api/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "fromAccountId": "account-uuid-1",
    "toAccountId": "account-uuid-2",
    "amountCents": 10000
  }'

# 3. 查詢轉帳狀態
curl http://localhost:3000/api/transfers/transfer-uuid

# 4. 訂閱實時事件
curl http://localhost:3000/api/events/stream
```

## 🎓 學習路徑

### 初級開發者（理解基礎）

1. 閱讀 [ARCHITECTURE.md](./ARCHITECTURE.md) 的「系統概覽」部分
2. 查看 `src/domain/account/Account.ts` 理解聚合根
3. 查看 `src/application/commands/` 理解命令模式
4. 運行示例並測試 API

### 中級開發者（深入理解設計）

1. 完整閱讀 [DDD_GUIDE.md](./DDD_GUIDE.md)
2. 研究 `src/application/sagas/TransferSaga.ts` 理解 Saga 模式
3. 查看事件監聽器如何更新讀取模型
4. 研究 [EVENT_DRIVEN_GUIDE.md](./EVENT_DRIVEN_GUIDE.md)

### 高級開發者（架構設計與優化）

1. 完整閱讀所有文檔
2. 研究死信隊列和補償機制的實現
3. 考慮如何擴展到多個聚合根或有界上下文
4. 實現自己的聚合根和 Saga

## 🔧 技術棧

| 組件 | 技術 | 用途 |
|------|------|------|
| 框架 | Gravito | DDD、事件驅動的框架支持 |
| 運行時 | Bun | TypeScript 運行環境 |
| 語言 | TypeScript | 類型安全 |
| HTTP | Photon/Hono | HTTP 服務器 |
| 驗證 | Zod | 請求驗證 |

## 📖 核心文件導航

### 領域層 (Domain)

```
src/domain/
├── account/
│   ├── Account.ts              # 帳戶聚合根
│   └── events/                 # 領域事件
│       ├── AccountOpened.ts
│       ├── MoneyDeposited.ts
│       ├── TransferInitiated.ts
│       └── ...
└── shared/
    └── Money.ts                # 值對象
```

### 應用層 (Application)

```
src/application/
├── commands/                   # 命令與處理器
│   ├── OpenAccountCommand.ts
│   ├── DepositMoneyCommand.ts
│   └── ...
├── queries/                    # 查詢與處理器
│   ├── GetAccountBalanceQuery.ts
│   └── ...
├── sagas/
│   └── TransferSaga.ts        # Saga 編排
└── utils/
    └── EventDispatcher.ts      # 事件分發
```

### 基礎設施層 (Infrastructure)

```
src/infrastructure/
├── repositories/               # 數據訪問層
│   ├── IAccountRepository.ts
│   └── InMemoryAccountRepository.ts
├── listeners/                  # 事件監聽器
│   ├── UpdateReadModelListener.ts
│   └── DeadLetterListener.ts
└── projections/                # 讀取模型
    ├── AccountReadModel.ts
    └── TransactionReadModel.ts
```

### 表現層 (Presentation)

```
src/presentation/
└── http/
    ├── controllers/            # HTTP 控制器
    ├── requests/               # 請求驗證
    ├── routes.ts              # 路由定義
    └── SSEManager.ts          # SSE 事件推送
```

## 🤝 貢獻指南

如果你想擴展此範例：

1. **添加新的聚合根**：參考 `Account.ts` 的實現模式
2. **添加新的領域事件**：在 `domain/*/events/` 中定義
3. **添加新的命令**：在 `application/commands/` 中實現
4. **添加新的 Saga**：在 `application/sagas/` 中設計補償邏輯

所有新增的事件都應該：
- 在 `EventServiceProvider.ts` 中註冊監聽器
- 在讀取模型中添加對應的投影方法
- 在 SSE 推送列表中添加

## 📚 相關資源

- [Gravito 框架文檔](https://gravito.example.com)
- [Enterprise 包 (DDD 支持)](../../../packages/enterprise)
- [Core 包 (容器、事件管理)](../../../packages/core)
- [Photon 包 (HTTP 層)](../../../packages/photon)

## ❓ 常見問題

### Q: 為什麼要使用 Saga 模式而不是分佈式事務？

A: Saga 模式更符合事件驅動和最終一致性的設計哲學。它不依賴 ACID 事務，而是通過補償操作來處理失敗，這在微服務架構中更實用。

### Q: 讀取模型和寫模型為什麼要分離？

A: CQRS 模式允許針對不同的需求優化：寫模型關注一致性和業務邏輯，讀模型關注查詢性能。這使得系統更靈活和可擴展。

### Q: 如何確保事件不丟失？

A: 本範例使用內存存儲以保持簡潔。在生產環境中，應使用持久事件存儲（如 EventStoreDB、PostgreSQL 等）。

### Q: SSE 有什麼局限？

A: SSE 只能單向推送（服務器 → 客戶端）。如果需要雙向通信，使用 WebSocket。

## 📞 支持

有問題或建議？
1. 檢查 [BEST_PRACTICES.md](./BEST_PRACTICES.md) 的「常見問題」部分
2. 查看 [EVENT_DRIVEN_GUIDE.md](./EVENT_DRIVEN_GUIDE.md) 的「故障排除」
3. 提交 Issue 或 Pull Request

---

**開心編程！** 🎉 這個範例展示了如何用 Gravito 框架構建高度可維護和可擴展的事件驅動系統。
