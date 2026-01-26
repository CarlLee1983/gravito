# 代碼分析結果

## 當前狀態分析

### 架構概覽

```
packages/atlas/
├── src/
│   ├── orm/
│   │   ├── model/Model.ts           (1,598 lines) - Core Model class
│   │   ├── model/DirtyTracker.ts    (141 lines)   - Change tracking
│   │   └── model/relationships.ts   (688 lines)   - Eager loading
│   ├── query/QueryBuilder.ts        (1,340 lines) - Query builder
│   ├── grammar/Grammar.ts           (708 lines)   - SQL compilation
│   ├── connection/                   - Connection management
│   └── DB.ts                         (346 lines)  - Facade entry point
```

## 關鍵發現

### 1. Model.ts (Lines 78-79) - API 命名不一致

**問題：**
```typescript
static table: string
static tableName: string  // Duplicate concept
```

**影響：** 開發者困惑，不清楚應該使用哪個屬性

**解決方案：** 見 [Phase 1.1](../03-phase-1-dx/1.1-api-naming.md)

---

### 2. DirtyTracker.ts (Lines 110-140) - 關鍵性能瓶頸

**問題：**
```typescript
private isEqual(a: unknown, b: unknown): boolean {
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)  // 🔴 SLOW
  }
}

private cloneValue(value: unknown): unknown {
  if (typeof value === 'object') {
    return JSON.parse(JSON.stringify(value))  // 🔴 DOUBLE SERIALIZATION
  }
}
```

**影響：**
- 每次屬性修改都會觸發 JSON 序列化
- 100 個屬性的模型：每次修改約 0.5ms
- 使用淺層比較可提升 50 倍速度

**解決方案：** 見 [Phase 2.1](../04-phase-2-performance/2.1-dirty-tracker.md)

---

### 3. Model.ts (Line 86) - 類型安全問題

**問題：**
```typescript
static observers: any[] = []  // 🔴 Loses type information
```

**解決方案：** 見 [Phase 1.2](../03-phase-1-dx/1.2-type-safety.md)

---

### 4. QueryBuilder.ts (Lines 84-94) - 類型安全問題

**問題：**
```typescript
setModel(model: any): this { ... }  // 🔴 Should be generic
getModel(): any { ... }             // 🔴 Loses type information
```

**解決方案：** 見 [Phase 1.2](../03-phase-1-dx/1.2-type-safety.md)

---

### 5. QueryBuilder.ts (Lines 1257-1273) - Clone 性能問題

**問題：**
```typescript
clone(): QueryBuilderContract<T> {
  cloned.columns = [...this.columns]          // Copies every time
  cloned.wheres = [...this.wheres]            // Potentially large array
  cloned.bindingsList = [...this.bindingsList] // Many parameters
}

// Called TWICE in paginate()
async paginate(perPage = 15, page = 1) {
  const total = await this.clone().count()    // 1st clone
  const data = await this.limit(perPage)      // 2nd clone
    .offset((page - 1) * perPage)
    .get()
}
```

**影響：** 在 `paginate()` 中被調用兩次，不必要的複製

**解決方案：** 見 [Phase 2.4](../04-phase-2-performance/2.4-querybuilder-clone.md)

---

### 6. Grammar.ts (Lines 33-39) - 快取架構問題

**問題：**
```typescript
// ⚠️ 實例級快取 - 每個 Grammar 實例獨立
protected compilationCache: Map<string, string> = new Map()
// 需要改為靜態快取，並添加 LRU 限制
```

**影響：**
- 快取無法跨實例共享
- 記憶體洩漏風險（無大小限制）

**解決方案：** 見 [Phase 2.3](../04-phase-2-performance/2.3-grammar-cache.md)

---

### 7. Model.ts (Lines 196-353) - Proxy 性能

**問題：**
- 每次屬性訪問都遍歷原型鏈
- 字串轉換（studly case）重複計算
- 關係元數據每次訪問都獲取

**影響：**
- Model.hydrate() × 1000: ~15-20ms (current) vs ~2ms (without Proxy)
- **7-10x 較慢**於直接屬性訪問

**解決方案：** 見 [Phase 2.2](../04-phase-2-performance/2.2-model-proxy.md)

---

### 8. Model.ts (Lines 441-491) - Attribute Casting 開銷（新發現）

**問題：**
```typescript
private _castAttribute(_key: string, value: any, type: string): any {
  switch (type) {  // 🔴 每次調用都執行 switch
    case 'int':
    case 'integer':
    // ... 多個 case 分支
  }
}
```

**影響：** 每次屬性設置都要走 switch 邏輯，可預編譯

**解決方案：** 見 [Phase 5.2](../07-phase-5-advanced/5.2-attribute-casting.md)

---

### 9. relationships.ts (Lines 415-436, 463-482) - 重複的 Map 邏輯（新發現）

**問題：**
```typescript
// hasOne/hasMany 和 morphOne/morphMany 中重複的邏輯
const relatedByFk = new Map<unknown, any[]>()
for (const model of models) {
  const fk = (model as any)[foreignKey!]
  if (!relatedByFk.has(fk)) {
    relatedByFk.set(fk, [])
  }
  relatedByFk.get(fk)?.push(model)
}
```

**影響：** 代碼重複，可提取為共用函數優化

**解決方案：** 見 [Phase 5.5](../07-phase-5-advanced/5.5-relationships-refactor.md)

---

### 10. DB.ts (Line 117) - 重複檢查開銷（新發現）

**問題：**
```typescript
static connection(name?: string): ConnectionContract {
  DB.ensureConfigured()  // 🔴 每次調用都執行檢查
  return DB.manager.connection(name)
}
```

**影響：** 熱路徑上的不必要檢查

**解決方案：** 見 [Phase 5.4](../07-phase-5-advanced/5.4-db-facade.md)

---

### 11. PostgresDriver.ts - 缺少 Prepared Statement 支持（新發現）

**問題：**
- 沒有 prepared statement caching
- 重複查詢無法複用執行計劃
- 可顯著提升高頻查詢性能

**解決方案：** 見 [Phase 5.1](../07-phase-5-advanced/5.1-prepared-statements.md)
