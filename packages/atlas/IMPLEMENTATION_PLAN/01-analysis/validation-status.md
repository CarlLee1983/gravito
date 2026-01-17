# 計劃審視狀態

**更新日期：** 2026-01-17

## ✅ 問題驗證結果

| 問題點 | 位置 | 驗證結果 | 備註 |
|--------|------|----------|------|
| API 命名重複 | Model.ts:78-79 | ✅ 確認 | `table` 和 `tableName` 並存 |
| DirtyTracker JSON 序列化 | DirtyTracker.ts:122-137 | ✅ 確認 | 嚴重性能瓶頸 |
| observers `any[]` 類型 | Model.ts:86 | ✅ 確認 | |
| setModel/getModel `any` | QueryBuilder.ts:84-94 | ✅ 確認 | |
| clone() 陣列複製 | QueryBuilder.ts:1257-1273 | ✅ 確認 | |
| Grammar 快取無限制 | Grammar.ts:34 | ⚠️ 需調整 | **是實例級，非靜態** |
| Proxy 原型鏈遍歷 | Model.ts:210-220 | ✅ 確認 | |
| ConnectionManager 無清理 | ConnectionManager.ts | ✅ 確認 | |
| 錯誤訊息過於簡單 | errors.ts | ✅ 確認 | |

## ⚠️ 架構調整需求

### Grammar 快取問題

**問題描述：** 計劃原本假設快取是靜態的，但實際上是實例級別：

```typescript
// 實際代碼（第 34 行）
protected compilationCache: Map<string, string> = new Map()
```

**影響：**
- 每個 Grammar 實例都有獨立的快取
- 快取無法跨實例共享
- 無大小限制 - 記憶體洩漏風險

**解決方案：** 需要改為靜態快取以跨實例共享，詳見 [Phase 2.3](../04-phase-2-performance/2.3-grammar-cache.md)。
