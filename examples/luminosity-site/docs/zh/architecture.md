---
title: 架構設計
order: 3
---

# 架構設計

Luminosity 的核心採用 **LSM-Tree（日誌結構合併樹）** 架構，與 Cassandra、LevelDB、RocksDB 等高效能資料庫使用的儲存引擎相似。

這種架構選擇使 Luminosity 能夠以極小的記憶體佔用處理數百萬個 URL，並實現極快的寫入效能。

## 核心概念

<a id="atomic-sequential-writes"></a>

### 1. 原子級順序寫入

傳統的 sitemap 生成器通常受到 **隨機 I/O 瓶頸** 的困擾——每次 URL 更新都需要讀取、修改和重寫一個大型 XML 檔案。

Luminosity 採用了根本不同的方法：

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.15]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 32px 32px;"></div>
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(99,102,241,0.08),transparent_70%)]"></div>
<div class="flex flex-col md:flex-row items-center justify-center gap-8 relative z-10">
<div class="flex flex-col items-center gap-4 group">
<div class="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 transition-all duration-500 shadow-xl">
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">來源入口</span>
<span class="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors text-center">新 URL 攝入</span>
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
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">核心引擎</span>
<span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors text-center">原子追加日誌</span>
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
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">存儲 L1</span>
<span class="text-xs font-bold text-white group-hover:text-blue-400 transition-colors text-center">記憶體緩衝</span>
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
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">優化進程</span>
<span class="text-xs font-bold text-white group-hover:text-rose-400 transition-colors text-center">背景合併壓縮</span>
</div>
</div>
</div>
</div>

**運作原理：**
<div class="tech-list my-6">
<div class="tech-item">新 URL 被 **追加** 到順序日誌檔案（`sitemap.ops.jsonl`）</div>
<div class="tech-item">每個寫入操作都是原子性的，只進行追加</div>
<div class="tech-item">寫入時不需要檔案鎖定</div>
<div class="tech-item">零讀取-修改-寫入循環</div>
</div>

**優勢：**
<div class="tech-list my-6">
<div class="tech-item tech-item-alt text-white">寫入速度接近硬體極限（約 70,000 次操作/秒）</div>
<div class="tech-item tech-item-alt text-white">高流量場景下無鎖競爭</div>
<div class="tech-item tech-item-alt text-white">崩潰安全：不完整的寫入不會損壞現有資料</div>
</div>

```typescript
// 原子寫入範例
await engine.getStrategy().add({
  url: 'https://example.com/new-page',
  lastmod: new Date(),
  priority: 0.8
})
// 這是只追加操作，立即持久化
```

---

<a id="dynamic-compaction"></a>

### 2. 動態壓縮

隨著只追加日誌的增長，需要定期整合。Luminosity 的 **Compactor** 會在閒置週期自動處理此過程。

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.15]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 32px 32px;"></div>
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(245,158,11,0.05),transparent_70%)]"></div>
<div class="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12 text-center">
<div class="flex flex-col gap-3 w-56">
<div class="flex items-center justify-between px-5 py-4 rounded-xl bg-white/[0.03] border border-amber-500/20 text-amber-500 text-xs font-mono shadow-lg backdrop-blur-md relative group overflow-hidden">
<div class="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500 opacity-20"></div>
<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>日誌分段 1</div>
<span class="text-[10px] text-gray-500">4 KB</span>
</div>
<div class="flex items-center justify-between px-5 py-4 rounded-xl bg-white/[0.03] border border-amber-500/20 text-amber-500 text-xs font-mono shadow-lg backdrop-blur-md relative group overflow-hidden">
<div class="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500 opacity-20"></div>
<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>日誌分段 2</div>
<span class="text-[10px] text-gray-500">12 KB</span>
</div>
<div class="flex items-center justify-between px-5 py-4 rounded-xl bg-white/[0.03] border border-indigo-500/20 text-indigo-400 text-xs font-mono shadow-lg backdrop-blur-md relative group overflow-hidden">
<div class="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500 opacity-20"></div>
<div class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>舊快照</div>
<span class="text-[10px] text-gray-500">105 MB</span>
</div>
</div>
<div class="flex flex-col items-center gap-2 group">
<div class="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white/40 group-hover:text-amber-500 group-hover:border-amber-500/50 transition-all duration-500 animate-pulse">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
</div>
<span class="text-[10px] font-black tracking-widest text-gray-600 uppercase">自動壓縮</span>
</div>
<div class="relative group">
<div class="absolute -inset-4 bg-purple-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
<div class="relative px-8 py-10 rounded-3xl bg-white/[0.03] border border-purple-500/30 text-purple-400 font-bold shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4 min-w-[240px]">
<div class="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-1">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="tracking-tight text-white group-hover:text-purple-400 transition-colors">優化後的快照</span>
<span class="text-[10px] font-mono text-gray-500 mt-2">105.02 MB (唯讀)</span>
</div>
</div>
</div>
</div>
</div>

**運作原理：**
<div class="tech-list my-6">
<div class="tech-item tech-item-warning">背景執行緒監控日誌大小</div>
<div class="tech-item tech-item-warning">達到閾值時觸發壓縮</div>
<div class="tech-item tech-item-warning">將多個日誌檔案合併為單一快照</div>
<div class="tech-item tech-item-warning">移除重複和已刪除的條目</div>
<div class="tech-item tech-item-warning">運行時不阻塞讀寫操作</div>
</div>

**配置方式：**
```typescript
const engine = new SeoEngine({
  mode: 'incremental',
  baseUrl: 'https://example.com',
  incremental: {
    logDir: './.luminosity',
    compactInterval: 3600000 // 每小時壓縮一次
  }
})
```

**透過 CLI 手動壓縮：**
```bash
bun lux:compact --force
```

---

<a id="zero-copy-serialization"></a>

### 3. 零拷貝序列化

在提供 sitemap 時，Luminosity 利用 **串流 XML 生成** 來避免將整個資料集載入記憶體。

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.15]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 32px 32px;"></div>
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(34,211,238,0.05),transparent_70%)]"></div>
<div class="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12">
<div class="flex flex-col items-center gap-4 group">
<div class="w-20 h-20 rounded-2xl bg-white/[0.03] border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-500/50 group-hover:bg-cyan-500/10 transition-all duration-500 shadow-xl">
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
</div>
<div class="flex flex-col items-center">
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">存儲層</span>
<span class="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">磁碟 / 記憶體</span>
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
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">處理層</span>
<span class="text-xs font-bold text-white group-hover:text-amber-500 transition-colors">串流轉換器</span>
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
<span class="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase mb-1">輸出層</span>
<span class="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">XML 輸出</span>
</div>
</div>
</div>
</div>

**運作原理：**
<div class="tech-list my-6">
<div class="tech-item tech-item-alt">條目以串流方式讀取，而非完整載入記憶體</div>
<div class="tech-item tech-item-alt">XML 元素使用直接緩衝區寫入即時生成</div>
<div class="tech-item tech-item-alt">HTTP 回應在所有條目處理完成前就開始傳輸</div>
<div class="tech-item tech-item-alt">無論 sitemap 大小，記憶體使用量保持恆定</div>
</div>

**記憶體高效服務：**
```typescript
// 以約 80MB 記憶體處理 100 萬以上的 URL
const entries = await engine.getStrategy().getEntries()
const xml = renderer.render(entries, requestUrl)
```

這種方法意味著一個擁有 100 萬個 URL 的網站在 sitemap 生成時使用的記憶體與僅有 1,000 個 URL 的網站大致相同。

---

<a id="tiered-storage"></a>

### 4. 分層儲存

Luminosity 自動管理跨多個儲存層的資料，以實現最佳效能：

<div class="my-10 p-10 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 opacity-[0.2]" style="background-image: radial-gradient(#333 1px, transparent 1px); background-size: 40px 40px;"></div>
<div class="relative z-10 flex flex-col items-center gap-6">
<div class="w-full max-w-md relative group">
<div class="absolute -inset-1 bg-gradient-to-r from-red-500/20 to-orange-500/20 blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
<div class="relative flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-red-500/20 backdrop-blur-md group-hover:border-red-500/50 transition-all">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
</div>
<div>
<div class="text-[10px] font-black tracking-widest text-red-500 uppercase mb-0.5">L0 - 熱級 (Hot)</div>
<div class="text-sm font-bold text-white">記憶體快取 (Memory Cache)</div>
</div>
</div>
<div class="text-right">
<div class="text-[10px] font-mono text-gray-500">存取時間</div>
<div class="text-xs font-bold text-red-400">~1μs</div>
</div>
</div>
</div>
<div class="text-white/5 animate-bounce"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m7-7-7 7-7-7"/></svg></div>
<div class="w-full max-w-md relative group">
<div class="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
<div class="relative flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-amber-500/20 backdrop-blur-md group-hover:border-amber-500/50 transition-all">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>
</div>
<div>
<div class="text-[10px] font-black tracking-widest text-amber-500 uppercase mb-0.5">L1 - 溫級 (Warm)</div>
<div class="text-sm font-bold text-white">操作日誌 (Operations Log)</div>
</div>
</div>
<div class="text-right">
<div class="text-[10px] font-mono text-gray-500">存取時間</div>
<div class="text-xs font-bold text-amber-400">~1ms</div>
</div>
</div>
</div>
<div class="text-white/5 animate-bounce"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m7-7-7 7-7-7"/></svg></div>
<div class="w-full max-w-md relative group">
<div class="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
<div class="relative flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-blue-500/20 backdrop-blur-md group-hover:border-blue-500/50 transition-all">
<div class="flex items-center gap-4">
<div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" x2="12" y1="22.08" y2="12"/></svg>
</div>
<div>
<div class="text-[10px] font-black tracking-widest text-blue-500 uppercase mb-0.5">L2 - 冷級 (Cold)</div>
<div class="text-sm font-bold text-white">快照檔案 (Snapshot File)</div>
</div>
</div>
<div class="text-right">
<div class="text-[10px] font-mono text-gray-500">存取時間</div>
<div class="text-xs font-bold text-blue-400">~10ms</div>
</div>
</div>
</div>
</div>
</div>

**層級說明：**

| 層級 | 儲存方式 | 存取速度 | 使用場景 |
|------|---------|----------|----------|
| L0（熱） | 記憶體快取 | ~1μs | 最近更新、活躍查詢 |
| L1（溫） | JSONL 日誌檔 | ~1ms | 待處理操作 |
| L2（冷） | 快照 JSON | ~10ms | 歷史資料、備份 |

**自動資料遷移：**
- 新條目從 L0（記憶體）開始
- 定期刷新到 L1（日誌檔案）
- 壓縮將 L1 合併到 L2（快照）
- 讀取時透明地合併所有層級

```typescript
// 範例：快取預熱將冷資料載入熱層
await engine.getStrategy().warmCache()
```

---

<a id="multi-framework"></a>

### 5. 多框架適配器

Luminosity 旨在成為框架無關的解決方案。透過其專門的適配器系統，它可以原生掃描並與現代 Web 架構整合。

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

**統一介面：**
無論您使用哪種框架，Luminosity 都提供一致的 sitemap 管理 API。適配器會自動處理特定框架的路由邏輯，將其轉換為標準的內部表示形式。

---

<a id="route-scanner"></a>

### 6. 智慧路由掃描

手動維護 sitemap 容易出錯。Luminosity 的 `RouteScanner` 透過即時檢查您的應用程序路由實例來自動完成此過程。

<div class="my-12 p-8 md:p-12 rounded-[2.5rem] bg-[#050505] border border-white/10 relative overflow-hidden not-prose font-sans">
<div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,_rgba(16,185,129,0.1),transparent_70%)]"></div>
<div class="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-center">
  <div class="flex-1 w-full max-w-[280px]">
    <div class="p-4 rounded-xl bg-white/[0.02] border border-white/10 font-mono text-[10px] space-y-2 opacity-60 group-hover:opacity-100 transition-opacity">
      <div class="flex items-center gap-2 text-blue-400 font-bold border-b border-white/5 pb-2 mb-2 italic">路由註冊器 (Router)</div>
      <div class="flex justify-between"><span>GET /</span><span class="text-emerald-500">首頁</span></div>
      <div class="flex justify-between"><span>GET /about</span><span class="text-emerald-500">關於</span></div>
      <div class="flex justify-between"><span>GET /blog/*</span><span class="text-emerald-500">文章</span></div>
      <div class="flex justify-between"><span>POST /api/v1</span><span class="text-rose-500">略過</span></div>
    </div>
  </div>
  <div class="flex flex-col items-center gap-2">
    <div class="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 animate-spin-slow">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    </div>
    <span class="text-[9px] font-black tracking-widest text-emerald-500/60 uppercase">掃描中...</span>
  </div>
  <div class="flex-1 w-full max-w-[280px]">
    <div class="p-4 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/20 font-mono text-[10px] space-y-2 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
      <div class="flex items-center gap-2 text-emerald-400 font-bold border-b border-emerald-500/20 pb-2 mb-2 italic">Sitemap 條目</div>
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

**主要功能：**
- **自動發現：** 檢測所有 `GET` 路由，包括動態參數。
- **模式過濾：** 定義 `include` 和 `exclude` 通配符來控制哪些路由進入 sitemap。
- **優先級邏輯：** 根據路徑深度自動分配 sitemap 優先級。

---

## 管線視覺化

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
<span class="text-xs font-bold text-emerald-500 tracking-widest uppercase">輸入 (Input)</span>
</div>
<h4 class="text-lg font-black text-white italic tracking-tighter mb-2">資料攝入串流</h4>
<div class="h-px w-full bg-white/5 my-3"></div>
<div class="space-y-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>HTTP POST / API</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>Webhooks</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>CLI 指令</div>
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
<span class="text-xs font-bold text-blue-500 tracking-widest uppercase">緩衝 (Buffer)</span>
</div>
<h4 class="text-lg font-black text-white italic tracking-tighter mb-2">記憶體緩衝區</h4>
<div class="h-px w-full bg-white/5 my-3"></div>
<div class="space-y-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>記憶體表 (MemTable)</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>排序映射 (Sorted Map)</div>
<div class="flex items-center gap-2 text-blue-400"><div class="w-1 h-1 bg-blue-500 rounded-full"></div>可變 (Mutable)</div>
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
<span class="text-xs font-bold text-purple-500 tracking-widest uppercase">儲存 (Storage)</span>
</div>
<h4 class="text-lg font-black text-white italic tracking-tighter mb-2">磁碟分段</h4>
<div class="h-px w-full bg-white/5 my-3"></div>
<div class="space-y-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>SSTables</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>快照 (Snapshots)</div>
<div class="flex items-center gap-2 text-purple-400"><div class="w-1 h-1 bg-purple-500 rounded-full"></div>不可變 (Immutable)</div>
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
<span class="text-xs font-bold text-white tracking-widest uppercase">服務 (Serve)</span>
</div>
<h4 class="text-lg font-black text-white italic tracking-tighter mb-2">輸出成果</h4>
<div class="h-px w-full bg-white/5 my-3"></div>
<div class="space-y-1 text-[11px] font-mono text-gray-500 uppercase tracking-wider">
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>sitemap.xml</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>robots.txt</div>
<div class="flex items-center gap-2"><div class="w-1 h-1 bg-gray-700 rounded-full"></div>串流傳輸</div>
</div>
</div>
</div>
</div>
<!-- Flow Animation Line in Background -->
<div class="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent -z-10 hidden lg:block"></div>
</div>

## 效能基準測試

使用這些架構模式，Luminosity 達成：

| 指標 | 數值 |
|------|------|
| 索引的 URL 數量 | 1,000,000 |
| 建置時間 | 14.2 秒 |
| 記憶體峰值 | 84 MB |
| 吞吐量 | ~70,000 URLs/秒 |

詳細的方法論和結果請參閱 [效能基準測試](/zh/docs/benchmark) 頁面。

## 下一步

- [快速開始](/zh/docs/getting-started) - 快速設定指南
- [CLI 命令列工具](/zh/docs/cli) - Luminosity 的終端控制
- [框架整合](/zh/docs/frameworks) - 連接您的技術堆疊
