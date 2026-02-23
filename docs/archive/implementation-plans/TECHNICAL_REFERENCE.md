# Gravito 核心技術參考指南 (歸檔)

本文件整合了核心框架改善期間產出的技術規範、實施指南與最佳實踐。

---

## 📦 1. ModelRepository 模式 (@gravito/atlas)

提供標準的數據存取層基類，實現 CRUD 職責分離。

### 核心功能
```typescript
class ProductRepository extends ModelRepository<Product> {
  protected modelClass = Product

  // 自訂查詢
  async findActive() {
    return this.findManyWhere('status', 'active')
  }

  // 複雜查詢
  async findByPriceRange(min: number, max: number) {
    return this.findByQuery(q => 
      q.where('price', '>=', min).where('price', '<=', max)
    )
  }
}
```

### 關鍵優勢
- **類型安全**: 透過泛型 `<T extends Model>` 提供完整推斷。
- **預防 N+1**: 支持 `.with()` 自動預加載關係。
- **軟刪除**: 內置 `restore()` 與 `forceDelete()` 支援。

---

## ⚡ 2. 事件聚合與去重 (Event Aggregation)

處理高頻事件 (如庫存更新) 的優化機制。

### 核心策略
- **智能去重**: 基於 `pattern` (例如 `user:id`) 在時間窗口內僅保留一個事件。
- **微批處理**: 支援「時間 + 大小」雙觸發模式 (例如每 50ms 或每 50 個事件提交一次)。
- **背壓感知**: 窗口大小會根據系統負載自動在 50ms - 200ms 間波動。

### 配置與使用
```typescript
await core.hooks.doActionAsync('stock:update', params, {
  aggregation: {
    enabled: true,
    pattern: (args) => `product:${args.id}`,
    windowMs: 100
  }
})
```

---

## 🛡️ 3. 背壓管理系統 (Backpressure Management)

保護系統免於過載崩潰。

### 四級狀態
- **NORMAL**: 標準處理。
- **WARNING (60%)**: 警告狀態，開始限制極低優先級事件。
- **CRITICAL (85%)**: 危急狀態，嚴格限制低優先級，加速聚合。
- **OVERFLOW (100%)**: 溢位狀態，啟動死信隊列 (DLQ) 路由。

### 決策邏輯
系統根據 `critical > high > normal > low` 優先級順序決定在壓力下丟棄哪些事件。

---

## 🧠 4. 進階快取與記憶體守護 (@gravito/cache)

### 智能預熱
- **HotProductTracker**: 自動追踪熱點數據。
- **PriorityCalculator**: 基於熱度、價格等權重矩陣計算預熱順序。

### 記憶體守護者 (Memory Monitor)
- **精準估算**: 監控 LRU 緩存實際佔用，超過 95% 時強制觸發驅逐。
- **一致性校驗**: 自動比對 L1 (本地) 與 L2 (Redis) 版本，發現數據漂移時自動同步。

---

## 🚀 5. 部署與運維最佳實務

### 性能導航 (Performance Dashboard)
- **P95 延遲應保持在 10ms 以下**。
- **TS 編譯應始終為 0 errors**。
- **單機壓力測試基線應達到 1,300+ ops/sec**。

---

## 🔗 歷史參考
- **實施背景**: [PROJECT_HISTORY.md](./PROJECT_HISTORY.md)
- **實測指標**: 參見各 Phase 結案文件
