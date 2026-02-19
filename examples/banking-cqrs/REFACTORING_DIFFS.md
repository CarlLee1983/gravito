# 銀行 CQRS 重構 - 完整 Diffs 與實施指南

## 概述

此重構將 routes.ts 從 **520 行** 簡化到 **55 行**，引入 Controller 層來處理 HTTP 邏輯，Action 層來處理業務編排。

**架構變化：**
```
Before:  Route → Bus → Handler
After:   Route → Controller → Action → Bus → Handler
```

---

## 📁 新增檔案

### 1. `src/Presentation/HttpController.ts` (新增)

**作用**：HTTP Controller 的抽象基類，提供統一的 HTTP 處理基礎設施。

**重點**：
- `execute()` 方法：通用錯誤處理包裝器
- `success()` 方法：生成標準化成功回應
- `validationError()` 方法：處理 Zod 驗證錯誤
- `handleError()` 方法：委派給全域錯誤處理器

**行數**：155 行

```typescript
// 用於所有 Controller 的基類
export abstract class HttpController {
  protected async execute(
    ctx: HttpContext,
    handler: () => Promise<Response>,
  ): Promise<Response>

  protected success(
    ctx: HttpContext,
    data?: unknown,
    status?: number,
    extra?: Record<string, unknown>,
  ): Response

  protected validationError(
    ctx: HttpContext,
    err: z.ZodError,
  ): Response
}
```

### 2. `src/Application/Actions/AccountActions.ts` (新增)

**作用**：7 個 Action 類別，每個對應一個 endpoint 的業務編排邏輯。

**重點**：
- 每個 Action 接受已驗證的輸入，回傳純資料物件
- Action 負責建構 Command/Query 並派發
- 不碰 HTTP context，可獨立測試

**行數**：133 行

```typescript
// 業務編排層 - 每個 Action 負責一個業務操作
export class CreateAccountAction {
  async execute(input: CreateAccountInput): Promise<{ accountId: string }>
}

export class DepositFundsAction {
  async execute(accountId: string, input: DepositInput): Promise<void>
}

// ... 5 個更多 Action
```

### 3. `src/Presentation/Controllers/AccountController.ts` (新增)

**作用**：HTTP 層 Controller，收納所有 7 個 endpoint 的處理邏輯。

**重點**：
- 每個公開方法對應一個 HTTP endpoint
- 負責解析請求、驗證輸入、呼叫 Action、格式化回應
- 繼承 HttpController，自動獲得統一錯誤處理

**行數**：250 行

```typescript
// HTTP 層 Controller - 收納所有帳戶相關的 endpoint
export class AccountController extends HttpController {
  async createAccount(ctx: HttpContext): Promise<Response>
  async getDetails(ctx: HttpContext): Promise<Response>
  async getBalance(ctx: HttpContext): Promise<Response>
  async deposit(ctx: HttpContext): Promise<Response>
  async withdraw(ctx: HttpContext): Promise<Response>
  async transfer(ctx: HttpContext): Promise<Response>
  async getTransactions(ctx: HttpContext): Promise<Response>
}
```

---

## 📝 修改的檔案

### 1. `src/Providers/CqrsProvider.ts`

**變更**：新增 Controller 註冊到 DI 容器

<details>
<summary>✅ Diff</summary>

```diff
import type { Container, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
// ... 其他 import ...
import { AtlasAccountRepository } from '../Infrastructure/Persistence/AtlasAccountRepository'
import { AtlasTransactionRepository } from '../Infrastructure/Persistence/AtlasTransactionRepository'
+ import { AccountController } from '../Presentation/Controllers/AccountController'

// ... 中間沒變 ...

/**
 * CQRS Service Provider
 *
 * Registers all core CQRS components (buses, handlers, repositories,
 * validators, cache, controllers) into the Gravito dependency injection container.
 *
 * **已整合的新功能：**
 * - ValidatorRegistry：CommandBus 在 dispatch 前自動驗證輸入
 * - QueryCache（30 秒 TTL）：QueryBus 自動快取查詢結果
+ * - Controller 層：HTTP 請求處理與回應格式化
 *
 * @since 1.0.0
 */
export class CqrsProvider extends ServiceProvider {
  register(container: Container): void {
    // ... 現有的 handler 和 bus 註冊 ...

    // Buses（注入驗證器與快取）
    container.singleton('cqrs.commandBus', (c) => new CommandBus(c, validatorRegistry))
    container.singleton('cqrs.queryBus', (c) => new QueryBus(c, queryCache))
+
+   // ─── Controller（單例，注入 Bus） ───
+   container.singleton(
+     'controller.account',
+     (c) =>
+       new AccountController(
+         c.make<CommandBus>('cqrs.commandBus'),
+         c.make<QueryBus>('cqrs.queryBus'),
+       ),
+   )
  }
}
```

</details>

**行數變化**：114 行 → 123 行 (+9 行)

---

### 2. `src/bootstrap.ts`

**變更**：修改 registerRoutes 呼叫，傳入 core 參數

<details>
<summary>✅ Diff</summary>

```diff
export async function bootstrapDatabase(core: PlanetCore): Promise<void> {
  // Register CQRS provider (dependency injection)
  core.register(new CqrsProvider())

  // Execute database migrations (create tables)
  await migrate()

  // Register HTTP routes (endpoint handlers)
  const router = core.container.make('router')
- registerRoutes(router)
+ registerRoutes(router, core)
}
```

</details>

**行數變化**：100 行 → 100 行 (只改 1 行，但邏輯重要)

---

### 3. `src/routes.ts`

**變更**：從 520 行單一函式重構為 55 行簡單路由註冊

<details>
<summary>✅ Diff</summary>

```diff
- import type { PlanetCore } from '@gravito/core'
- import { randomUUID } from 'crypto'
- import { z } from 'zod'
- import type { CommandBus } from './Application/Bus/CommandBus'
- import type { QueryBus } from './Application/Bus/QueryBus'
- import { CreateAccountCommand } from './Application/Commands/CreateAccount/CreateAccountCommand'
- import { DepositFundsCommand } from './Application/Commands/DepositFunds/DepositFundsCommand'
- import { TransferFundsCommand } from './Application/Commands/TransferFunds/TransferFundsCommand'
- import { WithdrawFundsCommand } from './Application/Commands/WithdrawFunds/WithdrawFundsCommand'
- import { GetAccountBalanceQuery } from './Application/Queries/GetAccountBalance/GetAccountBalanceQuery'
- import { GetAccountDetailsQuery } from './Application/Queries/GetAccountDetails/GetAccountDetailsQuery'
- import { GetTransactionHistoryQuery } from './Application/Queries/GetTransactionHistory/GetTransactionHistoryQuery'
- import {
-   createAccountSchema,
-   depositSchema,
-   transactionHistoryParamsSchema,
-   transferSchema,
-   withdrawSchema,
- } from './Application/Schemas/AccountSchemas'
- import { errorHandler } from './Middleware/ErrorHandler'

+ import type { PlanetCore } from '@gravito/core'
+ import type { AccountController } from './Presentation/Controllers/AccountController'

/**
 * Route Registration Module
 *
- * Defines all HTTP endpoints for the banking CQRS application.
- * This module follows the Interface/Presentation Layer in the layered architecture.
+ * 只負責路由映射，所有 HTTP 處理邏輯委派給 Controller。
+ * 從 DI 容器解析 AccountController，確保依賴注入的一致性。
 *
- * **Route Categories:**
- * - Account Management: Create, retrieve account details
- * - Balance Queries: View current balance
- * - Transactions: Deposit, withdraw, transfer funds
- * - History: View transaction history with pagination
+ * **設計原則：**
+ * - Route 只做路由注冊，不包含業務邏輯
+ * - Controller 透過 DI 容器注入，支援測試替換
+ * - 每個 endpoint 只有一行委派程式碼
 *
- * **Design Pattern:**
- * Each endpoint follows the same pattern:
- * 1. Extract request parameters/body
- * 2. Get core context (for DI container access)
- * 3. Resolve CommandBus or QueryBus
- * 4. Create command or query
- * 5. Dispatch/execute via bus
- * 6. Return JSON response
+ * **7 Endpoints：**
+ * - POST /api/accounts - 建立帳戶
+ * - GET /api/accounts/:id - 取得帳戶明細
+ * - GET /api/accounts/:id/balance - 取得餘額
+ * - POST /api/accounts/:id/deposit - 存款
+ * - POST /api/accounts/:id/withdraw - 提款
+ * - POST /api/accounts/:id/transfer - 轉帳
+ * - GET /api/accounts/:id/transactions - 交易歷史
 *
- * **Error Handling:**
- * - Any error thrown in command/query propagates as HTTP error
- * - No try-catch blocks in routes (delegate to middleware)
- * - Repository/domain errors bubble up naturally
+ * @param router - Photon 路由實例
+ * @param core - PlanetCore 實例（用於從容器解析 Controller）
 *
- * **API Response Format:**
- * All responses follow the standard format:
- * ```json
- * { "success": true, "data": {...} }
- * { "success": false, "error": "message" }
- * ```
+ * @since 2.0.0
 */
- export function registerRoutes(router: any): void {
-   /**
-    * POST /api/accounts - Create Account
-    * ... (60 行詳細 JSDoc)
-    */
-   router.post('/api/accounts', async (ctx: any) => {
-     try {
-       const body = await ctx.req.json()
-       const validated = createAccountSchema.parse(body)
-       const core = ctx.get('core') as PlanetCore
-       const bus = core.container.make<CommandBus>('cqrs.commandBus')
-
-       const command = new CreateAccountCommand(
-         randomUUID(),
-         validated.ownerName,
-         validated.currency
-       )
-
-       await bus.dispatch(command)
-
-       return ctx.json({ success: true, accountId: command.accountId }, 201)
-     } catch (err) {
-       if (err instanceof z.ZodError) {
-         return ctx.json(
-           {
-             success: false,
-             error: `驗證失敗: ${err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
-             code: 'VALIDATION_ERROR',
-           },
-           400
-         )
-       }
-       return errorHandler(err as Error, ctx)
-     }
-   })
-
-   // ... (420+ 行類似的 endpoint 實作) ...
- }

+ export function registerRoutes(router: any, core: PlanetCore): void {
+   // 從 DI 容器解析 Controller（含注入的 CommandBus/QueryBus）
+   const accounts = core.container.make<AccountController>(
+     'controller.account',
+   )
+
+   // ─── 帳戶管理 ───
+   router.post('/api/accounts', (ctx: any) => accounts.createAccount(ctx))
+   router.get('/api/accounts/:id', (ctx: any) => accounts.getDetails(ctx))
+
+   // ─── 餘額查詢 ───
+   router.get('/api/accounts/:id/balance', (ctx: any) =>
+     accounts.getBalance(ctx),
+   )
+
+   // ─── 交易操作 ───
+   router.post('/api/accounts/:id/deposit', (ctx: any) =>
+     accounts.deposit(ctx),
+   )
+   router.post('/api/accounts/:id/withdraw', (ctx: any) =>
+     accounts.withdraw(ctx),
+   )
+   router.post('/api/accounts/:id/transfer', (ctx: any) =>
+     accounts.transfer(ctx),
+   )
+
+   // ─── 交易歷史 ───
+   router.get('/api/accounts/:id/transactions', (ctx: any) =>
+     accounts.getTransactions(ctx),
+   )
+ }
```

</details>

**行數變化**：520 行 → 55 行 (**-465 行，86% 簡化**)

---

## 📊 變更統計

| 檔案 | 前 | 後 | 變化 |
|------|-----|-------|--------|
| routes.ts | 520 | 55 | **-465** |
| CqrsProvider.ts | 114 | 123 | +9 |
| bootstrap.ts | 100 | 100 | ±0 |
| HttpController.ts | — | 155 | **+155** (新) |
| AccountActions.ts | — | 133 | **+133** (新) |
| AccountController.ts | — | 250 | **+250** (新) |
| **總計** | **734** | **816** | **+82** |

**實際效益**：
- routes.ts 簡化 86%（520 → 55 行）
- 消除 ~350 行重複的 try-catch 和 DI 解析代碼
- 新增 3 個設計良好的層次（HttpController、Action、Controller）
- 業務邏輯變得可單獨測試且可重用

---

## 🔄 呼叫流程對比

### Before（重構前）

```
HTTP Request
  ↓
Route Handler (在 routes.ts 中)
  ├─ 解析 JSON 或參數
  ├─ Zod 驗證 (try-catch #1)
  ├─ ctx.get('core')
  ├─ container.make('cqrs.commandBus' 或 'cqrs.queryBus')
  ├─ new XxxCommand(...) 或 new XxxQuery(...)
  ├─ bus.dispatch() 或 bus.execute()
  ├─ ctx.json({ success, data })
  └─ catch → errorHandler() 或手動 ZodError 處理
    ↓
HTTP Response
```

### After（重構後）

```
HTTP Request
  ↓
Route Handler (在 routes.ts 中) - 簡潔！
  └─ accounts.methodName(ctx)  // 單行委派
    ↓
AccountController (在 Presentation/Controllers 中)
  └─ async methodName(ctx)
    ├─ ctx.req.json() 或 ctx.req.param()
    ├─ schema.parse() (ZodError → validationError())
    ├─ new XxxAction(bus)
    └─ action.execute() (all errors → handleError())
      ↓
Action (在 Application/Actions 中)
  └─ async execute(input)
    ├─ 業務邏輯編排
    ├─ new XxxCommand(...) 或 new XxxQuery(...)
    └─ bus.dispatch() 或 bus.execute()
      ↓
Handler / Repository → Business Logic / Database
    ↓
HTTP Response (via Controller.success() 或 handleError())
```

---

## 🛠️ 實施步驟

### Step 1：新增三個新檔案

✅ 已完成：
- `src/Presentation/HttpController.ts` ← 複製完成
- `src/Application/Actions/AccountActions.ts` ← 複製完成
- `src/Presentation/Controllers/AccountController.ts` ← 複製完成

### Step 2：修改三個現有檔案

✅ 已完成：
- `src/Providers/CqrsProvider.ts` ← 添加 Controller 註冊
- `src/bootstrap.ts` ← 傳入 core 參數
- `src/routes.ts` ← 完全重寫

### Step 3：驗證

```bash
# 1. TypeScript 檢查
bun run typecheck

# 2. 構建
bun run build

# 3. 測試
bun run test
```

---

## 📋 檢查清單

- [ ] 複製新檔案到 `src/Presentation/` 和 `src/Application/Actions/`
- [ ] 修改 CqrsProvider.ts（添加 import 和 container.singleton）
- [ ] 修改 bootstrap.ts（傳入 core）
- [ ] 重寫 routes.ts（完全替換）
- [ ] 執行 `bun run typecheck` 驗證
- [ ] 執行 `bun run build` 驗證
- [ ] 執行 `bun run test` 驗證測試通過
- [ ] 測試 curl 請求（例如：`curl http://localhost:3000/api/accounts`）

---

## 🚨 常見問題

### Q1：新建立的 AccountController 是 Singleton 嗎？

**A**：是的，在 CqrsProvider 中使用 `container.singleton()` 註冊。Controller 不持有任何請求狀態，所以可以安全地重複使用。

### Q2：能否為每個 Controller 新增更多方法？

**A**：可以。例如可以在 AccountController 中新增 `closeAccount()`、`freezeAccount()` 等方法。routes.ts 只需新增一行：
```typescript
router.post('/api/accounts/:id/close', (ctx) => accounts.closeAccount(ctx))
```

### Q3：能否新增其他 Controller？

**A**：可以。例如 TransactionController、ReportController 等。只需：
1. 建立 `src/Presentation/Controllers/TransactionController.ts`
2. 在 CqrsProvider 中註冊
3. 在 routes.ts 中新增路由

### Q4：這個改動會影響效能嗎？

**A**：不會。新增的層次只是函式呼叫（O(1) overhead），業務邏輯和資料庫操作保持不變。實際上，統一的錯誤處理可能略微改善效能。

---

## 📚 架構詳解

### HttpController 職責邊界

```typescript
// ✅ HttpController 負責
- 統一 try-catch 錯誤處理
- Zod 驗證錯誤 → 400 Bad Request
- 其他錯誤 → 委派給 errorHandler
- 標準化回應格式 { success, data }

// ❌ HttpController 不負責
- 業務規則（由 Handler 負責）
- 資料存取（由 Repository 負責）
- 路由注冊（由 routes.ts 負責）
```

### Controller 職責邊界

```typescript
// ✅ Controller 負責
- 解析 HTTP 請求（body、params、query）
- 驗證輸入（Zod schema）
- 呼叫 Action 執行業務邏輯
- 格式化和傳回 HTTP 回應

// ❌ Controller 不負責
- 業務邏輯編排（由 Action 負責）
- Command/Query 建構（由 Action 負責）
- 命令派發（由 Bus 負責）
- 資料存取（由 Repository 負責）
```

### Action 職責邊界

```typescript
// ✅ Action 負責
- 將已驗證的輸入轉換為 Command/Query
- 進行必要的資料轉換（例如元 → 分）
- 派發 Command 或執行 Query
- 回傳純資料物件或 void

// ❌ Action 不負責
- HTTP 解析（由 Controller 負責）
- 驗證（由 Zod schema 和 Validator 負責）
- 錯誤處理和轉換（由 Controller 和 errorHandler 負責）
- 資料存取（由 Handler/Repository 負責）
```

---

## 🎓 測試指南

### 單元測試 Action

```typescript
describe('CreateAccountAction', () => {
  it('should dispatch CreateAccountCommand', async () => {
    const mockBus = { dispatch: vi.fn() }
    const action = new CreateAccountAction(mockBus as any)

    const result = await action.execute({
      ownerName: 'Alice',
      currency: 'TWD',
    })

    expect(result.accountId).toBeTruthy()
    expect(mockBus.dispatch).toHaveBeenCalledOnce()
  })
})
```

### 整合測試 Controller

```typescript
describe('AccountController', () => {
  it('should return 201 with accountId on create', async () => {
    const mockCommandBus = { dispatch: vi.fn() }
    const controller = new AccountController(mockCommandBus as any, mockQueryBus)

    const result = await controller.createAccount(mockCtx)

    expect(result.status).toBe(201)
    expect(result.body.accountId).toBeTruthy()
  })
})
```

---

## 📖 後續優化方向

1. **中介軟體 Pipeline**：在 Action 前插入認證、速率限制等中介軟體
2. **DTO Mapper**：當 API 響應結構與領域 DTO 不同時，新增轉換層
3. **自動化映射**：使用 decorator 或 metadata 讓 Schema-to-Command 映射自動化
4. **性能監控**：在 HttpController.execute() 中新增性能指標收集

---

## ✅ 驗證清單

完成後運行：

```bash
# 編譯檢查
bun run typecheck

# 格式化檢查
bun run check

# 構建驗證
bun run build

# 測試
bun run test

# 全面檢查
bun run build && bun run test && bun run check
```

所有命令都應該通過 ✅

