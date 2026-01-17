# Phase 5: 持久化層優化

> **狀態**: 待執行  
> **預估時間**: 2-3 天  
> **依賴**: 無  
> **優先級**: 🟡 中

## 📋 目標

優化持久化層（Persistence）的寫入性能，通過批量寫入和緩衝機制減少 I/O 開銷。

## 🔍 當前問題

1. **單條寫入**: 每次 `archive()` 都是單獨的數據庫寫入
2. **同步阻塞**: 寫入操作可能阻塞主流程
3. **高頻場景**: 在高頻 Job 處理時，持久化成為瓶頸

## 🎯 優化策略

### 1. 批量寫入緩衝

**實現方案**:
```typescript
class BufferedPersistence implements PersistenceAdapter {
  private buffer: ArchiveEntry[] = []
  private bufferSize: number = 100
  private flushInterval: number = 1000 // ms
  private flushTimer?: NodeJS.Timeout

  async archive(...): Promise<void> {
    this.buffer.push({ queue, job, status })
    
    if (this.buffer.length >= this.bufferSize) {
      await this.flush()
    } else {
      this.scheduleFlush()
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    
    const entries = this.buffer.splice(0)
    await this.adapter.archiveMany(entries)
  }
}
```

### 2. 異步寫入隊列

**實現方案**:
- 使用內部隊列緩衝寫入請求
- 異步處理寫入，不阻塞主流程
- 支持背壓（backpressure）處理

### 3. 批量寫入接口

**新增方法**:
```typescript
interface PersistenceAdapter {
  // 現有方法
  archive(...): Promise<void>
  
  // 新增批量方法
  archiveMany(entries: ArchiveEntry[]): Promise<void>
}
```

### 4. 可配置選項

**配置選項**:
```typescript
persistence: {
  adapter: new SQLitePersistence(...),
  bufferSize: 100,           // 緩衝大小
  flushInterval: 1000,       // 刷新間隔（ms）
  async: true,               // 是否異步寫入
  continueOnError: true,     // 錯誤時是否繼續
}
```

## 📝 實施步驟

### Step 1: 實現批量寫入接口

1. **擴展 PersistenceAdapter 接口**
   - 添加 `archiveMany()` 方法
   - 定義 `ArchiveEntry` 類型

2. **實現 SQLitePersistence.archiveMany()**
   - 使用批量 INSERT
   - 事務處理
   - 錯誤處理

3. **實現 MySQLPersistence.archiveMany()**
   - 類似 SQLite 實現
   - 考慮 MySQL 特定優化

### Step 2: 實現緩衝機制

1. **創建 BufferedPersistence 包裝器**
   - 實現緩衝邏輯
   - 定時刷新機制
   - 錯誤處理

2. **集成到 QueueManager**
   - 可選使用緩衝包裝器
   - 配置選項

### Step 3: 優化現有實現

1. **SQLitePersistence 優化**
   - 批量 INSERT 語句
   - 索引優化
   - 查詢優化

2. **MySQLPersistence 優化**
   - 批量 INSERT 語句
   - 連接池優化

## 📊 預期改善

- **寫入性能**: 批量寫入提升 40-60%
- **I/O 開銷**: 減少 50-70%
- **主流程影響**: 異步寫入減少阻塞

## ⚠️ 注意事項

1. **數據一致性**: 緩衝寫入可能導致數據延遲，需要權衡
2. **錯誤處理**: 批量寫入時需要細緻的錯誤處理
3. **資源清理**: 應用關閉時需要刷新緩衝

## 📈 量測指標與門檻

- **寫入延遲**: `archive()` P95 延遲下降 >= 30%
- **I/O 次數**: 批量寫入使 DB I/O 次數下降 >= 50%
- **資料延遲**: 緩衝寫入延遲不得超過設定的 flushInterval

## 🧪 測試矩陣

- **一致性**: 緩衝關閉/啟用皆可正確寫入
- **關閉流程**: 程式結束時緩衝必須 flush
- **故障注入**: DB 失敗/超時時的錯誤處理

## 🔁 回滾與切換策略

- 以配置切換緩衝機制（可立即回到單條寫入）
- 發現延遲或一致性問題時停用 async 寫入

## 🧩 模板使用

- 指標報告模板：`appendices/metrics-report-template.md`
- 測試矩陣模板：`appendices/test-matrix-template.md`
- 回滾檢核表：`appendices/rollback-playbook.md`

## ✅ 完成標準

- [ ] 批量寫入接口實現完成
- [ ] 緩衝機制實現完成
- [ ] 性能提升驗證完成
- [ ] 錯誤處理完善
- [ ] 文檔更新完成
