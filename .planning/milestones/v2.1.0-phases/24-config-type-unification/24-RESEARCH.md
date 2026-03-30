# Phase 24: Config Type Unification - Research

**Researched:** 2026-03-30
**Domain:** TypeScript type system — interface inheritance, Pick utility type, source-compatible refactoring
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Strictly follow TYPE-01 — only unify `logger` and `config` fields. Do not expand to adapter, container, observabilityProvider, or any other GravitoConfig fields. Future phases can extend if needed.
- **D-02:** Direct modification without compatibility shim. The actual types are identical (`logger?: Logger`, `config?: Record<string, unknown>`), so the change is source-compatible. If `bun run typecheck` passes, the change is safe.
- **D-03:** Add proper JSDoc to `logger` and `config` fields in `GravitoConfig` (PlanetCore.ts) as the single documentation source.

### Claude's Discretion

- Exact JSDoc wording for the two fields in GravitoConfig
- Whether to keep ApplicationConfig as `interface` (using intersection) or change to `type` (if needed for extends Pick<> syntax)
- Test structure: new test file vs adding to existing PlanetCore/Application test files

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPE-01 | ApplicationConfig 改為 `extends Pick<GravitoConfig, 'logger' \| 'config'>` 消除欄位重複 | TypeScript interface 可以 extends Pick<T, K> — 標準語法，HIGH confidence |
| FIX-03 | PlanetCore.boot() 正確傳遞 observabilityProvider（已在 Phase 21 完成）| 現有測試 ioc.test.ts:67 已驗證此行為，只需確認測試存在即可 |
</phase_requirements>

## Summary

Phase 24 是一個純 TypeScript 型別重構，範圍極小且風險低。目標是讓 `ApplicationConfig` 的 `logger` 和 `config` 欄位從 `GravitoConfig` 繼承而來，消除在兩個型別中手動維護相同欄位定義的重複。

變更只涉及兩個檔案：`packages/core/src/Application.ts`（移除重複欄位、加上 `extends Pick<GravitoConfig, 'logger' | 'config'>`）和 `packages/core/src/PlanetCore.ts`（為 `logger` 和 `config` 欄位補充 JSDoc）。因為兩個型別的欄位定義完全相同，這是 source-compatible 變更，不需要相容性 shim。

FIX-03（boot() 正確傳遞 observabilityProvider）已在 Phase 21 完成，現有測試 `ioc.test.ts:67` 已覆蓋此行為。Phase 24 只需驗證現有測試仍通過。

**Primary recommendation:** 先加 JSDoc 至 GravitoConfig，再修改 ApplicationConfig extends — 先建立好 single source of truth 再引用它，避免中間狀態不一致。

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x (workspace) | 型別系統 | 專案標準，不需安裝 |
| bun:test | Bun 1.x | 測試框架 | 專案標準測試框架 |

無需額外安裝任何套件。這是純型別重構。

**Installation:** 不需要

## Architecture Patterns

### TypeScript interface extends Pick Pattern

**What:** TypeScript `interface` 可以直接 `extends` 一個 mapped/utility type，包含 `Pick<T, K>`。

**When to use:** 當 interface 需要共享另一個型別的部分欄位定義時。

**Example:**
```typescript
// packages/core/src/PlanetCore.ts
export type GravitoConfig = {
  /**
   * Logger instance for the application.
   * Defaults to ConsoleLogger if not provided.
   * @since 2.0.0
   */
  logger?: Logger

  /**
   * Initial configuration values, loaded into ConfigManager.
   * @since 2.0.0
   */
  config?: Record<string, unknown>

  // ... other fields unchanged
}

// packages/core/src/Application.ts
import type { GravitoConfig } from './PlanetCore'

export interface ApplicationConfig extends Pick<GravitoConfig, 'logger' | 'config'> {
  // logger and config fields come from GravitoConfig — do NOT repeat them here
  basePath: string
  configPath?: string
  providersPath?: string
  env?: 'development' | 'production' | 'testing'
  providers?: ServiceProvider[]
  autoDiscoverProviders?: boolean
}
```

**Verification:** `interface A extends Pick<T, K>` 是 TypeScript 標準語法（HIGH confidence，核心語言特性）。`bun run typecheck` 通過即表示型別相容。

### Current State Analysis

`ApplicationConfig` 目前使用 `interface` 關鍵字（Application.ts:68）。TypeScript 的 `interface` 可以直接 `extends` utility type（如 `Pick`），不需要改成 `type`。這是 **Claude's Discretion** 中的問題：答案是可以保持 `interface`。

```typescript
// 這個語法是合法的 TypeScript：
interface ApplicationConfig extends Pick<GravitoConfig, 'logger' | 'config'> {
  basePath: string
  // ...
}
```

### Import Requirement

`Application.ts` 目前 import 了 `PlanetCore`（第 26 行）但沒有獨立 import `GravitoConfig` 型別。需要添加：

```typescript
import type { GravitoConfig } from './PlanetCore'
```

或者直接從 PlanetCore import 中附加 type（但目前 Application.ts import 是 value import）：

```typescript
import { PlanetCore } from './PlanetCore'
import type { GravitoConfig } from './PlanetCore'
```

TypeScript 支援同個模組的 value/type 分開 import。

### Anti-Patterns to Avoid

- **重複欄位定義（當前問題）:** 在兩個 interface 中各自定義 `logger` 和 `config` → 未來任一個型別改變時需同步兩處
- **過度展開 extends 範圍:** 只 Pick `logger | config`，不要 Pick 其他 GravitoConfig 欄位（D-01 鎖定決策）
- **新增不必要的 compatibility shim:** 型別相同，直接修改即可（D-02 鎖定決策）

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 欄位相容性驗證 | 手動比較欄位 | `bun run typecheck` | TypeScript 編譯器已處理所有型別相容性檢查 |
| 型別一致性保證 | 執行期檢查 | `extends Pick<>` 型別關係 | 編譯期保證，零執行期成本 |

**Key insight:** TypeScript 的型別系統本身就是最好的相容性保證工具。`bun run typecheck` 通過即驗證完成。

## Common Pitfalls

### Pitfall 1: 忘記更新 import 語句

**What goes wrong:** 在 Application.ts 加上 `extends Pick<GravitoConfig, ...>` 後，TypeScript 報告 `GravitoConfig` 找不到。
**Why it happens:** `GravitoConfig` 目前沒有被 Application.ts 直接 import（只有 `PlanetCore` class 被 import，型別需要獨立引用）。
**How to avoid:** 在修改 interface 前先加 `import type { GravitoConfig } from './PlanetCore'`。
**Warning signs:** `TS2304: Cannot find name 'GravitoConfig'`。

### Pitfall 2: 在 ApplicationConfig 中保留欄位造成隱式覆寫

**What goes wrong:** 只加了 extends，但沒有移除 `logger?` 和 `config?` 欄位宣告，導致欄位被重新定義（即使型別相同，這違背 single source of truth 的目標）。
**Why it happens:** 忘記刪除舊欄位定義。
**How to avoid:** extends 加完後，明確移除 `logger?` 和 `config?` 欄位宣告（Application.ts:93-99 這兩個欄位需要刪除）。
**Warning signs:** TypeScript 可能在某些情況下允許重複欄位（若型別兼容），但這違背 SC-1 的「存在於一個地方」要求。

### Pitfall 3: JSDoc 遺漏造成 IDE hover 體驗退化

**What goes wrong:** 修改 extends 後，在 ApplicationConfig 型別中的 `logger` 欄位沒有 JSDoc（因為已移除宣告）；GravitoConfig 若沒有 JSDoc，IDE hover 顯示空白。
**Why it happens:** 先刪除欄位（含 JSDoc），但忘記在 GravitoConfig 補充 JSDoc（D-03 決策）。
**How to avoid:** 先在 GravitoConfig 加 JSDoc，再刪除 ApplicationConfig 中的重複欄位。

### Pitfall 4: observabilityProvider 測試誤以為需要新增

**What goes wrong:** 研究者/規劃者誤以為 FIX-03 需要新增測試。
**Why it happens:** FIX-03 已在 Phase 21 完成，`ioc.test.ts:67` 已驗證此行為。
**How to avoid:** Phase 24 只需確認現有測試仍通過（`bun test packages/core`），不需要新增 FIX-03 測試。

## Code Examples

### 修改後的 ApplicationConfig

```typescript
// packages/core/src/Application.ts
import type { GravitoConfig } from './PlanetCore'  // 新增此 import

/**
 * Application Config options for the Application class.
 * @public
 */
export interface ApplicationConfig extends Pick<GravitoConfig, 'logger' | 'config'> {
  /**
   * Base path of the application
   */
  basePath: string

  /**
   * Path to the config directory (relative to basePath)
   * @default 'config'
   */
  configPath?: string

  /**
   * Path to the providers directory (relative to basePath)
   * @default 'src/Providers'
   */
  providersPath?: string

  /**
   * Environment (development, production, testing)
   */
  env?: 'development' | 'production' | 'testing'

  /**
   * Service providers to register
   */
  providers?: ServiceProvider[]

  /**
   * Whether to auto-discover providers from providersPath
   * @default true
   */
  autoDiscoverProviders?: boolean
}
// NOTE: logger? and config? fields are removed — they come from Pick<GravitoConfig, 'logger' | 'config'>
```

### GravitoConfig 需要補充的 JSDoc

```typescript
// packages/core/src/PlanetCore.ts — logger 和 config 欄位新增 JSDoc
export type GravitoConfig = {
  /**
   * Logger instance for the application.
   * Used by both PlanetCore and Application. Defaults to ConsoleLogger if not provided.
   * @since 2.0.0
   */
  logger?: Logger

  /**
   * Initial configuration values, loaded into ConfigManager on boot.
   * Accessible via `core.config` or `app.config` after booting.
   * @since 2.0.0
   */
  config?: Record<string, unknown>

  // ... other fields unchanged
}
```

### 現有 FIX-03 驗證測試（已存在，不需新增）

```typescript
// packages/core/tests/ioc.test.ts:67
it('should forward observabilityProvider from boot() to constructor', async () => {
  const mockProvider = { /* ... */ }
  const core = await PlanetCore.boot({
    observabilityProvider: mockProvider as any,
  })
  expect(core.observabilityProvider).toBe(mockProvider)
})
```

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (Bun native) |
| Config file | packages/core/package.json `"test": "bun test --timeout=10000"` |
| Quick run command | `cd packages/core && bun test tests/ioc.test.ts` |
| Full suite command | `cd packages/core && bun run test` |
| Workspace typecheck | `bun run typecheck` (workspace root) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-01 | ApplicationConfig extends Pick — 型別相容性 | 型別檢查 | `cd packages/core && bun run typecheck` | N/A (typecheck，非測試檔) |
| TYPE-01 | ApplicationConfig extends Pick — 欄位仍可使用 | unit | `cd packages/core && bun test tests/application.test.ts` | ✅ |
| FIX-03 | boot() 傳遞 observabilityProvider | unit | `cd packages/core && bun test tests/ioc.test.ts` | ✅ |
| SC-3 | Workspace 整體 typecheck | 型別檢查 | `bun run typecheck` (root) | N/A |

### Sampling Rate

- **Per task commit:** `cd packages/core && bun run typecheck`
- **Per wave merge:** `cd packages/core && bun run test && bun run typecheck`
- **Phase gate:** `bun run typecheck` (workspace root) green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. 可能需要新增一個 type-level test 確認 `logger` 和 `config` 欄位型別從 GravitoConfig 正確繼承，但這是可選的（typecheck 通過已足夠保證）。

## Project Constraints (from CLAUDE.md)

從 `./CLAUDE.md` 提取的強制性指令（規劃者必須遵守）：

1. **TypeScript 嚴格模式：** `noUnusedLocals` 和 `noUnusedParameters` 啟用 — 移除欄位後確認無未使用宣告
2. **禁止 @ts-ignore：** 除非附加說明；此次修改不應需要 @ts-ignore
3. **代碼風格：** 100 字元寬、2 空格縮排、單引號、無分號、ES5 尾隨逗號
4. **Commit Message：** 使用英文（例：`refactor: [core] unify ApplicationConfig logger/config via Pick<GravitoConfig>`）
5. **禁止 mutation：** 此次為純型別修改，不涉及執行期邏輯，不適用
6. **函數大小：** 此次不涉及函數修改
7. **Satellite 隔離原則：** 此次修改限於 `packages/core`，不涉及 Satellite

## Environment Availability

Step 2.6: SKIPPED — 此 Phase 為純型別/代碼修改，無外部工具依賴。所需工具（Bun、TypeScript）已在專案中就緒（`packages/core` typecheck 通過確認）。

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 兩個 interface 各自重複定義 logger/config | ApplicationConfig extends Pick<GravitoConfig, 'logger' \| 'config'> | Phase 24 | 消除欄位重複，單一 source of truth |

**Deprecated/outdated:**
- ApplicationConfig 中直接宣告 `logger?` 和 `config?`：Phase 24 完成後，這些欄位宣告將移除

## Open Questions

無重大開放問題。此 Phase 研究充分，所有技術問題均已解決。

## Sources

### Primary (HIGH confidence)

- TypeScript Handbook — Utility Types (Pick) 和 interface extends：標準語言特性，編譯器行為已知
- `packages/core/src/Application.ts` (Application.ts:68-111)：直接代碼審查
- `packages/core/src/PlanetCore.ts` (PlanetCore.ts:85-157)：直接代碼審查
- `packages/core/tests/ioc.test.ts` (line 67)：FIX-03 現有測試確認

### Secondary (MEDIUM confidence)

- 無

### Tertiary (LOW confidence)

- 無

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 純 TypeScript 型別系統特性，無外部依賴
- Architecture: HIGH — 直接代碼審查確認所有細節
- Pitfalls: HIGH — 從代碼審查直接識別，非推測

**Research date:** 2026-03-30
**Valid until:** 穩定 — TypeScript interface extends Pick 是核心語言特性，不會改變
