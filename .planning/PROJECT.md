# Gravito-Core 健全性驗證 (Phase 1: 快速掃描)

## What This Is

驗證 gravito-core 的 60 個包（59 核心 + 1 admin）是否實際可運作。通過快速掃描建立健全性基線，識別阻擋性問題，為後續決策（包括 Hono Phase 4-5 遷移）奠定基礎。

## Core Value

**確保 gravito-core 框架的核心穩定性** — 所有包都能通過測試、編譯無誤、無循環依賴，且關鍵路徑可用。

## Requirements

### Validated

- ✓ Galaxy Architecture 基礎設計（59 個包已組織）— Phase 2026-02
- ✓ NativeEngine Phase 1 完成（92 測試通過）— 2026-03-02
- ✓ Photon 性能測試框架（41 性能測試）— 2026-03-02
- ✓ Satellite RBAC DCI 架構完成（110 測試）— 2026-03-02
- ✓ Satellite Catalog Phase 1-3 完成（184 測試）— 2026-03-02
- ✓ Satellite Commerce DDD+DCI（71 測試）— 2026-03-02
- ✓ Hono 遷移 Phase 2-3（9 包、23 檔案、581 tests pass）— 2026-03-07
- ✓ 代碼庫映射完成（7 結構化文檔）— 2026-03-24

### Active

- [ ] **測試全覆蓋** — `bun test` 所有 60 個包通過，0 failures
- [ ] **類型檢查通過** — `bun run typecheck` 0 errors
- [ ] **無循環依賴** — 驗證包依賴圖潔淨
- [ ] **關鍵模組可用** — Core、Photon、Atlas、Signal 實際運作
- [ ] **E2E 路徑驗證** — 1-2 個常用流程可正常執行
- [ ] **驗證報告** — 問題清單 + 優先級排序

### Out of Scope

- 性能優化 — 掃描不包括深度性能審計，留給後續
- 文檔完整性審計 — API 文檔檢查留待需要時
- 安全審計 — 不在快速掃描範圍，單獨評估
- Hono Phase 4-5 遷移規劃 — 建立基線後再決策
- 新功能開發 — 純驗證工作，無新代碼

## Context

**Brownfield 環境：** gravito-core 是成熟的 monorepo（64 個包、15 個衛星），已有大量工作。

**已完成工作：**
- Galaxy Architecture 設計與實現
- 核心模組（Core、Photon、Atlas、Signal）基本完成
- 衛星模組（RBAC、Catalog、Commerce）DCI/DDD 實現
- Hono 依賴移除 Phase 2-3 已完成

**已知問題（來自 CONCERNS.md）：**
- 4 個隱式依賴
- 139 個類型安全抑制（`@ts-ignore`）
- ESM/CJS 構建系統邊界情況
- 部分 middleware 測試被跳過
- 59 個包的 monorepo 可擴展性挑戰

**決策背景：**
- 選擇 B 路線：先驗證現有 60 個包，再決定 Hono Phase 4-5
- 時間線優先：快速掃描（1-2 天）勝過完整審計
- 建立基線：為後續修復和遷移提供清晰圖景

## Constraints

- **時間線**：1-2 天（快速掃描）— 驗證工作不應拖累 Hono 遷移
- **範圍**：60 個包（59 核心 + 1 admin） — 衛星不在此階段
- **工具**：現有 build/test 工具（Bun、Vitest、Turbo）— 無新工具
- **依賴**：codebase map 已完成，可直接進行
- **輸出**：markdown 報告 + 優先級清單 — 簡潔可操作

## Key Decisions

| 決策 | 理由 | 結果 |
|------|------|------|
| B 路線（先驗證現有） | 大型遷移前需要穩定基礎 | ✓ 已選擇 |
| 快速掃描範圍 | 1-2 天內可完成，足以識別阻擋問題 | ✓ 已選擇 |
| 先驗證，後修復 | 清晰了解問題才能優先排序 | — 實施中 |
| 建立基線文檔 | 為後續決策提供數據支撐 | — 待生成 |

---

**最後更新：** 2026-03-24 專案初始化
**下一步：** 建立 REQUIREMENTS.md 和 ROADMAP.md，進入 Phase 1 規劃
