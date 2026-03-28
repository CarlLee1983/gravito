# Phase 16: Core Error Model Foundation - Research

**Researched:** 2026-03-28
**Domain:** TypeScript 錯誤層次設計、ESM/CJS instanceof 相容性、Contract Test 架構
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 三層層次結構：
  ```
  GravitoException (abstract, @gravito/core)
  ├─ HttpException (HTTP layer)
  ├─ InfrastructureException (I/O operations)
  │  ├─ DatabaseException (atlas)
  │  ├─ CacheException (plasma)
  │  ├─ MailException (signal)
  │  └─ QueueException (quasar)
  ├─ DomainException (business logic)
  │  ├─ AuthException (fortify)
  │  └─ ValidationException
  └─ SystemException (internal framework)
     ├─ CircularDependencyException
     └─ ConfigurationException
  ```
- **D-02:** `InfrastructureException` 加入 `retryable: boolean` 欄位供 Phase 17 使用。`DomainException` 和 `SystemException` 無額外欄位。
- **D-03:** 所有中間層 (`InfrastructureException`, `DomainException`, `SystemException`) 定義於 `@gravito/core` 的 `packages/core/src/exceptions/`。Concrete exceptions 定義於各自的 Orbit 包。
- **D-04:** 每個 error constructor 必須呼叫 `Object.setPrototypeOf(this, ClassName.prototype)` 以確保 ESM/CJS instanceof 相容性。參考實作：`RippleError`、`AstralError`。
- **D-05:** `FortifyError` 將改寫為繼承 `DomainException`（作為 `AuthException`）。保留現有 30+ factory methods 和 `ErrorCodes` registry pattern。這是 v2.0.0 breaking change。
- **D-06:** 採用 fortify 既有 pattern：點分隔命名空間字串（如 `db.connection_failed`、`redis.timeout`、`auth.invalid_credentials`）。每個 Orbit 包定義自己的 `ErrorCodes` const 物件。
- **Zero new dependencies:** 此 phase 不引入任何新依賴。

### Claude's Discretion

- ErrorCode registry 實作細節（const object 結構、type 生成）
- Contract test helper 設計與放置位置
- Migration 相容性策略（deprecated warnings、transition period）
- Intermediate exception class 的精確 constructor API
- 是否在 `Object.setPrototypeOf` 之外使用 `Error.captureStackTrace()`
- 如何處理現有斷言 `.message` 字串的測試

### Deferred Ideas (OUT OF SCOPE)

無 — 討論保持在 phase 範圍內。
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ERRM-01 | 所有 Orbit 包的 Error 類別繼承 GravitoException，消除 bare `throw new Error()` | Phase 16 建立中間層與 contract test 框架；具體 Orbit 遷移在 Phase 18-19 |
| ERRM-02 | 每個 Orbit 包定義結構化錯誤碼命名空間（如 `db.connection_failed`、`redis.timeout`） | fortify ErrorCodes pattern 已驗證；本 phase 為 atlas/plasma/signal/quasar 建立 ErrorCodes 骨架 |
| ERRM-03 | 所有錯誤正確傳播 cause 欄位，保留完整錯誤鏈 | GravitoException 已有 `cause` via ExceptionOptions；需確保所有 new 的中間層通過 cause |
</phase_requirements>

---

## Summary

Phase 16 的核心工作是**擴展現有的 `GravitoException` 層次結構**，加入三個新的中間層（`InfrastructureException`、`DomainException`、`SystemException`），並為各 Orbit 包建立 `ErrorCodes` const 物件，最後為合規性驗證建立 contract test 骨架。

**重要發現：** `GravitoException` 本身**尚無** `Object.setPrototypeOf` 呼叫。現有的 `AuthenticationException`、`AuthorizationException`、`HttpException`、`ValidationException` 也都缺乏這個呼叫，但 `AstralError`、`ChromaticError`、`RippleError`、`InertiaError` 等非核心包已正確實作。Phase 16 必須補上這個缺口。

**補充發現：** `CircularDependencyException` 目前繼承 `Error`（非 `GravitoException`）；`FortifyError` 使用 `httpStatus` 欄位而非 `status`（Phase 19 的 open question）。

**Primary recommendation:** 以最小改動擴展現有 `GravitoException` 基礎設施——加入中間層、補上 `Object.setPrototypeOf`、建立 contract test helper——不重寫任何已穩定的邏輯。

---

## Standard Stack

### Core（此 phase 均在已有依賴中）

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| bun:test | bundled with Bun | 測試框架 | 整個 monorepo 統一使用 |
| TypeScript | ^5.9.3 | 靜態型別 | 專案標準，strict mode |

無新依賴。此 phase 為 zero-dependency。

### 現有代碼資產（直接可用）

| 資產 | 位置 | 用途 |
|------|------|------|
| `GravitoException` | `packages/core/src/exceptions/GravitoException.ts` | 所有新層的基底，已有 `status`、`code`、`cause`、`i18nKey` |
| `ExceptionOptions` | 同上 | constructor params 型別，可直接複用或擴展 |
| `ErrorCodes` pattern | `packages/fortify/src/errors/codes.ts` | `as const` 物件 + type 生成的正規模板 |
| `Object.setPrototypeOf` pattern | `packages/astral/src/errors.ts` | 每個 class 各自呼叫，通過具名 prototype |
| `new.target.prototype` pattern | `packages/ion/src/errors.ts` | 更通用，適合 base class；`Object.setPrototypeOf(this, new.target.prototype)` |
| `Error.captureStackTrace?.(this, this.constructor)` | `packages/ion/src/errors.ts` | V8 stack trace 精簡（選擇性使用） |

---

## Architecture Patterns

### Recommended Project Structure（Phase 16 新增項目）

```
packages/core/src/exceptions/
├─ GravitoException.ts          (修改: 加入 Object.setPrototypeOf)
├─ InfrastructureException.ts   (新增: retryable: boolean)
├─ DomainException.ts           (新增: abstract 中間層)
├─ SystemException.ts           (新增: abstract 中間層)
├─ HttpException.ts             (修改: 加入 Object.setPrototypeOf)
├─ AuthenticationException.ts   (修改: 移至 DomainException 子類)
├─ AuthorizationException.ts    (修改: 移至 DomainException 子類)
├─ ValidationException.ts       (修改: 移至 DomainException 子類)
├─ CircularDependencyException.ts (修改: 移至 SystemException 子類)
├─ ConfigurationException.ts    (新增: SystemException 子類)
├─ ModelNotFoundException.ts    (現況: 已繼承 GravitoException，暫不移動)
└─ index.ts                     (修改: 加入所有新 exports)

packages/core/tests/
└─ contract/
   ├─ helpers.ts               (新增: assertGravitoException helper)
   └─ core-exceptions.contract.test.ts  (新增)

packages/atlas/src/errors/
└─ index.ts                    (修改: 加入 ErrorCodes const 骨架)

packages/plasma/src/
└─ errors.ts                   (修改: 加入 ErrorCodes const 骨架)

packages/signal/src/
└─ errors.ts                   (修改: 加入 ErrorCodes const 骨架)

packages/quasar/src/errors/
└─ ErrorCodes.ts               (新增: ErrorCodes const 物件)
```

### Pattern 1: 中間層 Abstract Exception 設計

**What:** 每個中間層繼承 `GravitoException`，加上 `Object.setPrototypeOf`，並定義任何額外的 discriminator 欄位。

**When to use:** 建立 `InfrastructureException`（有 `retryable`）、`DomainException`（無額外欄位）、`SystemException`（無額外欄位）。

```typescript
// Source: 基於 packages/astral/src/errors.ts 與 packages/core/src/exceptions/GravitoException.ts
import { type ExceptionOptions, GravitoException } from './GravitoException'

export interface InfrastructureExceptionOptions extends ExceptionOptions {
  retryable?: boolean
}

export abstract class InfrastructureException extends GravitoException {
  public readonly retryable: boolean

  constructor(
    status: number,
    code: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'InfrastructureException'
    this.retryable = options.retryable ?? false
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

**重要：** 使用 `new.target.prototype` 而非 `InfrastructureException.prototype`，這樣子類的 instanceof 也能正確工作。這是 `packages/ion/src/errors.ts` 中 `InertiaError` 的做法。

### Pattern 2: GravitoException 補上 Object.setPrototypeOf

**What:** `GravitoException` 本身目前**缺乏** `Object.setPrototypeOf`，必須加入。

```typescript
// 修改 packages/core/src/exceptions/GravitoException.ts
export abstract class GravitoException extends Error {
  constructor(status: number, code: string, options: ExceptionOptions = {}) {
    super(options.message)
    this.name = 'GravitoException'
    this.status = status as ContentfulStatusCode
    this.cause = options.cause
    this.code = code
    if (options.i18nKey) { this.i18nKey = options.i18nKey }
    if (options.i18nParams) { this.i18nParams = options.i18nParams }
    // ESM/CJS boundary instanceof fix — MUST be last in constructor
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

**為何用 `new.target.prototype`：** 當用在 abstract base class 時，`new.target` 指向實際被 `new` 的子類，確保整個原型鏈正確。如果每個 concrete class 再各自呼叫一次，效果等同（各自顯式指定），但 `new.target` 更不容易被遺漏。

### Pattern 3: ErrorCodes Const 物件（模板）

**What:** 每個 Orbit 包定義自己的 `ErrorCodes` const 物件，使用 fortify 的 `as const` + type 導出 pattern。

```typescript
// Source: packages/fortify/src/errors/codes.ts 的標準化版本
// 放置於 packages/atlas/src/errors/codes.ts

export const DatabaseErrorCodes = {
  // Connection errors
  DB_CONNECTION_FAILED: 'db.connection_failed',
  DB_CONNECTION_TIMEOUT: 'db.connection_timeout',
  DB_POOL_EXHAUSTED: 'db.pool_exhausted',
  // Query errors
  DB_QUERY_FAILED: 'db.query_failed',
  DB_TABLE_NOT_FOUND: 'db.table_not_found',
  // Constraint errors
  DB_UNIQUE_CONSTRAINT: 'db.unique_constraint',
  DB_FOREIGN_KEY_CONSTRAINT: 'db.foreign_key_constraint',
  DB_NOT_NULL_CONSTRAINT: 'db.not_null_constraint',
  // Transaction errors
  DB_TRANSACTION_FAILED: 'db.transaction_failed',
  DB_DEADLOCK: 'db.deadlock',
} as const

export type DatabaseErrorCode = (typeof DatabaseErrorCodes)[keyof typeof DatabaseErrorCodes]
```

### Pattern 4: Contract Test Helper

**What:** 可複用的 helper function 驗證一個物件是否完整符合 `GravitoException` contract。

```typescript
// 放置於 packages/core/tests/contract/helpers.ts
import { expect } from 'bun:test'
import { GravitoException } from '../../src/exceptions/GravitoException'

export interface ContractAssertOptions {
  expectedCode: string
  expectedStatus: number
  expectRetryable?: boolean
  expectCause?: boolean
}

export function assertGravitoException(
  err: unknown,
  opts: ContractAssertOptions
): void {
  // instanceof check — 主要 contract
  expect(err).toBeInstanceOf(GravitoException)

  const e = err as GravitoException
  // Required fields
  expect(e.code).toBe(opts.expectedCode)
  expect(e.status).toBe(opts.expectedStatus)
  // cause preservation
  if (opts.expectCause) {
    expect(e.cause).toBeDefined()
  }
  // retryable for InfrastructureException
  if (opts.expectRetryable !== undefined) {
    expect((e as any).retryable).toBe(opts.expectRetryable)
  }
  // NOT asserting .message — tests must not be brittle on message strings
}
```

### Pattern 5: Concrete Exception（Orbit 包範本）

**What:** Orbit 包中的 concrete exception 繼承對應中間層，傳入 ErrorCodes 的值作為 code。

```typescript
// 範例：packages/atlas/src/exceptions/DatabaseException.ts
import { InfrastructureException, type InfrastructureExceptionOptions } from '@gravito/core'
import { DatabaseErrorCodes, type DatabaseErrorCode } from '../errors/codes'

export class DatabaseException extends InfrastructureException {
  constructor(
    code: DatabaseErrorCode,
    options: InfrastructureExceptionOptions & { query?: string } = {}
  ) {
    super(500, code, { retryable: false, ...options })
    this.name = 'DatabaseException'
  }

  // Factory methods (FortifyError pattern)
  static connectionFailed(cause?: unknown): DatabaseException {
    return new DatabaseException(DatabaseErrorCodes.DB_CONNECTION_FAILED, {
      cause,
      retryable: true,
      message: 'Database connection failed',
    })
  }
}
```

### Anti-Patterns to Avoid

- **`Object.setPrototypeOf(this, SpecificClass.prototype)` 於 abstract base class：** 會導致所有子類的 instanceof 都解析到 base class 的 prototype。應使用 `new.target.prototype`。
- **在子類中忘記呼叫 `Object.setPrototypeOf`：** 若 base class 已用 `new.target.prototype`，子類無需重複呼叫。但若 base class 用的是顯式 prototype，子類必須各自呼叫。建議統一使用 `new.target.prototype` 模式於所有 base class。
- **`ErrorCodes` 使用 enum：** `signal` 的 `MailErrorCode` 和 `flux` 的 `FluxErrorCode` 使用 TypeScript enum。新的 ErrorCodes 應改用 `as const` 物件（如 fortify 模式），因為 const 物件在 tree-shaking 上更好，且值為普通字串更易於 JSON 序列化。
- **重複的 `Object.setPrototypeOf`：** 若 base 已用 `new.target.prototype`，子類不需要再呼叫，會有冗餘但不會出錯。規則：只在 leaf class 確認呼叫即可，base class 的 `new.target.prototype` 覆蓋所有情況。
- **測試斷言 `.message` 字串：** Contract test 只斷言 `.code`、`.status`、`instanceof`，絕不斷言 `.message`（易碎，且不在 ERRM-02/03 要求中）。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ESM/CJS instanceof breakage | 自訂 class registry 或 duck-typing | `Object.setPrototypeOf(this, new.target.prototype)` | 這是 TS/V8 的標準 workaround，已在 astral/ion/chromatic/nova/xenon 驗證 |
| ErrorCode 型別安全 | 手動維護 union types | `as const` 物件 + `typeof X[keyof typeof X]` | fortify 已有完整範本，直接套用 |
| Contract test 重複程式碼 | 每個測試各自斷言 | 共用 `assertGravitoException(err, opts)` helper | 集中 contract 語意，未來可擴展 |

**Key insight:** 這個 phase 的複雜度主要在 TypeScript prototype chain 的正確設置，而非業務邏輯。所有模式都有現成的內部參考實作。

---

## Common Pitfalls

### Pitfall 1: Object.setPrototypeOf 位置錯誤

**What goes wrong:** 若在 base abstract class 中使用 `Object.setPrototypeOf(this, AbstractBase.prototype)` 而非 `new.target.prototype`，子類的 `e instanceof ConcreteClass` 回傳 false，但 `e instanceof AbstractBase` 回傳 true。
**Why it happens:** TypeScript extends Error 在 ES5 target 下會截斷原型鏈。
**How to avoid:** 在所有 abstract base class 使用 `new.target.prototype`。參考 `packages/ion/src/errors.ts`：`Object.setPrototypeOf(this, new.target.prototype)`。
**Warning signs:** Test 中 `expect(err).toBeInstanceOf(ConcreteException)` 失敗但 `toBeInstanceOf(GravitoException)` 通過。

### Pitfall 2: GravitoException 本身缺乏 Object.setPrototypeOf

**What goes wrong:** 目前 `GravitoException` 沒有 `Object.setPrototypeOf`。在 CJS/ESM 邊界（如 `require()` 一個 ESM-built package），`instanceof GravitoException` 可能失敗。
**Why it happens:** 現有類別在單一 runtime 內工作正常；跨邊界才會暴露問題（STATE.md 也記錄了此 confirmed issue）。
**How to avoid:** Phase 16 的第一個 task 就是在 `GravitoException` constructor 尾端加入 `Object.setPrototypeOf(this, new.target.prototype)`。
**Warning signs:** Contract test 在 ESM-loaded 環境通過，在 CJS require 環境失敗。

### Pitfall 3: CircularDependencyException 現在繼承 Error 而非 GravitoException

**What goes wrong:** `packages/core/src/exceptions/CircularDependencyException.ts` 繼承 `Error`，不符合新的層次結構（應為 `SystemException` 子類）。若測試依賴 `instanceof GravitoException`，當前代碼會失敗。
**Why it happens:** 該類別是獨立開發的，沒有對齊 GravitoException 層次。
**How to avoid:** Phase 16 必須同時修改 `CircularDependencyException` 使其繼承 `SystemException`。注意 constructor signature 的改變（需要加入 `status` 和 `code`，或用默認值）。

### Pitfall 4: signal 包沒有直接依賴 @gravito/core

**What goes wrong:** `packages/signal/package.json` 的 `dependencies` 中**沒有** `@gravito/core`（只有 `@aws-sdk/client-ses` 和 `nodemailer`）。若 Phase 16 的 `MailException` 需要在 signal 包內繼承 `InfrastructureException`，必須先加入依賴。
**Why it happens:** signal 目前透過 dynamic import 使用 core（非直接依賴）。
**How to avoid:** Phase 16 scope 只建立 ErrorCodes 骨架，不遷移 `MailTransportError`（遷移是 Phase 18-19 的工作）。但 ErrorCodes const 物件本身不需要 @gravito/core 依賴——只是字串 const，可獨立放在 signal 包。

### Pitfall 5: FortifyError 使用 httpStatus 欄位而非 status

**What goes wrong:** `FortifyError` 有 `httpStatus: number` 欄位，而 `GravitoException` 有 `status: ContentfulStatusCode`。Phase 16 要求 FortifyError 重寫為繼承 `DomainException`（作為 `AuthException`），這會造成 breaking change。
**Why it happens:** FortifyError 是獨立開發的，沒有對齊 GravitoException API。
**How to avoid:** 決策 D-05 已確認這是可接受的 v2.0.0 breaking change。新的 `AuthException` 使用 `status` 欄位；factory methods 內部改傳 `status` 而非 `httpStatus`。現有使用 `error.httpStatus` 的代碼需更新為 `error.status`（Phase 19 的 migration 範圍）。**Phase 16 只建立 `AuthException` class，不處理 call site 遷移。**

### Pitfall 6: Contract Test 放置位置的包邊界問題

**What goes wrong:** 若將 contract test helpers 放在 `@gravito/core` 的 test 目錄，其他 Orbit 包（atlas、plasma 等）無法直接 import。
**Why it happens:** Monorepo workspace packages 通常不 export test utilities。
**How to avoid:** 兩種選擇：(a) 每個 Orbit 包複製一份 helper（輕量，容易理解）；(b) 在 `@gravito/core` 加入 `./testing` export subpath（更複雜但 DRY）。Claude's Discretion：建議方案 (b) 加入 `testing` subpath，只 export 給 test 使用的工具，不影響生產 bundle。

---

## Code Examples

Verified patterns from official sources (internal codebase):

### 完整的 InfrastructureException 實作

```typescript
// Source: 基於 packages/ion/src/errors.ts (new.target pattern)
//         + packages/core/src/exceptions/GravitoException.ts (ExceptionOptions)
import { type ExceptionOptions, GravitoException } from './GravitoException'

export interface InfrastructureExceptionOptions extends ExceptionOptions {
  retryable?: boolean
}

/**
 * Base class for all infrastructure-level errors (database, cache, mail, queue).
 * Adds retryable field for Phase 17 withRetry integration.
 * @public
 */
export abstract class InfrastructureException extends GravitoException {
  public readonly retryable: boolean

  constructor(
    status: number,
    code: string,
    options: InfrastructureExceptionOptions = {}
  ) {
    super(status, code, options)
    this.name = 'InfrastructureException'
    this.retryable = options.retryable ?? false
    // new.target.prototype ensures instanceof works for all concrete subclasses
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

### DomainException（無額外欄位）

```typescript
// Source: 基於同 pattern
import { type ExceptionOptions, GravitoException } from './GravitoException'

/**
 * Base class for all business logic errors (auth, validation, domain rules).
 * @public
 */
export abstract class DomainException extends GravitoException {
  constructor(status: number, code: string, options: ExceptionOptions = {}) {
    super(status, code, options)
    this.name = 'DomainException'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
```

### 修改後的 CircularDependencyException

```typescript
// Source: 修改 packages/core/src/exceptions/CircularDependencyException.ts
import type { ServiceKey } from '../Container'
import { SystemException } from './SystemException'

export class CircularDependencyException extends SystemException {
  constructor(key: ServiceKey, stack: ServiceKey[]) {
    const path = [...stack, key].map(String).join(' -> ')
    super(500, 'system.circular_dependency', {
      message: `Circular dependency detected: ${path}`,
    })
    this.name = 'CircularDependencyException'
  }
}
```

### ErrorCodes 模板（各 Orbit 包各一份）

```typescript
// Source: 基於 packages/fortify/src/errors/codes.ts
// packages/plasma/src/errors/codes.ts

export const CacheErrorCodes = {
  CACHE_CONNECTION_FAILED: 'cache.connection_failed',
  CACHE_TIMEOUT: 'cache.timeout',
  CACHE_COMMAND_FAILED: 'cache.command_failed',
  CACHE_SERIALIZATION_FAILED: 'cache.serialization_failed',
} as const

export type CacheErrorCode = (typeof CacheErrorCodes)[keyof typeof CacheErrorCodes]
```

### Contract Test 範本

```typescript
// Source: 設計基於 packages/core/tests/exceptions-gravito.test.ts 模式
// packages/core/tests/contract/helpers.ts

import { expect } from 'bun:test'
import { GravitoException } from '../../src/exceptions/GravitoException'
import { InfrastructureException } from '../../src/exceptions/InfrastructureException'

export function assertGravitoContract(
  err: unknown,
  expected: { code: string; status: number }
): asserts err is GravitoException {
  expect(err).toBeInstanceOf(GravitoException)
  const e = err as GravitoException
  expect(e.code).toBe(expected.code)
  expect(e.status).toBe(expected.status)
  // Never assert e.message — brittle contract
}

export function assertInfrastructureContract(
  err: unknown,
  expected: { code: string; status: number; retryable: boolean }
): asserts err is InfrastructureException {
  assertGravitoContract(err, expected)
  expect(err).toBeInstanceOf(InfrastructureException)
  expect((err as InfrastructureException).retryable).toBe(expected.retryable)
}

export function assertCauseChain(err: unknown): void {
  expect((err as GravitoException).cause).toBeDefined()
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 每個包各自繼承 `Error` | 統一繼承 `GravitoException` 層次 | v2.0.0 (本 phase) | 跨包一致的 `.code` 和 `.status` 欄位 |
| enum 型態的 ErrorCode（signal、flux） | `as const` 物件（fortify pattern） | v2.0.0 (本 phase) | 更好的 tree-shaking 與字串相容性 |
| 無 `Object.setPrototypeOf` 於 core exceptions | 全面加入 | v2.0.0 (本 phase) | 修復 ESM/CJS 邊界 instanceof 問題 |

**Deprecated/outdated:**
- `FortifyError.httpStatus` 欄位：被 `status` 取代（v2.0.0 breaking change，Phase 16 建立 AuthException，Phase 19 完成遷移）
- `CircularDependencyException extends Error`：改為繼承 `SystemException`
- bare `throw new Error()` 在 Orbit 包中：Phase 18-19 全量消除

---

## Open Questions

1. **`AuthException` 與 `AuthenticationException` / `AuthorizationException` 的關係**
   - What we know: 目前 core 有 `AuthenticationException` (401) 和 `AuthorizationException` (403)；決策 D-05 要求 FortifyError 重寫為 `AuthException`
   - What's unclear: `AuthException` 是否取代 `AuthenticationException` 和 `AuthorizationException`，還是它們都繼承 `AuthException`？
   - Recommendation: `AuthException` 作為 fortify 的 concrete class（繼承 `DomainException`），現有的 `AuthenticationException` / `AuthorizationException` 保持在 core 並也繼承 `DomainException`。FortifyError 的 30+ factory methods 移至 `AuthException`。

2. **ModelNotFoundException 的歸屬層**
   - What we know: `ModelNotFoundException` 目前繼承 `GravitoException`（status 404）。它屬於 domain（業務邏輯找不到模型）還是 HTTP（404 response）？
   - What's unclear: Phase 16 hierarchy 未明確列出 ModelNotFoundException
   - Recommendation: 歸屬 `DomainException`（業務邏輯層），status 404 是 HTTP 表示層，可由 ErrorHandler 對應。

3. **ConfigurationException 的 constructor signature**
   - What we know: D-01 包含 `ConfigurationException` 作為 `SystemException` 子類
   - What's unclear: constructor 的參數設計（message only? field name?）
   - Recommendation: 參考 `InertiaConfigError` 的 `(message: string, details?: Record<string, any>)` 設計，簡潔且實用。

---

## Environment Availability

Step 2.6: SKIPPED（此 phase 為純代碼/型別變更，無外部依賴）

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built into Bun) |
| Config file | packages/core/package.json `scripts.test` |
| Quick run command | `cd packages/core && bun test tests/exceptions*.test.ts --timeout=10000` |
| Full suite command | `cd packages/core && bun test --timeout=10000` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ERRM-01 | `catch(e)` 回傳 `e instanceof GravitoException === true` | unit | `cd packages/core && bun test tests/contract/ --timeout=5000` | ❌ Wave 0 |
| ERRM-01 | `InfrastructureException instanceof GravitoException` 為 true | unit | 同上 | ❌ Wave 0 |
| ERRM-02 | `e.code === 'db.connection_failed'` 等 namespaced codes | unit | `cd packages/core && bun test tests/contract/ --timeout=5000` | ❌ Wave 0 |
| ERRM-03 | `e.cause` 為原始錯誤（非 undefined） | unit | 同上 | ❌ Wave 0 |
| SC-4 | ESM/CJS 邊界 instanceof 通過 | unit | `cd packages/core && bun test tests/exceptions-gravito.test.ts --timeout=5000` | ✅ 需擴展 |
| SC-5 | Contract test scaffolding 存在並執行於每個 Orbit 包 | unit | `bun test --filter="contract" --timeout=10000` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd packages/core && bun test tests/exceptions*.test.ts --timeout=10000`
- **Per wave merge:** `cd packages/core && bun test --timeout=10000`
- **Phase gate:** `bun run test --filter='./packages/*'` 全量通過

### Wave 0 Gaps

- [ ] `packages/core/tests/contract/helpers.ts` — contract assertion helpers
- [ ] `packages/core/tests/contract/core-exceptions.contract.test.ts` — ERRM-01/02/03
- [ ] `packages/atlas/tests/contract/` — atlas ErrorCodes contract tests
- [ ] `packages/plasma/tests/contract/` — plasma ErrorCodes contract tests

*(各 Orbit 包的 contract tests 在 Phase 18-19 建立；Phase 16 只需 core 的 contract test 骨架)*

---

## Project Constraints (from CLAUDE.md)

以下是從 CLAUDE.md 提取的強制性指令，規劃時必須遵守：

| 指令 | 類別 | 影響 |
|------|------|------|
| TypeScript strict mode：`noUnusedLocals` 和 `noUnusedParameters` | 代碼品質 | 所有新 exception class 的欄位必須被使用，或有文件說明為公開 API |
| 禁止 `@ts-ignore` | 代碼品質 | 不允許用 @ts-ignore 繞過型別問題 |
| Satellite 隔離原則（Satellite 間禁止直接導入） | 架構 | 此 phase 只涉及 core 和 Orbit 包，不影響 Satellite |
| 避免循環依賴 | 架構 | 新的中間層在 core 內，Orbit 包的 ErrorCodes 不引入 core 依賴就不會有循環問題 |
| 100 字元寬、2 空格縮排、單引號、無分號、ES5 尾隨逗號 | 代碼風格 | 所有新檔案遵守；Biome 會自動格式化 |
| Commit message 英文 | Git | Phase 16 的 commit 使用英文描述 |
| 測試目標覆蓋率 75%+ | 測試 | 新的 exception classes 應有對應測試 |
| 禁止 bare `throw new Error()` in Orbits | ERRM-01 | 此 phase 的 ErrorCodes 骨架為後續遷移提供基礎 |

---

## Sources

### Primary (HIGH confidence)
- `packages/core/src/exceptions/GravitoException.ts` — 直接讀取，確認現有欄位與缺少 `Object.setPrototypeOf`
- `packages/core/src/exceptions/` — 直接讀取所有現有 exception class
- `packages/fortify/src/errors/codes.ts` — 直接讀取，確認 `as const` ErrorCodes pattern
- `packages/fortify/src/errors/FortifyError.ts` — 直接讀取，確認 30+ factory methods 和 `httpStatus` vs `status` 差異
- `packages/astral/src/errors.ts` — 直接讀取，確認 `Object.setPrototypeOf(this, ConcreteClass.prototype)` pattern
- `packages/ion/src/errors.ts` — 直接讀取，確認 `Object.setPrototypeOf(this, new.target.prototype)` + `Error.captureStackTrace` pattern
- `packages/ripple/src/errors/RippleError.ts` — 直接讀取，確認命名 prototype pattern
- `packages/atlas/src/errors/index.ts` — 直接讀取，確認缺少 `GravitoException` 繼承和 `Object.setPrototypeOf`
- `packages/plasma/src/errors.ts` — 直接讀取，確認 `RedisError` 未繼承 GravitoException
- `packages/signal/src/errors.ts` — 直接讀取，確認 `MailErrorCode` enum + 無 GravitoException 繼承
- `packages/quasar/src/errors/QuasarError.ts` — 直接讀取，確認 code prefix pattern 但未繼承
- `packages/core/tests/exceptions-gravito.test.ts` — 直接讀取，確認現有測試模式
- `packages/core/package.json` — 直接讀取，確認 bun test 命令和依賴

### Secondary (MEDIUM confidence)
- `packages/flux/src/errors.ts` — 直接讀取，確認 enum-based ErrorCode 的反模式
- `packages/chromatic/src/core/errors.ts` — grep 確認 Object.setPrototypeOf 廣泛使用
- 整個 packages/ 目錄的 `Object.setPrototypeOf` grep — 確認 8 個包已採用此 pattern

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 無新依賴，現有 bun:test 和 TypeScript 已完全驗證
- Architecture: HIGH — 所有模式均有內部參考實作，直接代碼讀取確認
- Pitfalls: HIGH — 從實際代碼觀察發現（缺少 setPrototypeOf、signal 無 core 依賴、CircularDependencyException 繼承 Error、FortifyError httpStatus 欄位）

**Research date:** 2026-03-28
**Valid until:** 2026-06-01（此 phase 使用穩定的語言特性，不依賴外部 library 版本）
