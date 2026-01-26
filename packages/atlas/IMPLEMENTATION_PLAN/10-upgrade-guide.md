# 升級指南

本指南幫助您從 @gravito/atlas v1.x 升級到 v2.0。

**主要變更：**
- ✅ 性能大幅提升（Model hydration ↑300-500%, Query compilation ↑50-100%）
- ✅ 開發者體驗改進（更好的錯誤訊息、調試工具、類型安全）
- ⚠️ 三個可能影響行為的調整（見下方詳情）

---

## 快速檢查清單

- [ ] 檢查是否有 nested 物件直接修改（需改為整體重設）
- [ ] 確認是否有多租戶場景（需設置 `Grammar.cacheScope = 'instance'`）
- [ ] 檢查是否依賴 eager loading 順序（可能需要關閉 chunking）
- [ ] 執行完整測試套件確保兼容性

---

本指南聚焦於三個可能影響行為的調整：DirtyTracker shallow compare、eager loading chunking、Grammar cache scope。

---

## 1) DirtyTracker Shallow Compare

### 行為變更

- 僅做淺層比較，深層 nested 物件的原地修改不再自動被視為變更。

### 升級步驟

1. 對有深層修改需求的模型，改成「整體重設」屬性。
2. 若業務依賴深層變更自動偵測，改用深比較模式。

### 建議做法

```typescript
// ❌ 不會觸發 dirty
user.settings.theme = 'dark'

// ✅ 會觸發 dirty
user.settings = { ...user.settings, theme: 'dark' }

// ✅ 需要深層偵測時啟用（效能較慢）
user.getDirtyTracker().setDeepComparison(true)
```

### 升級檢查點

- 有 nested 物件更新的地方，是否已改成「整體重設」？
- 是否有需要開啟 deep comparison 的模型？

---

## 2) Eager Loading Chunking

### 行為變更

- 默認啟用 chunking，載入順序與載入時機可能改變。

### 升級步驟

1. 若程式依賴載入順序或 side effect，先改用相容模式。
2. 確認大型 eager loading 場景記憶體改善。

### 相容模式（關閉 chunking）

```typescript
import { setEagerLoadChunking } from '@gravito/atlas'
setEagerLoadChunking(false)
```

### 升級檢查點

- 是否有依賴 eager load 的順序或 side effect？
- 大量關聯載入的記憶體使用是否改善？

---

## 3) Grammar Cache Scope

### 行為變更

- 預設使用全域快取（跨實例共用）。
- 多租戶或多資料庫場景需要隔離快取。

### 升級步驟

1. 單租戶：維持 `global`（預設）。
2. 多租戶：改用 `instance`，避免跨租戶 SQL 汙染。

### 設定方式

```typescript
import { Grammar } from '@gravito/atlas'

// 多租戶場景建議
Grammar.cacheScope = 'instance'
```

### 升級檢查點

- 是否有多租戶或多資料庫的隔離需求？
- 是否有共享 SQL 造成誤用的風險？

---

## 4) 新功能與改進

### 環境變數支援

v2.0 新增了環境變數和配置檔案支援：

```typescript
// 使用環境變數
DB.configureFromEnv()

// 使用配置檔案
await DB.configureFromFile()
```

詳見 [README.md](../README.md) 中的配置範例。

### 調試工具

新增了強大的調試工具：

```typescript
// 啟用調試模式
DB.debug(true)

// 查看查詢日誌
const logs = DB.getQueryLog()

// 查看最後一個查詢
const lastQuery = DB.getLastQuery()
```

### 錯誤訊息改進

錯誤訊息現在包含 "Did you mean?" 建議：

```typescript
// 如果欄位名稱拼寫錯誤，會自動建議正確的名稱
user.nmae = 'John' // Error: Column 'nmae' not found. Did you mean 'name'?
```

### 性能監控

可以監控 Grammar 快取性能：

```typescript
import { Grammar } from '@gravito/atlas'

const stats = Grammar.getCacheStats()
console.log(`Cache hit rate: ${stats.hitRate}%`)
console.log(`Cache size: ${stats.size}/${stats.maxSize}`)
```

---

## 5) 測試建議

升級後建議執行以下測試：

1. **回歸測試**：確保所有現有功能正常運作
2. **性能測試**：驗證性能提升效果
3. **邊界情況測試**：特別關注 nested 物件修改和多租戶場景

```bash
# 執行完整測試套件
bun test

# 執行性能基準測試
bun test tests/performance/
```

---

## 6) 需要幫助？

如果遇到升級問題，請：
1. 查看 [風險評估](./09-risks/README.md) 了解已知問題
2. 檢查 [回歸測試清單](./08-testing/regression-checklist.md) 確認功能覆蓋
3. 提交 Issue 並附上詳細的錯誤訊息和重現步驟
