# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```
gravito-core/
├── .claude/                      # Claude Code agent configuration
├── .github/                      # GitHub Actions CI/CD workflows
├── .planning/                    # Planning documents (this location)
│   └── codebase/
├── .turbo/                       # Turbo cache configuration
├── docs/                         # Documentation
│   └── claude/                   # Developer guides (design.md, patterns.md, etc.)
├── packages/                     # 60 core framework packages
│   ├── core/                     # PlanetCore (micro-kernel, IoC, hooks)
│   ├── photon/                   # HTTP engine (Hono-based)
│   ├── atlas/                    # ORM and database abstraction
│   ├── signal/                   # Event bus (pub/sub system)
│   ├── stream/                   # Queue and job processing
│   ├── [50+ specialized packages]
├── templates/                    # Starter project templates
├── examples/                     # Usage examples
├── scripts/                      # Build, test, utility scripts
├── package.json                  # Monorepo root manifest
├── turbo.json                    # Turbo build configuration
├── tsconfig.json                 # TypeScript configuration (base + path aliases)
├── biome.json                    # Biome linter/formatter config
├── bunfig.toml                   # Bun runtime configuration
└── bun.lock                      # Bun package lock
```

## Directory Purposes

**packages/core/** (PlanetCore - Micro-kernel)
- Purpose: Foundational framework - IoC container, hooks, lifecycle, event emission
- Contains:
  - `src/Container.ts` - Dependency injection container
  - `src/HookManager.ts` - Hook system for lifecycle events
  - `src/EventManager.ts` - Event emission
  - `src/Application.ts` - Application bootstrap
  - `src/engine/` - Router, context, AOT compilation
  - `src/compat/` - Runtime compatibility (Bun, Node, browser)
  - `src/security/` - Hashing, crypto utilities
  - `src/error-handling/` - Error context and handling
- Key files:
  - `src/index.ts` - Main exports
  - `src/Container.ts` - Core DI container
  - `src/engine/Gravito.ts` - HTTP engine integration
  - `src/engine/AOTRouter.ts` - Route compilation

**packages/photon/** (HTTP Engine)
- Purpose: Web server framework (Hono-based) with middleware system
- Contains:
  - `src/index.ts` - Main Photon export
  - `src/middleware/` - Security, body parsing, rate limiting, streaming
  - `src/middleware/security/` - CORS, CSP, body size limits
  - `src/router/` - TrieRouter and RegExpRouter implementations
  - `src/adapter/` - Platform adapters (Cloudflare, Vercel, Deno)
  - `src/http-exception.ts` - HTTP error definitions
  - `src/native.ts` - Native Hono engine
- Key files:
  - `src/index.ts` - Hono instance creation
  - `src/middleware/security/index.ts` - All security middleware
  - `src/adapter/index.ts` - Platform detection and adapter selection

**packages/atlas/** (ORM and Database)
- Purpose: Database abstraction layer with query builder and migrations
- Contains:
  - `src/grammar/` - SQL dialects (MySQL, PostgreSQL, SQLite, Mongo)
  - `src/seed/` - Seeding and factory patterns
  - `src/types/` - Type definitions for connections and queries
  - `src/OrbitAtlas.ts` - Main ORM class
  - `src/cli.ts` - CLI commands (migrate, seed, etc.)
- Key files:
  - `src/index.ts` - ORM exports
  - `src/OrbitAtlas.ts` - Main database interface
  - `src/grammar/Grammar.ts` - Base grammar class
  - `src/seed/Seeder.ts` - Seed file executor

**packages/signal/** (Event Bus)
- Purpose: Cross-module pub/sub communication system
- Contains:
  - `src/EventManager.ts` - Event publishing and subscription
  - `src/EventListener.ts` - Listener registration and invocation
  - `src/` - Event routing and filtering
- Key files:
  - `src/index.ts` - Event manager exports
  - `src/EventManager.ts` - Core pub/sub
  - `src/EventListener.ts` - Listener patterns

**packages/stream/** (Queue and Jobs)
- Purpose: Asynchronous job processing with multiple brokers
- Contains:
  - `src/` - Queue abstractions
  - `src/brokers/` - Database, Redis, Kafka, SQS implementations
  - `src/worker/` - Worker pool management
- Key files:
  - `src/index.ts` - Queue exports
  - `src/Stream.ts` - Main queue interface
  - `src/worker/Worker.ts` - Worker implementation

**packages/resilience/** (Fault Tolerance)
- Purpose: Circuit breaker, DLQ, backpressure, worker pool patterns
- Contains:
  - `src/CircuitBreaker.ts` - Circuit breaker pattern
  - `src/DeadLetterQueue.ts` - Failed job storage
  - `src/EventBackpressure.ts` - Flow control
  - `src/WorkerPool.ts` - Thread/worker management
  - `src/EventPriorityQueue.ts` - Priority-based event queue
- Key files:
  - `src/index.ts` - All resilience exports
  - `src/CircuitBreaker.ts` - Fault tolerance

**packages/monitor/** (Observability)
- Purpose: OpenTelemetry integration and observability adapters
- Contains:
  - `src/` - Observability providers and adapters
  - OpenTelemetry metrics, tracing, logging integration
- Used by: Monitor integration via middleware

**packages/plasma/** (Redis Client)
- Purpose: Redis abstraction with Laravel-style API
- Contains: `src/` - Redis client wrapper
- Key files: `src/index.ts` - Redis instance creation

**packages/nebula/** (File Storage)
- Purpose: Abstract storage layer (local, S3, etc.)
- Contains: `src/` - Storage driver abstraction

**packages/nebula-s3/** (S3 Storage Adapter)
- Purpose: AWS S3 / Cloudflare R2 / MinIO adapter for Nebula
- Contains: `src/` - S3 implementation

**packages/enterprise/** (Enterprise Architecture)
- Purpose: DDD, Clean Architecture patterns, aggregate roots, value objects
- Contains: `src/` - Enterprise patterns and abstractions

**packages/monolith/** (Integration Layer)
- Purpose: Combines multiple packages into unified application
- Contains: `src/` - Application composition and bootstrapping

**packages/monolith/** through **packages/zenith/** (Specialized Packages)
- ~50 packages providing specialized functionality:
  - `flare` - Multi-channel notifications
  - `fortify` - Authentication (login, signup, password reset)
  - `sentinel` - Authorization and access control
  - `stasis` - Caching layer
  - `ripple` - WebSocket/real-time communication
  - `echo` - Webhook handling
  - `flux` - Workflow engine
  - `forge` - Media processing
  - `horizon` - Task scheduling
  - `nova` - Bun Shell orchestration
  - `xenon` - FFI bindings
  - `astral` - OpenAPI documentation
  - `freeze`, `freeze-react`, `freeze-vue` - Static site generation
  - `ion` - Inertia.js integration
  - `prism` - Template engines
  - `cosmos` - Internationalization (i18n)
  - `beam` - RPC client
  - `dark-matter` - MongoDB client
  - `graphql` - GraphQL integration
  - And 30+ more...

**templates/** (Starter Templates)
- Purpose: Pre-built project scaffolds
- Contains: Multiple template variants (Inertia, static sites, etc.)
- Naming: `my-gravito-*` pattern

**examples/** (Usage Examples)
- Purpose: Demonstrate framework usage
- Contains: Full application examples
- Naming: `gravito-*` pattern

**scripts/** (Utility and Build Scripts)
- Purpose: Development and CI tooling
- Contains:
  - `build-utils.ts` - Build helpers
  - `validate-*.ts` - Validation scripts
  - `check-*.ts` - Quality checks
  - `generate-*.ts` - Code generation
  - `publish-*.ts` - Release automation
- Key files:
  - `scripts/ci-publish.js` - CI publishing
  - `scripts/validate-affected-packages.ts` - Pre-push validation
  - `scripts/generate-dependency-graph.ts` - Dependency visualization

**docs/claude/** (Developer Documentation)
- Purpose: Developer guides for working with Gravito
- Key files:
  - `design.md` - Galaxy Architecture design principles
  - `packages.md` - Package functionality matrix
  - `commands.md` - CLI commands reference
  - `config.md` - Tool configuration details
  - `constraints.md` - Monorepo rules and boundaries
  - `patterns.md` - Architecture patterns and best practices
  - `development.md` - Developer workflow

## Key File Locations

**Entry Points:**
- `packages/core/src/index.ts` - Core framework exports
- `packages/photon/src/index.ts` - HTTP server exports
- `packages/atlas/src/index.ts` - Database ORM exports
- `packages/core/src/Application.ts` - Application class (startup point)
- `packages/core/src/engine/Gravito.ts` - Native HTTP engine

**Configuration:**
- `tsconfig.json` - TypeScript compiler options + path aliases for all 60 packages
- `turbo.json` - Turbo build orchestration (task definitions, caching)
- `biome.json` - Biome linter/formatter rules
- `bunfig.toml` - Bun runtime settings
- `package.json` - Monorepo workspace definition

**Core Logic:**
- `packages/core/src/Container.ts` - Dependency injection container
- `packages/core/src/HookManager.ts` - Hook system for lifecycle
- `packages/core/src/engine/AOTRouter.ts` - Route compilation
- `packages/photon/src/middleware/` - Request middleware pipeline
- `packages/atlas/src/grammar/` - SQL dialect implementations
- `packages/signal/src/` - Event pub/sub system

**Testing:**
- `packages/*/tests/` - Test files (co-located with source)
- `packages/*/tests/*.test.ts` - Unit tests
- `packages/*/tests/*.integration.test.ts` - Integration tests
- `packages/*/bunfig.toml` - Test-specific Bun config (optional)

## Naming Conventions

**Files:**
- `.ts` - TypeScript source files
- `.test.ts` - Unit/integration test files
- `.integration.test.ts` - Integration test files (separate from unit tests)
- `.d.ts` - TypeScript declaration files (generated)
- `.d.ts.map` - Declaration source maps (generated)
- `index.ts` - Package entry point
- `build.ts` - Build script for package
- `build.json` - Build configuration

**Directories:**
- `src/` - Source code
- `tests/` - Test files
- `dist/` - Built output (generated, not committed)
- `src/types/` - Type definitions and contracts
- `src/compat/` - Compatibility layers for different runtimes
- `src/middleware/` - Middleware implementations
- `src/adapters/` - Platform/service adapters
- `src/error-handling/` - Error handling utilities
- `src/Container/` - Container-related classes
- `src/engine/` - Core engine implementations

**Packages:**
- Foundation packages: lowercase with no prefix (`core`, `photon`, `atlas`, `signal`, `stream`)
- Specialized packages: descriptive names (`flare`, `fortify`, `sentinel`, `plasma`, etc.)
- Adapters: `*-adapter-*` pattern (e.g., `luminosity-adapter-photon`)
- Frontend packages: `*-client`, `*-react`, `*-vue` suffixes
- Satellites: Located in separate repo (gravito-dev-env/gravito-satellites)

## Where to Add New Code

**New Feature in Existing Package:**
- Primary code: `packages/<package-name>/src/<feature-directory>/`
- Tests: `packages/<package-name>/tests/<feature-directory>/`
- Example: Adding user auth to fortify:
  - Code: `packages/fortify/src/auth/UserAuthenticator.ts`
  - Tests: `packages/fortify/tests/auth/UserAuthenticator.test.ts`

**New Package (Core Infrastructure):**
1. Create directory: `packages/<new-package>/`
2. Initialize package files:
   - `package.json` (with `@gravito/<new-package>` name)
   - `src/index.ts` (main exports)
   - `tsconfig.json` (extends root)
   - `build.ts` (build configuration)
   - `tests/` directory
3. Register in root `tsconfig.json` path aliases
4. Add to `turbo.json` if special build needs
5. Declare dependencies on foundation packages only (core, optionally signal/atlas)

**Utility Module (Internal to Package):**
- Location: `packages/<package>/src/utilities/` or same directory as usage
- Naming: Describe the utility (e.g., `RequestContextHelper.ts`, `QueryBuilder.ts`)
- Export from `src/index.ts` if public API

**Middleware:**
- Location: `packages/photon/src/middleware/<category>/`
- Categories: `security`, `body`, `ratelimit`, `streaming`, `otel`, `htmx`, `binary`
- Example: `packages/photon/src/middleware/security/cors.ts`

**Database Grammar (Dialect):**
- Location: `packages/atlas/src/grammar/<dialect>.ts`
- Implement `Grammar` base class
- Register in grammar index

**Event/Hook Handler:**
- Location: `packages/<package>/src/` - same directory as component
- Naming: `*.listener.ts` or `*.handler.ts`
- Subscribe during application bootstrap in Application class

**Adapter (Platform/Service):**
- Location: `packages/<package>/src/adapters/` or new adapter package
- Naming: `<service-name>-adapter.ts`
- Implement common interface from core package
- Example: `packages/photon/src/adapter/cloudflare.ts` for Cloudflare Workers

## Special Directories

**packages/core/src/engine/**
- Purpose: HTTP engine core implementation
- Generated: No (source code)
- Committed: Yes
- Contents: AOTRouter, FastContext, Gravito engine, parser
- Critical for: Request routing and context

**packages/*/dist/**
- Purpose: Compiled output (ESM, CJS, TypeScript declarations)
- Generated: Yes (via build.ts)
- Committed: No (gitignored)
- Contents: Built JavaScript, declaration files, source maps
- Critical for: NPM publishing and runtime execution

**packages/*/tests/**
- Purpose: Test suites
- Generated: No (source code)
- Committed: Yes
- Naming: `*.test.ts` (unit), `*.integration.test.ts` (integration)
- Coverage target: 75%+

**packages/*/src/types/**
- Purpose: Shared type definitions and interfaces
- Generated: No (source code)
- Committed: Yes
- Contents: Contract interfaces, domain types, enums
- Critical for: Type safety across package boundaries

**packages/*/src/compat/**
- Purpose: Runtime compatibility layers
- Generated: No (source code)
- Committed: Yes
- Contents: Browser-safe implementations, Bun-specific APIs, fallbacks
- Example: `packages/core/src/compat/async-local-storage.ts` (Bun vs Node)

**.turbo/**
- Purpose: Turbo cache and execution data
- Generated: Yes (runtime)
- Committed: No (gitignored)
- Contents: Cache metadata, dependency graphs

**docs/claude/**
- Purpose: Claude Code developer guides
- Generated: No (manually maintained)
- Committed: Yes
- Contents: Architecture principles, patterns, constraints, workflows
- Critical for: Claude AI agent onboarding

---

*Structure analysis: 2026-03-24*
