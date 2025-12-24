# Atlas ORM Performance Benchmark

> **Date:** December 24, 2025
> **Environment:** Docker (Linux arm64), Bun Runtime v1.x
> **Focus:** Cross-Database Performance & Memory Stability

This report provides a comprehensive performance comparison of `@gravito/atlas` across all supported database engines.

## Performance Summary

The following charts detail the Operations Per Second (OPS) achieved across different usage patterns.

<div class="my-10 space-y-8 not-prose">
<!-- Metric Group: Raw Read -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-atlas-cyan/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-atlas-cyan rounded-full shadow-[0_0_10px_cyan]"></span>
Raw Read (Baseline)
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite (In-Memory)</span>
<span class="text-atlas-cyan font-bold">3,523,000 <span class="text-[9px] opacity-60 font-normal">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan shadow-[0_0_10px_cyan]" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-white">1,111,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/60" style="width: 31.5%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">1,110,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/60" style="width: 31.5%"></div>
</div>
</div>
<!-- MySQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MySQL 8.0</span>
<span class="text-white">521,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/30" style="width: 14.7%"></div>
</div>
</div>
</div>
</div>

<!-- Metric Group: Model Hydration -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_purple]"></span>
Model Hydration
</h3>
<div class="space-y-5">
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-purple-400 font-bold">253,000 <span class="text-[9px] opacity-60 font-normal">ops/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-purple-500 shadow-[0_0_10px_purple]" style="width: 100%"></div>
</div>
</div>
<!-- MySQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MySQL 8.0</span>
<span class="text-white">240,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">ops/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-purple-500/80" style="width: 94.8%"></div>
</div>
</div>
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">223,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">ops/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-purple-500/70" style="width: 88.1%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">193,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">ops/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-purple-500/60" style="width: 76.2%"></div>
</div>
</div>
</div>
</div>

<!-- Metric Group: Result Caching (Bulk Insert) -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-yellow-500/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-yellow-500 rounded-full shadow-[0_0_10px_orange]"></span>
Bulk Insert
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">415,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500 shadow-[0_0_10px_orange]" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-white">49,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500/70" style="width: 11.8%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">44,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500/60" style="width: 10.6%"></div>
</div>
</div>
<!-- MySQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MySQL 8.0</span>
<span class="text-white">26,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500/40" style="width: 6.2%"></div>
</div>
</div>
</div>
</div>

<!-- Metric Group: Data Streaming -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_blue]"></span>
Stream (Cursor)
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">197,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-blue-500 shadow-[0_0_10px_blue]" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-white">135,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-blue-500/80" style="width: 68.5%"></div>
</div>
</div>
<!-- MySQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MySQL 8.0</span>
<span class="text-white">132,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-blue-500/70" style="width: 67.0%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">129,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rows/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-blue-500/60" style="width: 65.5%"></div>
</div>
</div>
</div>
</div>
</div>

---

## Throughput Analysis

### The "Active Record" Efficiency
Atlas achieves elite-level hydration speeds, averaging **over 200,000 models per second** across different drivers.

*   **Minimizing Abstraction Cost:** You get the benefits of a full ORM (Dirty Checking, Events, Relationships) with performance that rivals raw query builders.
*   **PostgreSQL Excellence:** Raw read IOPS reached over 1 million, demonstrating the efficiency of our non-blocking asynchronous kernel.

## Memory Stability (Infinite Streaming)

We validated the `Model.cursor()` API by processing 50,000 records (approx. 50MB payload) per driver.

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose my-8">
<!-- SQLite -->
<div class="bg-gray-800/30 border border-white/10 rounded-lg p-4 flex items-center justify-between">
<div>
<div class="text-xs text-gray-400 font-mono mb-1">SQLite</div>
<div class="text-xl font-bold text-white tabular-nums">+19.27 <span class="text-sm font-normal text-gray-500">MB</span></div>
</div>
<div class="text-right">
<div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
Stable
</div>
</div>
</div>
<!-- PostgreSQL -->
<div class="bg-gray-800/30 border border-green-500/30 rounded-lg p-4 flex items-center justify-between relative overflow-hidden group">
<div class="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors"></div>
<div class="relative">
<div class="text-xs text-green-400/80 font-mono mb-1">PostgreSQL</div>
<div class="text-xl font-bold text-green-400 tabular-nums">-8.55 <span class="text-sm font-normal text-green-500/70">MB</span></div>
</div>
<div class="relative text-right">
<div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
Recycled
</div>
</div>
</div>
<!-- MySQL -->
<div class="bg-gray-800/30 border border-white/10 rounded-lg p-4 flex items-center justify-between">
<div>
<div class="text-xs text-gray-400 font-mono mb-1">MySQL 8.0</div>
<div class="text-xl font-bold text-white tabular-nums">+2.62 <span class="text-sm font-normal text-gray-500">MB</span></div>
</div>
<div class="text-right">
<div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
Stable
</div>
</div>
</div>
<!-- MariaDB -->
<div class="bg-gray-800/30 border border-white/10 rounded-lg p-4 flex items-center justify-between">
<div>
<div class="text-xs text-gray-400 font-mono mb-1">MariaDB</div>
<div class="text-xl font-bold text-white tabular-nums">+19.87 <span class="text-sm font-normal text-gray-500">MB</span></div>
</div>
<div class="text-right">
<div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
Stable
</div>
</div>
</div>
</div>

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
