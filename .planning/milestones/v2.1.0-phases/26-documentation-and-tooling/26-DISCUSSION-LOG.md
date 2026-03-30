# Phase 26: Documentation and Tooling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 26-documentation-and-tooling
**Areas discussed:** noExplicitAny upgrade, noConsole rule, publint CI, orbit/register/use guide

---

## noExplicitAny Upgrade Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| 全部修正 (推薦) | 16 個都換成具體型別或 unknown。數量可控，一次解決 | ✓ |
| 修 src、ignore 測試 | src/ 下的 11 個全部修正；測試檔 5 個加 biome-ignore 註釋 | |
| 全部 biome-ignore | 所有 16 個加 biome-ignore 先過 CI，後續再清理 | |

**User's choice:** 全部修正
**Notes:** None

## noExplicitAny Scope

| Option | Description | Selected |
|--------|-------------|----------|
| 只限 core (推薦) | Biome override 只對 packages/core/src/ 設 error，其他包維持 warn。符合 v2.1.0 範圍 | ✓ |
| 全 monorepo | 全域升為 error。影響範圍大，可能需要大量修正 | |

**User's choice:** 只限 core
**Notes:** None

## noConsole Rule Scope

| Option | Description | Selected |
|--------|-------------|----------|
| 排除 cli/ + Logger (推薦) | noConsole scope 限 core/src/ 但排除 cli/ 和 Logger.ts。其他 ~20 處換成使用 Logger 或加 biome-ignore 說明理由 | ✓ |
| 只限非 cli/ 的 src/ | noConsole 對 core/src/ 生效，但 Biome override 排除 cli/ 子目錄。Logger.ts 和 error handlers 的 console 加 biome-ignore | |
| 全部強制 | 所有 core/src/ 包含 cli/ 都不允許 console。CLI 改用 Logger 或 process.stdout | |

**User's choice:** 排除 cli/ + Logger
**Notes:** None

## publint CI Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Turbo pipeline 任務 (推薦) | publint 加入 turbo.json 作為 build 後的 pipeline 任務，每個有 exports 的包都跑。失敗即 block | ✓ |
| 獨立 CI step | 在 GitHub Actions 中加一個獨立的 publint check step，不透過 Turbo | |
| 只跑 core | 只對 packages/core 執行 publint，其他包後續再加 | |

**User's choice:** Turbo pipeline 任務
**Notes:** None

## orbit/register/use Decision Guide Location

| Option | Description | Selected |
|--------|-------------|----------|
| README 新段落 (推薦) | 在 README.md 現有 API 參考下方加一個 "When to use orbit() vs register() vs use()" 段落，含決策樹和具體範例 | ✓ |
| 獨立 docs/ 檔案 | 建立 docs/guides/orbit-register-use.md，README 只放簡要說明 + 連結 | |
| JSDoc 內嵌 | 直接在 PlanetCore.ts 的 orbit()/register()/use() 方法 JSDoc 中詳細說明，不另建檔案 | |

**User's choice:** README 新段落
**Notes:** None

## Claude's Discretion

- Specific type replacements for each `any` violation
- Exact Logger method mapping for each console replacement
- publint script naming and configuration details
- Decision tree formatting and examples in the orbit/register/use guide
- Order of operations across the 7 requirements

## Deferred Ideas

None -- discussion stayed within phase scope.
