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

## 文件結構

本優化計劃已拆分為多個文件，方便實行時聚焦：

- **[00-baseline.md](./00-baseline.md)** - Phase 0: 基準測試基線建立（最高優先級）
- **[01-middleware-precompile.md](./01-middleware-precompile.md)** - Phase 1: 中間件鏈預編譯
- **[02-minimal-context-query-cache.md](./02-minimal-context-query-cache.md)** - Phase 2: MinimalContext Query 快取
- **[03-photon-adapter-proxy.md](./03-photon-adapter-proxy.md)** - Phase 3: PhotonAdapter Proxy 消除
- **[04-aot-router-cache.md](./04-aot-router-cache.md)** - Phase 4: AOTRouter 中間件快取
- **[05-headers-pooling.md](./05-headers-pooling.md)** - Phase 5: FastContext Headers 池化
- **[06-container-symbol-key.md](./06-container-symbol-key.md)** - Phase 6: Container Symbol Key
- **[07-micro-optimizations.md](./07-micro-optimizations.md)** - Phase 7: 其他微優化
- **[verification.md](./verification.md)** - 驗證計劃與測試清單
- **[risks-and-compatibility.md](./risks-and-compatibility.md)** - 風險評估、修正版建議、向後相容性指南

---

## 實施優先級

### Phase 0: 基線建立（必須先完成）

- 實現基準測試套件
- 記錄當前效能數據
- 依據數據調整後續優先級

### 第一階段（高影響，P1-P2）

1. **Phase 1**: 中間件鏈預編譯
   - 實現 `compileMiddlewareChain()`
   - 整合到 `Gravito.compileRoutes()`
   - 基準測試驗證

2. **Phase 2**: MinimalContext Query 快取
   - 修復 `MinimalContext.query()` 的重複解析問題
   - 基準測試驗證

### 第二階段（中影響，P3-P4）

3. **Phase 3**: PhotonAdapter 優化（方案 C: Pool）
   - 創建 `PhotonAdapterContextPool`
   - 修改 handler 轉換函數
   - 基準測試驗證

4. **Phase 4**: AOTRouter 中間件快取
   - 實現簡單快取機制
   - 基準測試驗證

### 第三階段（低影響/待驗證，P5-P6）

5. **Phase 5**: Headers 優化（條件實施）
   - 先基準測試驗證假設
   - 依據結果決定是否實施

6. **Phase 6**: Container Symbol Key（可選）
   - 添加 Symbol 支援
   - 更新文件推薦

---

## 結論

本計劃聚焦於 `@gravito/core` 中**真正影響效能**的代碼路徑：

1. **每請求的物件創建**（閉包、Proxy、Headers）
2. **路由匹配和中間件收集**的迭代開銷
3. **中間件執行**的運行時開銷

### 關鍵修正

與原計劃相比，本修訂版：

1. ✅ 區分了 Gravito Engine 和 PhotonAdapter 兩條執行路徑
2. ✅ 將「基準測試基線建立」列為最高優先級
3. ✅ 新增「MinimalContext Query 快取」優化項目
4. ✅ 標註「路徑提取優化」已實現，無需重複工作
5. ✅ 標註「Headers 池化」需要先基準測試驗證
6. ✅ 補充了向後相容性指南
7. ✅ 調整了風險評估，增加 API 相容性風險

### 實施原則

1. **數據驅動**: 先建立基線，再進行優化
2. **漸進式**: 每個 Phase 完成後進行驗證
3. **向後相容**: 優先選擇不破壞 API 的方案
4. **避免過早優化**: 基準測試證明有收益再實施
