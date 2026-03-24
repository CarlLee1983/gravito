# Phase 1: 快速掃描驗證 (1-2 days) - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

驗證 gravito-core 的 60 個包（59 核心 + 1 admin）是否實際可運作。通過快速掃描建立健全性基線，識別阻擋性問題。

**Scope:**
- 執行完整測試套件 (`bun test`)
- TypeScript 類型檢查 (`bun run typecheck`)
- 依賴圖驗證（無循環依賴）
- 核心模組初始化驗證（Core、Photon、Atlas、Signal）
- 端到端流程驗證（2 個關鍵路徑）
- 生成驗證報告

**Timeline:** 1-2 天

**Success Criteria:**
- [ ] 所有 60 個包 `bun test` 通過
- [ ] `bun run typecheck` 0 errors（或明確記錄已知抑制）
- [ ] 無新循環依賴
- [ ] 4 個關鍵模組可初始化
- [ ] 2 個 E2E 路徑可執行
- [ ] HEALTH_CHECK_REPORT.md 已生成

</domain>

<decisions>
## Implementation Decisions

### 驗證順序
- 先執行測試（最能發現問題）
- 再執行類型檢查（編譯正確性）
- 然後驗證依賴（架構完整性）
- 最後驗證 E2E 流程（實際可用性）

### 報告格式
- Markdown 格式
- 包括問題清單、優先級、建議
- 所有發現都要有具體的文件/包名稱

### 已知抑制處理
- 記錄現有的 @ts-ignore 數量（基線）
- 識別新增的類型安全抑制
- 不強求全部修復，但要明確列出

### Claude 的判斷
- E2E 流程選擇：選擇最常用的 2 個關鍵路徑
  - 路徑 1：框架初始化 + HTTP 請求處理
  - 路徑 2：數據庫查詢 + 事件發佈
- 問題優先級定義：
  - Critical：阻擋框架運作
  - High：影響核心功能
  - Medium：邊界情況或警告

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 專案上下文
- `.planning/PROJECT.md` — 項目願景與核心價值
- `.planning/REQUIREMENTS.md` — 18 項 v1 需求
- `.planning/ROADMAP.md` — 6 階段規劃（Phase 1 詳細內容）

### 代碼庫映射
- `.planning/codebase/STACK.md` — 技術棧（Bun、Turbo、Vitest）
- `.planning/codebase/CONCERNS.md` — 已知問題（4 隱式依賴、139 @ts-ignore、ESM/CJS 邊界情況）
- `.planning/codebase/TESTING.md` — 測試框架與覆蓋率
- `.planning/codebase/STRUCTURE.md` — 59 個包組織結構

### 相關工具
- Turbo 配置 — `turbo.json`
- TypeScript 配置 — `tsconfig.json`
- Vitest 配置 — `vitest.config.ts`
- Bun 配置 — `bunfig.toml`

</canonical_refs>
