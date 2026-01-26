# Phase 3: 批量操作優化

> **狀態**: ✅ 已完成
> **預估時間**: 3-4 天  
> **依賴**: Phase 0 (基準測試), Phase 1 (類型安全)  
> **優先級**: 🔴 高

## 📋 目標

優化批量操作性能，提升 `pushMany()` 和批量消費的效率，減少網絡往返和 I/O 開銷。

## 🔍 當前問題

1. **pushMany 效率**: 雖然已有實現，但批次大小和錯誤處理可以優化
2. **Redis popMany 效能問題**: 🔴 **當前實現是同步循環，需要重構為 Pipeline/Lua**
3. **序列化開銷**: 批量操作時序列化可以優化

### 代碼審查發現

**Redis `popMany` 當前實現問題** (`RedisDriver.ts:363-377`):
```typescript
// ⚠️ 問題：同步循環，每次 rpop 都是一次網絡往返
async popMany(queue: string, count: number): Promise<SerializedJob[]> {
  for (let i = 0; i < count; i++) {
    const payload = await this.client.rpop(key)  // N 次網絡往返
    // ...
  }
}
```

**應改為 Lua 腳本或 Pipeline**：
```typescript
// ✅ 優化：單次網絡往返
async popMany(queue: string, count: number): Promise<SerializedJob[]> {
  // 方案 1: Lua 腳本
  const result = await this.client.eval(POP_MANY_SCRIPT, 1, key, count)
  
  // 方案 2: Pipeline
  const pipeline = this.client.pipeline()
  for (let i = 0; i < count; i++) {
    pipeline.rpop(key)
  }
  const results = await pipeline.exec()
}
```

## 🎯 優化策略

### 1. 優化 pushMany 實現

**當前實現問題**:
- 按 connection:queue 分組，但沒有優化批次大小
- 錯誤處理不夠細緻（一個失敗影響整批）
- 沒有並發推送選項

**優化方案**:
```typescript
async pushMany<T extends Job & Queueable>(
  jobs: T[],
  options?: {
    batchSize?: number      // 批次大小（默認 100）
    concurrency?: number     // 並發批次數（默認 1）
    continueOnError?: boolean // 錯誤時是否繼續（默認 true）
  }
): Promise<{ success: number; failed: number; errors: Error[] }>
```

### 2. 實現批量 pop

**新增 API**:
```typescript
async popMany(
  queue: string,
  count: number = 10,
  connection?: string
): Promise<Job[]>
```

**實施要點**:
- DatabaseDriver: 使用 `LIMIT` 和批量 `UPDATE`
- RedisDriver: 使用 `RPOP` 多次或 `RPOPLPUSH` 批量
- 其他驅動: 根據驅動特性實現

### 3. 批量序列化優化

**優化方案**:
- 預先序列化所有 Job，減少重複操作
- 使用對象池重用序列化器
- 批量 JSON.stringify（如果使用 JSON 序列化）

## 📝 實施步驟

### Step 1: 優化 pushMany

1. **分析當前實現**
   - 識別性能瓶頸
   - 測量不同批次大小的性能

2. **實現優化版本**
   - 添加批次大小控制
   - 實現錯誤隔離（一個失敗不影響其他）
   - 添加並發選項（可選）

3. **測試驗證**
   - 性能對比測試
   - 錯誤處理測試

### Step 2: 實現 popMany

1. **設計 API**
   - 定義 `popMany()` 接口
   - 確定批量大小限制

2. **實現各驅動支持**
   - DatabaseDriver: 批量 SELECT + UPDATE
   - RedisDriver: 批量 RPOP 或 Lua 腳本
   - MemoryDriver: 批量 shift
   - 其他驅動: 根據特性實現

3. **測試驗證**
   - 功能測試
   - 性能測試
   - 邊界條件測試

### Step 3: Consumer 批量處理

1. **修改 Consumer**
   - 支持批量 pop
   - 批量處理 Job
   - 錯誤處理優化

2. **配置選項**
   ```typescript
   consumerOptions: {
     batchSize: 10,        // 批量消費大小
     batchTimeout: 100,    // 批量超時（ms）
   }
   ```

## 📊 預期改善

- **pushMany 性能**: 提升 20-30%（通過批次優化）
- **消費性能**: 提升 30-50%（通過批量 pop）
- **網絡往返**: 減少 50-70%（批量操作）

## ⚠️ 注意事項

1. **向後相容性**: `pushMany` 保持現有 API，僅添加可選參數
2. **錯誤處理**: 批量操作時需要細緻的錯誤處理
3. **事務性**: 某些驅動（如 Database）需要考慮事務

## 📈 量測指標與門檻

- **吞吐量**: `pushMany/popMany` 提升 >= 20%
- **延遲**: 批量 pop 的 P95 延遲不得回歸 >10%
- **Redis 往返**: popMany 操作網路往返下降 >= 50%

## 🧪 測試矩陣

- **功能**: 批量大小 1/10/100 的一致性
- **錯誤隔離**: 部分失敗不影響其他 Job
- **邊界**: 空佇列、接近批量上限、極端並發

## 🔁 回滾與切換策略

- `popMany` 以 Feature Flag 或配置切換
- Consumer 批量消費可退回單條 `pop()`

## 🧩 模板使用

- 指標報告模板：`appendices/metrics-report-template.md`
- 測試矩陣模板：`appendices/test-matrix-template.md`
- 回滾檢核表：`appendices/rollback-playbook.md`

## ✅ 完成標準

- [x] pushMany 優化完成並測試通過
- [x] popMany 實現完成並測試通過
- [x] Consumer 批量處理支持完成
- [x] 性能提升驗證完成
- [x] 文檔更新完成
