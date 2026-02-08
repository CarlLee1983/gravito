# Gravito Ecosystem Technical Whitepaper
**Version 1.0.0 (Galaxy Architecture)**

## Introduction

Gravito is a modular, high-performance TypeScript framework built for the modern web. It transitions from a specialized task processing system to a comprehensive application ecosystem based on the **Galaxy Architecture**.

The ecosystem is founded on three pillars:
1.  **PlanetCore**: The ultra-lightweight micro-kernel that enforces Domain-Driven Design (DDD).
2.  **Gravito Stream**: The high-performance, atomic asynchronous engine.
3.  **Gravito Zenith**: The centralized operational control plane and monitoring system.

---

# Part 1: The Galaxy Architecture

**Design Philosophy**: "Rigorous Core, Flexible Perimeter."

## 1. Micro-Kernel (PlanetCore)
*   **Technology**: IoC Container + Hook System.
*   **Implementation**: A zero-dependency kernel that manages the application lifecycle. It uses **Boot-time Resolution** to compile routes and dependencies at startup, ensuring that the runtime is read-only and optimized for speed.

## 2. Orbits & Satellites
*   **Orbits (Infrastructure)**: Strategic extensions like `OrbitAtlas` (Database), `OrbitSignal` (Event Bus/Mail), and `OrbitIon` (Inertia.js) that "orbit" the core to provide resources.
*   **Satellites (Domain)**: Self-contained business modules (Catalog, Membership, Commerce) that implement specific domains using Clean Architecture.

## 3. Manifest-Driven Development (MDD)
*   **Feature**: High-level system assembly via `gravito.config.ts`.
*   **Outcome**: Developers can assemble a full-featured enterprise system by simply declaring satellites. The framework handles the low-level wiring, auto-mounting controllers, and connecting domain events.

---

# Part 2: Gravito Stream (The Asynchronous Engine)

**Design Philosophy**: "Atomic Reliability at Speed".
Stream is the standard background processing unit for the Galaxy Architecture, ensuring no data is ever lost due to race conditions.

## 1. Smart Queue Routing & Storage
*   **Technology**: Redis Lists (O(1)) & Namespace Partitioning.
*   **Implementation**:
    *   **Standard Jobs**: Stored in standard Redis Lists (`RPUSH` / `LPOP`).
    *   **Priority Jobs**: Implemented via **Implicit Partitioning**. A "High Priority" job is routed to `queue:name:critical`. The Consumer strictly polls these keys in order.
*   **Outcome**: Priority processing without the performance penalty of single sorted sets.

## 2. Guaranteed Atomicity
*   **Technology**: Redis Lua Scripting (`EVAL`).
*   **Implementation**: All critical state transitions (Rate Limiting, Job Popping) happen server-side within Redis to prevent race conditions across hundreds of workers.

## 3. Resilience: Graceful Retry & Exponential Backoff
*   **Technology**: Scheduled Storage (ZSET).
*   **Implementation**: Workers wrap execution in a resilience layer. On failure, jobs are re-dispatched to the `Delayed` set with a calculated backoff timestamp (`initial * (multiplier ^ attempts)`).

## 4. Dead Letter Queue (DLQ) Management
*   **Technology**: Atomic `RPOPLPUSH`.
*   **Implementation**: Toxic jobs are isolated to `failed` lists with a zero-loss guarantee, allowing manual inspection and replay without blocking healthy queues.

---

# Part 3: Gravito Zenith (The Control Plane)

**Design Philosophy**: "Maximum Visibility, Minimum Overhead".
Zenith provides real-time insights into the entire Galaxy ecosystem.

## 1. Real-Time Telemetry
*   **Technology**: Server-Sent Events (SSE) + Redis Pub/Sub.
*   **Implementation**: Workers emit events via Redis Pub/Sub; the Zenith bridge forwards these into an SSE stream for sub-100ms log visibility in the React dashboard.

## 2. Distributed Worker Health
*   **Technology**: Ephemeral Keys with TTL.
*   **Implementation**: Workers autonomously write heartbeat keys containing CPU/RAM/Heap metrics. The dashboard scans these keys for auto-discovery.

## 3. Hybrid Persistence (The Audit Layer)
*   **Technology**: Polyglot Persistence (Redis + SQL).
*   **Implementation**: Redis acts as the "Hot Buffer." Completed/Failed jobs are asynchronously archived to SQL (SQLite/MySQL) for long-term search without impacting RAM.

## 4. UI/UX Architecture
*   **Technology**: React 19, TailwindCSS, Framer Motion.
*   **Implementation**: Optimistic UI updates and virtualized lists ensure a premium, high-performance management experience.
