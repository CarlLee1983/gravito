# Gravito Ecosystem Technical Whitepaper
**Version 1.0.0**

## Introduction

Gravito is a modern, developer-first asynchronous task processing ecosystem designed for the TypeScript era. It consists of two symbiotic pillars:
1.  **Gravito Stream**: The high-performance, atomic queue processing engine.
2.  **Gravito Zenith**: The centralized operational control plane and monitoring system.

This whitepaper details the architectural decisions, technology stack, and implementation patterns that enable Gravito to deliver enterprise-grade reliability with zero-config developer experience.

---

# Part 1: Gravito Stream (The Engine)

**Design Philosophy**: "Atomic Reliability at Speed".
Stream is built to handle high throughput while ensuring no data is ever lost due to race conditions or crashes.

## 1. Smart Queue Routing & Storage
*   **Feature**: Multi-Strategy Queue Routing (Priority & Standard)
*   **Technology**: Redis Lists (O(1)) & Namespace Partitioning.
*   **Implementation**:
    *   Instead of using heavy Sorted Sets (O(log N)) for everything, Stream optimizes for the common case.
    *   **Standard Jobs**: Stored in standard Redis Lists (`RPUSH` / `LPOP`) for maximum throughput.
    *   **Priority Jobs**: Implemented via **Implicit Partitioning**. A "High Priority" job is simply routed to a distinct key (`queue:name:critical`). The Consumer is programmed to strictly poll these keys in order (`critical` > `high` > `default` > `low`).
*   **Outcome**: We achieve priority processing without the performance penalty of managing a single sorted set for all jobs.

## 2. Guaranteed Atomicity & Concurrency Control
*   **Feature**: Race-Condition Free Rate Limiting
*   **Technology**: Redis Lua Scripting (`EVAL`).
*   **Implementation**:
    *   All critical state transitions happen server-side within Redis.
    *   **Rate Limiting**: When a worker requests a job, a Lua script atomically:
        1. Checks the current window counter (Fixed Window strategy).
        2. If under limit: Increments counter and executes `LPOP`.
        3. If over limit: Returns null immediately.
*   **Outcome**: Hundreds of workers can hammer the queue simultaneously without ever exceeding the rate limit or processing a job twice.

## 3. Resilience: Graceful Retry & Exponential Backoff
*   **Feature**: Self-Healing Job Pipelines
*   **Technology**: Client-Side Intelligence + Scheduled Storage (ZSET).
*   **Implementation**:
    *   Unlike primitive queues that just "fail", Stream Workers wrap execution in a resilience layer.
    *   **On Failure**: The worker catches the error, calculates the next retry time using the formula `delay = initial * (multiplier ^ attempts)`.
    *   **Action**: The job is **not** discarded. It is re-dispatched to the `Delayed` set with a new timestamp score.
*   **Outcome**: Transient errors (API timeouts, DB locks) heal themselves without human intervention, preventing alarm fatigue.

## 4. Dead Letter Queue (DLQ) Management
*   **Feature**: Toxic Job Isolation
*   **Technology**: Dedicated Redis Lists (`queue:name:failed`).
*   **Implementation**:
    *   When a job exhausts its `maxAttempts`, it is atomically moved to a `failed` list.
    *   **Zero-Loss Guarantee**: We use `RPOPLPUSH` (or its Lua equivalent) to ensure there is no millisecond where the job exists in neither the active queue nor the failed queue.
    *   **Manual Replay**: System provides an API to batch-move jobs from `failed` back to `waiting`, effectively resetting their attempt counters.
*   **Outcome**: Bad data doesn't block the queue. Developers can inspect failed payloads, fix the bug, and replay the jobs.

---

# Part 2: Gravito Zenith (The Control Plane)

**Design Philosophy**: "Maximum Visibility, Minimum Overhead".
Zenith is designed to provide real-time insights without degrading the performance of the queue engine.

## 1. Real-Time Telemetry
*   **Feature**: Live matrix-style logs and metrics.
*   **Technology**: Server-Sent Events (SSE) + Redis Pub/Sub.
*   **Implementation**:
    *   **Producer**: Workers emit opaque events via `PUBLISH flux:logs`.
    *   **Bridge**: The Zenith Server subscribes to Redis and forwards these messages into an HTTP SSE Stream.
    *   **Frontend**: React (Vite) connects to `/api/logs/stream` and updates the State Store (TanStack Query/Zustand) in real-time.
*   **Outcome**: Developers see what's happening *as it happens* (sub-100ms latency) without refreshing the page.

## 2. Distributed Worker Health
*   **Feature**: Worker auto-discovery and resource monitoring.
*   **Technology**: Ephemeral Keys with TTL (Time-To-Live).
*   **Implementation**:
    *   **Heartbeat**: Every worker process autonomously writes a key `worker:{uuid}` every 5 seconds with a 15-second expiration (TTL).
    *   **Payload**: Includes robust process metrics: CPU Load Average, RSS Memory Usage, and Heap Statistics.
    *   **Discovery**: The Console simply scans for these keys. If a worker crashes hard (no heartbeat), the key expires automatically.
*   **Outcome**: No central registry needed. The system accurately reflects active capacity and automatically cleans up stale worker records.

## 3. Hybrid Persistence (The Audit Layer)
*   **Feature**: Long-term history search without Redis memory costs.
*   **Technology**: Polyglot Persistence (Redis + SQL).
*   **Implementation**:
    *   Redis is expensive RAM. We treat it as a "Hot Buffer".
    *   **Fire-and-Forget Archiving**: When a job completes (Success or Fail), an asynchronous hook writes the full job payload and result to an SQL database (SQLite/MySQL).
    *   **Separation**: The active queue (Redis) remains lean and fast. The history (SQL) grows indefinitely on cheap disk storage.
*   **Outcome**: You can search millions of past jobs to debug an issue from 3 months ago without slowing down today's processing.

## 4. UI/UX Architecture
*   **Feature**: Premium, App-Like Experience.
*   **Technology**: React 19, TailwindCSS, Framer Motion, Lucide Icons.
*   **Implementation**:
    *   **Optimistic UI**: Buttons (Pause/Resume, Retry) update the UI state immediately while the API call happens in the background.
    *   **Virtualization**: Lists can render thousands of job rows smoothly.
    *   **Aesthetics**: Glassmorphism and micro-interactions provide a modern, professional feel that enhances developer trust.
*   **Outcome**: A tool that developers *enjoy* using, reducing the friction of maintaining background infrastructure.
