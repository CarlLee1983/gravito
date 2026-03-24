# External Integrations

**Analysis Date:** 2026-03-24

## APIs & External Services

**Storage Services:**
- **AWS S3** - File storage driver via `@gravito/constellation`
  - SDK: `@aws-sdk/client-s3` 3.956.0
  - Alternative: Google Cloud Storage (`@google-cloud/storage` 7.18.0)
  - Alternative: Cloudflare R2 (S3-compatible)
  - Alternative: MinIO (S3-compatible)
  - Configuration: Environment variables for AWS credentials

**Notification Services:**
- **AWS SNS** - SMS/push notifications via `@gravito/flare`
  - SDK: `@aws-sdk/client-sns` 3.734.0
  - Use case: Notification broadcasting
- **Nodemailer** - SMTP email sending
  - Package: `nodemailer` 7.0.12
  - Configuration: SMTP connection details via environment

**Queue Services:**
- **AWS SQS** - Message queue integration
  - SDK: `@aws-sdk/client-sqs` 3.975.0
  - Used in: `@gravito/quasar` monitoring

**Email Delivery:**
- **AWS SES** - Email service provider
  - SDK: `@aws-sdk/client-ses` 3.953.0
  - Configuration: AWS credentials and region

**Webhook Handling:**
- **@gravito/echo** 3.1.2 - Webhook receiver/sender
  - Supports: Stripe, GitHub, and custom HMAC signatures
  - Configuration: Webhook secrets via environment

## Data Storage

**Databases:**

**PostgreSQL:**
- Client: `postgres` 3.4.8 (primary in `@gravito/atlas`)
- Fallback: `pg` 8.18.0 (traditional node-postgres)
- Connection: Via `POSTGRES_URL` environment variable
- ORM/Query Builder: Custom Atlas ORM in `@gravito/atlas`
- Features: Transactions, migrations, query builder

**MySQL/MariaDB:**
- Client: `mysql2` 3.9.0 (optional peer in `@gravito/atlas`)
- Connection: Via `MYSQL_URL` environment variable
- Supported Versions: MySQL 8+, MariaDB 10+

**SQLite:**
- Client: `better-sqlite3` 11.0.0 (optional peer in `@gravito/atlas`)
- Connection: Local file path via environment
- Use case: Development, testing, embedded scenarios

**MongoDB:**
- Client: `mongodb` 6.0.0 (optional peer in `@gravito/dark-matter`)
- Connection: Via `MONGODB_URI` environment variable
- Library Wrapper: `@gravito/dark-matter` (Laravel-style API)
- Features: GridFS, change streams, soft deletes, aggregation

**File Storage:**
- **Local Filesystem:** Supported via `@gravito/nebula` (default)
- **AWS S3:** Via `@gravito/nebula-s3` adapter
- **Google Cloud Storage:** Via `@gravito/constellation`
- **Cloudflare R2:** S3-compatible (works with `@gravito/nebula-s3`)
- **MinIO:** S3-compatible (works with `@gravito/nebula-s3`)

**Caching:**
- **Redis:** Via `ioredis` 5.8.2 (optional peer in `@gravito/ripple`)
  - Configuration: `REDIS_URL` environment variable
  - In-memory cache also available: `lru-cache` 11.0.2

## Authentication & Identity

**Auth Provider:**
- **Custom JWT Implementation** - No external provider
  - Implementation: `@gravito/sentinel` 4.0.2
  - Token signing: Bun's built-in crypto
  - Support: Bearer token authentication
  - Middleware: Integration via `@gravito/photon`

**Optional External Providers:**
- Setup ready for OAuth 2.0 integration via adapters

## Monitoring & Observability

**Error Tracking:**
- OpenTelemetry API 1.9.0 - Instrumentation support
- Manual error logging via application code

**Logs:**
- **Default:** Console logging (via Node console)
- **Integration Ready:** OpenTelemetry collector endpoint support
  - Configure via `OTEL_EXPORTER_OTLP_ENDPOINT` (convention)
  - Semantic conventions: `@opentelemetry/semantic-conventions` 1.39.0

**APM/Tracing:**
- OpenTelemetry instrumentation ready
- Performance monitoring via `mitata` benchmarks
- Middleware tracing support in `@gravito/photon`

## CI/CD & Deployment

**Hosting:**
- **Bun Deployment:** Primary deployment target
  - Runtime: Bun 1.3.9+
  - Standard: ESM modules in dist/
- **Node.js Deployment:** Fallback support via CJS stubs
  - Minimum: Node 18.0.0
  - Generated CJS files available in dist/

**CI Pipeline:**
- **Local Simulation:** `bash scripts/ci-simulation.sh`
- **Affected Packages:** Turbo-based change detection
- **Test Optimization:** `bun run scripts/test-ci-optimization.ts`
- **Pre-push Validation:** Hook runs `validate-affected-packages.ts`

**Build Process:**
```bash
# Full monorepo build
bun run build                    # ESM + DTS

# Type checking
bun run typecheck               # All packages
bun run typecheck:full --force  # Force rebuild

# Testing
bun run test                    # All packages
bun run test:coverage           # With coverage
```

## Environment Configuration

**Required environment variables by service:**

**Database:**
- `POSTGRES_URL` or `MYSQL_URL` or `MONGODB_URI` or SQLite file path

**AWS Services:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (default: us-east-1)

**Redis (optional):**
- `REDIS_URL` (e.g., `redis://localhost:6379`)

**OpenTelemetry (optional):**
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `OTEL_SDK_DISABLED`

**Application:**
- `NODE_ENV` (development, test, production)
- Database URLs per driver
- Third-party API keys (Stripe, GitHub, etc.)

**Secrets location:**
- `.env` files (git-ignored via `.gitignore`)
- Secret management: External systems (Vercel, GitHub Actions, etc.)
- Docker environment variables

## Webhooks & Callbacks

**Incoming Webhooks:**
- **@gravito/echo** 3.1.2 handles webhook reception
  - Signature verification: HMAC-SHA256
  - Supported platforms: Stripe, GitHub, custom
  - Endpoint path: Configurable via controller routing

**Outgoing Webhooks:**
- **@gravito/echo** sends webhook calls
  - Automatic retry logic
  - Signature generation for security
  - Configuration: Webhook endpoints in application

## Real-time Communication

**WebSocket Support:**
- **Native Bun:** Via `Bun.serve()` with `@gravito/photon`
- **Library:** `ws` 8.18.0 (optional peer)
- **Broadcasting:** `@gravito/ripple` 4.0.3 with:
  - Redis backend (optional)
  - NATS backend (optional)
  - Native Bun WebSocket (default)
- **GraphQL Subscriptions:** `graphql-ws` 6.0.6

**Real-time Data:**
- **Change Streams:** MongoDB change streams in `@gravito/dark-matter`
- **Pub/Sub:** Redis Pub/Sub via `ioredis`

## Email & Templating

**Email Sending:**
- **SMTP:** Via `nodemailer` 7.0.12
- **Template Engines:**
  - Handlebars 4.7.8 - General templating
  - Pug 3.0.3 - View templates
  - MJML 4.18.0 - Email template framework (responsive emails)

**Configuration:**
- SMTP credentials via environment variables
- Email templates in `resources/lang/*/emails/` structure

## Queue & Job Processing

**Queue Systems (optional peer dependencies):**
- **BullMQ** - Job queue integration
- **Bee-Queue** - Alternative queue system
- **Redis** - Required backend for queue systems
- Monitoring: `@gravito/quasar` 1.3.2 provides:
  - Queue statistics (Probes)
  - Real-time job tracking (Bridges)
  - Multi-provider support

## GraphQL Enhancements

**GraphQL Middleware & Tools:**
- **graphql-yoga** 5.1.1 - Server framework
- **graphql-complexity-validation** 1.0.4 - Query complexity limits
- **dataloader** 2.2.3 - Query batching/N+1 prevention
- **graphql-middleware** 6.1.35 - Custom middleware
- **@graphql-yoga/plugin-apq** 3.18.0 - Automatic Persisted Queries

**Rate Limiting:**
- `@envelop/rate-limiter` 10.0.0 - GraphQL rate limiting
- `graphql-rate-limit-directive` 2.0.6 - Directive-based limits

## Content Delivery

**Static Assets:**
- **Cloudflare Workers:** Adapter available in `@gravito/photon`
- **Vercel:** Adapter available in `@gravito/photon`
- **Deno:** Adapter available in `@gravito/photon`

**HTML Rendering:**
- HTMX middleware support in `@gravito/photon`
- Server-side rendering: Via template engines

## Performance Optimization

**Code Splitting & Bundling:**
- ESM default (production)
- Tree-shaking via `sideEffects: false` in package.json
- Parallel execution: Turbo handles dependency ordering

**Serialization:**
- **CBOR** 4.5.8 - Compact binary serialization
- **MessagePack** 1.11.8 - Alternative binary format
- **Protocol Buffers** 8.0.0 - Schema-based serialization

**Rate Limiting:**
- Redis-backed: `@gravito/photon/middleware/ratelimit-redis`
- In-memory: `@gravito/photon/middleware/ratelimit`

## Security

**HTTP Security:**
- **CORS:** Configurable via `@gravito/photon/middleware/cors`
- **Body Size Limiting:** Via `@gravito/photon/middleware/body`
- **OWASP Protections:** Built into `@gravito/photon/middleware/security`

**Authentication:**
- **JWT:** Via `@gravito/sentinel`
- **HMAC Signatures:** Webhook verification in `@gravito/echo`

---

*Integration audit: 2026-03-24*
