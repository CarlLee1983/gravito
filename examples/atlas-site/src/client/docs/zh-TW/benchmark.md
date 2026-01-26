# Atlas ORM 效能測試報告

> **測試日期：** 2026 年 1 月 15 日
> **測試環境：** 生產級基礎設施 (Linux arm64), Bun Runtime v1.3+
> **測試重點：** Bun.sql 原生驅動與傳統驅動效能對比

本報告詳細說明了 `@gravito/atlas` 在所有支援的資料庫引擎上的吞吐量與記憶體特性，並突顯了原生驅動整合帶來的巨大效能提升。

## 效能摘要

下表展現了在不同使用模式下所達成的每秒操作次數 (OPS)。
 
<div class="my-10 space-y-8 not-prose">
<!-- Metric Group: Raw Read -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-primary/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-primary rounded-full shadow-neon-blue"></span>
原生原始吞吐量 (基準線)
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite (Bun.sql 原生驅動)</span>
<span class="text-primary font-bold">3,523,000 <span class="text-[9px] opacity-60 font-normal">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-primary shadow-neon-blue" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB (原生整合)</span>
<span class="text-white">1,111,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-primary/60" style="width: 31.5%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL (原生整合)</span>
<span class="text-white">1,110,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
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
模型實例化 (Hydration)
</h3>
<div class="space-y-5">
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-atlas-cyan font-bold">253,000 <span class="text-[9px] opacity-60 font-normal">次/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan shadow-[0_0_10px_#00e5ff]" style="width: 100%"></div>
</div>
</div>
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">223,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">次/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/70" style="width: 88.1%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">193,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">次/秒</span></span>
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
大量寫入效能 (Bulk Insert)
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">415,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500 shadow-[0_0_10px_orange]" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-white">49,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500/70" style="width: 11.8%"></div>
</div>
</div>
</div>
</div>
</div>

---

## 數據分析：原生驅動的優勢

### 消除 "ORM 稅"
Atlas 達到了菁英級別的模型實例化速度，在所有驅動程式中平均達到 **每秒超過 200,000 個模型**。透過繞過傳統的網路驅動程式並利用 Bun 的 C++ SQL 核心，我們將抽象開銷降至幾近於零。

### 記憶體穩定性 (無限串流)
我們透過處理 1,000,000 筆紀錄來驗證 `chunk()` 與 `cursor()` API。在整個生命週期中，堆積記憶體佔用穩定維持在 **30MB** 以下，證明 Atlas 在大規模數據遷移與 ETL 任務中的安全性。

## 安全性與可靠性

效能提升並不以犧牲安全為代價。我們的基準測試套件驗證了：
*   **零 SQL 注入：** 所有高吞吐量測試均包含參數化綁定的完整性檢查。
*   **原子性交易：** 驗證了所有 SQL 方言的一致性。
*   **標準化異常：** 資料庫特定的異常在不同驅動程式間均被正確標準化。

## 重現測試

在您的本機執行完整的自動化測試套件：

```bash
git clone https://github.com/gravito-framework/gravito.git
cd examples/atlas-benchmark
bun install
bun run bench
```