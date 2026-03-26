# Gravito-Core Obsidian 文檔保管庫

## What This Is

為 gravito-core 框架的 60 個包構建一個結構良好的 Obsidian vault。通過清晰的入門路徑、核心概念解說、實際使用範例和模組依賴圖，讓新開發者、內部專家、使用者和客戶都能有效地理解和使用每個模組。

## Core Value

**一個統一的文檔入口** — 無論是新開發者快速上手、專家深度參考、還是使用者查詢功能，都能在結構化的 Obsidian vault 中找到所需信息。

## Requirements

### Validated

(無 — 首次創建，待驗證)

### Active

- [ ] **Core、Atlas、Photon 模組文檔** — 優先完成 3 個核心模組的完整文檔（概念、API、範例）
- [ ] **一致的文檔結構** — 所有模組遵循統一的格式（概述、架構、核心概念、使用範例、常見模式）
- [ ] **清晰的入門指南** — 按開發者角色分類的快速開始路徑（貢獻者、集成者、使用者）
- [ ] **模組依賴關係圖** — 視覺化展示模組間的依賴和通信模式
- [ ] **雙向鏈接和圖譜** — 充分利用 Obsidian 的知識圖譜功能，幫助讀者探索模組關係
- [ ] **實戰範例和最佳實踐** — 每個模組至少 2-3 個實戰使用範例
- [ ] **Obsidian vault 發佈** — 生成完整的 vault 檔案結構，供讀者直接在 Obsidian 中打開使用

### Out of Scope

- API 完整參考生成 — 文檔專注於概念和使用，不做自動 API 參考生成
- 性能文檔 — 性能優化留給後續專項工作
- 完整的 60 個包文檔 — 首階段只覆蓋 core、atlas、photon 等核心模組；其餘模組分階段推進
- 視頻教程 — 文檔形式以 markdown + 圖表為主

## Context

**Brownfield 環境：** gravito-core 已經運作多年，擁有 60 個核心包和 15 個衛星模組。

**當前痛點：**
- 文檔結構混亂，信息散落在各處
- 內容不完整，缺乏統一的深度
- 書寫風格不一致，難以形成學習路徑
- 新開發者入門指南缺失，上手曲線陡峭

**目標讀者層次：**
1. **新開發者 / 貢獻者** — 需要快速上手、了解基本概念和開發流程
2. **內部經驗員工 / 領域專家** — 需要深度參考、架構決策文檔
3. **使用者 / 客戶** — 需要了解功能、最佳實踐和常見問題解決

**已有基礎：**
- Gravito-Core 代碼庫完整可用
- 部分模組已有基礎文檔
- Obsidian 可作為編寫和發佈工具

## Constraints

- **時間線**：1-2 週內完成 core、atlas、photon 三個核心模組的文檔 — 這是高優先級阻擋工作
- **工具**：Obsidian CLI + 標準 markdown 格式 — 無複雜自動化需求
- **讀者多元性**：文檔需要層次化，同時滿足新手和專家的不同需求
- **範圍控制**：首階段聚焦 3 個核心模組，後續擴展到全部 60 個包
- **可維護性**：文檔結構應便於持續更新和貢獻

## Key Decisions

| 決策 | 理由 | 結果 |
|------|------|------|
| 優先核心模組 | 3 個模組完成度高於 60 個模組完成度低 | ✓ 已選擇 |
| Obsidian vault 發佈 | 充分利用雙向鏈接和圖譜，提升讀者體驗 | ✓ 已選擇 |
| 層次化文檔設計 | 同時服務不同角色的讀者，避免單一風格 | ✓ 已選擇 |
| 標準化結構 | 所有模組遵循一致格式，便於維護和擴展 | — 待實施 |

---

## Milestone: v1.3.10 (COMPLETE)

**Status:** ✅ **COMPLETE** — 2026-03-26
**Duration:** 3 days (2026-03-24 to 2026-03-26)
**Phases:** 6 + 4B sub-phases (10 phases total, all complete)

### Achievements

**Health Stabilization:**
- Phase 1: Baseline audit → 78/100 (identified 17 issues: 2 critical, 9 high, 2 medium, 4 low)
- Phase 2A-C: Critical & high-priority fixes → 90/100 (implicit deps fixed, test failures reduced from 162→43)
- Phase 4A: Intermittent test elimination → 93/100 (3x stable runs, variance ±1, 99.7% pass rate)

**Hono Migration (Phases 4B-1 through 4B-6):**
- Phase 4B-1: Easy compat shims (http-exception, routers, logger, websocket)
- Phase 4B-2: JWT native implementation (jose library)
- Phase 4B-3: External package cleanup (mass, beam, zenith)
- Phase 4B-4: Platform adapters deprecation (cloudflare, deno, vercel)
- Phase 4B-5: RPC client strategy (hono/client type-only)
- Phase 4B-6: OpenAPI scoping & final cleanup (removed bun.ts, scoped @hono/zod-openapi)
- **Result:** Hono fully removed from dependencies; backwards compatibility maintained

**Satellite Verification (Phase 5):**
- RBAC: 110/110 tests PASS ✅
- Catalog: 183/183 tests PASS ✅
- Commerce: 71/71 tests PASS ✅

**Full Framework Audit (Phase 6):**
- Performance: ✅ HTTP p99=72.6μs, 67k req/s throughput, 55.66MB memory
- Documentation: ⚠️ JSDoc 38% (Core 27%, Signal 60%, Photon 100%)
- Security: ✅ 0 production vulnerabilities, 0 hardcoded secrets

### Final Metrics

| Metric | Baseline | Final | Status |
|--------|----------|-------|--------|
| Health Score | 78/100 | 93/100 | ✅ +15 improvement |
| Test Pass Rate | 96.9% | 99.7% | ✅ Stable |
| Failed Tests | 162 | 40–41 | ✅ 75% reduction |
| TypeScript Errors | 0 | 0 | ✅ Maintained |
| Circular Dependencies | 0 | 0 | ✅ Maintained |
| Hono References | 12 compat shims + 3 external | 0 | ✅ Complete removal |

### Archived Files

- [`v1.3.10-ROADMAP.md`](./milestones/v1.3.10-ROADMAP.md) — Full phase details (835+ lines)
- [`v1.3.10-REQUIREMENTS.md`](./milestones/v1.3.10-REQUIREMENTS.md) — Requirements & outcomes

---

## Next Milestone: v1.4.0 (PLANNING)

**Status:** 📋 Ready to start

### Recommended Priorities (from v1.3.10 audit)

1. **Documentation Enhancement** (Priority 1 — 8 hours)
   - Improve JSDoc coverage in Core + Signal packages → target 90%
   - Core currently at 27% (gap: 11 undocumented exports)
   - Signal currently at 60% (gap: ~5 undocumented exports)

2. **Security Pattern Documentation** (Priority 2)
   - Document unsafe patterns (eval, Function usage)
   - Justify continued usage vs. deprecation timeline

3. **Bundle Optimization** (Priority 3 — Optional)
   - Long-duration performance testing
   - Optional size optimizations

**To start v1.4.0:** Use `/gsd:new-milestone v1.4.0`

---

*Last updated: 2026-03-26 (milestone completion & archival)*
