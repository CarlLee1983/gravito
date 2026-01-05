# 🌌 Project Quasar: Master Implementation Plan

**Version**: 1.0.0 (Unified)
**Target**: Zenith v1.0
**Context**: This document supersedes all previous "Pulse" plans. It is the single source of truth for the Quasar monitoring ecosystem.

---

## 1. Vision & Identity

**Quasar** is the comprehensive observability layer for the Gravito ecosystem. It unifies infrastructure monitoring (CPU/RAM), application insights (Queues/Slow Logs), and availability checks into a single stream.

> **Slogan**: *"The brightest signal in your infrastructure."*

---

## 2. Architecture & Deployment Matrix

We employ a "Right Tool for the Job" strategy for deployment:

| Ecosystem | Tool | Package | Strategy |
| :--- | :--- | :--- | :--- |
| **Node.js / Bun** | **SDK** | `@gravito/quasar` | **In-App Integration**. Directly imports into the app. Captures Event Loop, Heap, and Queues. |
| **Legacy / Polyglot** | **Agent** | `gravito/quasar-agent` | **Sidecar / Daemon**. Standalone Go binary. Captures OS-level metrics and external Queue states via Redis/API. |
| **PHP / Laravel** | **Package** | `gravito/laravel-zenith` | **Native Integration**. Laravel Service Provider. Captures Jobs, Logs, and Exceptions. |

### 🚀 Deployment Methods (Zero Friction)
1.  **NPM**: `npm install @gravito/quasar` (For Node developers)
2.  **Docker**: `image: gravito/quasar-agent:latest` (For Container/K8s/Laravel Sail)
3.  **Shell**: `curl -sL get.gravito.dev/quasar | bash` (For Bare Metal/VM)

---

## 3. Data Protocol (The Quasar Schema)

All agents/SDKs report to Redis using this unified schema.

**Namespace**: `gravito:quasar:`

### A. Heartbeat (Infrastructure)
*   **Key**: `gravito:quasar:node:{service_name}:{node_id}`
*   **TTL**: 30 seconds
*   **Metrics Philosophy**: Report **BOTH** Process and System metrics to isolate resource usage.
    *   `process`: metrics for the specific service (RAM usage, CPU time).
    *   `system`: metrics for the host OS (Load avg, Total RAM).

### B. Queues (Workload)
*   **Key**: `gravito:quasar:queues:{service_name}`
*   **TTL**: 30 seconds
*   **Purpose**: Snapshots of queue depths from various drivers.
    *   Gravito Stream (Native)
    *   Laravel Horizon (Redis)
    *   BullMQ (Redis)
    *   AWS SQS (API)

### C. Insights (Performance)
*   **Key**: `gravito:quasar:slow:{service_name}` (Stream)
*   **Purpose**: Log requests or jobs that exceed performance thresholds.

---

## 4. Execution Roadmap

### Phase 1: Foundation & Application Monitoring (Pulse Node)
**Goal**: Establish the basic dashboard and Node.js SDK for monitoring application health (CPU/RAM).

- [x] **Define Schema**: Update `PULSE_SPEC.md` with new Redis key patterns (`gravito:quasar:node:*`) and payload structure.
- [x] **SDK Update**: Refactor `@gravito/quasar` (formerly pulse-node) to support:
    - [x] Automatic runtime detection (Node, Bun, Deno).
    - [x] System/Process split metrics.
    - [x] Correct Redis namespacing.
- [x] **Server Update**: Update Zenith's `PulseService` to scan new key patterns.
- [x] **UI Overhaul**: Redesign `PulsePage` in Zenith:
    - [x] Implement "Card" layout for nodes.
    - [x] Rich metrics visualization (CPU/RAM split bars).
    - [x] Add brand icons for runtimes (Node, Bun, Deno, PHP, Go, Python).
    - [x] **Layout Optimization**: Compact Grid for Service Groups.

---

### Phase 2: Architecture Evolution - "The Brain-Hand Model" 🧠 🖐️ - **Completed** ✅
To support advanced features like **Queue Insights** (Phase 2) and **Remote Control** (Phase 3), we are adopting a bidirectional architecture.

*   **Metric Transport (The Mouth)**: Agent sends metrics to Zenith (via shared Redis).
*   **Local Insight (The Eyes)**: Agent inspects *its own* environment (Local Redis, Local Queue) to gather data. Zenith doesn't need to connect to the App DB directly.
*   **Command execution (The Hand)**: Zenith publishes commands (Retry/Delete), and Agent listens and executes them locally.

#### Revised Phase 2: Application Insights (Queues) - **Completed** ✅
**Goal**: Enable Quasar Agent to "see" local queues and report their status.

- [x] **SDK Architecture**: Update `QuasarAgent` to handle **Dual Connections**:
    - `transport`: Connection to Zenith (for sending heartbeat).
    - `app`: Connection to Local App (for inspecting queues/bull/laravel).
- [x] **Probe Implementation**: Create `QueueProbe` interface and implementations:
    - `RedisListProbe`: Simple `LLEN` checks.
    - [x] `BullProbe` (Future): Check `bull:*:waiting`, etc.
    - [x] `LaravelProbe`: Check `queues:default`, `queues:reserved`, `queues:delayed`.
- [x] **SDK API**: Expose `.monitorQueue(name, type)` method.
- [x] **UI Update**: Update `NodeCard` to render a "Queues" section if queue data is present in payload.

### Phase 3: Remote Control (Command & Control) - **Completed** ✅
**Goal**: Allow Zenith to instruct Quasar to perform actions (Retry Job, Delete Job).

- [x] **Protocol**: Define Command Protocol (Redis Pub/Sub: `gravito:quasar:cmd:{service}:{node_id}`).
- [x] **Agent**: Implement `CommandListener` in SDK.
- [x] **Command Executors**: Implement `RetryJobExecutor` and `DeleteJobExecutor`.
- [x] **Security (Allowlist Strategy)**:
    - [x] Implement **Command Allowlist** inside Agent code (only `RETRY_JOB`, `DELETE_JOB` allowed).
    - [ ] (Future) Use **Redis ACL** (v6+) to restrict Agent's `transport` connection.
- [x] **Server**: Add `CommandService` and `/api/pulse/command` endpoint.
- [x] **UI**: Add "Retry/Delete" buttons in Zenith `PulsePage` for failed queue jobs.
- [x] **Documentation**: Created `ALERTING_GUIDE.md` for configuration best practices.

### Phase 4: Polyglot Agent - **Completed** ✅
*   [x] Create `gravito-framework/quasar` repo (`quasar-go`).
*   [x] Develop Go Agent core (utilizing `gopsutil`).
    *   [x] System Probe (CPU/RAM)
    *   [x] Agent heartbeat loop
    *   [x] Config management (env vars)
*   [x] Implement Queue Monitoring in Go Agent:
    *   [x] Redis List Probe
    *   [x] Laravel Queue Probe
*   [x] Implement Remote Control in Go Agent:
    *   [x] Command Listener (Pub/Sub)
    *   [x] RETRY_JOB / DELETE_JOB Executors
    *   [x] **Laravel Deep Integration**:
        *   [x] `LARAVEL_ACTION` Executor (runs `artisan` safely).
        *   [x] Auto-discovery of Laravel project root via process inspection.
        *   [x] **Advanced Process Introspection**: Captures real-time CPU/RAM usage per Laravel Worker process.
        *   [x] **Virtual Node Mapping**: Visualizes individual Laravel Workers as distinct nodes in Zenith UI.
        *   [x] Support for `retry-all`, `retry {id}`, and `restart` (graceful worker reload).
*   [x] Docker & Makefile setup.
*   [x] Binary Release pipeline (GitHub Actions).
*   [x] Publish to Docker Hub (`carllee/quasar-go-agent`).

---

## 5. Security & Access
*   **Auth**: Agents authenticate via a shared secret (`QUASAR_TOKEN`) if writing to a remote Redis.
*   **Isolation**: Process metrics only report what they have access to. System metrics require readable `/proc` (in Docker).
