# Phase 16: Core Error Model Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 16-core-error-model-foundation
**Areas discussed:** Error Hierarchy Design

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Error 層級設計 (推薦) | 現有各包 Error 各自為政，如何統一繼承 GravitoException？中間層？FortifyError 整合？ | Y |
| ErrorCode 命名空間 | 命名規則、const object vs enum | |
| Contract Test 策略 | 測試放置位置、shared helper | |
| 遷移相容性 | 過渡策略、deprecated 警告期 | |

---

## Error Hierarchy Design

### Q1: 中間層設計

| Option | Description | Selected |
|--------|-------------|----------|
| 加入中間層 (推薦) | GravitoException -> InfrastructureException/DomainException/SystemException -> 具體 Exception | Y |
| 直接繼承 | 所有 Exception 直接繼承 GravitoException，扁平結構 | |

**User's choice:** 加入中間層
**Notes:** 三層架構：GravitoException -> 中間分類層 -> 具體 Exception

### Q2: FortifyError 整合

| Option | Description | Selected |
|--------|-------------|----------|
| 重寫繼承 DomainException (推薦) | FortifyError -> AuthException extends DomainException，保留 factory methods | Y |
| 保留但加 adapter | 不改 FortifyError，加 toGravitoException() 轉換 | |
| Phase 16 不處理 | 延後到 Phase 19 batch migration | |

**User's choice:** 重寫繼承 DomainException
**Notes:** v2.0.0 breaking change 可接受

### Q3: 中間層放置位置

| Option | Description | Selected |
|--------|-------------|----------|
| 放在 @gravito/core (推薦) | 所有包都依賴 core，無額外依賴 | Y |
| 新建 @gravito/exceptions | 獨立包但增加全局依賴 | |
| 放在 @gravito/resilience | InfrastructureException 相關但 DomainException 不適合 | |

**User's choice:** 放在 @gravito/core
**Notes:** 無

### Q4: 中間層額外欄位

| Option | Description | Selected |
|--------|-------------|----------|
| InfrastructureException 加 retryable (推薦) | 僅 InfrastructureException 加 retryable: boolean | Y |
| 不加額外欄位 | 中間層僅作分類用 | |
| 所有中間層都加欄位 | retryable, userFacing, severity 等 | |

**User's choice:** InfrastructureException 加 retryable
**Notes:** DomainException 和 SystemException 不加額外欄位

---

## Claude's Discretion

- ErrorCode registry 實作細節
- Contract test helper 設計與放置
- 遷移相容性策略
- Constructor API 設計
- Error.captureStackTrace() 使用
- 現有 .message 斷言測試處理

## Deferred Ideas

None

