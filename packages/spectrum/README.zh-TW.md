# @gravito/spectrum 🔭

> **您進入 Gravito 宇宙的望遠鏡 —— 即時分析，零配置。**

`@gravito/spectrum` 是專為 Gravito 生態系統設計的功能強大、零配置的可觀測性與除錯儀表板。它就像是您應用程式的望遠鏡，能即時捕捉 HTTP 請求、資料庫查詢以及應用程式日誌。

![Spectrum 儀表板](https://via.placeholder.com/1200x600/0f172a/38bdf8?text=Gravito+Spectrum+UI)

## 🌟 特性

- **⚡️ 即時更新**：基於 **Server-Sent Events (SSE)** 技術，無需重新整理頁面即可即時觀察請求與日誌。
- **🔍 深度檢查**：查看詳細的請求/回應標頭 (Headers)、狀態碼以及精確的執行時間。
- **🗄️ 資料庫分析**：自動整合 `@gravito/atlas`，捕捉所有 SQL 查詢、綁定參數以及執行耗時。
- **↺ 請求重放 (Replay)**：直接從儀表板一鍵重放任何已捕捉的請求，快速重現 Bug 或測試修復結果。
- **📊 即時統計**：透過即時儀表板監控總請求數、平均延遲以及錯誤率。
- **💾 可插拔儲存**：
  - **MemoryStorage**：適用於開發環境的快速零配置儲存（預設）。
  - **FileStorage**：持久化儲存，即使伺服器重啟資料也不會遺失。
- **🛡️ 安全閘門 (Security Gates)**：內建授權支援，在敏感環境中保護您的除錯數據。
- **🎨 現代化介面**：使用 Tailwind CSS 與 Vue.js 打造的簡潔、響應式儀表板。

## 📦 安裝

```bash
bun add @gravito/spectrum
```

## 🚀 快速上手

只需在您的應用程式入口點註冊 `SpectrumOrbit`：

```typescript
import { PlanetCore } from '@gravito/core'
import { SpectrumOrbit } from '@gravito/spectrum'

const core = new PlanetCore()

// 初始化 Spectrum (建議僅在開發環境中使用)
if (process.env.NODE_ENV !== 'production') {
  await core.orbit(new SpectrumOrbit())
}

await core.liftoff()
```

預設情況下，訪問 **`http://localhost:3000/gravito/spectrum`** 即可進入儀表板。

## ⚙️ 配置選項

您可以透過向 `SpectrumOrbit` 建構函數傳遞配置物件來客製化 Spectrum。

```typescript
import { SpectrumOrbit, FileStorage } from '@gravito/spectrum'

await core.orbit(new SpectrumOrbit({
  // 客製化儀表板路徑
  path: '/_debug',
  
  // 儲存策略 (MemoryStorage 或 FileStorage)
  storage: new FileStorage({ directory: './storage/spectrum' }), 
  
  // 每個類別保留的最大項目數
  maxItems: 500,

  // 採樣率 (0.0 到 1.0)
  // 1.0 代表捕捉所有請求，0.1 代表僅捕捉 10% 的流量
  sampleRate: 1.0, 
  
  // 安全閘門 (授權檢查)
  gate: async (c) => {
    // 回傳 true 允許訪問，false 則阻擋
    const user = c.get('auth')?.user;
    return user?.isAdmin === true;
  }
}))
```

## 🛡️ 正式環境安全指南

Spectrum 主要針對本地開發進行優化。若您選擇在正式環境啟用，請遵循以下安全建議：

1.  **務必配置安全閘門**：絕不要讓儀表板處於公開可訪問狀態。請使用 `gate` 選項實作身份驗證。
2.  **謹慎啟用持久化**：使用 `FileStorage` 可保留重啟後的資料，但請監控磁碟空間使用量。
3.  **調整採樣率**：對於高流量應用，建議設定較低的 `sampleRate`（例如 `0.01` 或 1%），以將效能開銷降至最低。

## 🔌 模組整合

### 資料庫 (Atlas)
若您的 Orbits 中包含 `@gravito/atlas`，Spectrum 會自動偵測並開始捕捉所有 SQL 查詢，讓您能精確掌握每個請求在資料庫層級的運作狀況。

### 日誌 (Logger)
Spectrum 封裝了 Gravito 核心日誌系統。所有透過 `core.logger.info()`, `debug()`, `warn()`, 或 `error()` 產生的日誌都會被捕捉，並與當下的請求上下文關聯顯示。

## ❓ Spectrum vs Monitor

| 特性 | `@gravito/spectrum` | `@gravito/monitor` |
|---------|---------------------|--------------------|
| **主要目標** | **本地除錯與效能分析** | **生產環境叢集觀測** |
| **界面** | 內建 Web UI 儀表板 | JSON / Prometheus / OpenTelemetry |
| **數據範圍** | 單節點 (具狀態) | 分散式 (無狀態) |
| **資料保留** | 短期 (近期項目) | 長期 (整合時序資料庫) |
| **適用對象** | 在本地修復 Bug 的開發者 | 監控系統健康狀況的 DevOps |

## 📄 授權

MIT © Carl Lee
