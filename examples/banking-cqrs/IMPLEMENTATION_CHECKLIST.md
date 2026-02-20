# 實施清單 - Banking CQRS Controller 層重構

## ✅ 已完成的工作

所有新檔案已生成，所有現有檔案已修改。

### 新增檔案 (3 個)

- ✅ `src/Presentation/HttpController.ts` (155 行)
- ✅ `src/Application/Actions/AccountActions.ts` (133 行)
- ✅ `src/Presentation/Controllers/AccountController.ts` (250 行)

### 修改檔案 (3 個)

- ✅ `src/Providers/CqrsProvider.ts` (+9 行，新增 Controller 註冊)
- ✅ `src/bootstrap.ts` (修改 registerRoutes 呼叫)
- ✅ `src/routes.ts` (520 行 → 55 行，完全重寫)

---

## 🔍 快速驗證

### 1️⃣ TypeScript 編譯

```bash
cd /Users/carl/Dev/Carl/gravito-core-dx
bun run typecheck
```

**預期結果**：✅ 無錯誤

### 2️⃣ 項目構建

```bash
bun run build
```

**預期結果**：✅ examples/banking-cqrs 構建成功

### 3️⃣ 測試運行

```bash
cd examples/banking-cqrs
bun test
```

**預期結果**：✅ 所有測試通過

### 4️⃣ 程式碼檢查

```bash
bun run check
```

**預期結果**：✅ 無 lint 或格式化錯誤

---

## 📝 架構變化總結

### 層級結構

```
Route (routes.ts)
  ↓ 委派 (1 行)
Controller (Presentation/Controllers/AccountController.ts)
  ├─ HTTP 解析 ✅
  ├─ Zod 驗證 ✅
  ├─ 回應格式化 ✅
  └─ 呼叫 Action ↓
    Action (Application/Actions/AccountActions.ts)
      ├─ 業務編排 ✅
      ├─ Command/Query 建構 ✅
      └─ Bus 派發 ↓
        Bus → Handler → Repository → Database
```

### 職責分配

| 層 | 職責 | 檔案 |
|---|------|------|
| **Route** | 路由注冊 | `routes.ts` |
| **Controller** | HTTP 請求解析、驗證、回應 | `Presentation/Controllers/` |
| **Action** | 業務編排、Command/Query 建構 | `Application/Actions/` |
| **Bus** | 命令派發、查詢執行 | `Application/Bus/` |
| **Handler** | 業務規則、事件發行 | `Application/Commands/*/Handler` |
| **Repository** | 資料存取 | `Infrastructure/Persistence/` |

---

## 🚀 核心改進

### Before → After

| 項 | Before | After |
|---|--------|-------|
| **routes.ts 行數** | 520 行 | 55 行 |
| **重複的 try-catch** | 7 個 | 1 個 (在 HttpController) |
| **重複的 DI 解析** | 7 個 (`ctx.get + make`) | 1 個 (CqrsProvider) |
| **重複的錯誤處理** | 5 個 Zod 錯誤處理 | 1 個 (HttpController.validationError) |
| **可測試性** | 無法單獨測試 Action | 直接測試 Action 和 Controller |
| **程式碼重用** | 無 | Action 可被其他進入點重用 |

---

## 📊 檔案變化統計

```
總新增行數：    +538 行
  - HttpController.ts:      155 行
  - AccountActions.ts:       133 行
  - AccountController.ts:    250 行

總修改行數：     +9 行
  - CqrsProvider.ts:        +9 行

總刪除行數：   -465 行
  - routes.ts:             -465 行

淨變化：        +82 行 (但去除了大量重複程式碼)
```

---

## 🔄 遷移流程確認

### ✅ 驗證順序

1. **TypeScript 檢查** → `bun run typecheck`
   - 確認沒有型別錯誤
   - 特別檢查：Controller import、Action import、Provider import

2. **構建驗證** → `bun run build`
   - 確認 banking-cqrs 編譯成功
   - 檢查生成的 dist 檔案

3. **測試驗證** → `bun run test` (在 banking-cqrs 目錄)
   - 所有現有測試應該保持通過
   - 新增的 Controller/Action 層應該在測試中被正確調用

4. **程式碼檢查** → `bun run check`
   - Biome 格式化應該通過
   - 沒有 lint 錯誤

5. **功能驗證** (可選)
   ```bash
   # 啟動伺服器
   cd examples/banking-cqrs
   bun run dev

   # 測試 curl
   curl -X POST http://localhost:3000/api/accounts \
     -H "Content-Type: application/json" \
     -d '{"ownerName": "Alice", "currency": "TWD"}'

   # 預期回應：
   # { "success": true, "accountId": "uuid-here" }
   ```

---

## 🎯 核心改善點

### 1. 消除重複的 DI 解析

**Before：**
```typescript
// 7 次重複
const core = ctx.get('core') as PlanetCore
const bus = core.container.make<CommandBus>('cqrs.commandBus')
```

**After：**
```typescript
// 1 次在 CqrsProvider
container.singleton('controller.account', (c) =>
  new AccountController(
    c.make<CommandBus>('cqrs.commandBus'),
    c.make<QueryBus>('cqrs.queryBus'),
  )
)

// 在 routes.ts 中
const accounts = core.container.make<AccountController>('controller.account')
```

### 2. 統一錯誤處理

**Before：**
```typescript
// 路由中重複的 try-catch
try {
  // ... handler logic ...
} catch (err) {
  if (err instanceof z.ZodError) {
    return ctx.json({ error: ..., code: 'VALIDATION_ERROR' }, 400)
  }
  return errorHandler(err, ctx)
}
```

**After：**
```typescript
// Controller 中的通用 execute 方法
protected async execute(ctx, handler) {
  try {
    return await handler()
  } catch (err) {
    if (err instanceof z.ZodError) {
      return this.validationError(ctx, err)
    }
    return this.handleError(err, ctx)
  }
}
```

### 3. 業務邏輯可單獨測試

**Before：** Action 邏輯在路由中，無法獨立測試

**After：**
```typescript
// Action 可獨立測試，不需 HTTP context
const action = new CreateAccountAction(mockBus)
const result = await action.execute({ ownerName: 'Alice', currency: 'TWD' })
expect(result.accountId).toBeTruthy()
```

---

## 📋 部署前檢查清單

- [ ] 所有 TypeScript 錯誤已解決 (`bun run typecheck`)
- [ ] 構建成功 (`bun run build`)
- [ ] 所有測試通過 (`bun run test`)
- [ ] 程式碼檢查通過 (`bun run check`)
- [ ] 已測試至少一個 endpoint（例如建立帳戶）
- [ ] Git 狀態清潔（已提交新檔案和修改）
- [ ] PR/Commit message 已準備

---

## 🔗 相關文件

- **詳細 Diffs**：[REFACTORING_DIFFS.md](./REFACTORING_DIFFS.md)
- **原始架構分析**：見專案文檔

---

## 🆘 問題排查

### 問題：TypeScript 錯誤 - "Cannot find module 'Presentation/HttpController'"

**解決**：
```bash
# 確認檔案存在
ls src/Presentation/HttpController.ts

# 重新執行 typecheck
bun run typecheck
```

### 問題：Container 找不到 'controller.account'

**檢查**：
1. CqrsProvider.ts 中的註冊代碼是否正確
2. bootstrapDatabase() 是否調用了 `core.register(new CqrsProvider())`
3. 檢查 registerRoutes 是否接收 core 參數

### 問題：Controller 方法無法被路由呼叫

**檢查**：
1. routes.ts 中的 controller.account 解析是否成功
2. 檢查路由註冊語法：`router.post('/path', (ctx) => accounts.method(ctx))`
3. 確認 AccountController 不是 abstract 類別

---

## ✨ 完成後的好處

1. ✅ **程式碼簡潔**：routes.ts 減少 465 行
2. ✅ **易於維護**：新增 endpoint 只需 1 行路由 + 1 個 Action 方法
3. ✅ **可測試性**：Action 和 Controller 可獨立單元測試
4. ✅ **可重用性**：Action 可被 CLI、事件、排程任務等進入點重用
5. ✅ **一致的錯誤處理**：所有 endpoint 共享統一的錯誤映射邏輯
6. ✅ **符合 DDD**：清晰的層級邊界和職責分配

---

**狀態**：✅ **已完成 - 準備驗證**

所有檔案已生成，所有修改已應用。現在請執行驗證步驟。

