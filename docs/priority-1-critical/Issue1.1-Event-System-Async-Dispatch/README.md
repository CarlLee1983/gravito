# Issue 1.1: Event System - Core Async Dispatch

**發現時間**：Week 3-4
**嚴重性**：⭐⭐⭐⭐⭐ Critical
**影響度**：高併發訂單流程延遲
**範圍**：核心異步派發 + 優先級隊列

---

## 📋 問題概述

當前 Event System 採用**同步派發**模式，在高頻事件派發時會出現性能瓶頸。

### 現象

```typescript
// 當前問題：同步事件派發導致堆積延遲
await core.hooks.doAction('order:created', { orderId: '123' })
// 上述操作會同步執行所有監聽器，造成延遲累積
```

**關鍵數據**：
- 高頻事件派發時，P99 延遲 **> 800ms** ❌
- 事件監聽器性能瓶頸**累積** ❌
- **無優先級控制**，重要事件被延遲 ❌
- **無可觀測性**，無法診斷瓶頸來源 ❌

### 根本原因

| 原因 | 現狀 | 改善方向 |
|------|------|---------|
| 派發模式 | 同步派發 | 異步派發 |
| 隊列管理 | 無隊列緩衝 | 優先級隊列 |
| 事件優先級 | 無優先級機制 | 分級處理 |
| 可觀測性 | 無監控指標 | 內置 OpenTelemetry |

---

## 💡 臨時解決方案

```typescript
// 使用 @gravito/stream 隊列替代 Event System
const job = new OrderCreatedJob({ orderId })
await queueManager.push(job.onQueue('orders'))
// 優勢：異步、可重試、可監控
// 劣勢：需要手動創建 Job 類，開發體驗不佳
```

**侷限**：
- 需要手動創建 Job 類
- 開發體驗不佳
- 無法利用現有 Event System

---

## 🎯 改進目標

| 指標 | 當前 | 目標 | 提升 |
|------|------|------|------|
| P99 延遲 | 800ms | 400ms | ⬇ 50% |
| 吞吐量 | 1000 events/s | 3000-5000 events/s | ⬆ 3-5x |
| CPU 利用率 | 40% | 70% | ⬆ 30% |
| 可觀測性 | 無 | 完整追蹤 + Prometheus | ✅ 新增 |

---

## 📂 相關文檔

- [Phase 1: 核心異步派發機制](./Phase1-核心异步派发.md)
- [Phase 2: 可觀測性整合](./Phase2-可观测性整合.md)
- [Phase 3: 向後兼容性測試](./Phase3-向后兼容性测试.md)

---

## 📊 實施時程

```
Week 1-2: Phase 1 - 核心異步派發
  ├─ 實現 doActionAsync + EventPriorityQueue
  ├─ Feature Flag: asyncByDefault
  └─ 單元測試 (80%+ 覆蓋率)

Week 3-4: Phase 2 - 可觀測性整合
  ├─ OpenTelemetry 集成
  ├─ Prometheus 指標導出
  ├─ Grafana 監控面板
  └─ 性能告警規則

Week 5-6: Phase 3 - 向後兼容性測試
  ├─ 兼容性測試套件
  ├─ 自動檢測機制
  ├─ 遷移警告日誌
  ├─ 遷移指南文檔
  └─ 示例項目驗證
```

---

## ✅ 預期收益

### 性能提升
- ✅ P99 延遲：**800ms → 400ms**（降低 50%）
- ✅ 事件派發吞吐：**1000 → 3000-5000 events/s**（提升 3-5x）
- ✅ CPU 利用率：**40% → 70%**（並行處理）

### 可觀測性
- ✅ 端到端追蹤：可視化完整調用鏈路
- ✅ 性能瓶頸識別：自動識別慢監聽器
- ✅ 實時告警：P99 延遲 > 800ms 自動通知

### 開發體驗
- ✅ 向後兼容：現有代碼無需修改
- ✅ 漸進式遷移：Feature Flag 控制切換
- ✅ 完整文檔：遷移指南 + 最佳實踐

---

## 🚨 風險與緩解

| 風險 | 嚴重性 | 緩解措施 |
|------|--------|----------|
| 破壞現有功能 | High | Feature Flag + 完整兼容性測試 |
| 性能回退 | Medium | Benchmark 基準測試 + A/B 測試 |
| 監控開銷 | Low | 採樣率控制（預設 10%） |
| 學習曲線 | Low | 詳細文檔 + 示例代碼 |

---

## 🔗 相關 Issue

- [Issue 1.2: Event System - Reliability & Scalability](../Issue1.2-事件系统可靠性/README.md)（前置條件：本 Issue 完成）

---

**最後更新**：2026-02-02
