# Pending Improvements & Future Tasks

This document tracks deferred tasks, pending refactorings, and future optimization goals extracted from various roadmap and cleanup plans.

## 🔴 High Priority

### QueryBuilder Clauses Integration (Phase 19.2)
- **Task**: Integrate newly created clauses (Select, Where, Join, Limit) into the main `QueryBuilder.ts`.
- **Sub-tasks**:
    - Fix `JoinClause` type conflicts with `types/index.ts`.
    - Rewrite `QueryBuilder` methods to delegate to clause classes.
    - Ensure 100% backward compatibility and pass all existing tests.
- **Source**: `optimization-roadmap.md` (Phase 19.2)

### Fortify Email Integration (Phase 7)
- **Task**: Implement email sending for verification and password resets.
- **Implementation Details**:
    - **VerifyEmailMail**: 實作 `Mailable` 類別，包含 `to()`, `subject()`, `html()` 等方法，發送驗證連結。
    - **ResetPasswordMail**: 實作密碼重設郵件模板，包含重設連結與過期說明。
    - **Controller Integration**: 在 `VerifyEmailController` 與 `ForgotPasswordController` 中注入 `mailService` 並呼叫 `mail.send()`。
- **Sub-tasks**:
    - Integrate `VerifyEmailMail` and `ResetPasswordMail` into their respective controllers.
    - Ensure `@gravito/signal` is properly utilized for mail delivery.
- **Source**: `technical-debt-cleanup-plan.md` (Phase 7)

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
- **Model Refactoring (Phase 2 & 3 - Deferred)**: 
    - **Integration of Concerns**: While deferred for 1.x stability, future versions should evaluate full integration of `HasAttributes`, `HasRelationships`, etc., into the `Model` class using a more robust mixin or composition pattern.
    - **Static Query Extraction**: Extract static methods into specialized concerns like `StaticQueries` or `QueryHelpers`.
    - **Migration Details (Phase 3)**:
        | Method | Suggested Module |
        |--------|------------------|
        | query(), first(), find(), findOrFail(), all(), createAndSave() | StaticQueries concern |
        | lazyAll() | LazyQueries concern |
        | cursor() | Cursor concern |
        | count(), exists() | Aggregations concern |
        | where(), whereIn(), whereNull(), whereNotNull(), orderBy(), limit(), offset(), select(), latest(), oldest() | QueryHelpers concern |
        | with() | EagerLoading concern |
- **Source**: `model-refactoring-plan.md` (Phases 2 & 3)

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
*Last Updated: 2026-02-03*
