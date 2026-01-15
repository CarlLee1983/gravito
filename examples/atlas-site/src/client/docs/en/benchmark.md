# Atlas ORM Performance Report

> **Test Date:** January 15, 2026
> **Environment:** Production Infrastructure (Linux arm64), Bun Runtime v1.3+
> **Focus:** Native Bun.sql Driver vs. Traditional Drivers

This report details the throughput and memory characteristics of `@gravito/atlas` across all supported database engines, highlighting the massive performance gains from our native driver integration.

## Executive Summary

The following table shows the Operations Per Second (OPS) achieved across different usage patterns.
 
<div class="my-10 space-y-8 not-prose">
<!-- Metric Group: Raw Read -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-primary/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-primary rounded-full shadow-neon-blue"></span>
Native Raw Throughput (Baseline)
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite (Bun.sql Native)</span>
<span class="text-primary font-bold">3,523,000 <span class="text-[9px] opacity-60 font-normal">rec/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-primary shadow-neon-blue" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB (Native)</span>
<span class="text-white">1,111,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rec/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-primary/60" style="width: 31.5%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL (Native)</span>
<span class="text-white">1,110,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rec/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-primary/60" style="width: 31.5%"></div>
</div>
</div>
</div>
</div>

<!-- Metric Group: Model Hydration -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-atlas-cyan/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-atlas-cyan rounded-full shadow-[0_0_10px_#00e5ff]"></span>
Model Instantiation (Hydration)
</h3>
<div class="space-y-5">
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-atlas-cyan font-bold">253,000 <span class="text-[9px] opacity-60 font-normal">models/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan shadow-[0_0_10px_#00e5ff]" style="width: 100%"></div>
</div>
</div>
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">223,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">models/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/70" style="width: 88.1%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">193,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">models/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/60" style="width: 76.2%"></div>
</div>
</div>
</div>
</div>

<!-- Metric Group: Bulk Write -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-yellow-500/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-yellow-500 rounded-full shadow-[0_0_10px_orange]"></span>
Bulk Insert Performance
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">415,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rec/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500 shadow-[0_0_10px_orange]" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-white">49,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">rec/sec</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500/70" style="width: 11.8%"></div>
</div>
</div>
</div>
</div>
</div>

---

## Analysis: The Native Advantage

### Eliminating the "ORM Tax"
Atlas has achieved elite-tier hydration speeds, averaging **200,000+ models per second** across drivers. By bypassing traditional network drivers and utilizing Bun's C++ SQL core, we've reduced abstraction overhead to near-zero.

### Memory Stability (Infinite Streams)
We verified the `chunk()` and `cursor()` APIs by processing 1,000,000 records. Heap usage remained stable below **30MB** throughout the entire lifecycle, proving Atlas is safe for massive data migrations and ETL tasks.

## Security & Reliability

Performance does not compromise safety. Our benchmark suite validates:
*   **Zero SQL Injection:** All high-throughput tests include sanity checks for parameterized bindings.
*   **Atomic Transactions:** Verified consistency across all SQL dialects.
*   **Standardized Errors:** Database-specific exceptions are normalized across drivers.

## Reproduce Benchmarks

Run the suite on your local machine:

```bash
git clone https://github.com/gravito-framework/gravito.git
cd examples/atlas-benchmark
bun install
bun run bench
```