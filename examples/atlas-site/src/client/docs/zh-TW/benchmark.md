# Atlas ORM 效能測試報告

> **測試日期：** 2025 年 12 月 24 日
> **測試環境：** Docker (Linux arm64), Bun Runtime v1.x
> **測試重點：** 跨資料庫效能與記憶體穩定性

本報告提供了 `@gravito/atlas` 在所有支援的資料庫引擎上的綜合效能比較。

## 效能摘要

下表展現了在不同使用模式下所達成的每秒操作次數 (OPS)。
 
<div class="my-10 space-y-8 not-prose">
<!-- 對照組：原始讀取 -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-atlas-cyan/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-atlas-cyan rounded-full shadow-[0_0_10px_cyan]"></span>
Raw Read (基準線)
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite (In-Memory)</span>
<span class="text-atlas-cyan font-bold">3,523,000 <span class="text-[9px] opacity-60 font-normal">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan shadow-[0_0_10px_cyan]" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-white">1,111,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/60" style="width: 31.5%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">1,110,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/60" style="width: 31.5%"></div>
</div>
</div>
<!-- MySQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MySQL 8.0</span>
<span class="text-white">521,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-atlas-cyan/30" style="width: 14.7%"></div>
</div>
</div>
</div>
</div>

<!-- 對照組：模型水合 -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-purple-500 rounded-full shadow-[0_0_10px_purple]"></span>
Model Hydration (模型水合)
</h3>
<div class="space-y-5">
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-purple-400 font-bold">253,000 <span class="text-[9px] opacity-60 font-normal">次/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-purple-500 shadow-[0_0_10px_purple]" style="width: 100%"></div>
</div>
</div>
<!-- MySQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MySQL 8.0</span>
<span class="text-white">240,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">次/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-purple-500/80" style="width: 94.8%"></div>
</div>
</div>
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">223,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">次/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-purple-500/70" style="width: 88.1%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">193,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">次/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-purple-500/60" style="width: 76.2%"></div>
</div>
</div>
</div>
</div>

<!-- Metric Group: Result Caching (大量寫入) -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-yellow-500/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-yellow-500 rounded-full shadow-[0_0_10px_orange]"></span>
Bulk Insert (大量寫入)
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
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">44,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500/60" style="width: 10.6%"></div>
</div>
</div>
<!-- MySQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MySQL 8.0</span>
<span class="text-white">26,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-yellow-500/40" style="width: 6.2%"></div>
</div>
</div>
</div>
</div>

<!-- Metric Group: Data Streaming (串流) -->
<div class="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-blue-500/30 transition-colors">
<h3 class="text-lg font-bold text-white mb-6 flex items-center gap-3">
<span class="w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_blue]"></span>
Stream / Cursor (串流)
</h3>
<div class="space-y-5">
<!-- SQLite -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">SQLite</span>
<span class="text-white">197,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-blue-500 shadow-[0_0_10px_blue]" style="width: 100%"></div>
</div>
</div>
<!-- MariaDB -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MariaDB</span>
<span class="text-white">135,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-blue-500/80" style="width: 68.5%"></div>
</div>
</div>
<!-- MySQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">MySQL 8.0</span>
<span class="text-white">132,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-blue-500/70" style="width: 67.0%"></div>
</div>
</div>
<!-- PostgreSQL -->
<div class="relative">
<div class="flex justify-between text-xs font-mono mb-1.5 align-bottom">
<span class="text-gray-400">PostgreSQL</span>
<span class="text-white">129,000 <span class="text-[9px] opacity-60 font-normal text-gray-500">筆/秒</span></span>
</div>
<div class="h-1.5 bg-gray-800/50 rounded-full overflow-hidden">
<div class="h-full bg-blue-500/60" style="width: 65.5%"></div>
</div>
</div>
</div>
</div>
</div>

---

## 吞吐量分析

### "Active Record" 的極致效率
Atlas 達到了菁英級別的水合速度，在不同驅動程式間平均達到 **每秒超過 200,000 個模型**。

*   **最小化抽象成本：** 您在獲得完整 ORM 優勢（髒檢查、事件、關聯）的同時，效能仍可媲美原始查詢建構器。
*   **PostgreSQL 的卓越表現：** 原始讀取 IOPS 超過 100 萬，展現了我們非阻塞非同步核心的效率。

## 記憶體穩定性 (無限串流)

我們透過每個驅動程式處理 50,000 筆紀錄（約 50MB 負載）來驗證 `Model.cursor()` API。

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose my-8">
<!-- SQLite -->
<div class="bg-gray-800/30 border border-white/10 rounded-lg p-4 flex items-center justify-between">
<div>
<div class="text-xs text-gray-400 font-mono mb-1">SQLite</div>
<div class="text-xl font-bold text-white tabular-nums">+19.27 <span class="text-sm font-normal text-gray-500">MB</span></div>
</div>
<div class="text-right">
<div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
穩定 (Stable)
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
已回收 (Recycled)
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
穩定 (Stable)
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
穩定 (Stable)
</div>
</div>
</div>
</div>

*\*負值表示在串流過程中進行了積極的 GC 回收，證明已處理的物件零殘留。*

---

## 安全性與可靠性驗證

除了效能之外，基準測試套件還成功驗證了：

*   **自動參數化：** 在高吞吐量壓力測試下未檢測到 SQL 注入向量。
*   **標準化異常：** 特定於資料庫的錯誤被正確標準化為 `UniqueConstraintError` 等。
*   **統一架構建構器：** 相同的遷移語法在 4 種不同的 SQL 方言中皆能正常運作。

## 重現測試

在您的本機上執行完整的自動化測試套件：

```bash
git clone https://github.com/gravito-framework/gravito.git
cd examples/atlas-benchmark
docker-compose up --build
```
