# Phase 3: Fix Critical Issues (If Needed) - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning
**Trigger:** Conditional — Only activates if Phase 2 identifies Critical priority issues

<domain>
## Phase Boundary

修復 Phase 1 快速掃描發現的所有 **Critical 優先級問題**，以確保框架核心穩定性。本 Phase 著眼於移除阻擋 Hono Phase 4-5 遷移的障礙。

**範圍限制：**
- ✅ 修復 Critical 優先級問題（阻擋框架運作）
- ✅ 包括隱式依賴、循環依賴、測試失敗、編譯錯誤、建構失敗等
- ❌ 不包括 High / Medium 優先級問題（Phase 4 之後評估）
- ❌ 不新增功能（純修復工作）
- ❌ 不進行深度性能優化（建立基線後再評估）

**前置條件：**
- Phase 1 (快速掃描) 已完成
- Phase 2 (結果評估) 已確認存在 Critical 問題

**觸發條件：**
- 如果 Phase 2 發現 0 個 Critical 問題 → Skip Phase 3，直接進入 Hono Phase 4-5 規劃
- 如果 Phase 2 發現 1+ 個 Critical 問題 → 啟動 Phase 3

**成功準則：**
- [ ] 所有 Critical 問題都已修復並驗證
- [ ] `bun test` 全部通過（含修復後新增的測試）
- [ ] `bun run typecheck` 0 errors（or 記錄已知抑制）
- [ ] 無新循環依賴
- [ ] 所有修復都有完整文檔和驗證記錄

</domain>

<decisions>
## Implementation Decisions

### 修復優先級策略 (D-01)
**決策：按影響範圍排序 — 優先修復影響最多包的問題**

- **範圍最寬的問題優先**（如隱式依賴影響 4 個包 → 第一個修復）
- **單包問題後置**（如特定包的編譯錯誤）
- **理由：** 建立穩定的基礎，減少後續修復中發現新的級聯失敗
- **執行時參考：** 從 Phase 1 報告的 `ISSUES_PRIORITIZED.md` 中提取影響範圍數據

### 修復驗證策略 (D-02)
**決策：每個 Critical 修復完成後，執行全量測試 + 編譯檢查**

- **每次修復流程：**
  1. 修改代碼
  2. 運行 `bun run typecheck` 確認無類型錯誤
  3. 運行 `bun test` 確認全量測試通過
  4. 記錄驗證結果（通過/失敗）

- **不接受縮減驗證** — 即使耗時 30+ 分鐘，也要完整驗證
- **理由：** 避免修復引入新問題，影響後續 Hono 遷移的穩定性
- **檢查清單：** 修復提交前必須檢查：
  - [ ] 類型檢查通過 (0 errors)
  - [ ] 修復相關包的測試通過
  - [ ] 全量測試通過（無跳過/失敗）

### 修復範圍決策 (D-03)
**決策：修復所有 Critical 優先級問題（無論數量）**

- **如果發現 5+ 個 Critical 問題：** 全部修復（預算 2-3 天）
- **不分批、不評估成本** — 將 Critical 問題消除到零
- **理由：** 確保框架穩定基礎，避免後續 Hono 遷移中遇到隱患
- **風險接受：** 如果發現超過預期的 Critical 問題，延長時間軸而非縮減範圍

### 修復失敗處理 (D-04)
**決策：若修復導致新的測試失敗 → 回滾，列入待辦待後續**

- **回滾條件：** 修復引入 1+ 個新的測試失敗
- **後續處理：**
  - 回滾代碼修改
  - 記錄「修復 X 導致 Y 失敗」在 `ISSUES_PRIORITIZED.md`
  - 作為 Phase 4+ 的待辦事項
- **例外情況：** 如果新失敗與修復無關（環境問題），經確認後可保留修復
- **理由：** 避免用一個問題掩蓋另一個問題，保持可追溯性

### 修復並發度 (D-05)
**決策：完全串聯 — 一次修復一個 Critical 問題**

- **不並發修復** — 即使有多個獨立的 Critical 問題
- **理由：** 確保每個修復都經過充分驗證，避免互相干擾導致難以追蹤的問題
- **預期時間線：** N 個 Critical 問題 × 45 分鐘/問題（修復 + 驗證）
- **實施方式：**
  1. 修復問題 #1，完整驗證
  2. 修復問題 #2，完整驗證
  3. ... 重複直到所有 Critical 問題修復

### 修復文檔記錄 (D-06)
**決策：每個修復記錄「問題詳細描述 + 根本原因」**

- **必須記錄的信息：**
  - 問題簡述（如「隱式依賴：package X 導入 atlas 但未宣告」）
  - 根本原因分析（如「package.json 中漏掉 @gravito/atlas 依賴」）
  - 修復方案描述（做了什麼改變）
  - 驗證結果（修復前/後的測試結果數據）

- **可選但推薦記錄：**
  - 為什麼之前沒有發現（代碼審查漏洞）
  - 如何預防重複（應添加什麼檢查）

- **輸出格式：** 更新 `ISSUES_PRIORITIZED.md`，在每個已修復問題後註記修復過程

### Hono Phase 4-5 規劃時間 (D-07)
**決策：串聯 — Phase 3 完全完成後再啟動 Hono 規劃**

- **不並行規劃** — Hono Phase 4-5 的規劃延遲到 Phase 3 驗收完成
- **里程碑：**
  - Phase 3 完成：所有 Critical 問題修復 ✓
  - 驗收確認：生成 `FIXES_VERIFIED.md` 報告
  - 啟動規劃：`/gsd:plan-phase 4` (Hono Phase 4-5)

- **理由：** 確保框架穩定後再推進大規模遷移，降低 Hono 遷移中遇到環境問題的風險
- **時間軸影響：** Phase 3 耗時 2-3 天，會推遲 Hono 規劃 2-3 天

### Claude 的判斷空間 (D-08)
**以下方面 Claude 在實施時有自由裁量權：**

- **修復方案選擇：** 如果同一問題有多個修復方案（如隱式依賴的標準化方式），Claude 可選擇最簡潔/最安全的方案
- **額外修復優化：** 修復一個 Critical 問題時，如果順便發現可改進的 High 問題且修復簡單，可一並處理（但需記錄區分）
- **驗證工具選擇：** 如果需要更細緻的驗證工具（如依賴圖分析），可建立額外腳本
- **報告格式調整：** 基於實際修復情況調整報告結構（但保留上述必須記錄的信息）

</decisions>

<specifics>
## Specific Ideas

### 預期 Critical 問題類型（基於代碼分析）

根據 CONCERNS.md，以下類型的問題可能在 Phase 1 被識別為 Critical：

1. **隱式依賴** (Impact: 4 packages)
   - `packages/fortify`, `graphql`, `pulse`, `spectrum` 導入 `@gravito/atlas` 但未宣告
   - 修復：添加 `@gravito/atlas` 到各包的 package.json dependencies

2. **循環依賴**（如有新增）
   - 修復：重組包結構或使用事件解耦
   - 驗證：運行 `bun run scripts/generate-dependency-graph.ts`

3. **ESM/CJS 建構失敗**
   - 現象：build:dts 失敗，CJS stub 引用不存在的 ESM 文件
   - 修復：確保 `esmNaming` 與 `buildCJSStub` 第三參數一致
   - 案例：`packages/core/build.ts` 已修正為 `target: 'bun'`

4. **測試失敗**（Flaky 或未知原因）
   - 修復：逐一調查，修復根本原因（不跳過測試）
   - 跳過測試政策：記錄為「已知問題」，不作為修復對象（除非阻擋核心功能）

5. **Bun.Tar 可用性**
   - 現象：Archive 功能在某些 Bun 版本不可用
   - 修復：添加運行時檢查或版本要求

### 修復不應包括的範圍

- ❌ 重構 QueryBuilder（太大，非 Critical）
- ❌ 修復 @ts-expect-error 抑制（非 Critical，但 High 優先級）
- ❌ 性能優化（非 Critical）
- ❌ 文檔補充（非 Critical）

</specifics>

<canonical_refs>
## Canonical References

**下游 Agent 必須閱讀這些文檔，以理解修復的上下文和限制。**

### Phase 1 掃描結果（待生成）
- `.planning/phases/01-1-2-days/HEALTH_CHECK_REPORT.md` — Phase 1 驗證詳細結果（測試覆蓋率、類型檢查狀態、依賴圖分析）
- `.planning/phases/02-*/ISSUES_PRIORITIZED.md` — Critical/High/Medium 優先級問題清單（Phase 2 生成）

### 代碼庫約束文檔
- `.planning/codebase/CONCERNS.md` — 已知技術債、風險、邊界情況（隱式依賴、ESM/CJS、@ts-expect-error 等）
- `.planning/codebase/STACK.md` — 技術棧（Bun、Turbo、Vitest）及限制
- `.planning/codebase/STRUCTURE.md` — 59 個包的組織結構

### 相關工具配置
- `turbo.json` — Turborepo 構建依賴與快取配置
- `tsconfig.json` — TypeScript 嚴格模式配置
- `vitest.config.ts` — 測試框架配置
- `bunfig.toml` — Bun 運行時配置

### 驗證腳本
- `scripts/generate-dependency-graph.ts` — 依賴圖分析（驗證無循環依賴）
- `scripts/validate-affected-packages.ts` — 受影響包驗證

</canonical_refs>

<code_context>
## Existing Code Insights

### 修復的技術模式

#### 1. 隱式依賴修復模式
**現有案例：** 多個包在 `src` 中導入 `@gravito/atlas` 但 package.json 中未聲明

**修復步驟：**
```bash
# 1. 確認導入
grep -r "@gravito/atlas" packages/{fortify,graphql,pulse,spectrum}/src

# 2. 添加依賴
# 編輯 packages/fortify/package.json，添加 "@gravito/atlas" 到 dependencies

# 3. 驗證
bun run typecheck
bun run build
bun test
```

#### 2. 建構失敗修復模式
**現有案例：** `packages/core/build.ts` 中 `target: 'node'` 與 Bun API 不匹配（已修正為 `target: 'bun'`）

**修復檢查清單：**
- [ ] 檢查構建目標是否與代碼使用的 API 匹配（Bun vs Node）
- [ ] 驗證 ESM/CJS 副檔名一致性
- [ ] 確保 DTS 輸出目錄結構正確

#### 3. 循環依賴修復模式
**檢測：** `bun run scripts/generate-dependency-graph.ts`

**修復選項：**
1. 提取共享模塊（最優）
2. 使用事件解耦（適合跨領域）
3. 重組包邊界（複雜，需規劃）

### 已知的修復案例（參考）
- 7 個包的 `build:dts` 目錄結構問題修正（2026-03-05）— 展示批量修復的驗證模式
- Hono 依賴移除 Phase 2-3（2026-03-07）— 展示大規模修復的測試策略

</code_context>

<deferred>
## Deferred Ideas

### Phase 4+ 待評估的工作

- **High 優先級問題修復** — Phase 3 完成後，評估是否與 Hono Phase 4-5 平行修復
- **@ts-expect-error 審計** — 139 個實例需要逐一審查，確認必要性（Phase 4+ 低優先級）
- **大文件重構** — QueryBuilder (1751 行) 等需要拆分（Phase 5+ 技術債清理）
- **性能基線建立** — N+1 檢測、Proxy 開銷等（Phase 5+ 優化工作）
- **衛星模組驗證** — RBAC、Catalog、Commerce（Phase 5+）

### 使用者提出但範圍外的想法
（無 — 討論過程中未出現範圍外建議）

</deferred>

---

*Phase: 03-fix-critical-issues-if-needed*
*Context gathered: 2026-03-24*
*Next step: Wait for Phase 1 & 2 completion, then trigger Phase 3 planning if Critical issues found*
