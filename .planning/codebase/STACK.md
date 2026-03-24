# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**
- TypeScript 5.9.3 - Entire monorepo codebase, strict mode enabled
- JavaScript - Supporting scripts and some configuration files

**Secondary:**
- HTML/CSS - UI templates, email templates
- YAML - Docker and configuration files
- TOML - Build and runtime configuration (bunfig.toml)

## Runtime

**Environment:**
- Bun 1.3.9 - Primary runtime, used for all core packages and development
- Node.js 18.0.0+ - Supported as fallback for compatibility

**Package Manager:**
- Bun 1.3.9 - Native monorepo package manager
- Lockfile: `bun.lock` present

**Build System:**
- Turbo - Monorepo build orchestration via `turbo.json`
  - Caching enabled per task
  - Dependency-based build ordering (`dependsOn`)
  - 61 packages total across core, templates, and examples
- Bun's native `build` API - Direct TypeScript/ESM compilation in `build.ts` files

## Frameworks

**Core:**
- **Hono** 4.12.2 - HTTP framework (`@gravito/photon` wrapper)
- **GraphQL Yoga** 5.1.1 - GraphQL server (`@gravito/graphql`)
- **MongoDB Driver** 6.0.0 - Document database (optional peer, `@gravito/dark-matter`)
- **PostgreSQL (postgres)** 3.4.8 - SQL client (`@gravito/atlas`)

**Build/Dev:**
- Biome 2.3.10 - Unified linter, formatter, and code checker
  - Configured for 100 char line width
  - Single quotes, no semicolons, ES5 trailing commas
  - Handles TypeScript, JavaScript, JSON, CSS with Tailwind support
- simple-git-hooks 2.13.1 - Pre-commit and pre-push hooks
- lint-staged - Runs Biome check on staged files before commit
- Turbo - Task orchestration and dependency management

**Testing:**
- Bun's native test runner - Used by all packages in monorepo
  - Test timeout: 10000ms (configured in `bunfig.toml`)
  - Coverage reporting: LCOV format via `--coverage --coverage-reporter=lcov`
- Vitest 2.1.9+ - Frontend component testing (`@gravito/support-chat-widget`)
  - happy-dom environment for DOM simulation
  - Coverage via v8 provider
- Playwright 1.58.0 - E2E testing (`@gravito/support-chat-widget`)
  - Test command: `playwright test`
  - UI mode: `playwright test --ui`

**Quality:**
- OpenTelemetry API 1.9.0 - Observability instrumentation
- TypeDoc 0.27.0 - API documentation generation

## Key Dependencies

**Critical:**
- **zod** 4.3.6 - Runtime schema validation, used across multiple packages
- **@gravito/core** 2.0.6 - Micro-kernel foundation (all packages depend on this)

**Infrastructure & Adapters:**
- **cborg** 4.5.8 - CBOR encoding/decoding
- **msgpackr** 1.11.8 - MessagePack serialization
- **protobufjs** 8.0.0 - Protocol Buffers support
- **dataloader** 2.2.3 - GraphQL data batching

**AWS Services:**
- **@aws-sdk/client-s3** 3.956.0 - S3 storage (`@gravito/constellation`)
- **@aws-sdk/client-sns** 3.734.0 - SNS notifications (`@gravito/flare`)
- **@aws-sdk/client-sqs** 3.975.0 - SQS queue integration
- **@aws-sdk/client-ses** 3.953.0 - Email sending

**Cloud Storage:**
- **@google-cloud/storage** 7.18.0 - Google Cloud Storage support

**Database/Cache:**
- **ioredis** 5.8.2 - Redis client (optional peer)
- **better-sqlite3** 11.0.0 - SQLite client (optional peer, `@gravito/atlas`)
- **mysql2** 3.9.0 - MySQL/MariaDB driver (optional peer, `@gravito/atlas`)
- **pg** 8.18.0 - PostgreSQL driver (optional peer, `@gravito/atlas`)
- **lru-cache** 11.0.2 - In-memory caching

**Real-time & Messaging:**
- **ws** 8.18.0 - WebSocket implementation (optional peer)
- **nats** 2.23.0 - NATS messaging (optional peer, `@gravito/ripple`)
- **graphql-ws** 6.0.6 - GraphQL WebSocket protocol

**GraphQL Tools:**
- **graphql** 16.8.1 - GraphQL core
- **graphql-middleware** 6.1.35 - Query middleware
- **graphql-complexity-validation** 1.0.4 - Complexity checking
- **@envelop/depth-limit** 7.1.0 - Query depth limiting
- **@envelop/response-cache** 9.1.0 - Response caching
- **@graphql-yoga/plugin-apq** 3.18.0 - Automatic Persisted Queries

**Utilities:**
- **p-limit** 7.2.0 - Async concurrency control
- **yaml** 2.8.2 - YAML parsing
- **handlebars** 4.7.8 - Template engine
- **pug** 3.0.3 - Template engine for views
- **mjml** 4.18.0 - Email template framework
- **canvas** 3.2.1 - Image generation
- **nodemailer** 7.0.12 - SMTP email sending

**Performance & Monitoring:**
- **mitata** 1.0.34 - Benchmarking tool (used in core, atlas, quasar)
- **@opentelemetry/api** 1.9.0 - Observability API
- **@opentelemetry/semantic-conventions** 1.39.0 - OpenTelemetry standards

## Configuration

**Environment:**
- Configuration files:
  - `bunfig.toml` - Bun runtime config (test timeout, install mode)
  - `tsconfig.json` - TypeScript configuration (ESNext target, strict mode)
  - `biome.json` - Code quality (linting, formatting)
  - `turbo.json` - Build task definitions and caching
  - `.env` files - Environment variables (git-ignored for secrets)

**Build Configuration:**
- `packages/*/build.ts` - Bun build scripts per package
- Parallel ESM/CJS builds with TypeScript declaration generation
- Entry points: `src/index.ts` with multiple export variants

**Key Configuration Settings:**
- TypeScript:
  - `target`: ESNext (transpiled at runtime by Bun)
  - `module`: ESNext (ESM-first)
  - `strict`: true (all strictness flags enabled)
  - `moduleResolution`: bundler (for path aliases)
  - 60+ path aliases for workspace imports (e.g., `@gravito/core`, `@gravito/photon`)
- Biome:
  - `lineWidth`: 100 characters
  - `indentWidth`: 2 spaces
  - `quoteStyle`: single quotes
  - `semicolons`: asNeeded (no semicolons)
  - Trailing commas: es5

## Platform Requirements

**Development:**
- Bun >= 1.3.9
- Node.js >= 18.0.0 (for compatibility)
- TypeScript 5.9.3
- Git with simple-git-hooks

**Production:**
- Bun runtime (primary) or Node.js >= 18.0.0 (fallback)
- Environment variables:
  - Database URLs (PostgreSQL, MongoDB, MySQL)
  - AWS credentials (for S3, SNS, SES, SQS)
  - Third-party service tokens (Redis, etc.)
  - Optional: OpenTelemetry collector endpoint

**Database Support:**
- PostgreSQL 8.11+ (via `postgres` and `pg` clients)
- MySQL/MariaDB 3.9+ (via `mysql2`)
- SQLite 11.0+ (via `better-sqlite3`, optional)
- MongoDB 6.0+ (via native driver, optional peer)

**External Services:**
- AWS (S3, SNS, SES, SQS)
- Google Cloud Storage
- Redis (ioredis, optional)
- NATS (optional)
- WebSocket support (native or ws library)

---

*Stack analysis: 2026-03-24*
