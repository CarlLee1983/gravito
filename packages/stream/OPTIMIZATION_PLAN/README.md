# @gravito/stream 優化執行計劃

> **版本**: 1.2.0  
> **日期**: 2026-01-17  
> **目標**: 提升 Stream 隊列系統整體性能 30-50%，優化內存使用，改善類型安全，增強大規模並發處理能力

---

## 📋 執行摘要

| 優化項目 | 當前狀態 | 目標狀態 | 預期提升 | 備註 |
|---------|---------|---------|---------|------|
| 類型安全 | ⚠️ 98 個 any | ✅ 強類型定義 | 開發體驗 | 🔴 核心優化項目 |
| 序列化性能 | ⚠️ JSON.stringify | ✅ 優化序列化策略 | 10-20% | 可選 MessagePack |
| 批量操作 | ⚠️ pushMany 已有，popMany 需優化 | ✅ Pipeline/Lua 批量 | 20-30% | Redis popMany 需重構 |
| 輪詢效率 | ✅ 部分已優化 | ✅ 自適應 + BLPOP | 15-25% | Consumer 已有立即處理 |
| 數據庫驅動 | ⚠️ 單條查詢 | ✅ 批量查詢優化 | 30-50% | 批量 pop、連接池 |
| Redis 驅動 | ⚠️ popMany 同步循環 | ✅ Lua 腳本批量 | 20-40% | 減少網絡往返 |
| 持久化層 | ⚠️ 單條寫入 | ✅ 批量寫入緩衝 | 40-60% | 減少 I/O 開銷 |
| 並發處理 | ⚠️ 單線程處理 | ✅ 漸進式並發 | 40-70% | **三階段漸進方案** |
| 內存優化 | ⚠️ 無緩存策略 | ✅ 對象池/緩存 | 20-30% | 減少 GC 壓力 |
| 錯誤處理 | ✅ 已有指數退避 | ✅ 優化重試策略 | 穩定性 | Consumer 已實現 |

**預期整體提升**: 吞吐量提升 30-50%，內存使用減少 20-30%，類型安全 100% 覆蓋

> ⚠️ **重要說明**: 預期提升數值為保守估計，實際效果需以 Phase 0 基準測試結果為準

---

## ✅ 審查評估與補充（新增）

以下為本計劃已涵蓋的重點與仍需補強的缺口，補強項目已整理為可落地的補充清單。

### 已涵蓋重點

- 性能瓶頸定位（popMany、優先級輪詢、持久化單寫入）
- 風險分級（並發拆階段，避免一次性高風險變更）
- 關鍵路徑與階段化時程（Phase 0/1 可平行）
- 向後相容性原則（API 不變、內部實作優化）

### 主要缺口與補充清單

1. **觀測性與 SLO**
   - 建議補上：吞吐量、延遲（P50/P95/P99）、失敗率、重試率、佇列深度、並發度的 SLI/SLO
   - 每個 Phase 必須產出前後指標對比，作為「是否可進入下一階段」門檻

2. **基準測試可重現性**
   - Phase 0 基準測試需補「固定版本」、「固定資料集」、「固定硬體/Redis 配置」
   - 建議新增「測試腳本鎖定依賴版本」與「測試結果輸出格式」要求

3. **發布與回滾策略**
   - 建議每個高風險 Phase 具備 Feature Flag（Lua / Pipeline / BLPOP / 並發模式可切換）
   - 需定義回滾條件與回滾流程（性能劣化 > X%、錯誤率 > Y%）

4. **一致性與語義保證**
   - 需明確定義隊列語義：至少一次（at-least-once）、順序保證（Group FIFO）
   - 對並發引入的競態風險需具體列出處理策略（鎖、分流、重試策略）

5. **容量與成本評估**
   - Lua / Pipeline 方案的 Redis 資源影響與成本預估（CPU、網路、記憶體）
   - 建議補上「峰值吞吐量 vs 延遲」的折衷說明

6. **測試範圍與準入條件**
   - 除單元測試外，應有：壓測、長時間 soak test、故障注入測試（Redis 超時/斷線）
   - 新增「Phase 完成準入條件」：性能 + 正確性 + 回歸 + 相容性

7. **安全與風險控制**
   - Lua 腳本需驗證輸入長度與錯誤處理，避免影響 Redis 主循環
   - 大量 payload 序列化可能導致 CPU 峰值，應設大小與時間限制

> ✅ **建議新增一個「Phase 完成門檻」章節**（下方已補）

---

## 🗂️ 計劃結構

本計劃已按 Phase 拆分到以下資料夾，每個 Phase 都有獨立的 README：

### 核心優化階段

- **[00-baseline/](./00-baseline/README.md)** - 基準測試與分析（與 Phase 1 可平行）
- **[01-type-safety/](./01-type-safety/README.md)** - 類型安全優化 🔴 **核心**
- **[02-serialization-optimization/](./02-serialization-optimization/README.md)** - 序列化性能優化
- **[03-batch-optimization/](./03-batch-optimization/README.md)** - 批量操作優化（含 Redis popMany 重構）
- **[04-driver-optimization/](./04-driver-optimization/README.md)** - 驅動層優化（含 BLPOP 支持）
- **[05-persistence-optimization/](./05-persistence-optimization/README.md)** - 持久化層優化

### 次要優化階段

- **[06-concurrency-optimization/](./06-concurrency-optimization/README.md)** - 並發處理優化（漸進式三階段方案）
- **[07-memory-optimization/](./07-memory-optimization/README.md)** - 內存優化（根據 Phase 0 決定）
- **[08-consumer-optimization/](./08-consumer-optimization/README.md)** - Consumer 輪詢優化（部分已完成）
- **[09-dx-optimization/](./09-dx-optimization/README.md)** - 開發者體驗（DX）優化

### 附錄

- **[appendices/](./appendices/)** - 配置類型定義、文件清單等

---

## 🎯 實施優先級（修訂版）

| 順序 | Phase | 內容 | 優先級 | 預估時間 | 依賴 | 狀態 |
|-----|-------|------|--------|---------|------|------|
| 1a | [00-baseline](./00-baseline/) | 基準測試 | 🔴 高 | 1 天 | 無 | ✅ 已完成 |
| 1b | [01-type-safety](./01-type-safety/) | 類型安全優化 | 🔴 高 | 4-5 天 | 無 | ✅ 已完成 |
| 1c | [02-serialization-optimization](./02-serialization-optimization/) | 序列化優化 | 🟢 低 | 2-3 天 | 無 | ✅ 已完成 |
| 2 | [03-batch-optimization](./03-batch-optimization/) | 批量操作優化 | 🔴 高 | 3-4 天 | 1a, 1b | ✅ 已完成 |
| 3 | [04-driver-optimization](./04-driver-optimization/) | 驅動層優化 | 🔴 高 | 4-5 天 | 2 | ✅ 已完成 |
| 4 | [08-consumer-optimization](./08-consumer-optimization/) | Consumer 優化 | 🟡 中 | 1-2 天 | 3 | 整合 popMany + BLPOP |
| 5 | [05-persistence-optimization](./05-persistence-optimization/) | 持久化層優化 | 🟡 中 | 2-3 天 | 1b | |
| 6 | [06-concurrency-optimization](./06-concurrency-optimization/) | 並發處理優化 | 🟡 中 | 3-5 天 | 4 | 漸進式：6A+6B |
| 1c | [02-serialization-optimization](./02-serialization-optimization/) | 序列化優化 | 🟢 低 | 2-3 天 | 無 | ✅ 已完成 |
| 8 | [07-memory-optimization](./07-memory-optimization/) | 內存優化 | 🟢 低 | 1-2 天 | 1a | 視 Phase 0 結果 |
| 9 | [09-dx-optimization](./09-dx-optimization/) | DX 優化 | 🟢 低 | 1-2 天 | 無 | ✅ 已完成 |

> **修訂說明**: 
> - Phase 0 和 Phase 1 可以**平行執行**，節省 2-3 天
> - Phase 1 時間上調至 4-5 天，因類型定義需仔細設計
> - Phase 3 新增 Redis `popMany` Pipeline/Lua 重構
> - Phase 4 新增 BLPOP 阻塞輪詢支持
> - Phase 8 調整為在 Phase 4 之後，整合驅動優化成果
> - Phase 6 並發優化風險較高，時間上調並加註警告

---

## 📊 依賴關係圖（修訂版）

```
┌─────────────────────────────────────────────────────────────────┐
│                        可平行執行區塊                            │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │ Phase 0          │      │ Phase 1          │                │
│  │ (基準測試)        │      │ (類型安全優化)    │                │
│  │ 2-3 天           │      │ 4-5 天           │                │
│  └────────┬─────────┘      └────────┬─────────┘                │
└───────────┼──────────────────────────┼──────────────────────────┘
            │                          │
            ▼                          ▼
    Phase 7 (內存優化)         Phase 3 (批量優化)
    [可選，視結果]              3-4 天，含 Redis popMany
                                       │
                                       ▼
                               Phase 4 (驅動優化)
                               4-5 天，含 BLPOP
                                       │
            ┌──────────────────────────┼──────────────────┐
            ▼                          ▼                  ▼
    Phase 5 (持久化)           Phase 8 (Consumer)   Phase 6 (並發)
    2-3 天                     1-2 天                3-5 天
                               整合 popMany/BLPOP    漸進式 6A+6B

獨立優化（可隨時執行）:
├── Phase 2 (序列化優化) ← 可選，依賴 Phase 1
└── Phase 9 (DX 優化) ← 文檔和工具
```

> **關鍵路徑**: Phase 1 → Phase 3 → Phase 4 → Phase 8 → Phase 6  
> **預估關鍵路徑時間**: 16-20 天

---

## ⏱️ 預期時間表（修訂版）

| 階段 | 包含 Phase | 預估時間 | 累計時間 | 備註 |
|-----|-----------|---------|---------|------|
| 階段 1: 基礎設施 | 0 + 1（平行） | 4-5 天 | 4-5 天 | 基準測試與類型安全同步進行 |
| 階段 2: 批量與驅動 | 3, 4 | 7-9 天 | 11-14 天 | 核心性能優化 + BLPOP |
| 階段 3: Consumer + 持久化 | 5, 8 | 3-5 天 | 14-19 天 | I/O、輪詢、批量整合 |
| 階段 4: 並發優化 | 6 (6A+6B) | 3-5 天 | 17-24 天 | 漸進式方案 |
| 階段 5: 可選優化 | 2, 7, 9 | 4-7 天 | 22-31 天 | 根據需求決定 |
| 階段 6: 收尾測試 | 測試、文檔、發布 | 3-5 天 | 25-36 天 | 完整測試與文檔 |

**總預估時間**: 25-36 個工作日（約 5-7 週）

> **時間優化說明**:
> - 通過 Phase 0/1 平行執行，節省 2-3 天
> - Phase 6 並發優化需要充分測試，保留較長時間
> - 如果跳過可選優化（Phase 2, 7），可縮短至 18-24 天

---

## 🔍 代碼審查發現

### 已有優化（無需重複實施）

1. **Consumer 立即處理邏輯** (`Consumer.ts:214-219`)
   ```typescript
   // 已有：處理完 Job 後立即繼續，無等待
   if (!this.stopRequested && processed) {
     await new Promise((resolve) => setTimeout(resolve, 0))
   }
   ```

2. **Worker 指數退避** (`Consumer.ts:173-174`)
   ```typescript
   const delayMs = job.getRetryDelay(job.attempts)
   ```

### 需要修復的問題

1. **Redis `popMany` 同步循環** (`RedisDriver.ts:363-377`)
   - 當前實現是同步 for 循環，每次調用 `rpop`
   - 應改為 Lua 腳本或 Pipeline 批量操作

2. **Redis 優先級輪詢** (`RedisDriver.ts:206-251`)
   - 需要 4 次 Redis 往返來檢查所有優先級
   - 應合併為單一 Lua 腳本

3. **Consumer 未整合 `popMany`**
   - Consumer 仍使用 `pop()` 單條獲取
   - 應支持批量獲取後並發處理

---

## ⚠️ 重要說明

### 關鍵發現（更新）

1. **類型安全問題**：代碼中存在 98 個 `any` 類型，主要集中在 `QueueManager.ts` 和 `RedisDriver.ts`
2. **批量操作效率**：`pushMany` 已有實現，但 `popMany` 實現存在效能問題
3. **驅動層性能**：Redis 優先級輪詢和批量 pop 需要 Lua 腳本優化
4. **持久化開銷**：Persistence 層的單條寫入在高頻場景下會成為瓶頸
5. **並發處理限制**：當前 Worker 是單線程處理，但引入並發需謹慎處理 Group FIFO 邏輯

### 風險評估（更新）

| 項目 | 風險 | 緩解措施 |
|-----|------|---------|
| Phase 1 類型安全 | 🟡 中 | 保持向後相容、分步遷移、完整測試 |
| Phase 3 批量優化 | 🟡 中 | Lua 腳本需充分測試，保留 fallback |
| Phase 4 驅動優化 | 🟡 中 | BLPOP 超時設計、保留輪詢 fallback |
| Phase 6A 無 Group 並發 | 🟢 低 | Group Job 保持順序，僅對無 Group Job 並發 |
| Phase 6B 智能分流並發 | 🟡 中 | 使用 p-limit、定期清理、充分測試 |
| Phase 6C 完全並發 | 🔴 高 | **建議不實施**，除非有強烈需求 |
| Phase 2 序列化優化 | 🟢 低 | 可選優化，不影響核心功能 |

### 向後相容性

- **Phase 1 (類型安全)**: 保持 API 不變，僅改善內部類型定義
- **Phase 3-6 (性能優化)**: 保持 API 不變，僅優化內部實現
- **Phase 2, 7-9 (可選優化)**: 可選功能，不影響現有代碼

---

## ✅ 驗證清單

完成每個 Phase 後，驗證以下項目：

- [ ] 所有現有測試通過
- [ ] 新增功能測試通過
- [ ] 性能基準測試顯示預期提升（如適用）
- [ ] 內存使用符合預期（如適用）
- [ ] 類型檢查通過（TypeScript strict mode）
- [ ] 觀測性指標（SLI/SLO）符合門檻
- [ ] 回歸測試覆蓋關鍵佇列語義（FIFO/Group）
- [ ] 回滾策略已驗證（Feature Flag 可切回）
- [ ] 文檔已更新
- [ ] 向後相容性驗證通過
- [ ] 代碼審查完成

---

## 🧪 Phase 完成門檻（新增）

每個 Phase 完成後需符合以下門檻，否則不得進入下一階段：

- **性能**：吞吐量或延遲改善達標，且無顯著回歸（>10%）
- **正確性**：FIFO / Group FIFO / 重試語義驗證通過
- **穩定性**：Soak test（≥4 小時）無持續性錯誤
- **可回滾性**：Feature Flag 可關閉並回復穩定版本
- **觀測性**：指標與告警已驗證（SLO/SLI）

---

## 📚 相關資源

- [配置類型定義](./appendices/config-types.md)
- [新增檔案清單](./appendices/file-list.md)
- [性能基準測試規格](./appendices/benchmark-spec.md)
- [指標報告模板](./appendices/metrics-report-template.md)
- [測試矩陣模板](./appendices/test-matrix-template.md)
- [回滾與切換檢核表](./appendices/rollback-playbook.md)

---

**版本歷史**:
- v1.2.0 (2026-01-17): Phase 6 漸進式並發方案 - 拆分為 6A/6B/6C 三階段，降低風險
- v1.1.0 (2026-01-17): 審閱調整版 - 修正依賴關係、更新時間估計、新增代碼審查發現
- v1.0.0 (2026-01-17): 初始版本
