# Gravito Launchpad Design Document

> **Mission**: "From Commit to URL in 10 seconds."

## 1. Problem Definition (The Pain Points)

Current CI/CD and Preview Environment workflows suffer from significant waste and DX gaps:

*   **🐢 Slow Feedback Loop**: Traditional Docker builds take 3-10 minutes per PR update, causing context switching and low efficiency.
*   **🫣 Opaque Debugging**: Developers cannot see preview errors (e.g., 502 Bad Gateway) directly and rely on DevOps to fetch logs.
*   **💸 Resource Waste**: Creating fresh pods/VMs for every PR incurs high cold-start costs and cloud bills.

## 2. Solution: The Launchpad Service

Gravito Launchpad is a **container lifecycle management system** tailored for Bun applications.

### Core Value Propositions

1.  **🚀 Flash Deployment**:
    *   Inject code into pre-warmed "IDLE" containers (Rockets).
    *   Skip `docker build` entirely.
    *   **Result**: Deployment time reduced to < 10s.

2.  **🩺 Transparent Telemetry**:
    *   Stream `stdout`, `stderr`, and Bun errors via WebSocket to a developer dashboard.
    *   **Result**: "Glass-box" debugging experience.

3.  **♻️ Refurbishment System**:
    *   Recycle containers after PR closure by running cleanup scripts.
    *   **Result**: Zero waste, maximum resource utilization.

## 3. User Scenarios

### Scenario A: The Hyper-Speed Iteration
*   **Context**: Frontend dev tweaking CSS.
*   **Flow**: Push code -> GitHub Webhook -> Payload Injection into IDLE Rocket -> `bun run` -> **Preview Ready in 8s**.
*   **Impact**: Developer stays in the "Flow State".

### Scenario B: Glass-Box Debugging
*   **Context**: Backend dev hits a 500 error on preview.
*   **Flow**: Open Dashboard -> See realtime Stack Trace via WebSocket -> Fix bug.
*   **Impact**: No need to ask DevOps for logs.

### Scenario C: The Falcon Landing (Refurbishment)
*   **Context**: PR merged and closed.
*   **Flow**: Launchpad detects `pull_request.closed` -> Rocket enters REFURBISHING -> Cleanup script runs -> Rocket returns to IDLE pool.
*   **Impact**: No zombie pods, immediate readiness for next task.

## 4. Architecture & Domain Model

We use **Domain-Driven Design (DDD)**.

### Core Concepts

*   **Rocket (Aggregate Root)**: Represents a Docker container.
    *   Manages lifecycle states.
    *   Records telemetry.
*   **LaunchPad (Domain Service)**: The "Pool Manager".
    *   Monitors pool size.
    *   Assigns missions to rockets.
*   **Mission (Value Object)**:
    *   Git Repo URL, Commit SHA, Branch.

### State Machine (Rocket Lifecycle)

1.  **🔴 IDLE**: Container running, ready for assignment.
2.  **🟡 PREPARING**: Code injection in progress (Locked).
3.  **🟢 ORBITING**: Application running, serving traffic.
4.  **🔵 REFURBISHING**: Cleaning up data, resetting environment.
5.  **⚫ DECOMMISSIONED**: Dead or removed.

## 5. Technical Stack

*   **Orchestrator**: Bun (Hono/Elysia)
*   **Worker Pool**: Docker Containers
*   **Router**: Caddy / Nginx (Dynamic Proxy)
*   **Dashboard**: React / Vue + Bun

## 6. Implementation Stages

1.  **Stage 1: Infrastructure & Pool**: PoolManager, Docker API integration.
2.  **Stage 2: Rapid Deployment**: PayloadInjector, git clone, docker cp.
3.  **Stage 3: Telemetry**: WebSocket log streaming.
4.  **Stage 4: Refurbishment**: Cleanup logic.
