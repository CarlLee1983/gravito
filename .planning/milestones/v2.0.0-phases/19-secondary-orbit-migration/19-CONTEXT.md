# Phase 19: Secondary Orbit Migration - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all remaining ~40 Orbit packages to the GravitoException unified error model (hierarchy from Phase 16), wire resilience primitives where applicable (from Phase 17), register health checks with `@gravito/monitor` (INTG-04), and complete `core:shutdown` handlers for stream and beam (INTG-03). No bare `throw new Error()` should remain in any Orbit package after this phase.

This phase covers everything NOT migrated in Phase 18 (atlas, plasma, photon, signal). OrbitDegradationManager and version bumps are Phase 20.

</domain>

<decisions>
## Implementation Decisions

### Batching Strategy
- **D-01:** Hybrid complexity + domain batching. 5 batches total:
  | Batch | Packages | Rationale |
  |-------|----------|-----------|
  | Batch 1 (HIGH) | fortify, astral, flux, quasar, ripple, beam, stream | Have custom error classes to re-parent; validates migration pattern |
  | Batch 2 (Storage) | constellation, nebula, nebula-s3, stasis, freeze, dark-matter, pulsar, forge | Share StorageException intermediate layer |
  | Batch 3 (Comms) | echo, flare, radiance, quark, graphql, impulse, impulse-bridge, monolith | Communication/network packages |
  | Batch 4 (DevOps) | horizon, monitor, zenith, launchpad, cli, luminosity, prism | Scheduling/monitoring/tooling |
  | Batch 5 (LOW) | chromatic, ion, enterprise, ether, spectrum, cosmos, sentinel | Minimal changes — add ErrorCodes only or trivial re-parent |
- **D-02:** stream is placed at end of Batch 1 (most complex, handled individually after other HIGH packages validate the pattern).
- **D-03:** Each package verified independently after migration (typecheck + test + contract test) — same as Phase 18 D-02.

### Error Class Design
- **D-04:** New intermediate exception layers added to `@gravito/core/src/exceptions/`:
  ```
  GravitoException
  +-- InfrastructureException (exists)
  |   +-- DatabaseException (exists, atlas)
  |   +-- CacheException (exists, plasma)
  |   +-- StorageException (NEW, constellation/nebula/nebula-s3/freeze)
  |   +-- QueueException (planned in P16, quasar/flux)
  |   +-- StreamException (NEW, stream)
  |   +-- MailException (exists, signal)
  +-- DomainException (exists)
  |   +-- AuthException (planned in P16, fortify/sentinel)
  |   +-- ValidationException (exists)
  +-- SystemException (exists)
      +-- ConfigurationException (exists)
  ```
- **D-05:** HIGH packages (7): re-parent existing error classes to corresponding intermediate layer, preserve all factory methods and existing fields.
- **D-06:** MEDIUM packages (23): use nearest intermediate layer directly (e.g., `StorageException`, `InfrastructureException`). Add per-package `ErrorCodes` const object. Do NOT create a dedicated exception class per package — too much file bloat for packages with only bare throws.
- **D-07:** LOW packages (6): use `SystemException` or `GravitoException` directly. Add `ErrorCodes` const only if the package has any `throw` statements.

### Health Check Registration (INTG-04)
- **D-08:** Only I/O packages register health checks with `@gravito/monitor` HealthRegistry. Non-I/O utility packages are exempt.
- **D-09:** Required health checks (~15 packages):
  - **Must:** stream, beam, dark-matter, quasar, flux, constellation, nebula-s3, radiance, stasis, echo
  - **Optional:** forge, launchpad, luminosity
  - **Exempt:** chromatic, spectrum, enterprise, ether, ion, impulse, freeze, and other pure-utility packages
- **D-10:** Health check registration pattern — each Orbit registers during `onReady`:
  ```typescript
  orbit.onReady(() => {
    monitor.health.register('<orbit-name>', async () => ({
      status: this.isConnected() ? 'healthy' : 'unhealthy',
      details: { /* backend-specific info */ }
    }))
  })
  ```

### Stream Package Strategy
- **D-11:** stream is migrated incrementally, NOT rebuilt. Preserve existing `ErrorCategorizer` and `ErrorRecoveryManager` domain logic.
- **D-12:** Migration steps for stream:
  1. `StreamError` re-parents to `StreamException extends InfrastructureException`
  2. `ErrorCategorizer` results map to `retryable: boolean` field on StreamException
  3. `ErrorRecoveryManager` internals refactored to use `@gravito/resilience` withRetry / CircuitBreaker
  4. 81 bare `throw new Error()` replaced with `StreamException` + ErrorCodes (`stream.kafka.*`, `stream.rabbitmq.*`, `stream.sqs.*`)
  5. stream + beam register `core:shutdown` handlers with deadline enforcement (INTG-03)
- **D-13:** stream's error classification domain knowledge (which Kafka/RabbitMQ errors are retryable vs fatal) is preserved — this is valuable domain logic that must NOT be lost during migration.

### Claude's Discretion
- Exact ErrorCodes namespace values for each package (following established `<domain>.<error>` convention)
- Internal module organization within each package's error files
- Whether to batch commits per-package or per-batch
- Order of packages within each batch
- Contract test structure per package (follow Phase 16/18 scaffolding pattern)
- How to handle packages with both I/O and utility code (e.g., luminosity has SEO + S3)
- Specific health check `details` fields per Orbit
- Whether `ErrorRecoveryManager` in stream should be fully replaced or kept as a thin wrapper

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Error Model Foundation (Phase 16 output)
- `packages/core/src/exceptions/GravitoException.ts` -- Base abstract class with status, code, i18nKey, cause
- `packages/core/src/exceptions/InfrastructureException.ts` -- Intermediate layer with `retryable: boolean`
- `packages/core/src/exceptions/DatabaseException.ts` -- Reference for new intermediate layers (StorageException, StreamException, QueueException)
- `packages/core/src/exceptions/index.ts` -- All exception exports, must be extended with new intermediate layers
- `packages/fortify/src/errors/codes.ts` -- Reference ErrorCodes registry pattern

### Resilience Infrastructure (Phase 17 output)
- `packages/resilience/src/index.ts` -- Barrel exports: withRetry, withResilience, CircuitBreaker
- `packages/resilience/src/circuit-breaker/CircuitBreaker.ts` -- Canonical CB implementation

### Phase 18 Migration Reference (pattern to follow)
- `packages/plasma/src/errors.ts` -- Completed migration example (RedisError -> CacheException)
- `packages/signal/src/errors.ts` -- Completed migration example (MailTransportError -> InfrastructureException)
- `packages/atlas/src/errors/index.ts` -- Completed migration example (DatabaseError hierarchy)

### Health Check Infrastructure
- `packages/monitor/src/health/HealthRegistry.ts` -- HealthRegistry.register() API
- `packages/monitor/src/health/HealthController.ts` -- Health endpoint controller
- `packages/monitor/src/config.ts` -- HealthCheckFn, HealthCheckResult types

### HIGH Priority Migration Targets (Batch 1)
- `packages/fortify/src/errors/FortifyError.ts` -- 30+ factory methods, re-parent to AuthException
- `packages/astral/src/errors.ts` -- AstralError hierarchy with Object.setPrototypeOf
- `packages/flux/src/errors.ts` -- FluxError with FluxErrorCode enum + factories
- `packages/quasar/src/errors/QuasarError.ts` -- QuasarError with code prefix pattern
- `packages/ripple/src/errors/RippleError.ts` -- RippleError + RippleDriverError
- `packages/beam/src/` -- BeamError base class
- `packages/stream/src/` -- StreamError + ErrorCategorizer + ErrorRecoveryManager

### Architecture
- `docs/claude/design.md` -- Galaxy Architecture design principles
- `docs/claude/constraints.md` -- Monorepo constraints and conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 16 contract test scaffolding (`assertGravitoException` helper) -- reuse for all ~40 packages
- Phase 18 migration patterns (plasma, signal, atlas) -- proven template for re-inherit + preserve
- `FortifyError.ErrorCodes` pattern -- template for all package-specific ErrorCodes registries
- `HealthRegistry.register()` API -- simple name + async function signature
- `Object.setPrototypeOf` pattern already in RippleError, AstralError -- some HIGH packages already have correct prototype chain

### Established Patterns
- Dot-separated ErrorCode namespaces (`db.*`, `redis.*`, `mail.*`, `http.*`) -- extend for all packages
- Factory methods on error classes (FortifyError pattern) -- adopt for HIGH package migrations
- `orbit.onReady()` lifecycle hook -- natural place for health check registration
- `core:shutdown` handler with deadline -- pattern from Phase 18 plasma/atlas/signal

### Integration Points
- `packages/core/src/exceptions/` -- Where new intermediate layers (StorageException, StreamException, QueueException, AuthException) are added
- `packages/core/src/exceptions/index.ts` -- Must export new intermediate exception classes
- `packages/monitor/src/health/HealthRegistry.ts` -- Target for health check registrations
- `packages/*/src/Orbit*.ts` or `packages/*/src/index.ts` -- Where shutdown hooks and health checks are registered per package

</code_context>

<specifics>
## Specific Ideas

- stream's `ErrorCategorizer` contains valuable domain knowledge about which Kafka/RabbitMQ/SQS errors are retryable vs fatal -- this logic must be preserved and mapped to the `retryable: boolean` field
- MEDIUM packages should NOT get dedicated exception classes -- use the nearest intermediate layer + ErrorCodes to avoid file bloat across 23 packages
- Health checks are only meaningful for packages with external connections -- pure utility packages have nothing to check
- Phase 18 migrations (plasma, signal, atlas) serve as proven templates -- follow the same verify-after-each-package discipline

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 19-secondary-orbit-migration*
*Context gathered: 2026-03-28*
