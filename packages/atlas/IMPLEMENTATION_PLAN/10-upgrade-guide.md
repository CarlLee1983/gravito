# 升級指南

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
