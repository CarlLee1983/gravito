# Commerce Satellite 架構說明 🏎️

## 1. 設計哲學
Commerce 衛星模組遵循 **「核心輕量、按需增壓」** 的原則。

### 自然進氣模式 (Standard Mode) - 預設
- **目標**: 極致的強一致性、低資源消耗。
- **技術**: `Atlas SQL Transaction` + `Optimistic Locking`。
- **適用**: 一般電商流程。

### 運動模式 (Sport Mode) - Stage 1 加速
- **目標**: 減少資料庫負擔，提升響應速度。
- **技術**: `Stasis Memory Cache` (元數據快取) + `Optimistic Locking`。
- **適用**: 活動促銷、中高流量。
- **優勢**: 減少 50% 以上的資料庫 `SELECT` 負載，且無需外部 Redis 依賴。

### 渦輪增壓模式 (Turbo Mode) - 選配
- **目標**: 千萬級流量秒殺、極致的吞吐量。
- **技術**: `Redis Lua Script` (虛擬庫存) + `Write-Behind` (非同步落庫) + `Stream` (消息隊列)。
- **適用**: 雙 11 搶購、高併發活動。

## 2. 原子性保證 (Atomicity)
我們透過以下 SQL 模式確保在任何模式下庫存都不會超賣：

```sql
UPDATE product_variants 
SET stock = stock - ?, version = version + 1 
WHERE id = ? AND version = ? AND stock >= ?
```

## 3. 調整項抽象 (Adjustment Abstraction)
為了支持行銷插件（Marketing Satellite），我們將「金額調整」抽象為 `Adjustment` 對象。
`Order` 聚合根會自動平衡 `subtotal + sum(adjustments) = total`。

## 4. 雲原生與自動擴展
- **無狀態 Pod**: 所有的狀態 (Order State) 均保證在資料庫或 Redis 中。
- **Web/Worker 分離**: 在 Turbo 模式下，接收請求的 Pod (Web) 與寫入資料庫的 Pod (Worker) 可以獨立自動擴展。

## 5. 冪等性 (Idempotency)
透過 `idempotency_key` 欄位與資料庫唯一索引，確保同一筆交易請求不論重試幾次，結果始終唯一。