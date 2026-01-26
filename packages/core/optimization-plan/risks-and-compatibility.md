# 風險評估與向後相容性指南

## 風險評估（修訂版）

### 高風險

1. **PhotonAdapter Proxy 消除（方案 A）可能破壞現有功能**
   - 某些代碼依賴解構賦值 `({ userService }: Context)`
   - **緩解**: 先實施方案 C（Pool），保持 API 相容
   - **緩解**: 如實施方案 A，提供遷移指南

2. **中間件預編譯可能改變執行語義**
   - 錯誤處理行為可能不同
   - **緩解**: 詳細的單元測試覆蓋
   - **緩解**: 保留原始實現作為回退

### 中風險

3. **快取可能導致記憶體洩漏**
   - **緩解**: 設置快取大小限制
   - **緩解**: 在 `invalidateCache()` 中主動清除

4. **基準測試結果可能與預期不符**
   - Phase 5 的假設可能錯誤
   - **緩解**: 先測試再實施，避免無效工作

### 低風險

5. **微優化可能被 JIT 抵消**
   - 現代 JS 引擎可能已經優化了這些操作
   - **緩解**: 基準測試驗證實際收益

6. **Symbol Key 需要 API 變更**
   - **緩解**: 向後相容設計，支援 string 和 symbol

---

## 修正版建議（最小變更）

> **範圍**：僅補強計劃與驗證方法，不進行實作。

### Phase 1: 中間件鏈預編譯

1. **語意對齊原行為**
   - 明確定義：`middleware` 未呼叫 `next()` 且未回傳 `Response` 時的行為
   - 若原行為為「回退到 handler」，預編譯版本需保持一致
2. **避免 handler 重複呼叫**
   - 中間件回傳 `Response` 時**不得**再往下執行
   - 中間件呼叫 `next()` 且回傳 `undefined` 時，應確保僅執行一次 handler
3. **動態路由快取鍵穩定化**
   - 使用穩定且可重現的 key（例如 router 的「路由 ID」或 routePattern 的 canonical 形式）
   - 若只能使用 `path`，需加上「middleware 版本號」以避免錯配
4. **快取大小限制**
   - 為 `compiledDynamicRoutes` 增加 `maxSize` 或簡易 LRU

### Phase 2: MinimalContext Query 快取

1. **邊界行為一致性**
   - 明確處理：無 `?`、只有 `?`、包含 `#` 的 URL
   - 與原 `new URL()` 行為比對（空值與重複 key 的處理）

### Phase 3: PhotonAdapter Pool（方案 C）

1. **Proxy 重用安全性**
   - `reset()` 必須完全清除與請求綁定的狀態
   - 文件中新增「禁止持有 ctx 參考」的規範
2. **釋放時機**
   - 需強制在 `finally` 中釋放，避免異常路徑漏釋放

### Phase 4: AOTRouter 中間件快取

1. **快取鍵正確性**
   - 避免僅用 `routeMiddleware.length`，改為「路由 ID + middleware 參考」
2. **變更時完整失效**
   - `use`, `usePattern`, `add` 與路由重編譯時，都必須清掉快取

### Phase 5: Headers 優化

1. **以數據為唯一條件**
   - 明確定義採用門檻（例如：平均耗時下降 > 10% 才採用）
2. **環境一致性**
   - 基準需固定 Bun 版本與硬體環境，避免誤判

### Phase 6: Container Symbol Key

1. **文件明確指引**
   - 建議用 `Symbol`，但保留 string 為預設支援

---

## 向後相容性指南

### PhotonAdapter API 變更（如實施方案 A）

```typescript
// 舊 API（使用 Proxy，支援解構）
app.get('/users', async ({ userService, db }: GravitoContext) => {
  const users = await userService.findAll()
  return db.json(users)
})

// 新 API（無 Proxy，顯式存取）
app.get('/users', async (c) => {
  const userService = c.get('userService')
  const users = await userService.findAll()
  return c.json(users)
})

// 或使用輔助函數
app.get('/users', async (c) => {
  const { userService } = c.services(['userService'])
  const users = await userService.findAll()
  return c.json(users)
})
```

### Container Symbol Key

```typescript
// 舊 API（仍支援）
container.singleton('UserService', factory)
const service = container.make<UserService>('UserService')

// 新 API（推薦）
container.singleton(SERVICE_KEYS.UserService, factory)
const service = container.make<UserService>(SERVICE_KEYS.UserService)
```
