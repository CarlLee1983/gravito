# Banking CQRS 架構審查報告

> **審查日期:** 2026-02-17  
> **審查範圍:** `examples/banking-cqrs/src/` — 37 個 TypeScript 檔案  
> **審查方法:** 全量原始碼閱讀 + DDD/CQRS 模式合規性分析  
> **整體評分:** ⭐ 8.5 / 10

---

## 目錄

- [1. 專案概覽](#1-專案概覽)
- [2. 架構分層分析](#2-架構分層分析)
- [3. 架構亮點](#3-架構亮點)
- [4. 風險與問題](#4-風險與問題)
- [5. 評分矩陣](#5-評分矩陣)
- [6. 改善建議](#6-改善建議)
- [7. 結論](#7-結論)

---

## 1. 專案概覽

### 1.1 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | Gravito PlanetCore + PhotonAdapter（Hono-based HTTP） |
| 資料庫 | SQLite（via `@gravito/atlas` ORM） |
| 語言 | TypeScript（Bun runtime） |
| 模式 | CQRS + DDD（Aggregate, ValueObject, Entity, Repository, DomainEvent） |
| 測試 | Bun Test（`bun:test`） |

### 1.2 檔案結構

```
src/                                    # 37 個 TypeScript 檔案
├── index.ts                            # 應用入口（PlanetCore + PhotonAdapter）
├── bootstrap.ts                        # 引導流程：Provider → Migrations → Routes
├── routes.ts                           # 7 個 HTTP API 端點（介面層）
├── Providers/
│   └── CqrsProvider.ts                 # DI 容器設定（Handler + Bus 註冊）
│
├── Domain/                             # 🟢 領域層（純業務邏輯，無框架依賴）
│   ├── Account/
│   │   ├── Account.ts                  # AggregateRoot（472 行，核心業務邏輯）
│   │   ├── AccountStatus.ts            # Enum: ACTIVE | FROZEN | CLOSED
│   │   ├── IAccountRepository.ts       # Repository 介面（依賴反轉）
│   │   └── Events/
│   │       ├── AccountCreated.ts       # 帳戶建立領域事件
│   │       ├── FundsDeposited.ts       # 存款領域事件
│   │       ├── FundsWithdrawn.ts       # 提款領域事件
│   │       └── FundsTransferred.ts     # 轉帳領域事件
│   ├── Shared/
│   │   └── Money.ts                    # ValueObject（以分為單位，避免浮點誤差）
│   └── Transaction/
│       ├── Transaction.ts              # Entity（不可變審計記錄）
│       ├── TransactionType.ts          # Enum: DEPOSIT | WITHDRAWAL | TRANSFER_IN/OUT
│       └── ITransactionRepository.ts   # Repository 介面
│
├── Application/                        # 🟡 應用層（協調器）
│   ├── Bus/
│   │   ├── CommandBus.ts               # 命令調度器（convention-based 解析）
│   │   └── QueryBus.ts                 # 查詢調度器（convention-based 解析）
│   ├── Commands/
│   │   ├── CreateAccount/              # CreateAccountCommand + Handler
│   │   ├── DepositFunds/               # DepositFundsCommand + Handler
│   │   ├── WithdrawFunds/              # WithdrawFundsCommand + Handler
│   │   └── TransferFunds/              # TransferFundsCommand + Handler
│   └── Queries/
│       ├── GetAccountBalance/          # Query + Handler + DTO
│       ├── GetAccountDetails/          # Query + Handler + DTO
│       └── GetTransactionHistory/      # Query + Handler + DTO
│
└── Infrastructure/                     # 🔵 基礎設施層
    ├── Persistence/
    │   ├── AtlasAccountRepository.ts   # Account 持久化（SQLite via Atlas）
    │   └── AtlasTransactionRepository.ts # Transaction 持久化
    └── EventPublisher/
        └── GravitoEventPublisher.ts    # 事件發布器（目前未被使用）
```

### 1.3 API 端點

| 方法 | 路徑 | 類型 | 說明 |
|------|------|------|------|
| `POST` | `/api/accounts` | Command | 建立帳戶 |
| `GET` | `/api/accounts/:id` | Query | 取得帳戶詳情 |
| `GET` | `/api/accounts/:id/balance` | Query | 查詢餘額 |
| `POST` | `/api/accounts/:id/deposit` | Command | 存款 |
| `POST` | `/api/accounts/:id/withdraw` | Command | 提款 |
| `POST` | `/api/accounts/:id/transfer` | Command | 轉帳 |
| `GET` | `/api/accounts/:id/transactions` | Query | 交易紀錄（分頁） |

### 1.4 資料流概覽

```
HTTP Request
  ↓
routes.ts（解析參數、建立 Command/Query）
  ↓
CommandBus / QueryBus（透過 Container 命名慣例解析 Handler）
  ↓
Handler（協調 Domain 與 Infrastructure）
  ├── 從 Repository 載入 Aggregate
  ├── 調用 Aggregate 方法（業務邏輯）
  ├── 持久化狀態變更
  ├── 記錄 Transaction 審計記錄
  └── 發布 Domain Events（via core.hooks）
  ↓
HTTP Response（JSON）
```

---

## 2. 架構分層分析

### 2.1 Domain 層

**評價: ⭐⭐⭐⭐⭐ 優秀**

#### Account AggregateRoot

- ✅ 完整的業務不變量守護：
  - 餘額非負（由 `Money.subtract()` 保障）
  - 帳戶狀態檢查（`assertAccountIsActive()`）
  - 轉帳限額（`assertTransferLimit()` — 單次不超過 100,000）
  - 關閉帳戶前餘額歸零
- ✅ Factory Method（`Account.create()`）封裝建立邏輯
- ✅ Domain Event 收集（`pullDomainEvents()`）實現事件溯源基礎
- ✅ 雙向轉帳：`transferTo()` + `receiveTransfer()` 語意清晰

#### Money ValueObject

- ✅ 以分（cents）為單位的整數運算，**徹底消除浮點誤差**
- ✅ Immutable（所有方法返回新物件）
- ✅ `assertSameCurrency()` 防止跨幣種混合操作
- ✅ 拒絕負數建構（`if (cents < 0) throw`）
- ✅ `fromDollars()` 工廠方法提供便利建構
- ✅ `toJSON()` 和 `toString()` 序列化支援

#### Domain Events

- ✅ 繼承自 `@gravito/enterprise` 的 `DomainEvent` 基類
- ✅ 每個事件包含 `getAggregateId()` 用於事件溯源
- ✅ 每個事件包含 `toJSON()` 用於序列化
- ✅ 事件資料介面（如 `FundsDepositedData`）明確定義
- ✅ 4 個事件覆蓋所有狀態變更：AccountCreated, FundsDeposited, FundsWithdrawn, FundsTransferred

#### Repository Interface

- ✅ 介面定義在 Domain 層，實作在 Infrastructure 層（**依賴反轉原則**）
- ✅ `IAccountRepository`：save, findById, existsById
- ✅ `ITransactionRepository`：save, findByAccountId（分頁）, countByAccountId

### 2.2 Application 層

**評價: ⭐⭐⭐⭐ 良好**

#### CommandBus / QueryBus

- ✅ Convention-based Handler 解析（`cqrs.command.{ClassName}`）：
  - 零配置路由 — 只需在 Container 中按慣例註冊
  - 新增 Command/Query 只需新增資料夾 + 在 Provider 中註冊
- ✅ 泛型支援（`dispatch<TResult>()` / `execute<TResult>()`）
- ✅ 職責單一：Bus 只負責解析和調度

#### Command Handlers

| Handler | 步驟 | 評價 |
|---------|------|------|
| `CreateAccountHandler` | 存在性檢查 → 建立 Aggregate → 保存 → 發送事件 | ✅ 幂等檢查 |
| `DepositFundsHandler` | 載入帳戶 → 存款 → 保存 → 記錄 Transaction → 發送事件 | ✅ 完整流程 |
| `WithdrawFundsHandler` | 載入帳戶 → 提款（含餘額驗證） → 保存 → 記錄 → 事件 | ✅ 完整流程 |
| `TransferFundsHandler` | 載入雙方 → 轉帳 → 分別保存 → 記錄雙邊 Transaction → 事件 | ⚠️ 缺乏原子性 |

#### Query Handlers

| Handler | 特性 | 評價 |
|---------|------|------|
| `GetAccountBalanceHandler` | 唯讀，返回 `AccountBalanceDTO` | ✅ 無副作用 |
| `GetAccountDetailsHandler` | 唯讀，返回 `AccountDetailsDTO`（含 `updatedAt`） | ✅ 無副作用 |
| `GetTransactionHistoryHandler` | 分頁查詢，返回 `TransactionHistoryDTO` | ✅ 支援分頁 |

#### DTO 設計

- ✅ 清晰的介面定義（`AccountBalanceDTO`, `AccountDetailsDTO`, `TransactionHistoryDTO`）
- ✅ 提供 `cents` 和 `dollars` 雙表示（方便前端和後端使用）
- ✅ 不洩漏 Domain 物件（Aggregate 不直接暴露給 API）

### 2.3 Infrastructure 層

**評價: ⭐⭐⭐ 尚可**

#### AtlasAccountRepository

- ✅ 正確的 Domain → DB Row 映射
- ✅ 重建 Aggregate 時正確使用 `Money` ValueObject
- ⚠️ 使用 SELECT → INSERT/UPDATE 的非原子 upsert 邏輯
- ⚠️ 大量使用 `as any` 類型斷言（Atlas QueryBuilder 限制）

#### AtlasTransactionRepository

- ✅ 不可變設計（只有 INSERT，沒有 UPDATE/DELETE）
- ✅ 支援 ORDER BY + LIMIT/OFFSET 分頁
- ✅ COUNT 聚合查詢支援
- ⚠️ 同樣的 `as any` 類型問題

#### GravitoEventPublisher

- ⚠️ **完全未被使用** — 所有 Handler 都直接使用 `core.hooks.doAction()` 發布事件
- 這是一個死程式碼，應移除或整合使用

### 2.4 介面層（routes.ts）

**評價: ⭐⭐⭐ 尚可**

- ✅ RESTful 端點設計合理
- ✅ 正確的金額轉換（`Math.round(body.amount * 100)` — dollars to cents）
- ✅ 分頁參數處理（`limit`/`offset` 預設值）
- ⚠️ `router: any` 和 `ctx: any` 失去型別安全
- ⚠️ 缺少輸入驗證（直接信任 `req.json()` 內容）
- ⚠️ 缺少全域錯誤處理中間件

---

## 3. 架構亮點

### 3.1 嚴格的分層隔離

Domain 層的依賴圖完全指向內部，只有一個外部依賴：

```
Domain 層依賴:
  └── @gravito/enterprise（僅引入 DomainEvent 型別）

Application 層依賴:
  ├── @gravito/core（Container 型別）
  ├── @gravito/enterprise（Command, Query, Handler 型別）
  └── Domain 層（Account, Money, Repository 介面等）

Infrastructure 層依賴:
  ├── @gravito/atlas（DB 門面）
  └── Domain 層（Account, Money, Repository 介面等）
```

**結論**: 完全符合 Clean Architecture 的依賴規則 — 外層依賴內層，內層不依賴外層。

### 3.2 Convention-based Handler 解析

```typescript
// CommandBus.ts
async dispatch<TResult = void>(command: Command): Promise<TResult> {
  const handlerKey = `cqrs.command.${command.constructor.name}`
  const handler = this.container.make<CommandHandler<Command, TResult>>(handlerKey)
  return handler.handle(command)
}
```

**優點**:
- 新增功能零配置（遵循命名慣例即可）
- 降低 Bus 與 Handler 的耦合
- 容易在 Provider 中統一管理所有 Handler 註冊

### 3.3 Money ValueObject 的防禦性設計

```typescript
// 建構時驗證
if (cents < 0) throw new Error('金額不能為負數')

// 操作時驗證
private assertSameCurrency(other: Money): void {
  if (this._currency !== other._currency) {
    throw new Error(`貨幣不符：${this._currency} 不能與 ${other._currency} 混合操作`)
  }
}

// 不可變：所有操作返回新物件
add(other: Money): Money {
  this.assertSameCurrency(other)
  return new Money(this._cents + other._cents, this._currency) // 新物件
}
```

### 3.4 Aggregate Event Collection

```typescript
// Account.ts — 事件在狀態變更時自動收集
deposit(amount: Money): void {
  this.assertAccountIsActive()
  this._balance = this._balance.add(amount)
  this._domainEvents.push(new FundsDeposited(...)) // ← 收集事件
}

// Handler 中統一拉出事件並發布
const events = account.pullDomainEvents()
for (const event of events) {
  this.core.hooks.doAction('cqrs:domain-event', event)
}
```

**優點**: 事件與狀態變更綁定，不會忘記發布事件。

---

## 4. 風險與問題

### 4.1 🚨 嚴重（Critical）

#### C1: TransferFundsHandler 缺乏資料庫交易原子性

**檔案:** `src/Application/Commands/TransferFunds/TransferFundsHandler.ts`

```typescript
// 問題程式碼（Line 57-58）
await this.accountRepository.save(fromAccount)  // 第一步：扣除 sender
await this.accountRepository.save(toAccount)    // 第二步：入帳 receiver
```

**風險:**
- 如果第一個 `save()` 成功、第二個失敗 → sender 扣款了但 receiver 未入帳
- 如果 transaction record 寫入失敗 → 帳務與審計不一致
- 在高並發下可能出現 race condition

**建議修復:**

```typescript
await DB.transaction(async (trx) => {
  await this.accountRepository.save(fromAccount, trx)
  await this.accountRepository.save(toAccount, trx)
  await this.transactionRepository.save(outgoingTx, trx)
  await this.transactionRepository.save(incomingTx, trx)
})
```

> 需要同步修改 Repository 介面以支援 transaction 注入。

#### C2: 缺少全域錯誤處理中間件

**檔案:** `src/routes.ts`, `src/index.ts`

**現狀:** routes.ts 的 JSDoc 提到 "delegate to middleware"，但中間件並未實作。所有 Domain 層拋出的中文錯誤訊息（如 `'餘額不足無法提取'`）會直接以 HTTP 500 返回。

**風險:**
- 洩漏內部實作細節
- 無法區分 4xx 和 5xx 狀態碼
- 前端無法正確解析錯誤結構

**建議修復:**

```typescript
// src/middleware/ErrorHandler.ts
export function errorHandler(err: Error, ctx: Context) {
  const errorMap: Record<string, number> = {
    '不存在': 404,
    '餘額不足': 422,
    '帳戶狀態不可': 409,
    '已存在': 409,
    '不能超過': 422,
    '金額不能為負': 400,
    '貨幣不符': 400,
    '貨幣代碼不合法': 400,
  }

  for (const [keyword, status] of Object.entries(errorMap)) {
    if (err.message.includes(keyword)) {
      return ctx.json({ success: false, error: err.message }, status)
    }
  }

  console.error('Unhandled error:', err)
  return ctx.json({ success: false, error: 'Internal Server Error' }, 500)
}
```

### 4.2 ⚠️ 中度風險（Medium）

#### M1: GravitoEventPublisher 未被使用（死程式碼）

**檔案:** `src/Infrastructure/EventPublisher/GravitoEventPublisher.ts`

**現狀:** 已實作 `subscribe()` / `publish()` 介面，但所有 Handler 都直接使用 `core.hooks.doAction()` 發布事件。兩套事件機制並存，違反單一真實來源原則。

**建議:** 選擇一個統一方案：
- 若 `core.hooks` 足夠 → 刪除 `GravitoEventPublisher`
- 若需要更豐富的事件語意 → 在 Provider 中註冊 `GravitoEventPublisher` 並改用

#### M2: routes.ts 中的型別安全缺失

**檔案:** `src/routes.ts`

```typescript
export function registerRoutes(router: any): void {  // ← any
  router.post('/api/accounts', async (ctx: any) => { // ← any
```

**建議:**

```typescript
import type { PhotonRouter, Context } from '@gravito/core'
export function registerRoutes(router: PhotonRouter): void {
  router.post('/api/accounts', async (ctx: Context) => {
```

#### M3: AtlasAccountRepository.save() 的 SELECT-then-INSERT/UPDATE 模式

**檔案:** `src/Infrastructure/Persistence/AtlasAccountRepository.ts`

```typescript
const existing = await DB.table('accounts').where('id', account.id).first()
if (existing) {
  await DB.table('accounts').where('id', account.id).update({...})
} else {
  await DB.table('accounts').insert({...})
}
```

**風險:** 在高並發下，兩個 request 同時 SELECT 得到 `null`，然後都 INSERT，導致主鍵衝突。

**建議:** 使用 SQLite 的 UPSERT 語法：

```sql
INSERT INTO accounts (id, owner_name, balance, currency, status, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
  balance = excluded.balance,
  status = excluded.status,
  updated_at = excluded.updated_at
```

#### M4: 缺少輸入驗證

**檔案:** `src/routes.ts`

```typescript
const body = (await ctx.req.json()) as { amount: number; currency?: string }
// 沒有驗證 amount > 0、currency 合法、ownerName 非空等
```

**建議:** 引入 Zod 或類似的 schema 驗證：

```typescript
import { z } from 'zod'

const depositSchema = z.object({
  amount: z.number().positive('金額必須為正數'),
  currency: z.string().length(3).optional().default('TWD'),
})

router.post('/api/accounts/:id/deposit', async (ctx) => {
  const body = depositSchema.parse(await ctx.req.json())
  // ...
})
```

### 4.3 💡 低度風險 / 建議改善

#### L1: 事件發布的最終一致性

**現狀:** 事件在 `save()` 之後才 `pullDomainEvents()`。如果在兩者之間出現異常，資料已持久化但事件未發布（或反之）。

**建議:**（僅生產環境需要）
- 考慮 Outbox Pattern：在同一個 DB transaction 中寫入事件到 outbox 表
- 背景 worker 輪詢 outbox 表並發布事件
- 確保事件最終一致性

#### L2: 測試覆蓋不足

| 層級 | 狀態 | 說明 |
|------|------|------|
| Domain - Account | ✅ 有測試 | 8 個測試案例，覆蓋核心業務規則 |
| Domain - Money | ✅ 有測試 | 8 個測試案例，覆蓋運算和驗證 |
| Application - Handlers | ❌ 無測試 | 建議使用 mock repository 進行單元測試 |
| Infrastructure - Repos | ❌ 無測試 | 建議使用 in-memory SQLite 進行整合測試 |
| 介面層 - Routes | ❌ 無測試 | 建議使用 supertest 進行 E2E 測試 |

#### L3: Account 的 `receiveTransfer()` 不發布事件

```typescript
receiveTransfer(fromAccountId: string, amount: Money): void {
  this.assertAccountIsActive()
  this._balance = this._balance.add(amount)
  this._updatedAt = new Date()
  // ← 沒有 FundsReceived 事件
}
```

**影響:** receiver 端的入帳沒有獨立的領域事件。如果有訂閱者需要知道「某帳戶收到轉帳」，目前無法捕獲。

**建議:** 新增 `FundsReceived` 事件或在 `FundsTransferred` 事件中包含雙方資訊。

---

## 5. 評分矩陣

| 維度 | 評分 | 說明 |
|------|:----:|------|
| **分層清晰度** | ⭐⭐⭐⭐⭐ | Domain / Application / Infrastructure 完全隔離，依賴方向正確 |
| **DDD 實踐** | ⭐⭐⭐⭐⭐ | AggregateRoot, ValueObject, Entity, Repository, DomainEvent 齊全 |
| **CQRS 實踐** | ⭐⭐⭐⭐⭐ | Command/Query 完全分離，Bus convention 設計精巧 |
| **Type Safety** | ⭐⭐⭐☆☆ | 路由和基礎設施層有較多 `any` 類型斷言 |
| **原子性/並發** | ⭐⭐☆☆☆ | 轉帳缺乏 DB transaction，upsert 有 race condition |
| **錯誤處理** | ⭐⭐☆☆☆ | Domain 層有業務驗證，但缺少 HTTP 錯誤映射中間件 |
| **測試覆蓋** | ⭐⭐⭐☆☆ | Domain 有測試，Application/Infrastructure 缺少測試 |
| **可擴展性** | ⭐⭐⭐⭐☆ | 新增 Command/Query 只需新增資料夾 + Provider 註冊 |
| **文件品質** | ⭐⭐⭐⭐⭐ | JSDoc 極其完整，每個檔案都有詳盡的說明 |
| **程式碼品質** | ⭐⭐⭐⭐☆ | 一致的風格，良好的命名，遵循 SRP |

---

## 6. 改善建議

### 6.1 優先行動清單

| 優先級 | 編號 | 改善項目 | 工作量 | 影響 |
|:------:|:----:|---------|:------:|:----:|
| **P0** | C1 | 為 TransferFundsHandler 加入 DB Transaction | 🟢 低 | 🔴 高 |
| **P0** | C2 | 加入全域錯誤處理中間件 | 🟢 低 | 🔴 高 |
| **P1** | M4 | 在 routes.ts 加入輸入驗證（如 Zod） | 🟡 中 | 🟡 中 |
| **P1** | M1 | 移除未使用的 GravitoEventPublisher 或整合使用 | 🟢 低 | 🟢 低 |
| **P1** | M2 | 將 `router: any` 和 `ctx: any` 替換為正確型別 | 🟢 低 | 🟡 中 |
| **P2** | L2 | 為 Application 層 Handler 加入單元測試（mock repo） | 🟡 中 | 🟡 中 |
| **P2** | M3 | AtlasAccountRepository.save 改用 UPSERT 語法 | 🟢 低 | 🟢 低 |
| **P2** | L1 | 考慮 Outbox Pattern 保障事件最終一致性 | 🔴 高 | 🟡 中 |
| **P3** | L3 | 為 receiveTransfer 新增 FundsReceived 事件 | 🟢 低 | 🟢 低 |

### 6.2 快速修復清單（可立即執行）

1. **刪除 `GravitoEventPublisher.ts`**（死程式碼）
2. **替換 `router: any`** 為 `PhotonRouter` 型別
3. **在 `routes.ts` 中加入 `try-catch`** 或全域 `onError` 中間件

---

## 7. 結論

### 整體評價

> **這是一個架構品質極高的 CQRS + DDD 教學範例。**

**強項:**
- 分層清晰，完全符合 Clean Architecture 依賴規則
- Domain 層業務規則完善，防禦性編程做到位
- Money ValueObject 的設計堪稱教科書範例
- Convention-based Bus 設計精巧、可擴展
- JSDoc 文件覆蓋率接近 100%，品質優異

**需要立即修復的兩個問題:**
1. **TransferFundsHandler 的資料一致性** — 加入 DB Transaction
2. **全域錯誤處理中間件** — 防止 500 洩漏內部資訊、正確映射 HTTP 狀態碼

**其餘問題均為改善建議級別，不影響整體架構品質。**

作為 Gravito Framework 的 CQRS 範例專案，此架構 **完全達到教學目標**，並為生產環境的擴展提供了良好基礎。

---

## 附錄

### A. 關聯文件

- [CQRS 模式概述](./CQRS-overview.md) — CQRS 概念與原理說明
- [DDD 學習指南](./concepts/) — Domain-Driven Design 各概念詳解

### B. 審查方法論

本審查採用以下方法論：

1. **全量原始碼閱讀** — 逐一閱讀 37 個 TypeScript 檔案
2. **依賴圖分析** — 驗證分層依賴方向是否正確
3. **DDD 模式合規性** — 檢查 Aggregate, ValueObject, Entity, Repository, DomainEvent
4. **CQRS 模式合規性** — 檢查 Command/Query 分離、Bus 調度、Handler 設計
5. **風險識別** — 並發安全、資料一致性、錯誤處理、類型安全
6. **測試覆蓋分析** — 檢查已有測試的範圍與缺失
