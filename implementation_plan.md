# Gravito 框架優化實施計畫

> **建立日期**: 2026-02-25
> **規劃者**: OPUS 4.6 架構設計
> **狀態**: 📋 待開始執行
> **分支**: feat/framework-optimization

## 執行摘要

Gravito 框架存在六個結構性問題，需要系統性地進行優化。最嚴重的是 **架構反轉問題**：`@gravito/core` 直接依賴 `@gravito/photon`，違反了 Galaxy Architecture 的向心依賴原則。第二嚴重的是 **core 包膨脹**：120+ 個原始碼檔案，超出微核心的設計意圖。

本計畫將優化分為三個階段：Phase 1 聚焦零破壞性的即時勝利（quick wins），Phase 2 處理核心架構修正，Phase 3 進行深度模組拆分。

---

## Phase 1：零破壞性即時勝利（預估 1-2 週）

### 1.1 全域添加 `sideEffects: false` [優先度 ⭐⭐⭐⭐⭐]

**目標**: 為所有 62 個缺少 `sideEffects` 宣告的核心包添加 `"sideEffects": false`。

**實施步驟**:
1. 使用 Bun.Glob 掃描所有 `packages/*/package.json` 和 `satellites/*/package.json`
2. 過濾已有 `sideEffects` 的包（core, cosmos, prism, chromatic）
3. 為每個包添加 `"sideEffects": false`
4. 全量構建 + 測試驗證
5. Semver：PATCH bump

**預期收益**: 30-40% 的 bundled 產物大小削減（tree-shaking）

---

### 1.2 大檔案拆分（Phase 1 級別：僅限安全拆分）

#### 1.2.1 QueryBuilder.ts（1,601 行）→ 四個子模組

**路徑**: `packages/atlas/src/query/QueryBuilder.ts`

**拆分目標**:
- `packages/atlas/src/query/AggregateBuilder.ts` - 聚合操作（count, sum, avg, min, max, aggregate）
- `packages/atlas/src/query/PaginationBuilder.ts` - 分頁操作（paginate, cursorPaginate）
- `packages/atlas/src/query/MutationBuilder.ts` - 寫入操作（insert, update, upsert, delete）
- `packages/atlas/src/query/SubqueryBuilder.ts` - 子查詢操作

**風險**: MEDIUM。使用 mixin 或 composition 模式保持公開 API 不變。

---

#### 1.2.2 BunRedisClient.ts（1,341 行）→ 五個命令模組

**路徑**: `packages/plasma/src/clients/BunRedisClient.ts`

**拆分目標**:
- `packages/plasma/src/clients/commands/StringCommands.ts` - String 命令
- `packages/plasma/src/clients/commands/HashCommands.ts` - Hash 命令
- `packages/plasma/src/clients/commands/ListCommands.ts` - List 命令
- `packages/plasma/src/clients/commands/SetCommands.ts` - Set/SortedSet 命令
- 保留 BunRedisClient.ts 為連線管理 + facade

---

#### 1.2.3 HookManager.ts（1,142 行）→ 四個子模組

**路徑**: `packages/core/src/HookManager.ts`

**拆分目標**:
- `packages/core/src/hooks/types.ts` - Hook 類型定義
- `packages/core/src/hooks/FilterManager.ts` - Filter hooks 實作
- `packages/core/src/hooks/ActionManager.ts` - Action hooks 實作
- `packages/core/src/hooks/HookPriority.ts` - Hook 排序邏輯
- 保留 HookManager.ts 為 facade

---

#### 1.2.4 atlas/types/index.ts（1,358 行）→ 五個子檔案

**路徑**: `packages/atlas/src/types/index.ts`

**拆分目標**:
- `packages/atlas/src/types/connection.ts` - 連線配置型別（~200 行）
- `packages/atlas/src/types/query.ts` - 查詢相關型別（~400 行）
- `packages/atlas/src/types/model.ts` - ORM 模型型別（~300 行）
- `packages/atlas/src/types/grammar.ts` - Grammar 契約（~250 行）
- `packages/atlas/src/types/common.ts` - 通用工具型別（~100 行）
- `index.ts` 改為 barrel re-export

**風險**: LOW。僅限內部 import 路徑變更，公開 API 不受影響。

---

### 1.3 建置腳本 Bun.Glob 最佳化

**新增三個自動化工具腳本**:

1. **`scripts/check-file-size.ts`** - 掃描所有 `packages/*/src/**/*.ts`，報告超過 800 行的檔案
2. **`scripts/check-sideeffects.ts`** - 掃描所有 `package.json`，報告缺少 `sideEffects` 宣告的包
3. **`scripts/check-error-classes.ts`** - 掃描所有 `class.*Error extends` 定義，報告重複

**用途**: 這些工具可在 CI 中運行，確保程式碼品質門檻。

---

## Phase 2：核心架構修正（預估 3-4 週）

### 2.1 解除 core 對 photon 的依賴 [CRITICAL PATH] ⭐⭐⭐⭐⭐ ✅ 完成 (2026-02-25)

**問題**: `@gravito/core` 的 `package.json` 第 125 行依賴 `@gravito/photon`，違反向心依賴原則。

**解決方案**:
1. 將 `packages/core/src/adapters/PhotonAdapter.ts` 移至 `packages/photon/src/adapter/GravitoAdapter.ts`
2. core 僅保留 `HttpAdapter` 抽象介面
3. 從 core 的 `package.json` 移除 photon 依賴
4. 在 core 中保留 deprecated re-export（1 個 minor 版本）

**Semver 影響**: MINOR（with deprecation）

**緩解**: 所有 73 個依賴 core 的包無需修改代碼。

---

### 2.2 OpenTelemetry 提取 🔄 進行中 (2026-02-25)

**問題**: core 的 `package.json` 有 9 個 `@opentelemetry/*` peerDependencies，相關代碼散佈在 `src/instrumentation/` 和 `src/events/observability/`。

**解決方案**:
1. 將 OTel 相關代碼移至現有的 `@gravito/monitor` 包
2. core 保留 `MetricsRecorder` interface（無 OTel 依賴）
3. 從 core 的 `package.json` 移除所有 9 個 peerDependencies
4. 在 core 中保留 deprecated re-export

**Semver 影響**: MINOR（with deprecation）

**實施進度**:
- ✅ Step 7：刪除過期的觀測檔案（TracingSetup.ts, Metrics.ts）
- ⏳ Step 8：全量構建驗證（進行中）
- ⏳ Step 9：文檔完成報告（進行中）

詳細進度見 PHASE2_2_COMPLETION.md

---

### 2.3 core 事件系統瘦身

**問題**: core 的 `src/events/` 有 30 個檔案，包含進階功能（BackpressureManager, CircuitBreaker, DeadLetterQueue 等）。

**解決方案**: 建立新包 `@gravito/resilience`，接收可靠性功能

| 保留在 core | 移至 @gravito/resilience |
|----------|------------------------|
| EventManager.ts | BackpressureManager.ts |
| Event.ts | CircuitBreaker.ts |
| HookManager.ts | DeadLetterQueue.ts |
| Listener.ts | EventPriorityQueue.ts |
| events/types.ts | events/aggregation/* |
| | events/observability/* |
| | WorkerPool*.ts |
| | FlowControlStrategy.ts |
| | IdempotencyCache.ts |
| | MessageQueueBridge.ts |
| | RetryScheduler.ts |

---

### 2.4 core HTTP 中介軟體提取

**問題**: core 包含 CORS、CSRF、SecurityHeaders 等 HTTP 中介軟體。

**解決方案**: 移至 `@gravito/photon` 作為中介軟體擴展。

---

## Phase 3：深度模組拆分（預估 4-6 週）

### 3.1 core 最終瘦身目標

**預期結果**:
- 原始碼檔案：120+ → 30 個
- 行數：42.9K → 15K（-65%）
- peerDependencies：9 → 0
- 直接依賴：2（photon, zod）→ 1（zod）或 0

---

### 3.2 新包建立

| 包名 | 來源 | 功能 |
|-----|------|------|
| `@gravito/resilience` | core | 可靠性模組：CircuitBreaker, DLQ, Backpressure, RetryEngine |
| `@gravito/observability` | core | 監控：OTel 整合、Metrics、Tracing |

---

### 3.3 signal & zenith 優化

- **signal** (16M)：將 `@aws-sdk/client-ses` 外部化，拆分為 SES adapter
- **zenith** (15M)：Client/Server 分離，React 代碼 dynamic import

---

## 關鍵路徑依賴圖

```
[Phase 1 並行]
├─ 1.1 sideEffects ✓
├─ 1.2 大檔案拆分 ✓
├─ 1.3 Bun.Glob 腳本 ✓
└─ 1.4 types 拆分 ✓

[Phase 2 序列化]
└─ 2.1 core 脫離 photon (CRITICAL PATH)
   ├─ 2.2 OTel 提取
   ├─ 2.3 事件瘦身
   └─ 2.4 HTTP 提取

[Phase 3 並行/序列化混合]
├─ 3.1 core 最終瘦身 (需 Phase 2 完成)
├─ 3.2 新包建立 (需 2.3 完成)
├─ 3.3 signal 優化 (獨立)
└─ 3.4 zenith 優化 (獨立)
```

---

## 風險登記表

| 風險 ID | 描述 | 嚴重性 | 緩解策略 |
|--------|------|-------|--------|
| R-01 | core 脫離 photon 導致 import 失效 | HIGH | Deprecated re-export + 1 minor 版本遷移期 |
| R-02 | OTel 提取破壞現有 setupOpenTelemetry 調用 | HIGH | 在 core 保留 proxy export，實際 import 從 monitor 重新導出 |
| R-03 | QueryBuilder 拆分引入回歸 bug | MEDIUM | QueryBuilder 已有完整測試，拆分後確保 100% 通過 |
| R-04 | sideEffects: false 移除必要代碼 | MEDIUM | 逐包審查；如有副作用，使用 `"sideEffects": ["./src/global.ts"]` |
| R-05 | 版本一致性約束影響拆分 | HIGH | 新包初始版本對齊當前版本；changeset 配合 |

---

## 成功指標

### 量化 KPI

- [ ] core 原始碼行數：42.9K → 15K（-65%）
- [ ] core 直接依賴：photon + zod → zod 或 0
- [ ] core peerDependencies：9 → 0
- [ ] sideEffects 覆蓋率：4/66 → 66/66（100%）
- [ ] 超過 800 行的檔案：8+ → 0
- [ ] signal dist 大小：16M → <1M
- [ ] zenith dist 大小：15M → <5M

### 質化標準

- [ ] Galaxy Architecture 向心依賴原則得到程式碼強制保證
- [ ] core 真正成為零外部框架依賴的微核心
- [ ] 所有大檔案拆分後 100% 測試通過
- [ ] 沒有任何 satellite 需要修改代碼

---

## 深度思考結論

### Q1：先拆分 core 還是先重構大檔案？

**A**: Phase 1 先重構大檔案，再 Phase 2 拆分 core。

理由：大檔案拆分降低認知複雜度，使後續代碼遷移更清晰。

### Q2：Breaking change 策略

**A**: Deprecation-first，MAJOR bump 延後一個版本。

所有架構變更通過「添加 deprecated re-export」實現，下一個 MAJOR 版本才移除。

### Q3：Satellite 相容性

**A**: Phase 1-2 不會 break 任何 satellite。

所有變更透過 deprecated re-export 或內部 API 變更實現，公開 API 保持相容。

### Q4：Bun Glob 優化效益

**A**: CI 掃描腳本加速 30-50%，構建本身不受直接影響。

但能啟用更多自動化品質檢查，間接提升開發效率。

---

## 執行計畫時間線

| 階段 | 預估工期 | 主要工作 |
|------|--------|--------|
| Phase 1 | 1-2 週 | quick wins，零破壞性 |
| Phase 2 | 3-4 週 | 核心架構修正，deprecated re-export |
| Phase 3 | 4-6 週 | 深度拆分，新包建立 |
| **總計** | **8-12 週** | **完整優化周期** |

---

**下一步**: 使用 Sonnet 4.6 開始 Phase 1 實施。
