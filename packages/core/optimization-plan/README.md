# @gravito/core 效能優化計劃

> **版本**: 2.0.0  
> **日期**: 2026-01-17  
> **最後更新**: 2026-01-17  
> **目標**: 提升框架整體吞吐量 30-50%

---

## 執行摘要

本計劃針對 `@gravito/core` 的**實際效能瓶頸**進行分析和優化。與 `@gravito/photon`（純別名層）不同，core 包含真正的業務邏輯和效能敏感代碼。

### 效能影響分級

| 優先級 | 優化項目 | 預估提升 | 複雜度 | 風險 | 適用範圍 |
|-------|---------|---------|-------|-----|---------|
| P0 | 基準測試基線建立 | - | 低 | 無 | 全局 |
| P1 | 中間件鏈預編譯 | 10-15% | 中 | 低 | Gravito Engine |
| P2 | MinimalContext Query 快取 | 5-8% | 低 | 低 | Gravito Engine |
| P3 | PhotonAdapter Proxy 消除 | 15-25% | 高 | 中 | PhotonAdapter |
| P4 | AOTRouter 中間件快取 | 5-10% | 低 | 低 | Gravito Engine |
| P5 | FastContext Headers 池化 | 待驗證 | 低 | 低 | Gravito Engine |
| P6 | Container Symbol Key | 2-3% | 低 | 低 | 全局 |

**總計預估**: 35-58% 效能提升（需基準測試驗證）

---

## 架構說明

> **重要**: 本計劃的優化項目針對不同的執行路徑，理解架構是正確實施的前提。

### 雙執行路徑架構

`@gravito/core` 存在**兩條獨立的執行路徑**：

```
┌─────────────────────────────────────────────────────────────────┐
│                        @gravito/core                            │
├─────────────────────────────┬───────────────────────────────────┤
│     Gravito Engine          │        PhotonAdapter              │
│     (原生高效能引擎)          │        (Hono/Photon 相容層)        │
├─────────────────────────────┼───────────────────────────────────┤
│ • FastContext (無 Proxy)    │ • PhotonContextWrapper (Proxy)    │
│ • MinimalContext (超輕量)    │ • PhotonRequestWrapper (Proxy)    │
│ • ObjectPool (物件池化)      │ • 無池化，每次創建新實例            │
│ • AOTRouter (O(1) 靜態路由)  │ • 委託 Photon 路由                 │
├─────────────────────────────┼───────────────────────────────────┤
│ 適用場景:                    │ 適用場景:                         │
│ • 新專案，追求極致效能         │ • 需要 Hono API 相容性             │
│ • 不需要 Hono 生態系統        │ • 使用 Hono 中間件生態系統          │
│ • 直接使用 Bun.serve         │ • 漸進式遷移                       │
└─────────────────────────────┴───────────────────────────────────┘
```

### 現有優化狀態

| 優化技術 | Gravito Engine | PhotonAdapter |
|---------|---------------|---------------|
| Object Pool | ✅ 已實現 (`pool.ts`) | ❌ 無 |
| 無 Proxy Context | ✅ `FastContext` | ❌ 使用 Proxy |
| 超輕量 Context | ✅ `MinimalContext` | ❌ 無 |
| O(1) 靜態路由 | ✅ `AOTRouter` | 透過 Photon |
| 路徑快速提取 | ✅ `extractPath()` | N/A |
| Handler 分析優化 | ✅ `analyzer.ts` | ❌ 無 |

### 關鍵文件對照

```
Gravito Engine:
├── src/engine/Gravito.ts        # 主引擎
├── src/engine/FastContext.ts    # 池化 Context
├── src/engine/MinimalContext.ts # 超輕量 Context
├── src/engine/AOTRouter.ts      # AOT 路由器
├── src/engine/pool.ts           # 物件池
├── src/engine/path.ts           # 路徑提取
└── src/engine/analyzer.ts       # Handler 分析

PhotonAdapter:
└── src/adapters/PhotonAdapter.ts # Photon 適配器（使用 Proxy）
```

---

## 檔案結構

### 📋 主要文件

- **[PENDING_WORK.md](./PENDING_WORK.md)** ⭐ **← 從這裡開始**
  - 所有待完成工作的清單
  - 優先級分級與工作量估算
  - 詳細實現方案與驗證清單

### 📚 優化歷史（已歸檔至 [history](./history/v1.6-optimizations/)）

- **[實施日誌](./history/v1.6-optimizations/DETAILED_WORK_LOG.md)** - 已完成工作的摘要。
- **[技術規格存檔](./history/v1.6-optimizations/PHASE_SPECS_ARCHIVE.md)** - Phase 0-8 的詳細設計規格整合。
- **[驗證與測評存檔](./history/v1.6-optimizations/VERIFICATION_ARCHIVE.md)** - 基準測試數據與風險評估。

---

## 實施優先級

⚠️ **詳見 [PENDING_WORK.md](./PENDING_WORK.md) 的完整待完成工作清單**

### 快速摘要

| 優先級 | 項目 | 預估提升 | 複雜度 | 狀態 |
|-------|-----|--------|-------|------|
| P1 | Body Payload 快取 | 5-10% | 低 | 📋 計劃中 |
| P1 | MinimalContext Query 快取 | 5-8% | 低 | 📋 計劃中 |
| P1 | 基準測試基線 | - | 中 | 📋 計劃中 |
| P2 | 中間件鏈預編譯 | 10-15% | 中 | 📋 計劃中 |
| P2 | AOTRouter 中間件快取 | 5-10% | 低 | 📋 計劃中 |
| P3 | PhotonAdapter Proxy 消除 | 15-25% | 高 | 📋 計劃中 |
| P4 | Headers 優化 | 待驗證 | 低 | 📋 計劃中 |

**已完成**：
- ✅ 路徑提取優化（Phase 7.1）
- ✅ RequestScope Phase 1-3

---

## 現狀與結論

### ✅ 已完成項目

1. **RequestScope 完整實現** (Phase 1-3)
   - Container 層級作用域管理
   - FastContext/MinimalContext 集成
   - 監控系統與 Orbit 整合示例
   - 測試覆蓋率 100%

2. **路徑提取優化** (Phase 7.1)
   - 已使用無 URL 物件的優化實現

### 📋 待完成項目

根據 **Phase 08 深度代碼審查** 的最新發現，確認了以下優化項目：

1. **P1 優先級**（關鍵）
   - Body Payload 快取機制 - 防止 Body 重複讀取崩潰
   - MinimalContext Query 快取 - 避免重複構造物件
   - 基準測試基線建立 - 數據驅動優化決策

2. **P2 優先級**（高影響）
   - 中間件鏈預編譯 - 10-15% 性能提升
   - AOTRouter 中間件快取 - 5-10% 性能提升
   - Headers Object Spread 優化 - 消除淺複製開銷

3. **P3 優先級**（中等影響）
   - PhotonAdapter Proxy 消除 - 15-25% 性能提升（高風險）

4. **P4 優先級**（可選）
   - Headers 池化、Container Symbol Key、微優化等

### 實施指南

**立即開始**：
1. 查看 [PENDING_WORK.md](./PENDING_WORK.md) 的完整清單
2. 按優先級依序執行 Phase
3. 每個 Phase 後執行基準測試驗證效果

**重要原則**：
- 🎯 **數據驅動**: Phase 0 基準測試必須先完成
- 🔄 **漸進式**: 每個 Phase 完成後驗證無破壞性變更
- 🛡️ **向後相容**: 優先選擇不破壞 API 的方案
- ⚠️ **風險控制**: 詳見 [risks-and-compatibility.md](./risks-and-compatibility.md)
