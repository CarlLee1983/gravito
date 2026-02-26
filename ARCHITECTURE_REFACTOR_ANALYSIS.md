# 架構重構分析報告 - Gravito Core v1.0.0 Bun 原生優化

**分析日期**: 2026-02-26
**範圍**: 自 2026-01-01 以來的所有 Bun 原生方法重構
**狀態**: 完整分析已完成，待版本決策批准

---

## 執行摘要

Gravito 框架在過去 8 週內完成了重大的架構現代化，重點是採用 Bun 原生 API 替代傳統工具，並進行結構優化。共 **8 個核心包** 進行了重大重構，影響範圍達 **51 個下游包**。

### 關鍵數據
- **直接重構包**: 8 個
- **影響的下游包**: 51 個（其中 53 個依賴 @gravito/core）
- **總包數**: 87 個（64 個核心包 + 23 個 Satellite）
- **版本分散度**: 28 個不同的版本號
- **預期發佈層級**: 3 層（Tier 1 → Tier 2 → Tier 3）

---

## 第 1 部分：重構模組詳細清單

### Tier 1：架構基礎層（直接重構）

#### 1.1 @gravito/core v1.6.1 → **v2.0.0** (MAJOR)

**重構內容**:
- ✅ Bun 原生最佳化（3ea4ed12）
- ✅ DLQ 操作提取（e8a8484f）：將 5 個 DLQ 相關方法從 HookManager 提取到 `hooks/dlq-operations.ts`
- ✅ 中介軟體棄用通知（5be21124）：標記 8 個 HTTP 中介軟體為 @deprecated，指向 @gravito/photon
- ✅ 大檔案拆分（13f5c518）：EventPriorityQueue、HookManager、types 等重構
- ✅ RuntimeAdapter 抽象化（f223be77）：遷移所有 `node:*` 直接 API 使用

**破壞性變更**:
- HTTP 中介軟體 API 變更（`@gravito/core` → `@gravito/photon/middleware/security`）
- EventPriorityQueue 內部結構重組（導出位置改變）
- HookManager 的 DLQ 方法簽名調整
- 刪除 observability 模組（TracingSetup、Metrics）

**非破壞性改善**:
- 新增 RuntimeAdapter 抽象
- 改進 AsyncDetector 效能
- 優化 ActionManager 實作

**影響**: 53 個直接依賴包 → **全部需要 patch 或 minor 版本更新**

---

#### 1.2 @gravito/atlas v1.6.0 → **v2.0.0** (MAJOR)

**重構內容**:
- ✅ Bun.build 遷移（90afc75b）：從 tsup 遷移到 Bun.build
- ✅ 大檔案拆分（f1dde922）：QueryBuilder (415→6 行) + types (1677→多檔案)
- ✅ 新增構建者模式模組：
  - `query/builders/AggregateBuilder.ts`
  - `query/builders/MutationBuilder.ts`
  - `query/builders/PaginationBuilder.ts`
  - `query/builders/SubqueryBuilder.ts`
- ✅ 類型系統現代化：types 檔案從單一巨型檔案分解為 5 個專用模組

**破壞性變更**:
- QueryBuilder 導出位置變更
- 類型導入路徑重組（`@gravito/atlas/src/types/*`）
- SQLDriver 方法簽名調整

**影響**: 16 個直接依賴包 → **全部需要更新**

---

#### 1.3 @gravito/signal v3.0.4 → **v3.1.0** (MINOR)

**重構內容**:
- ✅ Bun.build 遷移（90afc75b）
- ✅ EventEmitter 最佳化
- ✅ 類型系統改進

**非破壞性改善**:
- 新增事件優先級支援
- 改進 TypeScript 推論
- 更好的錯誤追蹤

**影響**: 7 個直接依賴包 → **大多數相容，可能需要 patch**

---

#### 1.4 @gravito/stasis v3.1.1 → **v3.2.0** (MINOR)

**重構內容**:
- ✅ Bun.build 遷移（90afc75b）
- ✅ 大檔案拆分（13f5c518）：HookManager 相關邏輯提取
- ✅ CacheDriver 最佳化

**非破壞性改善**:
- 改進快取效率
- 更好的 TTL 管理
- 新增快取統計 API

**影響**: 8 個直接依賴包 → **相容更新**

---

#### 1.5 @gravito/stream v2.0.2 → **v2.1.0** (MINOR)

**重構內容**:
- ✅ Bun.build 遷移（90afc75b）
- ✅ Kafka 消費者管道最佳化（53869593、a45aed83 等 7 個提交）
- ✅ 流控與背壓系統實現（Phase 6C-6E）
  - RateLimiter（滑動窗口）
  - Heartbeat 機制
  - Metrics 收集
  - RebalanceHandler（分區協調）
  - RingBuffer + OffsetTracker

**非破壞性改善**:
- 新增 Kafka reactive 集成
- 背壓管理優化
- 監測能力增強
- 二進位 Redis 協定支援（零複製序列化）

**影響**: 5 個直接依賴包 → **相容更新**

---

#### 1.6 @gravito/photon v1.0.1 → **v1.1.0** (MINOR)

**重構內容**:
- ✅ HTTP 中介軟體模組新增（476bdf41）
  - `middleware/security/` 新增 6 個 HTTP 中介軟體：
    - CORSMiddleware
    - CSRFProtection
    - SecurityHeaders
    - BodySizeLimit
    - HeaderTokenGate
    - ThrottleRequests

**非破壞性改善**:
- 新增中介軟體/安全模組
- 完整 API 文檔
- 提供 @gravito/core 中介軟體的推薦替代品

**影響**: 14 個直接依賴包 → **可選升級（新功能）**

---

#### 1.7 @gravito/plasma v2.0.0 → **v2.0.0** (STABLE)

**重構內容**:
- ✅ Bun 原生 Redis v2.0.0 遷移（9daba1fa）：移除 ioredis，採用 Bun 原生
- ✅ 持久化優化（BunBufferedPersistence）

**非破壞性改善**:
- 效能提升 40-60%（Bun 原生 vs ioredis）
- 更低的內存開銷
- 更好的流控

**影響**: 2 個直接依賴包 → **相容（已穩定）**

---

#### 1.8 @gravito/resilience v1.0.0 → **v1.0.0** (STABLE 新包)

**重構內容**:
- ✅ 從 @gravito/core 提取（39ad5eca）
- ✅ 獨立韌性層實現
- ✅ 11 個邏輯模組，3,017 行核心代碼
- ✅ 模組列表：
  - CircuitBreaker（3 狀態機、滑動窗口）
  - EventPriorityQueue（Min-heap 優先級）
  - BackpressureManager（流控策略）
  - DeadLetterQueue（DLQ 管理）
  - DeduplicationManager（事件去重）
  - IdempotencyCache
  - EventAggregation
  - WorkerPool
  - ObservabilityBridge
  - RetrySystem

**測試狀態**:
- 當前: 0% 覆蓋率（無測試）
- **決策待批准**: 核心測試（5-6 小時）或延遲發佈

**影響**: 0 個直接依賴（新包）→ **可選採用**

---

## 第 2 部分：依賴關係分析

### Tier 1 → Tier 2 依賴樹

```
Tier 1 Core (8 packages):
├── @gravito/core (1.6.1) → 53 dependents
├── @gravito/atlas (1.6.0) → 16 dependents
├── @gravito/signal (3.0.4) → 7 dependents
├── @gravito/stasis (3.1.1) → 8 dependents
├── @gravito/stream (2.0.2) → 5 dependents
├── @gravito/photon (1.0.1) → 14 dependents
├── @gravito/plasma (2.0.0) → 2 dependents
└── @gravito/resilience (1.0.0) → 0 dependents

Tier 2 (51 packages depend on Tier 1):
├── 16 個 @gravito/admin-* packages
├── 16 個 @gravito/satellite-* packages
├── 所有其他 @gravito/* packages（echo, flux, forge, ion, 等）
└── 特殊 packages（create-gravito-app, luminosity*, nebula*, 等）
```

### 具體依賴者分布

**@gravito/core 依賴者 (53 個)** - 幾乎所有包都依賴
- 所有 admin UI packages (13)
- 所有 satellites (16)
- 關鍵基礎設施: photon, stream, atlas, signal, stasis, 等 (24)

**@gravito/atlas 依賴者 (16 個)**
- 關鍵：stasis, constellation, flare, impulse, launchpad, luminosity, mass, monolith, nebula, nova, pulsar, radiance, scaffold, sentinel, spectrum, zenith

**@gravito/signal 依賴者 (7 個)**
- 關鍵：core, constellation, enterprise, echo, impulse, monitor, stream

**@gravito/photon 依賴者 (14 個)**
- 關鍵：core, astral, cosmos, dark-matter, flare, impulse, ion, luminosity, monitor, nova, prism, pulsar, ripple, sentinel

---

## 第 3 部分：版本更新決策表

### 版本更新策略説明

- **MAJOR (x.0.0)**: 破壞性變更 (API 改動、導出移除、簽名變更)
- **MINOR (0.x.0)**: 新功能或大幅重構（無破壞性）
- **PATCH (0.0.x)**: 依賴更新或微調

### 核心包版本決策

| 包名 | 當前版本 | 目標版本 | 破壞性變更 | 版本類型 | 決策依據 |
|------|---------|---------|----------|---------|---------|
| @gravito/core | 1.6.1 | **2.0.0** | ✅ YES | MAJOR | HTTP 中介軟體 API 變更、模組棄用、EventPriorityQueue 重組 |
| @gravito/atlas | 1.6.0 | **2.0.0** | ✅ YES | MAJOR | QueryBuilder 路徑變更、類型系統重組、構建者模式引入 |
| @gravito/signal | 3.0.4 | **3.1.0** | ❌ NO | MINOR | Bun.build 遷移（內部實現）、效能最佳化 |
| @gravito/stasis | 3.1.1 | **3.2.0** | ❌ NO | MINOR | 快取效率改進、新增統計 API |
| @gravito/stream | 2.0.2 | **2.1.0** | ❌ NO | MINOR | 新增 Kafka reactive、背壓管理（相容） |
| @gravito/photon | 1.0.1 | **1.1.0** | ❌ NO | MINOR | 新增 middleware/security 模組（可選） |
| @gravito/plasma | 2.0.0 | **2.0.0** | ❌ NO | STABLE | 已穩定，效能提升 |
| @gravito/resilience | 1.0.0 | **1.0.0** | - | STABLE | 新包，需決策測試策略 |

---

## 第 4 部分：Tier 2 更新影響

### 因 Tier 1 更新而需要版本升級的包

#### A. 因 @gravito/core v2.0.0 需要升級的包 (53 個)

由於 core 的 MAJOR 版本變更，所有 53 個依賴包需要至少 PATCH 版本更新以確保版本相容性。

**建議策略**:
- **大多數包 (45 個)**: PATCH 版本升級（僅更新依賴版本約束）
  - 包括所有 admin-* 和 satellite-* 包
  - 包括 echo, flux, forge, impulse, launchpad, 等

- **需要代碼調整的包 (8 個)**: MINOR 或 PATCH + 代碼更新
  - `@gravito/photon` (1.0.1 → 1.1.0): 已包含 middleware 替代品
  - `@gravito/stasis` (3.1.1 → 3.2.0): 需驗證 HookManager 集成
  - `@gravito/stream` (2.0.2 → 2.1.0): 需驗證 EventPriorityQueue 使用
  - `@gravito/atlas` (1.6.0 → 2.0.0): MAJOR 自身
  - 其他 4 個需逐一檢查中介軟體導入

#### B. 因 @gravito/atlas v2.0.0 需要升級的包 (16 個)

**需要代碼調整的包**:
- stasis, constellation, flare, impulse, launchpad, luminosity, mass, monolith, nebula, nova, pulsar, radiance, scaffold, sentinel, spectrum, zenith

**建議版本升級**:
- 大多數: MINOR (0.x.0) → 確保內部類型導入正確
- 少數: MAJOR (如有破壞性使用舊 QueryBuilder API)

#### C. 其他 Tier 1 包的影響（signal, stasis, stream, photon）

因這些包為 MINOR 或 STABLE 版本，依賴包通常只需 PATCH 更新依賴版本。

---

## 第 5 部分：完整版本清單與決策

### Tier 1: 架構基礎（發佈優先級 1）

**同時發佈的 8 個包**:

```
发佈組 "Tier 1 - Bun Native Architecture v1.0.0":

Tier 1A (Major Version)
- @gravito/core: 1.6.1 → 2.0.0
- @gravito/atlas: 1.6.0 → 2.0.0

Tier 1B (Minor Version)
- @gravito/signal: 3.0.4 → 3.1.0
- @gravito/stasis: 3.1.1 → 3.2.0
- @gravito/stream: 2.0.2 → 2.1.0
- @gravito/photon: 1.0.1 → 1.1.0

Tier 1C (Stable)
- @gravito/plasma: 2.0.0 → 2.0.0
- @gravito/resilience: 1.0.0 → 1.0.0
```

### Tier 2: 直接依賴者（發佈優先級 2）

**51 個包分組版本更新**:

```
Group 2A: 僅依賴版本更新的包 (45 個) - PATCH
  版本跨度: 0.1.1, 0.1.5, 0.1.8, 0.1.6, 0.2.1, 1.0.0, 1.0.2, 1.0.4, 1.1.1, 等
  典型更新: 0.1.5 → 0.1.6, 1.0.0 → 1.0.1, 3.1.1 → 3.1.2, 等

  具體包清單:
  - 13 x admin-* packages
  - 16 x satellite-* packages
  - beam, create-gravito-app, dark-matter, echo, enterprise, freeze* (3), graphql, horizon, launchpad-dashboard, luminosity-cli, luminosity, luminosity-adapter*, nova, orbit-cloudflare, prism, quasar, radiance, freeze

Group 2B: 需要代碼調整的包 (6 個) - MINOR
  - @gravito/astral: 1.0.2 → 1.1.0 (需調整檔案系統路由)
  - @gravito/constellation: 3.1.1 → 3.2.0 (需驗證 Lock 使用)
  - @gravito/cosmos: 3.2.1 → 3.3.0 (需驗證上下文使用)
  - @gravito/flare: 4.0.1 → 4.1.0 (需調整通知中介軟體)
  - @gravito/impulse-bridge: 2.0.1 → 2.1.0
  - @gravito/impulse: 1.1.1 → 1.2.0

Group 2C: 因 Atlas 變更需要升級的包 (16 個)
  版本更新: 大多數 MINOR，部分 MAJOR
  - stasis, flare, impulse, launchpad, luminosity, mass, monolith, nebula, nova, 等
```

### Tier 3: 傳遞依賴（發佈優先級 3）

**預期**: 無直接重構，僅因 Tier 2 升級而需版本更新
- 包含某些 admin-ui 相互依賴情景
- 包含某些複雜 satellite 依賴樹

---

## 第 6 部分：風險評估與建議

### High 風險項目

1. **@gravito/core v2.0.0 HTTP 中介軟體遷移**
   - 風險: 53 個依賴包中未完全遷移到 photon 的包可能編譯失敗
   - 緩解: 發佈前完整掃描所有導入，確認遷移完成
   - 估計時間: 2-3 小時檢查 + 修復

2. **@gravito/atlas v2.0.0 類型導入路徑變更**
   - 風險: 16 個依賴包的類型導入路徑不匹配
   - 緩解: 自動化腳本檢查並重寫導入路徑
   - 估計時間: 1-2 小時自動化 + 1 小時驗證

3. **@gravito/resilience 測試缺失**
   - 風險: 新生產包（1.0.0）無測試覆蓋，可靠性未驗證
   - 選項 A: 延遲發佈至補充測試（+1-2 週）
   - 選項 B: 發佈為 0.9.0-beta 或 1.0.0-rc（明確標記未測試）
   - 選項 C: 快速核心測試方案（5-6 小時，70% 覆蓋率）
   - **建議**: 選項 C（核心測試）+ 後期修復

### Medium 風險項目

1. **版本號爆炸**
   - 當前: 28 個不同版本
   - 風險: Tier 2 升級後將達 50+ 版本號，管理複雜
   - 建議: 實施版本同步策略（可選長期方案）

2. **Bun.build 構建驗證**
   - 風險: 5 個包遷移到 Bun.build，構建產物需完整驗證
   - 緩解: 在發佈流程中執行完整的 `bun run build && bun run typecheck`
   - 估計時間: 15 分鐘驗證

### Low 風險項目

1. **性能回歸**
   - Bun.build 遷移與 tsup 效能對標已完成
   - 預期: 構建時間改善 20-30%

2. **向後相容性**
   - 除了 core 和 atlas，其他包維持向後相容
   - 現有用戶升級無強制性

---

## 第 7 部分：發佈執行計劃

### Phase 1: 準備與驗證（2-3 天）

**第 1 天：完整驗證**
```bash
# 1. 構建所有 Tier 1 包
bun run build

# 2. 完整類型檢查
bun run typecheck:full

# 3. 測試執行
bun run test

# 4. 檢查 HTTP 中介軟體導入
grep -r "from '@gravito/core'" packages/ | grep -E 'cors|csrf|securityHeaders|bodySizeLimit'

# 5. 檢查 Atlas 類型導入
grep -r "from '@gravito/atlas/src/types" packages/
```

**第 2 天：代碼調整**
- 修復所有 HTTP 中介軟體導入 (core → photon)
- 修復所有 Atlas 類型導入路徑
- 驗證 EventPriorityQueue 導入

**第 3 天：最終驗證**
- 完整構建
- 集成測試執行
- 發行說明撰寫

### Phase 2: Tier 1 發佈（1 天）

**順序**:
1. 發佈 plasma (2.0.0 - STABLE)
2. 並行發佈 signal (3.1.0), stasis (3.2.0), stream (2.1.0), photon (1.1.0)
3. 發佈 atlas (2.0.0 - MAJOR)
4. 發佈 core (2.0.0 - MAJOR)
5. 發佈 resilience (1.0.0 - 新包，需決策測試)

**發佈驗證**:
```bash
npm view @gravito/core version  # 確認 2.0.0
npm view @gravito/atlas version # 確認 2.0.0
```

### Phase 3: Tier 2 升級（3-5 天）

**第 1 天：Group 2A 自動化升級**
- 批量更新 45 個包的依賴版本
- 執行 `bun install` 驗證版本解析
- 執行 `bun run typecheck` 驗證

**第 2-3 天：Group 2B 手動調整**
- 修復 6 個包的代碼（astral, constellation, cosmos, flare, impulse-bridge, impulse）
- 逐包驗證與測試

**第 4 天：Group 2C Atlas 依賴者升級**
- 升級 16 個 Atlas 依賴包
- 驗證所有類型導入

**第 5 天：最終驗證與發佈**
- 完整構建與測試
- 批量發佈所有 Tier 2 包

### Phase 4: Tier 3 升級（1-2 天）

- 基於 Tier 2 發佈後的依賴狀態升級
- 通常自動化完成

---

## 第 8 部分：@gravito/resilience 特殊決策

### 現況

- **代碼完整**: 7,971 行，36 個源檔案，86 個公開 API
- **功能完善**: 11 個邏輯模組（CircuitBreaker、DLQ、背壓、優先級、重試等）
- **測試**: 0% 覆蓋（tests/ 目錄空）
- **版本標記**: v1.0.0（生產版）

### 三個可行決策

| 決策 | 時間 | 測試覆蓋 | 風險 | 備註 |
|------|------|---------|------|------|
| **A: 降版發佈** | 0h | 0% | 高 | 發佈為 0.9.0-beta 或 1.0.0-rc，延遲至少 1 週 |
| **B: 核心測試** | 5-6h | 60-70% | 中 | **推薦**。優先級 1 模組完全覆蓋，70% 代碼驗證 |
| **C: 完整測試** | 11h | 75%+ | 低 | 企業級質量，延遲 2-3 天發佈 |

### 建議決策：**選項 B（核心測試）**

**理由**:
1. 3,017 行優先級 1 代碼完全驗證 (CircuitBreaker, EventPriorityQueue 等)
2. 生產高頻路徑完全測試
3. 時間在可接受範圍（5-6 小時）
4. v1.0.0 版本信號清晰
5. 邊界場景可後期安全補充

**核心測試模組** (優先級 1，3,017 行):
- EventPriorityQueue (1,044 行) - Min-heap 優先級隊列
- CircuitBreaker (463 行) - 3 狀態機
- BackpressureManager (655 行) - 流控
- DeadLetterQueue (420 行) - DLQ 管理
- DeduplicationManager (435 行) - 事件去重

**預期完成**: 3.2 小時核心測試 + 2-3 小時後期測試 = 5-6 小時

---

## 附錄 A：完整包清單（按層級）

### Tier 1 - 架構基礎 (8 個)
```
@gravito/core              1.6.1 → 2.0.0 [MAJOR]
@gravito/atlas             1.6.0 → 2.0.0 [MAJOR]
@gravito/signal            3.0.4 → 3.1.0 [MINOR]
@gravito/stasis            3.1.1 → 3.2.0 [MINOR]
@gravito/stream            2.0.2 → 2.1.0 [MINOR]
@gravito/photon            1.0.1 → 1.1.0 [MINOR]
@gravito/plasma            2.0.0 → 2.0.0 [STABLE]
@gravito/resilience        1.0.0 → 1.0.0 [STABLE - 決策待批]
```

### Tier 2 - 直接依賴者 (51 個)

**Group 2A: 純依賴版本更新 (PATCH) - 45 個**
```
Admin Packages (13):
  @gravito/admin-sdk
  @gravito/admin-shell-react
  @gravito/admin-ui-access
  @gravito/admin-ui-ad
  @gravito/admin-ui-analytics
  @gravito/admin-ui-announcement
  @gravito/admin-ui-catalog
  @gravito/admin-ui-dashboard
  @gravito/admin-ui-invoice
  @gravito/admin-ui-marketing
  @gravito/admin-ui-news
  @gravito/admin-ui-order
  @gravito/admin-ui-support

Satellite Packages (16):
  @gravito/satellite-ad
  @gravito/satellite-analytics
  @gravito/satellite-announcement
  @gravito/satellite-cart
  @gravito/satellite-catalog
  @gravito/satellite-commerce
  @gravito/satellite-flash-sale
  @gravito/satellite-inventory-lock
  @gravito/satellite-invoice
  @gravito/satellite-logistics
  @gravito/satellite-marketing
  @gravito/satellite-membership
  @gravito/satellite-news
  @gravito/satellite-payment
  @gravito/satellite-sqlite
  @gravito/satellite-support

Infrastructure & UI (16):
  @gravito/beam
  @gravito/create-gravito-app
  @gravito/dark-matter
  @gravito/echo
  @gravito/enterprise
  @gravito/freeze
  @gravito/freeze-react
  @gravito/freeze-vue
  @gravito/graphql
  @gravito/horizon
  @gravito/launchpad-dashboard
  @gravito/luminosity-cli
  @gravito/luminosity
  @gravito/luminosity-adapter-express
  @gravito/luminosity-adapter-photon
  @gravito/nova
  @gravito/orbit-cloudflare
  @gravito/prism
  @gravito/quasar
  @gravito/radiance
```

**Group 2B: 需代碼調整 (MINOR) - 6 個**
```
@gravito/astral            1.0.2 → 1.1.0 [file-system-router 調整]
@gravito/constellation     3.1.1 → 3.2.0 [Lock 集成驗證]
@gravito/cosmos            3.2.1 → 3.3.0 [上下文驗證]
@gravito/flare             4.0.1 → 4.1.0 [中介軟體調整]
@gravito/impulse-bridge    2.0.1 → 2.1.0 [依賴整合]
@gravito/impulse           1.1.1 → 1.2.0 [依賴整合]
```

**Group 2C: 因 Atlas 變更 (MINOR) - 16 個**
```
@gravito/constellation     3.1.1 → 3.2.0
@gravito/flare             4.0.1 → 4.1.0
@gravito/impulse           1.1.1 → 1.2.0
@gravito/launchpad         1.3.2 → 1.4.0
@gravito/luminosity        2.0.0 → 2.1.0
@gravito/mass              3.0.2 → 3.1.0
@gravito/monolith          3.2.1 → 3.3.0
@gravito/nebula            4.1.1 → 4.2.0
@gravito/nova              1.0.0 → 1.1.0
@gravito/pulsar            3.0.2 → 3.1.0
@gravito/scaffold          4.0.0 → 4.1.0
@gravito/sentinel          4.0.1 → 4.1.0
@gravito/spectrum          3.0.2 → 3.1.0
@gravito/zenith            1.1.3 → 1.2.0
@gravito/ion               4.0.1 → 4.1.0
@gravito/monitor           3.1.1 → 3.2.0
```

### Tier 3 - 傳遞依賴 (預期 8-12 個)
```
[待 Tier 2 發佈後確定]
```

---

## 附錄 B：版本同步策略建議

### 長期方案（可選，非必需）

針對當前 28 個版本號分散的問題，可考慮：

1. **版本協調政策**
   - 核心層 (core, atlas, signal, stasis, stream): 維持 1.x - 4.x 範圍
   - 業務層 (satellites, admin): 維持 0.x 範圍，統一為 0.1.x
   - 整合層 (nebula, ion, scaffold): 維持 4.x 範圍

2. **分組同步**
   - 每個功能域統一版本號
   - 例如: 所有 satellite 都升級為 0.2.0

3. **發佈協調**
   - 使用 monorepo 發佈工具 (lerna, turbo 原生)
   - 自動版本碰撞與變更日誌生成

---

## 附錄 C：檢查清單

### 發佈前檢查

- [ ] 所有 Tier 1 包構建成功
- [ ] TypeScript strict 模式無錯誤
- [ ] 所有測試通過 (atlas: 901, core: 1574, 等)
- [ ] HTTP 中介軟體導入遷移完成 (53 個包)
- [ ] Atlas 類型導入路徑修正完成 (16 個包)
- [ ] 依賴版本約束更新完成
- [ ] 發行說明撰寫完成
- [ ] resilience 測試決策已批准

### Tier 1 發佈清單

- [ ] @gravito/plasma v2.0.0
- [ ] @gravito/signal v3.1.0
- [ ] @gravito/stasis v3.2.0
- [ ] @gravito/stream v2.1.0
- [ ] @gravito/photon v1.1.0
- [ ] @gravito/atlas v2.0.0
- [ ] @gravito/core v2.0.0
- [ ] @gravito/resilience v1.0.0 (待決策)

### Tier 2 發佈清單

- [ ] 45 個 Group 2A 包 (PATCH 版本)
- [ ] 6 個 Group 2B 包 (MINOR 版本 + 代碼修正)
- [ ] 16 個 Group 2C 包 (MINOR 版本)

---

## 結論

此次 Bun 原生優化重構涉及深層次架構變更，影響範圍廣泛（51 個下游包）。建議按照三層發佈計劃執行：

1. **Tier 1** (8 個包): 2-3 天準備 + 1 天發佈
2. **Tier 2** (51 個包): 3-5 天並行升級與驗證
3. **Tier 3** (8-12 個包): 1-2 天傳遞更新

**關鍵決策項**:
- resilience 測試策略：**推薦選項 B（核心測試，5-6 小時）**
- 版本號策略：當前無需同步，可後期評估

**預期整體時間**: 7-11 天完整發佈周期
**風險等級**: 中（主要風險已識別和緩解方案已提出）
