# Phase 9: 額外優化領域

> **優先級**: 🟡 中 - 🟢 低  
> **狀態**: 補充優化項目

[← 返回總覽](../README.md)

---

## 📋 發現的額外優化機會

在深入檢查程式碼後，發現以下可能遺漏的優化領域：

---

## 9.1 SeoRenderer 索引計算優化（已包含在 Phase 4）

**發現位置**: `src/engine/SeoRenderer.ts:55-104`

**問題**:
- `renderIndex()` 方法中，為了找到每個 chunk 的 `lastmod`，需要遍歷所有 entries
- 對於 100K+ entries，這可能造成不必要的性能開銷

**優化方案**:
- 在構建索引時，只檢查每個 chunk 的最後 N 個 entries（假設最近更新的在最前面）
- 或使用增量計算，只檢查 chunk 邊界附近的 entries
- 或允許配置是否計算準確的 lastmod（vs 使用當前時間）

**狀態**: ✅ 已在 Phase 4.1 中規劃

---

## 9.2 SitemapBuilder 路由處理優化

**發現位置**: `src/scanner/SitemapBuilder.ts:61-98`

**問題**:
- `build()` 方法中，對每個 route 都進行同步的 pattern matching
- 對於大量路由（1000+），可能造成性能瓶頸
- 沒有並行處理多個 resolver 的 `resolve()` 調用

**優化方案**:
```typescript
// 批次處理動態路由
const dynamicRoutes = routes.filter(r => r.isDynamic)
const staticRoutes = routes.filter(r => !r.isDynamic)

// 並行處理所有動態路由的 resolver
const dynamicEntries = await Promise.all(
  dynamicRoutes.map(route => this.processRoute(route, baseUrl))
)

// 靜態路由直接處理
const staticEntries = staticRoutes.map(route => 
  this.createEntry(route.path, baseUrl, route)
)
```

**優先級**: 🟡 中  
**預估時間**: 0.5-1 天

---

## 9.3 JsonlLogger 錯誤處理與恢復

**發現位置**: `src/storage/JsonlLogger.ts:33-50`

**問題**:
- `readAll()` 方法在遇到損壞的行時，只是跳過（返回 null）
- 沒有統計或報告損壞行的數量
- 沒有自動修復機制（雖然有 `repairWAL()`，但需要手動調用）

**優化方案**:
```typescript
async readAll(options?: { autoRepair?: boolean }): Promise<LogEntry[]> {
  // ... 現有邏輯 ...
  
  const corrupted = lines.filter((_, i) => results[i] === null).length
  
  if (corrupted > 0) {
    console.warn(`[JsonlLogger] Found ${corrupted} corrupted lines`)
    
    if (options?.autoRepair) {
      await this.repairWAL()
      return this.readAll({ autoRepair: false }) // 重新讀取
    }
  }
  
  return results.filter(x => x !== null) as LogEntry[]
}
```

**優先級**: 🟡 中  
**預估時間**: 0.5 天

---

## 9.4 Compactor 排序優化

**發現位置**: `src/storage/Compactor.ts:33`

**問題**:
- 每次 compact 都會對所有 entries 進行排序
- 對於大型數據集（100K+），排序可能成為瓶頸
- 如果 entries 已經大致有序（例如按 URL 添加），可以優化

**優化方案**:
- 使用更高效的排序算法（例如 Timsort）
- 或允許配置是否排序（某些場景可能不需要）
- 或使用增量排序（只對新增/修改的部分排序）

**優先級**: 🟢 低（除非基準測試顯示排序是瓶頸）  
**預估時間**: 0.5 天

---

## 9.5 SeoEngine render() 方法優化

**發現位置**: `src/engine/SeoEngine.ts:53-76`

**問題**:
- `render()` 方法每次都會調用 `strategy.getEntries()`，即使只是請求 robots.txt
- 對於 robots.txt，不需要獲取 entries

**優化方案**:
```typescript
async render(path: string): Promise<string | null> {
  // 1. Handle Robots.txt (不需要 entries)
  if (path.endsWith('/robots.txt')) {
    const robotsConfig = this.config.robots || { rules: [{ userAgent: '*', allow: ['/'] }] }
    const builder = new RobotsBuilder(robotsConfig, this.config.baseUrl)
    return builder.build()
  }

  // 2. Handle Sitemap.xml (需要 entries)
  if (path.endsWith('/sitemap.xml') || /* ... */) {
    const entries = await this.strategy.getEntries()
    return this.renderer.render(entries, path, page)
  }

  return null
}
```

**狀態**: ✅ 已優化（robots.txt 不需要 entries）

---

## 9.6 定時器資源清理

**發現位置**: `src/engine/strategies/IncrementalStrategy.ts:18, 59, 69`

**問題**:
- `compactTimer` 使用 `setInterval`，但在某些情況下可能沒有正確清理
- 如果 engine 被多次初始化，可能造成多個定時器同時運行

**優化方案**:
```typescript
private startAutoCompact(): void {
  // 確保先清理舊的定時器
  this.stopAutoCompact()
  
  if (this.compactInterval) {
    this.compactTimer = setInterval(() => {
      // ...
    }, this.compactInterval)
  }
}

async shutdown(): Promise<void> {
  this.stopAutoCompact()
  // 確保清理所有資源
}
```

**優先級**: 🟡 中（穩定性問題）  
**預估時間**: 0.5 天

---

## 9.7 快照壓縮性能優化

**發現位置**: Phase 2.3 已規劃，但可以補充

**額外優化**:
- 使用流式 JSON 解析/序列化（例如 `stream-json` 庫）
- 對於超大快照（100MB+），考慮分片存儲
- 壓縮算法選擇（gzip vs brotli vs zstd）

**狀態**: ✅ 已在 Phase 2.3 中規劃

---

## 9.8 路由掃描器適配器性能

**發現位置**: `src/scanner/adapters/*.ts`

**問題**:
- 各種框架掃描器可能使用不同的性能策略
- 沒有統一的快取機制（已在 Phase 5 規劃）
- 某些掃描器可能需要優化（例如 Next.js 的路由掃描）

**優化方案**:
- 統一掃描器接口的性能基準
- 為每個適配器添加性能測試
- 優化特定框架的掃描邏輯

**優先級**: 🟢 低（依使用情況）  
**預估時間**: 1-2 天

---

## 9.9 CLI 工具性能優化

**發現位置**: `src/cli.ts`

**問題**:
- CLI 工具可能沒有充分利用並行處理
- 某些命令（如 `inspect`）可能需要優化

**優化方案**:
- 為 CLI 命令添加性能分析
- 優化批量操作（例如批量 inspect）
- 添加進度條和性能指標顯示

**優先級**: 🟢 低  
**預估時間**: 1 天

---

## 9.10 內存洩漏檢查

**發現位置**: 全專案

**問題**:
- 需要檢查是否有未清理的事件監聽器
- 檢查是否有循環引用導致無法 GC
- 檢查定時器是否正確清理

**優化方案**:
- 使用內存分析工具（例如 `clinic.js`）
- 添加內存監控和報告
- 定期進行內存洩漏測試

**優先級**: 🟡 中（穩定性）  
**預估時間**: 1-2 天

---

## 9.11 測試覆蓋率與性能測試

**發現位置**: `tests/` 目錄

**問題**:
- 需要確保所有優化都有對應的性能測試
- 需要基準測試來驗證優化效果
- 需要回歸測試防止性能退化

**優化方案**:
- 建立完整的性能測試套件
- 整合 CI/CD 性能基準測試
- 添加性能回歸檢測

**優先級**: 🟡 中  
**預估時間**: 2-3 天

---

## 9.12 與其他包的整合優化

**發現位置**: `packages/luminosity-adapter-photon/`, 整合點

**問題**:
- 與 Photon 的整合可能有優化空間
- 與其他框架的適配器可能需要性能優化

**優化方案**:
- 檢查整合點的瓶頸
- 優化數據傳遞和序列化
- 減少不必要的複製和轉換

**優先級**: 🟢 低（依使用情況）  
**預估時間**: 1-2 天

---

## 📊 優先級總結

| 項目 | 優先級 | 預估時間 | 狀態 |
|-----|--------|---------|------|
| 9.2 SitemapBuilder 並行處理 | 🟡 中 | 0.5-1 天 | 新增 |
| 9.3 JsonlLogger 自動修復 | 🟡 中 | 0.5 天 | 新增 |
| 9.6 定時器資源清理 | 🟡 中 | 0.5 天 | 新增 |
| 9.10 內存洩漏檢查 | 🟡 中 | 1-2 天 | 新增 |
| 9.11 測試覆蓋率 | 🟡 中 | 2-3 天 | 新增 |
| 9.4 Compactor 排序 | 🟢 低 | 0.5 天 | 新增 |
| 9.8 路由掃描器優化 | 🟢 低 | 1-2 天 | 新增 |
| 9.9 CLI 工具優化 | 🟢 低 | 1 天 | 新增 |
| 9.12 整合優化 | 🟢 低 | 1-2 天 | 新增 |

---

## ✅ 驗證清單

完成每個優化後，驗證：
- [ ] 性能測試顯示預期提升
- [ ] 所有現有測試通過
- [ ] 沒有引入新的內存洩漏
- [ ] 文檔已更新

---

## 📝 備註

這些優化項目是在深入程式碼審查後發現的。建議：

1. **先完成主要優化階段**（Phase 0-8）
2. **執行基準測試**，確認這些額外優化的必要性
3. **根據實際使用情況**決定是否實施

某些優化（如 9.4 Compactor 排序）可能只有在特定場景下才有意義，建議先通過基準測試確認。
