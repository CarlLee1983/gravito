# Phase 16: Core Error Model Foundation - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish unified GravitoException hierarchy with intermediate layers, ErrorCode registry per Orbit package, and contract test scaffolding. All Orbit errors must extend GravitoException with `.code`, `.status`, and `.cause` fields. Cross-boundary ESM/CJS `instanceof` must work via `Object.setPrototypeOf`.

This phase builds the **foundation** only. Actual Orbit package migration happens in Phase 18-19. Resilience primitives (retry, CB) are Phase 17.

</domain>

<decisions>
## Implementation Decisions

### Error Hierarchy Design
- **D-01:** Three-layer hierarchy with intermediate categories:
  ```
  GravitoException (abstract, in @gravito/core)
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
- **D-02:** `InfrastructureException` adds a `retryable: boolean` field for Phase 17's `withRetry` to consume. `DomainException` and `SystemException` have no extra fields beyond GravitoException.
- **D-03:** All intermediate layers (`InfrastructureException`, `DomainException`, `SystemException`) defined in `@gravito/core` package (`packages/core/src/exceptions/`). Concrete exceptions (e.g., `DatabaseException`) defined in their respective Orbit packages.
- **D-04:** `Object.setPrototypeOf(this, ClassName.prototype)` required in every error constructor for ESM/CJS instanceof compatibility. Reference implementations: `RippleError`, `AstralError`.

### FortifyError Integration
- **D-05:** `FortifyError` will be rewritten to extend `DomainException` (as `AuthException`). Existing 30+ factory methods and `ErrorCodes` registry pattern preserved. This is a v2.0.0 breaking change — acceptable.

### ErrorCode Namespace Convention
- **D-06:** Follow fortify's established pattern: dot-separated namespace strings (e.g., `db.connection_failed`, `redis.timeout`, `auth.invalid_credentials`). Each Orbit package defines its own `ErrorCodes` const object.

### Claude's Discretion
- ErrorCode registry implementation details (const object structure, type generation)
- Contract test helper design and placement
- Migration compatibility strategy (deprecated warnings, transition period)
- Exact constructor API for intermediate exception classes
- Whether to use `Error.captureStackTrace()` in addition to `Object.setPrototypeOf`
- How to handle existing tests that assert on `.message` strings

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Error Model (existing code to understand)
- `packages/core/src/exceptions/GravitoException.ts` -- Base abstract class with status, code, i18nKey, cause fields
- `packages/core/src/exceptions/` -- All existing core exception classes (HttpException, ValidationException, AuthenticationException, etc.)
- `packages/fortify/src/errors/codes.ts` -- Reference ErrorCodes registry pattern (30+ dot-separated codes)
- `packages/fortify/src/errors/FortifyError.ts` -- Factory method pattern for error creation
- `packages/ripple/src/errors/RippleError.ts` -- Reference Object.setPrototypeOf implementation
- `packages/astral/src/errors.ts` -- Another correct Object.setPrototypeOf hierarchy

### Orbit Error Classes (migration targets for Phase 18-19, understand structure now)
- `packages/atlas/src/errors/index.ts` -- DatabaseError hierarchy (ConstraintViolation, TableNotFound, Connection)
- `packages/plasma/src/errors.ts` -- RedisError with command + originalError
- `packages/signal/src/errors.ts` -- MailTransportError with MailErrorCode enum
- `packages/flux/src/errors.ts` -- FluxError with FluxErrorCode enum + factories
- `packages/quasar/src/errors/QuasarError.ts` -- QuasarError with code prefix pattern
- `packages/monolith/ion/src/errors.ts` -- InertiaError with toJSON and hints

### Resilience (context for retryable field design)
- `packages/resilience/src/circuit-breaker/CircuitBreaker.ts` -- Existing CB implementation
- `packages/echo/src/resilience/CircuitBreaker.ts` -- Duplicate CB (to be consolidated in Phase 17)
- `packages/atlas/src/DB.ts` -- transactionWithRetry method (DO NOT wrap with external withRetry)

### Architecture
- `docs/claude/design.md` -- Galaxy Architecture design principles
- `docs/claude/constraints.md` -- Monorepo constraints and conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GravitoException` base class: Already has `status`, `code`, `i18nKey`, `cause` fields -- extend, don't replace
- `FortifyError.ErrorCodes` pattern: Mature dot-separated code registry with `as const` typing -- use as template for all Orbit packages
- `ValidationException` chainable pattern (`.withRedirect()`, `.withInput()`): Keep this pattern for rich error context
- Existing exception exports in `packages/core/src/exceptions/index.ts`: Use as the barrel export point

### Established Patterns
- **PascalCase for exception files**: `GravitoException.ts`, `HttpException.ts`
- **`ExceptionOptions` type for constructor params**: Already defined in core
- **i18n support via `getLocalizedMessage()`**: Part of GravitoException, all subclasses inherit
- **Factory methods on error classes**: FortifyError pattern (`FortifyError.invalidCredentials()`) -- adopt for InfrastructureException subclasses

### Integration Points
- `packages/core/src/exceptions/` -- Where intermediate layers will be added
- `packages/core/src/index.ts` -- Must export new exception classes
- `packages/photon/src/http-exception.ts` -- Re-exports HttpException from core
- `packages/photon/src/middleware/circuit-breaker.ts` -- Will consume `InfrastructureException.retryable` in Phase 17-18

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. Key constraint from STATE.md: cockatiel is the single new dependency for resilience (Phase 17), this phase should have zero new dependencies.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 16-core-error-model-foundation*
*Context gathered: 2026-03-28*
