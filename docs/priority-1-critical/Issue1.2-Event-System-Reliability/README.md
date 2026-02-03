# Issue 1.2: Event System - Reliability & Scalability

**發現時間**：Week 4-5
**嚴重性**：⭐⭐⭐⭐ High
**影響度**：系統可靠性與容錯能力
**範圍**：DLQ + Circuit Breaker + Backpressure
**前置條件**：Issue 1.1 完成

---

## 📋 問題概述

當前 Event System 缺失關鍵的可靠性機制，在高併發和故障場景下會出現問題。

### 現象

```
秒殺活動 10000 QPS：
1. order:created 事件生產速度 > 消費速度
2. 隊列深度無限增長 → 記憶體耗盡 → OOM
3. 某個監聽器（analytics）失敗 → 無重試 → 數據丟失
4. 支付服務 Circuit Open → 所有訂單失敗
```

**關鍵缺失**：
- ❌ 無 Dead Letter Queue（重試失敗的事件無處理）
- ❌ 無 Circuit Breaker（監聽器失敗級聯影響）
- ❌ 無 Backpressure（高峰期隊列無限增長）
- ❌ 無資料一致性保證（事件順序混亂）
- ❌ 無冪等性支持（事件重複處理）

---

## 💡 改進方向

### 1. Dead Letter Queue (DLQ)
重試失敗的事件進入 DLQ，支持手動或自動重新入隊

### 2. Circuit Breaker
監聽器級別的熔斷，隔離故障，防止級聯

### 3. Backpressure
隊列深度超過閾值時，啟動背壓機制拒絕新事件

### 4. 資料一致性
分區順序保證 + 冪等性支持，確保可靠性

### 5. Bull Queue 整合
使用現有的 @gravito/stream，持久化事件隊列

---

## 📊 關鍵決策點

基於 **flash-sale-fullstack** 項目的分析：

### 決策 1: 事件類型與遷移優先級

**13 個事件類型，3 阶段遷移**：

| 類別 | 事件 | 優先級 | 遷移階段 |
|------|------|--------|---------|
| 訂單流程 | `order:created` | **High** | Phase 2 |
| | `order:ready_for_payment` | **High** | Phase 2 |
| | `order:lock_failed` | Normal | Phase 1 |
| | `order:confirmed` | Normal | Phase 2 |
| | `order:confirm_permanent_failure` | **High** | Phase 3 |
| 庫存流程 | `order:deduct_failed` | Normal | Phase 1 |
| | `inventory:released` | Low | Phase 1 |
| | `inventory:release_failed` | Normal | Phase 1 |
| 支付流程 | `payment:succeeded` | **High** | Phase 2 |

### 決策 2: 順序保證策略

**選擇：Partition Ordering**

```
訂單生命週期（必須按順序）：
1. order:created
   ↓
2. order:ready_for_payment
   ↓
3. payment:succeeded
   ↓
4. order:confirmed

推薦：按 orderId 分區，相同訂單保證順序，不同訂單並行
```

### 決策 3: Delivery Semantics

**選擇：At-least-once + 冪等性**

```
優勢：
✅ 事件至少被處理一次
✅ 可能重複處理（需要冪等性）
✅ 性能好，實現簡單

目標丟失率：0.01%（DLQ + 重試 3 次）
```

### 決策 4: Bull Queue 部署

**現狀：已部署**

```
✅ Redis: 已部署（用於 Cache + Queue）
✅ Bull Queue: 已部署（@gravito/stream）
✅ Worker: 已部署（處理 Job）
⚠️ Bull Board UI: 未部署（需要添加）

Phase 4 可立即開始！
```

### 決策 5: 多區域部署

**短期不需要，長期需要**

```
Phase 1-2：單 Redis Lock（簡單可靠）
Phase 3：Redis Sentinel（高可用）
Phase 4+：Redlock（多區域）
```

---

## 🎯 改進目標

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| 事件丟失率 | 5% | 0.01% | ⬇ 99.8% |
| 級聯故障率 | 100% | 0% | 完全隔離 |
| OOM 風險 | High | None | 消除 |
| 峰值吞吐 | 1000 e/s | 10000+ e/s | ⬆ 10x |
| 恢復時間 | > 1h | < 5m | ⬇ 自動恢復 |

---

## 📂 相關文檔

- [Phase 1: Dead Letter Queue + 重試機制](./Phase1-DLQ与重试.md)
- [Phase 2: Circuit Breaker 熔斷器](./Phase2-熔断器.md)
- [Phase 3: 背壓機制](./Phase3-背压机制.md)
- [Phase 4: Bull Queue 整合](./Phase4-BullQueue整合.md)

---

## 📊 實施時程

```
Week 7-8:   Phase 1 - DLQ + Retry
  ├─ event_dlq 資料表
  ├─ RetryPolicy 邏輯
  └─ DeadLetterQueueManager

Week 9-10:  Phase 2 - Circuit Breaker
  ├─ @gravito/stasis 整合
  ├─ 監聽器級別熔斷
  └─ 狀態監控 CLI

Week 11-12: Phase 3 - Backpressure
  ├─ QueueConfig + BackpressureManager
  ├─ 記憶體監控
  └─ 拒絕策略

Week 13-14: Phase 4 - Bull Queue
  ├─ SystemEventJob 創建
  ├─ StreamEventBackend 實現
  └─ Bull Board UI
```

---

## ✅ 預期收益

### 可靠性
- ✅ 事件丟失率：**5% → 0.01%**（DLQ 保障）
- ✅ 級聯故障：**100% → 0%**（Circuit Breaker 隔離）
- ✅ OOM 風險：**High → None**（Backpressure 控制）

### 擴展性
- ✅ 峰值處理：**10000 events/s**（Bull Queue 分佈式）
- ✅ 水平擴展：支持多 Worker 並行
- ✅ 彈性伸縮：根據隊列深度自動調整

### 可運維性
- ✅ DLQ 管理：CLI 工具 + UI 界面
- ✅ Circuit Status：實時狀態監控
- ✅ Backpressure Alert：自動告警

---

## 🚨 風險與緩解

| 風險 | 嚴重性 | 緩解措施 |
|------|--------|----------|
| 數據遷移複雜 | High | 迴滾計劃 + 階段遷移 |
| 性能回退 | Medium | 性能基準測試 + A/B 測試 |
| 複雜度增加 | Medium | 完整文檔 + 示例代碼 |
| 依賴包升級 | Low | 版本兼容性檢查 |

---

## 🔗 相關 Issue

- [Issue 1.1: Event System - Core Async Dispatch](../Issue1.1-事件系统异步派发/README.md)（前置依賴）
- [Issue 1.3: 數據庫連接池管理](../Issue1.3-连接池管理.md)
- [Issue 1.4: 分佈式鎖支持](../Issue1.4-分布式锁.md)

---

**最後更新**：2026-02-02
