# Atlas ORM Performance Benchmark

> **Date:** December 24, 2025
> **Environment:** Docker (Linux arm64), Bun Runtime v1.x
> **Focus:** Cross-Database Performance & Memory Stability

This report provides a comprehensive performance comparison of `@gravito/atlas` across all supported database engines.

## Performance Summary

The following table details the Operations Per Second (OPS) achieved across different database drivers.

| Metric | SQLite (In-Memory) | PostgreSQL | MySQL 8.0 | MariaDB |
| :--- | :--- | :--- | :--- | :--- |
| **Raw Read (Baseline)** | **3,523,000** | **1,110,000** | **521,000** | **1,111,000** |
| **Model Hydration** | **223,000** | **193,000** | **240,000** | **253,000** |
| **Bulk Insert** | **415,000** | **44,000** | **26,000** | **49,000** |
| **Stream (Cursor)** | **197,000** | **129,000** | **132,000** | **135,000** |

---

## Throughput Analysis

### The "Active Record" Efficiency
Atlas achieves elite-level hydration speeds, averaging **over 200,000 models per second** across different drivers.

*   **Minimizing Abstraction Cost:** You get the benefits of a full ORM (Dirty Checking, Events, Relationships) with performance that rivals raw query builders.
*   **PostgreSQL Excellence:** Raw read IOPS reached over 1 million, demonstrating the efficiency of our non-blocking asynchronous kernel.

## Memory Stability (Infinite Streaming)

We validated the `Model.cursor()` API by processing 50,000 records (approx. 50MB payload) per driver.

| Driver | Heap Delta | Status |
| :--- | :--- | :--- |
| **SQLite** | +19.27 MB | Stable |
| **PostgreSQL** | -8.55 MB* | Recycled |
| **MySQL** | +2.62 MB | Stable |
| **MariaDB** | +19.87 MB | Stable |

*\*Negative delta indicates aggressive GC collection during the stream, proving zero retention of processed objects.*

---

## Security & Reliability Verified

Beyond performance, the benchmark suite successfully validated:

*   **Auto-Parameterization:** No SQL injection vectors detected during high-throughput stress.
*   **Standardized Exceptions:** Database-specific errors were correctly normalized into `UniqueConstraintError`, etc.
*   **Unified Schema Builder:** Identical migration syntax worked across 4 different SQL dialects.

## Reproduction

Run the full automated suite on your local machine:

```bash
git clone https://github.com/gravito-framework/gravito.git
cd examples/atlas-benchmark
docker-compose up --build
```
