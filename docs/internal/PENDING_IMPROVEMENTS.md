# Pending Improvements & Future Tasks

This document tracks deferred tasks, pending refactorings, and future optimization goals. Items previously listed and completed in Issue 1.1/1.2 have been removed.

## 🔴 High Priority

### Core `any` Type Reduction (Phase 8)
- **Task**: Systematically replace `any` with `unknown` or specific generics in core packages.
- **Implementation Details**:
    - **Category A (unknown)**: 將 `catch (error: any)` 改為 `unknown` 並配合 type guards。
    - **Category B (Generics)**: 為 `json(data: any)` 等方法引入泛型 `json<T>(data: T)`。
    - **Category C (Runtime Compatibility)**: 針對 `runtime.ts` 中的 Deno 訪問，建立 `deno.d.ts` 聲明文件或保留具備正當理由的 `any`。
- **Focus Areas**: `Route.ts`, `runtime.ts` (Deno compatibility), and `BunNativeAdapter.ts`.
- **Source**: `technical-debt-cleanup-plan.md` (Phase 8)

## 🟡 Medium Priority

### Large File Refactoring (Phase 20 - Remaining)
- **Core Router**: `packages/core/src/Router.ts` (~932 lines). Requires deep analysis of routing logic and type conflicts before splitting.
- **Zenith Server Index**: `packages/zenith/src/server/index.ts` (~856 lines). Needs architectural redesign to decouple initialization logic.
- **Source**: `optimization-roadmap.md` (Phase 20)

### Scaffold Generator Enhancements
- **CleanArchitectureGenerator**: Further extraction of template logic into `TemplateManager`.
- **EnterpriseMvcGenerator**: Complete integration with `ConfigGenerator` and `ServiceProviderGenerator`.
- **Source**: `optimization-roadmap.md` (Phase 20)

### Future Architectural Refactors
- **Source**: `model-refactoring-plan.md` (Phases 2 & 3)

### Satellite Standardization (The Great Refactoring)
- **Task**: Ensure all official satellites (Catalog, Payment, Order) conform to Clean Architecture.
- **Goals**:
    - Implement `Domain`, `Application`, `Infrastructure`, `Interface` layering.
    - Extract business logic into `UseCase` classes.
    - Standardize Dependency Injection patterns to reduce `c.get()` usage.
- **Source**: `FUTURE_ROADMAP_SATELLITE_DX.md`

### Cross-Satellite Decoupling
- **Task**: Eliminate hard-coded dependencies between satellite domains.
- **Goals**:
    - **Hook Governance**: Standardize namespacing for all `Action` and `Filter` hooks.
    - **Event Schema Validation**: Implement payload validation in `OrbitSignal`.
    - **Distributed Resilience**: Integrate circuit breakers and retries for cross-satellite async calls.
- **Source**: `FUTURE_ROADMAP_SATELLITE_DX.md`

### Diagnostic & DX Tools
- **Task**: Build the `gravito doctor` CLI suite.
- **Sub-tasks**:
    - **`gravito doctor`**: Environment, Orbit config, and Bun runtime compatibility check.
    - **`gravito check:schema`**: Atlas model vs. DB schema drift detection.
    - **N+1 Static Analyzer**: Linter/Tool to detect repository calls within loops in `UseCase`.
- **Source**: `FUTURE_ROADMAP_SATELLITE_DX.md`

## 🟢 Low Priority

### Deprecated API Cleanup (Phase 10)
- **Task**: Establish a clear removal schedule for deprecated APIs.
- **Implementation Details**:
    - **API Inventory**: 追蹤 `signal/Queueable.ts`, `atlas/Grammar.ts`, `beam/index.ts`, `cosmos/index.ts`, `stasis/index.ts`, `core/types.ts` 等處的 `@deprecated` 標記。
    - **Migration Guide**: 建立 `docs/MIGRATION.md` 提供明確的替代方案（如 `ctx.matchedRoute` 遷移至 `ctx.route()`）。
    - **Runtime Warnings**: 評估是否在開發環境添加 runtime 警告。
- **Sub-tasks**:
    - Create `docs/MIGRATION.md` with detailed transition guides.
    - Add runtime deprecation warnings where appropriate.
- **Source**: `technical-debt-cleanup-plan.md` (Phase 10)

### Performance & Monitoring
- **Continuous Benchmarking**: Automate the execution of the performance benchmarking suite in CI.
- **Bundle Size Monitoring**: Set up automated alerts for significant bundle size increases.
- **Source**: `optimization-roadmap.md` (Phase 16)

---
*Last Updated: 2026-02-23*
*Maintained by Antigravity*
