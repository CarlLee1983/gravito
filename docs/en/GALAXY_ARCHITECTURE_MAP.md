# 🌌 Gravito Galaxy Master Map

Welcome to the **complete panorama** of the Gravito Galaxy. This document is the 100% comprehensive master index for all modules, tools, and satellites within the ecosystem.

---

## 🪐 The Core & DNA (Foundation)
The center of gravity and the architectural foundation of the entire ecosystem.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/core`** | **PlanetCore** | The micro-kernel, IoC container, and lifecycle manager. |
| **`@gravito/enterprise`**| **Architectural DNA**| DDD, CQRS, and Clean Architecture primitives. |
| **`@gravito/gravito`** | **Galaxy Umbrella** | The unified entry point and CLI wrapper for all orbits. |

---

## 💻 The Command Center (Orchestration & Tooling)
How the Galaxy is built, expanded, and managed from the terminal.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/cli`** | **Command Center** | The primary CLI interface for managing Gravito projects. |
| **`@gravito/scaffold`** | **Blueprint Engine** | Project generators and structural enforcers for new Satellites. |
| **`create-gravito-app`**| **Birth Pulse** | The quick-start tool for birthing new Galaxies. |
| **`@gravito/launchpad`**| **Launch Platform** | Sub-second zero-downtime container deployments. |

---

## 📡 The Sensing Layer (Web, API & Validation)
How the Galaxy interacts with the outside world and filters incoming signals.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/photon`** | **Sensing Layer** | High-performance HTTP engine based on Hono. |
| **`@gravito/ether`** | **Sensing Filter** | Streaming HTML rewriter based on Bun HTMLRewriter. |
| **`@gravito/impulse`** | **Sensing Filter** | Declarative request validation and data integrity. |
| **`@gravito/beam`** | **Portal Layer** | Zero-overhead, type-safe RPC for Client-to-Satellite and M2M. |
| **`@gravito/graphql`** | **Semantic Gateway**| Unified GraphQL interface aggregating data across Satellites. |
| **`@gravito/astral`** | **Discovery Layer** | Shadow-contract OpenAPI generator and Swagger UI. |
| **`impulse-bridge`** | **Filter Bridge** | Connects backend validation rules to the frontend UI. |

---

## 💾 The Gravity Layer (Persistence & State)
How the Galaxy persists knowledge across SQL, NoSQL, and multi-tier Cache.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/atlas`** | **Data Gravity (SQL)**| Bun-native ORM and Query Builder (Postgres/SQLite). |
| **`@gravito/dark-matter`**| **NoSQL Gravity** | Bun-native MongoDB client and Change Streams. |
| **`@gravito/plasma`** | **Energy Grid** | Bun-native Redis integration for shared state and locks. |
| **`@gravito/stasis`** | **Thermal Buffer** | Tiered L1/L2 caching with predictive warming. |
| **`@gravito/nebula`** | **Storage Core** | Multi-disk file management (Local, S3 via `nebula-s3`). |
| **`@gravito/monolith`** | **Knowledge Core** | File-based Markdown CMS for documentation and content. |

---

## 🧠 The Nervous System (Logic & Real-time)
How information flows and logic is orchestrated within the Galaxy.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/flux`** | **Logic Orchestrator**| Distributed workflow engine and Saga coordinator. |
| **`@gravito/stream`** | **Async Engine** | Background job processing and EDA (Event-Driven). |
| **`@gravito/signal`** | **Communication** | Multi-driver email framework and template rendering. |
| **`@gravito/flare`** | **Comm. Flux** | Multi-channel notifications (Slack, SMS, Push). |
| **`@gravito/ripple`** | **Gravitational Waves**| Bi-directional WebSocket Pulse (Client via `ripple-client`). |
| **`@gravito/radiance`** | **Event Horizon** | Real-time state sync via Pusher/Redis. |
| **`@gravito/echo`** | **Deep Space Radar**| Enterprise webhook receiving and reliable dispatch. |

---

## 🛡️ The Immune System (Security & Resilience)
How the Galaxy protects itself from failures and attacks.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/fortify`** | **Security Shield** | E2E authentication, M2M tokens, and Distributed RBAC. |
| **`@gravito/sentinel`** | **Identity Base** | Core identity management, Guards, and ACL Policies. |
| **`@gravito/mass`** | **Data Quality Layer**| High-performance TypeBox schema validation. |
| **`@gravito/resilience`**| **Guardian Layer** | Circuit breakers, DLQs, Retries, and Worker Pools. |

---

## 👁️ The Visual Cortex (Presentation & SEO)
How the Galaxy renders itself for humans and search engines.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/prism`** | **Visual Focus** | Edge template engine, SSG, and Image Optimization. |
| **`@gravito/ion`** | **Neural Bridge** | Inertia.js v2 adapter for Modern Monoliths. |
| **`@gravito/chromatic`**| **Aesthetic Spectrum**| Unified styling, color math, and distributed theming. |
| **`@gravito/freeze`** | **Hydration Layer** | Resumability engine (React via `freeze-react`, Vue via `freeze-vue`). |
| **`@gravito/luminosity`**| **SmartMap Engine** | Enterprise SEO, Sitemap sharding, and Meta indexing. |

---

## 🏛️ The Administrative Cortex (Back-office)
The enterprise management interface for governing the entire Galaxy.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/admin-sdk`** | **Gov. SDK** | The foundational toolkit for building management features. |
| **`admin-shell-react`** | **Gov. Shell** | The React-based administrative container. |
| **`admin-ui-*`** | **Domain Modules** | Access, Ad, Analytics, Catalog, Dashboard, Invoice, etc. |

---

## ⚙️ The Engine Room (System & Edge)
How the Galaxy interacts with the physical OS and Edge environments.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/horizon`** | **Clockwork** | Distributed task scheduler with node-role awareness. |
| **`@gravito/forge`** | **Industrial Core** | CPU-intensive media processing pipelines (FFmpeg). |
| **`@gravito/nova`** | **External Thrusters**| Type-safe shell orchestration and command execution. |
| **`@gravito/quark`** | **Quantum Link** | Ultra-low latency Bun-native TCP engine. |
| **`@gravito/xenon`** | **Native Bridge** | Secure FFI bindings for Rust/C++ integration. |
| **`orbit-cloudflare`** | **Edge Adapter** | Specialized integration for the Cloudflare ecosystem. |

---

## 🔭 The Observatory (Ops & Monitoring)
How engineers monitor and manage the internal health of the Galaxy.

| Module | Galaxy Role | Description |
|:---|:---|:---|
| **`@gravito/zenith`** | **Control Plane** | Visual dashboard for monitoring queues and workers. |
| **`@gravito/quasar`** | **Heartbeat Agent** | Distributed telemetry agent reporting to Zenith. |
| **`@gravito/monitor`** | **Vital Signs** | Health checks, metrics, and OpenTelemetry tracing. |
| **`@gravito/spectrum`** | **Visual Telescope**| Real-time local debugging UI with request correlation. |
| **`@gravito/constellation`**| **Star Chart** | Multi-satellite SEO sitemaps and shadow deployment. |

---

## 📡 Specialized Satellites (Pre-built Services)
Out-of-the-box domain units provided by the framework.

- **`official-landing`**: The primary marketing portal for the Galaxy.
- **`support-chat-widget`**: Real-time customer support bridge.
- **`site`**: The default implementation template for new Galaxies.
- **`launchpad-dashboard`**: The operational UI for managing container deployments.

---

## 📄 License
MIT © 2026 Gravito Framework Team
