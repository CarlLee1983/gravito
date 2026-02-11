# Stasis Architecture Deep Dive 🏗️

`@gravito/stasis` is designed to be the most flexible and efficient caching solution for cloud-native environments. This document explains its core architectural design and operating principles.

---

## 🚀 Core Design Philosophy

### 1. Unified Abstraction
Developers don't need to worry about whether the backend is Redis, Memory, or a File System. Stasis provides a standardized interface so that switching drivers only requires a single line of configuration change, without any modifications to business logic.

### 2. Tiered/Hybrid Architecture
This is the most powerful feature of Stasis. Through `TieredStore`, we combine the strengths of two storage layers:
*   **L1 (Near Cache)**: Stored in the process memory with < 0.01ms latency.
*   **L2 (Distributed Cache)**: Stored in Redis to ensure data synchronization across multiple nodes.

**Operating Logic:**
1.  **Read-Through**: Look for L1 first; if it's a MISS, check L2. If L2 is a HIT, it automatically writes back to L1 (Backfill).
2.  **Write-Through**: Updates both L1 and L2 simultaneously to ensure real-time data consistency.

---

## 📡 Distributed Consistency (Signal Integration)

In a multi-instance environment, the biggest challenge for L1 cache is "stale data." Stasis recommends using `@gravito/signal` for **"Active Invalidation"**:

1.  **Event Dispatch**: When an instance updates data (or executes `cache.forget`).
2.  **Broadcast Sync**: Dispatches an invalidation signal through Signal.
3.  **Auto Cleanup**: All other instances receive the signal and automatically clear the stale data from their local L1 process memory.

This ensures you get the extreme performance of local caching while maintaining a strong consistency experience.

---

## 🧠 Predictive Caching

Stasis contains a built-in predictive driver based on **Markov Chains**.
It tracks the access sequences of keys. For example: if a user frequently accesses `user:1/profile` followed by `user:1/settings`.
The predictor learns this behavior and, when the user accesses the Profile, it **non-blockingly prefetches (Pre-warms)** Settings into L1, minimizing the latency for subsequent requests.

---

## 🛡️ Fault Tolerance (Circuit Breaker)

For distributed applications, a Redis failure should not crash the entire system.
Stasis's `Circuit Breaker` driver monitors the underlying connection state:
*   **Auto Trip**: If Redis timeouts exceed a threshold, it automatically stops access.
*   **Graceful Degradation**: Automatically switches to `MemoryStore` or `NullStore` to keep the application running.
*   **Auto Recovery**: Periodically probes if Redis has recovered and seamlessly switches back to the primary storage.
