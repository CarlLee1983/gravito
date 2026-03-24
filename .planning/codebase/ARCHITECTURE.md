# Architecture

**Analysis Date:** 2026-03-24

## Pattern Overview

**Overall:** Galaxy Architecture (Three-Layer Concentric Model)

Gravito implements a sophisticated concentric architecture inspired by celestial mechanics:
- **PlanetCore** at the center (micro-kernel foundation)
- **Orbits** surrounding the core (infrastructure and general-purpose modules)
- **Satellites** in free orbit (independent business domains)

**Key Characteristics:**
- Unidirectional dependency flow (inner → outer, never reverse)
- Satellite isolation (no direct inter-satellite dependencies, event-driven communication only)
- Modular composition via IoC container
- High cohesion within layers, low coupling between layers
- Supports Bun as primary runtime with browser/Node.js compatibility layers

## Layers

**Foundation Layer (PlanetCore + Primary Orbits):**
- Purpose: Provide all base functionality required by higher layers
- Location: `packages/core`, `packages/photon`, `packages/atlas`, `packages/signal`
- Contains: IoC container, HTTP engine, ORM, event bus
- Depends on: External dependencies only (zero inter-package dependencies for core)
- Used by: All 60 packages + 15 satellites

**Advanced Infrastructure Layer:**
- Purpose: Specialized capabilities building on foundation layer
- Location: `packages/stream`, `packages/resilience`, `packages/stasis`, `packages/monitor`, etc.
- Contains: Queue systems, caching, error handling, observability
- Depends on: Foundation layer packages
- Used by: Specialized use cases and satellites

**Data/Storage Layer:**
- Purpose: Database and external storage abstraction
- Location: `packages/atlas` (ORM), `packages/plasma` (Redis), `packages/dark-matter` (MongoDB), `packages/nebula` (storage), `packages/nebula-s3` (S3 adapter)
- Contains: Query builders, connection pools, migrations, storage adapters
- Depends on: Core for lifecycle and DI
- Used by: Applications and satellites that need persistence

**API & Communication Layer:**
- Purpose: HTTP routing, webhooks, real-time communication
- Location: `packages/photon` (HTTP), `packages/echo` (webhooks), `packages/ripple` (WebSocket), `packages/flare` (notifications)
- Contains: Route handlers, middleware, protocol adapters
- Depends on: Core and optionally other infrastructure packages
- Used by: Web applications and service integrations

**Satellite/Business Domain Layer:**
- Purpose: Independent business logic implementations
- Location: Not included in this monorepo (located in gravito-dev-env/gravito-satellites)
- Contains: Domain-specific models, services, aggregates
- Depends on: Core, Atlas, Signal, and selected infrastructure packages
- Used by: Applications that need specific business features

## Data Flow

**HTTP Request → Response Flow:**

1. HTTP request arrives at Photon server (`packages/photon`)
2. Photon middleware pipeline executes (security, rate limiting, body parsing)
3. Route handler located via AOTRouter (`packages/core/src/engine/AOTRouter.ts`)
4. Handler receives context containing IoC container and request scope
5. Handler may invoke services from container (DI resolution)
6. Database queries via Atlas (`packages/atlas`)
7. Events emitted through Signal (`packages/signal`) - triggers cross-module communication
8. Response constructed and sent back through Photon

**Event Flow (Satellite Communication):**

1. Satellite-A publishes domain event via Signal
2. Signal event broker routes to all registered listeners
3. Satellite-B subscribes to and processes event
4. Satellite-B may emit its own events
5. All communication asynchronous and decoupled

**Background Job Flow:**

1. Job enqueued to Stream (`packages/stream`)
2. Stream selects broker (database, Redis, Kafka, SQS)
3. Worker pool processes job asynchronously
4. Backpressure mechanism prevents queue overflow
5. Dead Letter Queue captures failed jobs

**State Management:**
- **Request Scope:** AsyncLocalStorage (`packages/core/src/compat/async-local-storage.ts`) maintains context within single request
- **Application Scope:** IoC Container (`packages/core/src/Container.ts`) manages singletons and transient services
- **Event State:** Signal pub/sub manages cross-module state transitions
- **Cache:** Stasis (`packages/stasis`) provides Redis/in-memory cache
- **Database:** Atlas manages persistent state with transactions and migrations

## Key Abstractions

**IoC Container (Dependency Injection):**
- Purpose: Manage service lifecycle and wiring
- Examples: `packages/core/src/Container.ts`, `packages/core/src/Container/RequestScopeManager.ts`
- Pattern: Singleton + transient lifetimes; request-scoped resolution

**Hook System:**
- Purpose: Allow plugins to inject behavior at lifecycle points
- Examples: `packages/core/src/HookManager.ts` - before/after application startup, middleware attachment
- Pattern: Observer pattern with guaranteed execution order

**Event Manager:**
- Purpose: Publish/subscribe for decoupled component communication
- Examples: `packages/signal/src/` - event routing, listener management
- Pattern: Pub/Sub with priority queues and event prioritization

**Router (AOT Compiler):**
- Purpose: Compile routes to optimized lookup structure at startup
- Examples: `packages/core/src/engine/AOTRouter.ts`
- Pattern: Trie-based or regex-based route matching with ahead-of-time compilation

**Middleware Pipeline:**
- Purpose: Chain of responsibility for request processing
- Examples: `packages/photon/src/middleware/` - security, body parsing, rate limiting
- Pattern: Composable middleware functions with early termination support

**ORM Query Builder:**
- Purpose: Type-safe database query construction
- Examples: `packages/atlas/src/grammar/` - MySQL, PostgreSQL, SQLite grammars
- Pattern: Fluent builder pattern with SQL dialect abstraction

**DCI (Domain Context Interaction) for Complex Logic:**
- Purpose: Separate roles from objects for flexible domain modeling
- Examples: Used in satellite implementations for context-specific behavior
- Pattern: Roles assigned to objects within specific context

## Entry Points

**Application Startup:**
- Location: `packages/core/src/Application.ts`
- Triggers: Called by user's main entry point
- Responsibilities: Initialize IoC container, register hooks, bootstrap services, start HTTP server

**HTTP Server (Photon):**
- Location: `packages/photon/src/index.ts`
- Triggers: HTTP requests
- Responsibilities: Route incoming requests, apply middleware, invoke handlers, format responses

**Background Worker:**
- Location: `packages/stream/src/` - queue worker implementation
- Triggers: Job enqueued in queue
- Responsibilities: Dequeue job, execute handler, handle failures/retries

**CLI Kernel:**
- Location: `packages/core/src/CommandKernel.ts`
- Triggers: Command-line invocation
- Responsibilities: Parse CLI arguments, resolve command handler, execute

**Event Listener:**
- Location: `packages/signal/src/` - listener registration
- Triggers: Event published
- Responsibilities: Invoke subscribed handlers in order

## Error Handling

**Strategy:** Multi-layer error handling with context preservation

**Patterns:**

**1. Request Scope Error Context:**
- Location: `packages/core/src/error-handling/RequestScopeErrorContext.ts`
- Captures error context for current request scope
- Enables async stack trace reconstruction
- Stores exception details for middleware consumption

**2. Error Handler Chain:**
- Location: `packages/core/src/ErrorHandler.ts`
- Centralized error handler registration
- Invokes handlers in sequence
- Transforms errors to HTTP responses

**3. Zod Validation Errors:**
- Location: Uses Zod (`packages/mass/src/` wraps TypeBox)
- Standardized validation error format
- Type-safe error objects

**4. Dead Letter Queue (Resilience):**
- Location: `packages/resilience/src/`
- Captures failed jobs for later analysis/retry
- Preserves error context and metadata

**5. Try-Catch Boundaries:**
- All async operations wrapped in try-catch
- Errors logged with full context
- User-facing error messages distinct from internal details

## Cross-Cutting Concerns

**Logging:**
- Core provides RequestScopeMetrics (`packages/core/src/Container/RequestScopeMetrics.ts`)
- Monitor package provides OpenTelemetry integration (`packages/monitor/src/`)
- Messages stored in request scope context
- Output via console or external service

**Validation:**
- Zod for schema validation (`@gravito/core` dependency)
- Mass package wraps TypeBox for high-performance validation
- Validation errors standardized and captured

**Authentication:**
- Fortify package provides end-to-end auth flow (`packages/fortify/src/`)
- JWT support via Photon (`packages/photon/src/jwt.ts`)
- Auth state stored in request scope container
- Middleware enforces guards and permissions

**Authorization:**
- Sentinel package for access control (`packages/sentinel/src/`)
- Role-based and attribute-based access control
- Checked in middleware before handler invocation

**Rate Limiting:**
- Photon middleware supports Redis-based rate limiting (`packages/photon/src/middleware/ratelimit-redis.ts`)
- Also in-memory rate limiting for development
- Returns HTTP 429 when limit exceeded

**CORS & Security Headers:**
- Photon middleware for security (`packages/photon/src/middleware/security/`)
- Configurable CORS origins
- Security headers (CSP, HSTS, etc.) applied automatically

**Observability/Tracing:**
- OpenTelemetry integration via Monitor (`packages/monitor/src/`)
- Event metrics recorder interface in Core (contracts)
- Span creation for HTTP requests, database queries, events
- Exporters pluggable (Jaeger, etc.)

---

*Architecture analysis: 2026-03-24*
