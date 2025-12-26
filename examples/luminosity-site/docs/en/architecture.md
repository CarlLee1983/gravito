---
title: Architecture
order: 3
---

# Architecture

Luminosity's core is powered by an **LSM-Tree (Log-Structured Merge-Tree)** inspired architecture, similar to the storage engines found in high-performance databases like Cassandra, LevelDB, and RocksDB.

This architectural choice enables Luminosity to handle millions of URLs with minimal memory footprint and blazing-fast write performance.

## Core Concepts

<a id="atomic-sequential-writes"></a>

### 1. Atomic Sequential Writes

Traditional sitemap generators often suffer from **random I/O bottlenecks**—every URL update requires reading, modifying, and rewriting a large XML file.

Luminosity takes a fundamentally different approach:

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.15]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 32px 32px;"></div>
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.08),transparent_70%)]"></div>
<div class="flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
<div class="flex flex-col items-center gap-4 group">
<div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-all duration-500 shadow-xl">
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">Source</span>
<span class="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">NEW URLS</span>
</div>
</div>
<div class="text-white/5 md:rotate-0 rotate-90 scale-125">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
</div>
<div class="flex flex-col items-center gap-4 group">
<div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-500 shadow-xl relative overflow-hidden">
<div class="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">Engine</span>
<span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">APPEND LOG</span>
</div>
</div>
<div class="text-white/5 md:rotate-0 rotate-90 scale-125">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
</div>
<div class="flex flex-col items-center gap-4 group">
<div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-all duration-500 shadow-xl">
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="12" x2="12" y1="3" y2="21"/><line x1="3" x2="21" y1="12" y2="12"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">Store</span>
<span class="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">MEM BUFFER</span>
</div>
</div>
<div class="text-white/5 md:rotate-0 rotate-90 scale-125">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
</div>
<div class="flex flex-col items-center gap-4 group">
<div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-center text-rose-400 group-hover:scale-110 group-hover:border-rose-500/50 group-hover:bg-rose-500/10 transition-all duration-500 shadow-xl">
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">Optimize</span>
<span class="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">COMPACTION</span>
</div>
</div>
</div>
</div>

**How it works:**
<div class="tech-list my-6">
<div class="tech-item">New URLs are **appended** to a sequential log file (`sitemap.ops.jsonl`)</div>
<div class="tech-item">Each write operation is atomic and append-only</div>
<div class="tech-item">No file locking required during writes</div>
<div class="tech-item">Zero read-modify-write cycles</div>
</div>

**Benefits:**
<div class="tech-list my-6">
<div class="tech-item tech-item-alt text-white">Write speeds approaching hardware limits (~70,000 ops/sec)</div>
<div class="tech-item tech-item-alt text-white">No lock contention in high-traffic scenarios</div>
<div class="tech-item tech-item-alt text-white">Crash-safe: incomplete writes don't corrupt existing data</div>
</div>

```typescript
// Atomic write example
await engine.getStrategy().add({
  url: 'https://example.com/new-page',
  lastmod: new Date(),
  priority: 0.8
})
// This is append-only, instantly persisted
```

---

<a id="dynamic-compaction"></a>

### 2. Dynamic Compaction

As append-only logs grow, they need periodic consolidation. Luminosity's **Compactor** handles this automatically during idle cycles.

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.15]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 32px 32px;"></div>
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(245,158,11,0.05),transparent_70%)]"></div>
<div class="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12 text-center">
<div class="flex flex-col gap-3 w-56">
<div class="flex items-center justify-between px-5 py-4 rounded-xl bg-white/[0.03] border border-amber-500/20 text-amber-500 text-xs font-mono shadow-lg backdrop-blur-md relative group overflow-hidden">
<div class="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500 opacity-20"></div>
<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>Log Segment 1</div>
<span class="text-[10px] text-gray-500">4 KB</span>
</div>
<div class="flex items-center justify-between px-5 py-4 rounded-xl bg-white/[0.03] border border-amber-500/20 text-amber-500 text-xs font-mono shadow-lg backdrop-blur-md relative group overflow-hidden">
<div class="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500 opacity-20"></div>
<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>Log Segment 2</div>
<span class="text-[10px] text-gray-500">12 KB</span>
</div>
<div class="flex items-center justify-between px-5 py-4 rounded-xl bg-white/[0.03] border border-indigo-500/20 text-indigo-400 text-xs font-mono shadow-lg backdrop-blur-md relative group overflow-hidden">
<div class="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500 opacity-20"></div>
<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>Old Snapshot</div>
<span class="text-[10px] text-gray-500">105 MB</span>
</div>
</div>
<div class="flex flex-col items-center gap-2 group">
<div class="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/40 group-hover:text-amber-500 group-hover:border-amber-500/50 transition-all duration-500 animate-pulse">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
</div>
<span class="text-[10px] font-black tracking-widest text-gray-600 uppercase">Auto Compact</span>
</div>
<div class="relative group">
<div class="absolute -inset-4 bg-purple-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
<div class="relative px-8 py-10 rounded-3xl bg-white/[0.03] border border-purple-500/30 text-purple-400 font-bold shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4 min-w-[240px]">
<div class="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-1">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="tracking-tight text-white group-hover:text-purple-400 transition-colors">Optimized Snapshot</span>
<span class="text-[10px] font-mono text-gray-500 mt-2">105.02 MB (Read-only)</span>
</div>
</div>
</div>
</div>
</div>

**How it works:**
<div class="tech-list my-6">
<div class="tech-item tech-item-warning">Background thread monitors log size</div>
<div class="tech-item tech-item-warning">When threshold is reached, triggers compaction</div>
<div class="tech-item tech-item-warning">Merges multiple log files into a single snapshot</div>
<div class="tech-item tech-item-warning">Removes duplicate and deleted entries</div>
<div class="tech-item tech-item-warning">Runs without blocking read/write operations</div>
</div>

**Configuration:**
```typescript
const engine = new SeoEngine({
  mode: 'incremental',
  baseUrl: 'https://example.com',
  incremental: {
    logDir: './.luminosity',
    compactInterval: 3600000 // Compact every hour
  }
})
```

**Manual Compaction via CLI:**
```bash
bun lux:compact --force
```

---

<a id="zero-copy-serialization"></a>

### 3. Zero-Copy Serialization

When serving sitemaps, Luminosity leverages **streaming XML generation** to avoid loading the entire dataset into memory.

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.15]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 32px 32px;"></div>
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(34,211,238,0.05),transparent_70%)]"></div>
<div class="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12">
<div class="flex flex-col items-center gap-4 group">
<div class="w-20 h-20 rounded-2xl bg-white/[0.03] border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-all duration-500 shadow-xl">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">Storage</span>
<span class="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">DISK / MEMORY</span>
</div>
</div>
<div class="text-white/5 md:rotate-0 rotate-90 scale-150 animate-pulse">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
</div>
<div class="flex flex-col items-center gap-4 group">
<div class="w-20 h-20 rounded-2xl bg-white/[0.03] border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:border-amber-500/50 group-hover:bg-amber-500/10 transition-all duration-500 shadow-xl relative overflow-hidden">
<div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">Processing</span>
<span class="text-xs font-bold text-white group-hover:text-amber-500 transition-colors">STREAM TRANSFORM</span>
</div>
</div>
<div class="text-white/5 md:rotate-0 rotate-90 scale-150 animate-pulse">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
</div>
<div class="flex flex-col items-center gap-4 group">
<div class="w-20 h-20 rounded-2xl bg-white/[0.03] border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-500 shadow-xl">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">Output</span>
<span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">XML STREAM</span>
</div>
</div>
</div>
</div>

**How it works:**
<div class="tech-list my-6">
<div class="tech-item tech-item-alt">Entries are read as a stream, not loaded entirely into memory</div>
<div class="tech-item tech-item-alt">XML elements are generated on-the-fly using direct buffer writes</div>
<div class="tech-item tech-item-alt">The HTTP response begins before all entries are processed</div>
<div class="tech-item tech-item-alt">Memory usage remains constant regardless of sitemap size</div>
</div>

**Memory-efficient serving:**
```typescript
// Handles 1M+ URLs with ~80MB memory
const entries = await engine.getStrategy().getEntries()
const xml = renderer.render(entries, requestUrl)
```

This approach means a site with 1 million URLs uses roughly the same memory as one with 1,000 URLs during sitemap generation.

---

<a id="tiered-storage"></a>

### 4. Tiered Storage

Luminosity automatically manages data across multiple storage tiers for optimal performance:

<div class="my-10 p-10 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.2]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 40px 40px;"></div>
<div class="relative z-10 flex flex-col items-center gap-6">
<div class="w-full max-md relative group">
<div class="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
<div class="relative flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-red-500/20 backdrop-blur-md group-hover:border-red-500/50 transition-all shadow-xl">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
</div>
<div>
<div class="text-[10px] font-black tracking-widest text-red-500 uppercase mb-0.5">L0 - Hot Tier</div>
<div class="text-sm font-bold text-white">Memory Cache</div>
</div>
</div>
<div class="text-right">
<div class="text-[10px] font-mono text-gray-500">Access Time</div>
<div class="text-xs font-bold text-red-400">~1μs</div>
</div>
</div>
</div>
<div class="text-white/5 animate-bounce"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m7-7-7 7-7-7"/></svg></div>
<div class="w-full max-md relative group">
<div class="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
<div class="relative flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-md group-hover:border-amber-500/50 transition-all shadow-xl">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
</div>
<div>
<div class="text-[10px] font-black tracking-widest text-amber-500 uppercase mb-0.5">L1 - Warm Tier</div>
<div class="text-sm font-bold text-white">Operations Log</div>
</div>
</div>
<div class="text-right">
<div class="text-[10px] font-mono text-gray-500">Access Time</div>
<div class="text-xs font-bold text-amber-400">~1ms</div>
</div>
</div>
</div>
<div class="text-white/5 animate-bounce"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m7-7-7 7-7-7"/></svg></div>
<div class="w-full max-md relative group">
<div class="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
<div class="relative flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-blue-500/20 backdrop-blur-md group-hover:border-blue-500/50 transition-all shadow-xl">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
</div>
<div>
<div class="text-[10px] font-black tracking-widest text-blue-500 uppercase mb-0.5">L2 - Cold Tier</div>
<div class="text-sm font-bold text-white">Snapshot File</div>
</div>
</div>
<div class="text-right">
<div class="text-[10px] font-mono text-gray-500">Access Time</div>
<div class="text-xs font-bold text-blue-400">~10ms</div>
</div>
</div>
</div>
</div>
</div>

**Tier Breakdown:**

| Tier | Storage | Access Speed | Use Case |
|------|---------|--------------|----------|
| L0 (Hot) | In-Memory Cache | ~1μs | Recent updates, active queries |
| L1 (Warm) | JSONL Log File | ~1ms | Pending operations |
| L2 (Cold) | Snapshot JSON | ~10ms | Historical data, backup |

**Automatic Data Movement:**
- New entries start in L0 (memory)
- Periodically flushed to L1 (log file)
- Compaction merges L1 into L2 (snapshot)
- Reads merge all tiers transparently

```typescript
// Example: Cache warming loads cold data into hot tier
await engine.getStrategy().warmCache()
```

---

<a id="multi-framework"></a>

### 5. Multi-framework Adapters

Luminosity is designed to be framework-agnostic. Through its specialized adapter system, it can natively scan and integrate with modern web architectures.

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.1]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 32px 32px;"></div>
<div class="relative z-10 flex flex-wrap justify-center items-center gap-4 md:gap-8">
  <div class="flex flex-col items-center gap-2 group">
    <div class="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:border-white/40 group-hover:bg-white/10 transition-all duration-300">
      <span class="text-xs font-bold font-mono uppercase">Next</span>
    </div>
  </div>
  <div class="flex flex-col items-center gap-2 group">
    <div class="w-14 h-14 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center text-emerald-500/40 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all duration-300">
      <span class="text-xs font-bold font-mono uppercase text-emerald-500">Nuxt</span>
    </div>
  </div>
  <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-white shadow-2xl relative overflow-hidden group">
    <div class="absolute inset-0 bg-indigo-500/10 animate-pulse"></div>
    <div class="relative flex flex-col items-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      <span class="text-[8px] font-black tracking-widest uppercase mt-2">Luminosity</span>
    </div>
  </div>
  <div class="flex flex-col items-center gap-2 group">
    <div class="w-14 h-14 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-center justify-center text-orange-500/40 group-hover:border-orange-500/50 group-hover:bg-orange-500/10 transition-all duration-300">
      <span class="text-xs font-bold font-mono uppercase text-orange-500">Hono</span>
    </div>
  </div>
  <div class="flex flex-col items-center gap-2 group">
    <div class="w-14 h-14 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-center text-blue-500/40 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-all duration-300">
      <span class="text-xs font-bold font-mono uppercase text-blue-500">Express</span>
    </div>
  </div>
</div>
</div>

**Unified Interface:**
No matter which framework you use, Luminosity provides a consistent API for sitemap management. The adapters automatically handle framework-specific routing logic, transforming it into a standard internal representation.

---

<a id="route-scanner"></a>

### 6. Intelligent Route Scanning

Manual sitemap maintenance is error-prone. Luminosity's `RouteScanner` automates this by introspecting your application's router instance in real-time.

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_rgba(16,185,129,0.1),transparent_70%)]"></div>
<div class="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-center">
  <div class="flex-1 w-full max-w-[280px]">
    <div class="p-4 rounded-xl bg-white/[0.02] border border-white/10 font-mono text-[10px] space-y-2 opacity-60 group-hover:opacity-100 transition-opacity">
      <div class="flex items-center gap-2 text-blue-400 font-bold border-b border-white/5 pb-2 mb-2 italic">Router Register</div>
      <div class="flex justify-between"><span>GET /</span><span class="text-emerald-500">Home</span></div>
      <div class="flex justify-between"><span>GET /about</span><span class="text-emerald-500">About</span></div>
      <div class="flex justify-between"><span>GET /blog/*</span><span class="text-emerald-500">Posts</span></div>
      <div class="flex justify-between"><span>POST /api/v1</span><span class="text-rose-500">Skip</span></div>
    </div>
  </div>
  <div class="flex flex-col items-center gap-2">
    <div class="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 animate-spin-slow">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    </div>
    <span class="text-[9px] font-black tracking-widest text-emerald-500/60 uppercase">Scanning...</span>
  </div>
  <div class="flex-1 w-full max-w-[280px]">
    <div class="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/20 font-mono text-[10px] space-y-2 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
      <div class="flex items-center gap-2 text-emerald-400 font-bold border-b border-emerald-500/20 pb-2 mb-2 italic">Sitemap Entries</div>
      <div class="flex items-center gap-2 text-white/80">
        <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
        <span>https://site.com/</span>
      </div>
      <div class="flex items-center gap-2 text-white/80">
        <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
        <span>https://site.com/about</span>
      </div>
      <div class="flex items-center gap-2 text-white/80">
        <div class="w-1 h-1 rounded-full bg-emerald-500"></div>
        <span>https://site.com/blog/hello</span>
      </div>
    </div>
  </div>
</div>
</div>

**Capabilities:**
- **Auto-Discovery:** Detects all `GET` routes including dynamic parameters.
- **Pattern Filtering:** Define `include` and `exclude` globs to control what enters the sitemap.
- **Priority Logic:** Automatically assigns sitemap priority based on path depth.

---

## Pipeline Visualization

<div class="my-16 p-8 md:p-12 rounded-[32px] bg-[#0A0A0A] border border-white/10 relative overflow-hidden not-prose font-sans">
<!-- Subtle Grid Background -->
<div class="absolute inset-0 opacity-[0.1]" style="background-image: linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px); background-size: 40px 40px;"></div>
<div class="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-900/10 to-transparent"></div>
<!-- Pipeline Container -->
<div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">
<!-- Step 1: Ingest -->
<div class="flex-1 w-full relative group">
<div class="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
<div class="relative p-6 rounded-2xl bg-[#111] border border-white/10 group-hover:border-emerald-500/50 transition-all shadow-2xl">
<div class="flex items-center gap-3 mb-3">
<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
<span class="text-xs font-bold text-emerald-500 tracking-widest uppercase">Input</span>
</div>
<h4 class="text-lg font-black text-white italic tracking-tighter mb-2">INGEST STREAM</h4>
<div class="h-px w-full bg-white/5 my-3"></div>
<div class="space-y-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>HTTP POST / API</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>Webhooks</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>CLI Commands</div>
</div>
</div>
<!-- Connector Down (Mobile) or Right (Desktop) -->
<div class="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 z-20 text-white/10">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
</div>
</div>
<!-- Step 2: Memory -->
<div class="flex-1 w-full relative group">
<div class="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
<div class="relative p-6 rounded-2xl bg-[#111] border border-white/10 group-hover:border-blue-500/50 transition-all shadow-2xl">
<div class="flex items-center gap-3 mb-3">
<div class="w-2 h-2 rounded-full bg-blue-500"></div>
<span class="text-xs font-bold text-blue-500 tracking-widest uppercase">Buffer</span>
</div>
<h4 class="text-lg font-black text-white italic tracking-tighter mb-2">MEMORY</h4>
<div class="h-px w-full bg-white/5 my-3"></div>
<div class="space-y-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>MemTable</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>Sorted Map</div>
<div class="flex items-center gap-2 text-blue-400"><div class="w-1 h-1 bg-blue-500 rounded-full"></div>Mutable</div>
</div>
</div>
<div class="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 z-20 text-white/10">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
</div>
</div>
<!-- Step 3: Disk -->
<div class="flex-1 w-full relative group">
<div class="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
<div class="relative p-6 rounded-2xl bg-[#111] border border-white/10 group-hover:border-purple-500/50 transition-all shadow-2xl">
<div class="flex items-center gap-3 mb-3">
<div class="w-2 h-2 rounded-full bg-purple-500"></div>
<span class="text-xs font-bold text-purple-500 tracking-widest uppercase">Storage</span>
</div>
<h4 class="text-lg font-black text-white italic tracking-tighter mb-2">DISK SEGMENTS</h4>
<div class="h-px w-full bg-white/5 my-3"></div>
<div class="space-y-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>SSTables</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>Snapshots</div>
<div class="flex items-center gap-2 text-purple-400"><div class="w-1 h-1 bg-purple-500 rounded-full"></div>Immutable</div>
</div>
</div>
<div class="hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 z-20 text-white/10">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
</div>
</div>
<!-- Step 4: Output -->
<div class="flex-1 w-full relative group">
<div class="absolute inset-0 bg-white/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
<div class="relative p-6 rounded-2xl bg-[#111] border border-white/10 group-hover:border-white/30 transition-all shadow-2xl">
<div class="flex items-center gap-3 mb-3">
<div class="w-2 h-2 rounded-full bg-white"></div>
<span class="text-xs font-bold text-white tracking-widest uppercase">Serve</span>
</div>
<h4 class="text-lg font-black text-white italic tracking-tighter mb-2">OUTPUT</h4>
<div class="h-px w-full bg-white/5 my-3"></div>
<div class="space-y-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>sitemap.xml</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>robots.txt</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>Streamed</div>
</div>
</div>
</div>
</div>
<!-- Flow Animation Line in Background -->
<div class="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent -z-10 hidden lg:block"></div>
</div>

## Benchmark Results

Using these architectural patterns, Luminosity achieves:

| Metric | Value |
|--------|-------|
| URLs Indexed | 1,000,000 |
| Build Time | 14.2 seconds |
| Memory Peak | 84 MB |
| Throughput | ~70,000 URLs/sec |

See the [Benchmark](/docs/benchmark) page for detailed methodology and results.

## Next Steps

- [Getting Started](/docs/getting-started) - Quick setup guide
- [CLI Commands](/docs/cli) - Terminal control for Luminosity
- [Framework Integration](/docs/frameworks) - Connect with your stack
