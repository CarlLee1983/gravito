# Phase 4: 驅動層優化

> **狀態**: 待執行  
> **預估時間**: 4-5 天  
> **依賴**: Phase 0 (基準測試), Phase 3 (批量優化)  
> **優先級**: 🔴 高

## 📋 目標

優化各個驅動的實現，提升性能、減少延遲、改善資源使用效率。

## 🎯 優化項目

### 1. DatabaseDriver 優化

#### 當前問題
- 單條 `pop()` 查詢效率低
- 沒有連接池管理
- `reserved_at` 超時處理可以優化

#### 優化方案

**批量 pop**:
```sql
-- 優化前：單條查詢
SELECT ... LIMIT 1 FOR UPDATE SKIP LOCKED

-- 優化後：批量查詢
SELECT ... LIMIT 10 FOR UPDATE SKIP LOCKED
```

**連接池優化**:
- 使用數據庫連接池
- 配置合理的連接數
- 連接復用

**索引優化**:
```sql
-- 確保有合適的索引
CREATE INDEX idx_jobs_queue_available_reserved 
ON jobs(queue, available_at, reserved_at);
```

**超時處理優化**:
- 使用數據庫級別的超時清理
- 定期清理過期 reserved 記錄

### 2. RedisDriver 優化

#### 當前問題
- 優先級隊列需要多次輪詢（`pop()` 檢查 4 個優先級，最多 4 次往返）
- 延遲隊列檢查效率低
- 沒有使用 Redis Pipeline
- **缺少 BLPOP 阻塞輪詢支持**

#### 優化方案

**Lua 腳本批量檢查優先級**:
```lua
-- 一次性檢查所有優先級隊列
local priorities = {'critical', 'high', nil, 'low'}
for i, priority in ipairs(priorities) do
  local key = getKey(queue, priority)
  local job = redis.call('RPOP', key)
  if job then
    return job
  end
end
return nil
```

**延遲隊列優化**:
- 使用 Redis Sorted Set 的 `ZRANGEBYSCORE` 批量獲取
- 減少 Redis 往返次數

**Pipeline 支持**:
- 批量操作使用 Pipeline
- 減少網絡延遲

**Group FIFO 優化**:
- 優化 Lua 腳本性能
- 減少腳本執行時間

**🆕 BLPOP 阻塞輪詢支持**:
```typescript
// 新增阻塞式 pop 方法
async popBlocking(queue: string, timeout: number = 0): Promise<SerializedJob | null> {
  // 對於支持 BLPOP 的驅動，使用阻塞等待
  // 減少空輪詢的 CPU 開銷
  const result = await this.client.blpop(this.getKey(queue), timeout)
  if (result) {
    return this.parsePayload(result[1])
  }
  return null
}
```

> **注意**: BLPOP 優化後需要在 Phase 8 Consumer 優化中整合使用

### 3. MemoryDriver 優化

#### 當前問題
- 簡單實現，但可以優化內存使用
- 沒有大小限制

#### 優化方案
- 添加可選的大小限制
- 優化內存使用（使用 TypedArray 等）
- 添加統計信息

### 4. 其他驅動優化

#### KafkaDriver
- 批量消費優化
- 消費組管理優化

#### SQSDriver
- 批量接收消息
- 長輪詢優化

#### RabbitMQDriver
- 批量確認
- 預取數量優化

## 📝 實施步驟

### Step 1: DatabaseDriver 優化

1. **實現批量 pop**
   - 修改 `pop()` 支持批量
   - 實現 `popMany()`
   - 測試驗證

2. **連接池集成**
   - 評估當前連接管理
   - 集成連接池（如需要）
   - 配置優化

3. **索引和查詢優化**
   - 分析查詢計劃
   - 優化索引
   - 查詢語句優化

### Step 2: RedisDriver 優化

1. **Lua 腳本優化**
   - 實現批量優先級檢查腳本
   - 優化延遲隊列檢查
   - 性能測試

2. **Pipeline 支持**
   - 實現批量操作的 Pipeline
   - 減少網絡往返
   - 測試驗證

3. **Group FIFO 優化**
   - 優化現有 Lua 腳本
   - 性能測試

### Step 3: 其他驅動優化

1. **KafkaDriver**
   - 批量消費實現
   - 消費組優化

2. **SQSDriver**
   - 批量接收實現
   - 長輪詢優化

3. **RabbitMQDriver**
   - 批量確認實現
   - 預取優化

## 📊 預期改善

- **DatabaseDriver**: 批量操作提升 30-50%
- **RedisDriver**: Lua 腳本優化提升 20-40%
- **整體驅動性能**: 提升 25-35%

## ⚠️ 注意事項

1. **向後相容性**: 保持現有 API 不變
2. **驅動特定**: 每個驅動的優化策略不同
3. **測試覆蓋**: 確保所有驅動都有充分測試

## 📈 量測指標與門檻

- **DatabaseDriver**: popMany 延遲 P95 降低 >= 20%
- **RedisDriver**: Lua/Pipeline 減少往返 >= 50%
- **BLPOP**: 空佇列 CPU 降幅 >= 40%

## 🧪 測試矩陣

- **功能**: 主要驅動（Redis/Database/Memory）完整回歸
- **性能**: Lua 腳本與 Pipeline 壓測
- **穩定性**: 阻塞輪詢長時間測試（>= 2 小時）

## 🔁 回滾與切換策略

- Lua / Pipeline / BLPOP 皆需可配置切換
- 若驅動優化導致延遲回歸，回退至原有 pop 邏輯

## 🧩 模板使用

- 指標報告模板：`appendices/metrics-report-template.md`
- 測試矩陣模板：`appendices/test-matrix-template.md`
- 回滾檢核表：`appendices/rollback-playbook.md`

## ✅ 完成標準

- [ ] DatabaseDriver 優化完成
- [ ] RedisDriver 優化完成
- [ ] 其他驅動優化完成（如適用）
- [ ] 性能提升驗證完成
- [ ] 測試覆蓋完整
- [ ] 文檔更新完成
