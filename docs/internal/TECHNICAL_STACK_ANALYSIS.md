# Gravito Technical Stack Analysis

**Status**: Living Document
**Updated**: 2025-12-22

This document serves as an index for the deep-dive technical architecture documentation of the Gravito Framework. For detailed implementation logic, algorithms, and diagrams, please refer to the specific module documentation linked below.

---

## Core Modules

### 1. [The Micro-kernel (Gravito Core)](./technical/CORE_ARCHITECTURE.md)
**Scope**: `@gravito/core`
*   **Architecture**: Bun Native Adapter, IoC Container, Lifecycle Management.
*   **Key Tech**: Zero-Copy Request handling, Custom Radix Router with Regex constraints.
*   **Highlights**: Explains how Gravito achieves high performance on Bun without relying on Photon core logic directly.

### 2. [The SEO Engine (Luminosity)](./technical/LUMINOSITY_ENGINE.md)
**Scope**: `@gravito/luminosity`
*   **Architecture**: LSM-Tree (Log-Structured Merge-Tree), Streaming XML Generation.
*   **Key Tech**: Write-Ahead Log (WAL), MemTable, Compaction Algorithms.
*   **Highlights**: Detailed analysis of how to generate sitemaps for 1M+ pages without OOM or locking issues.

### 3. [The Database Orbit (Atlas)](./technical/ATLAS_ORM.md)
**Scope**: `@gravito/atlas`
*   **Architecture**: Fluent Query Builder, Grammar-based SQL Compilation.
*   **Key Tech**: Connection Pooling, Transaction Scope, Polyglot Driver Support.
*   **Security Reinforcement**: Implemented **Tagged Template Literals (`sql` tag)** to automatically parameterize raw SQL queries, eliminating injection risks at the architectural level.
*   **Highlights**: How the Grammar system compiles abstract query states into secure, driver-specific SQL.

### 4. [The SSG Adapter (Freeze)](./technical/FREEZE_SSG.md)
**Scope**: `@gravito/freeze`
*   **Architecture**: Dual-Mode Routing (Dynamic/Static), Client-side Redirection.
*   **Key Tech**: Runtime Environment Detection, Static HTML Redirect Generation.
*   **Highlights**: Enables "Write Once, Deploy Anywhere" - allowing the same Monolith code to run as a Node.js server or a static GitHub Pages site.

### 5. [The Internationalization Orbit (Cosmos)](./technical/COSMOS_I18N.md)
**Scope**: `@gravito/cosmos`
*   **Architecture**: Context-injected Orbit, Fallback Pipeline.
*   **Key Tech**: Dot-notation Lookup, Parameter Interpolation.
*   **Highlights**: Standardized i18n solution deeply integrated with PhotonContext.

### 6. [The Type-Safe RPC Orbit (Beam)](./technical/BEAM_RPC.md)
**Scope**: `@gravito/beam`
*   **Architecture**: Shared Type Inference, Zero-Runtime Wrapper.
*   **Key Tech**: Beam client, TypeScript `import type`.
*   **Highlights**: Provides tRPC-like experience with zero runtime overhead, perfect for Gravito Monorepos.

---

## Architectural Summary

Gravito is built on a **"Native-First"** philosophy. Unlike generic Node.js frameworks that add layers of abstraction for compatibility, Gravito strips away these layers when running on **Bun**, utilizing native APIs (like `Bun.serve`, `Bun.password`, `ReadableStream`) to their fullest potential.

*   **Core**: Optimizes for Runtime Performance (Latency & Throughput).
*   **Luminosity**: Optimizes for Write Throughput & Memory Efficiency (Big Data).
*   **Atlas**: Optimizes for Developer Experience (Fluent API) & Security.
*   **Freeze**: Optimizes for Deployment Flexibility (Hybrid Architecture).
*   **Cosmos**: Optimizes for Localization Agility (Lightweight Orbit).
*   **Beam**: Optimizes for Frontend-Backend Synergy (Type Safety).
