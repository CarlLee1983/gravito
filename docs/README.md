# Gravito Documentation Hub

Welcome to the official documentation for the **Gravito Galaxy Architecture**.

## 🌌 Galaxy Architecture 1.0

Gravito is a modular, high-performance framework built on the principles of **Domain-Driven Design (DDD)** and **Clean Architecture**.

### Core Pillars
- **PlanetCore**: The micro-kernel managing the application lifecycle.
- **Orbits**: Strategic infrastructure extensions (ORM, Auth, Mail).
- **Satellites**: Self-contained business domain modules.

---

## 📚 Documentation Index

### 🚀 Getting Started
- [Quick Start Guide](./en/guide/getting-started/getting-started.md) - Get up and running in minutes.
- [Development Examples](./guides/development-examples.md) - Common patterns and recipes.
- [AI Assistant Guide](./guides/ai/gravito-ai-guide.md) - How to work with the Gravito AI agent.

### 🏗️ Architecture & Core Concepts
- [Architecture Spec](./spec/ARCHITECTURE_SPEC.md) - Core system design specifications.
- [Satellite Specification](./spec/SATELLITE_SPEC.md) - Standards for building domain modules.
- [Event System & Observability](./architecture/event-system-observability.md) - Deep dive into event tracking.
- [Constellation Locks](./architecture/constellation-locks.md) - Distributed locking mechanism.

### 🛠️ Operations & Infrastructure
- [Development Guide](./operations/DEVELOPMENT_GUIDE.md) - Monorepo contribution guide.
- [NPM Publishing](./operations/NPM_PUBLISHING_GUIDE.md) - Package release workflow.
- [Migration Guides](./operations/migration/) - Guides for upgrading and migrating features.
- [CI/CD Optimization](./operations/optimization/ci.md) - Pipeline strategies.

### ⚡ Core Features & Guides
**System Resilience:**
- [Circuit Breakers](./guides/core/circuit-breaker.md)
- [Pool Management](./guides/core/pool-management.md)

**Queues & Async:**
- [Bull Queue Integration](./guides/core/bull-queue-integration.md)
- [DLQ & Retry Strategies](./guides/core/dlq-and-retry.md)

**Observability:**
- [Observability Guide](./guides/core/observability.md)

### 📈 Benchmarks & Performance Optimization
- [Gravito Whitepaper](./whitepaper/gravito-whitepaper.md)
- [Atlas Performance](./benchmarks/ATLAS_PERFORMANCE_WHITEPAPER.md)
- [Bull Queue Benchmarks](./benchmarks/bull-queue-performance.md)
- **[Bun File I/O Optimization](./optimization/OPTIMIZATION_SUMMARY.md)** - Phase 1-4 完整成果（27-46% 框架級效能提升）
  - [Phase 5: Core Audit Report 2026](./optimization/CORE_AUDIT_2026.md) - 技術債與效能缺口分析
  - [Phase 4 Completion Report](./optimization/PHASE_4_COMPLETION.md) - 最後三個模組的非同步化
  - [Provider Loading Optimization](./optimization/PROVIDER_LOADING_OPTIMIZATION.md) - 並行 Provider 預掃描
  - [Runtime Conditional Compilation POC](./optimization/RUNTIME_CONDITIONAL_COMPILATION.md) - Bundle 優化設計

---

## 📂 Multi-language Support
- `zh-TW/` - [繁體中文文檔](./zh-TW/guide/getting-started/introduction.md)
- `en/` - [English Documentation](./en/guide/getting-started/introduction.md) (WIP)

## 🗃️ Archive
- [Task Logs & History](./archive/tasks/) - Historical task breakdowns.
- [Progress Logs](./archive/logs/) - Past session summaries and progress reports.

