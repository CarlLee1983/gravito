---
title: 動力生態系 (Ecosystem)
description: 探索 Gravito 的 Kinetic Modules，從數據庫到實時通訊的完整動力支援。
---

# 動力生態系 (Kinetic Ecosystem)

Gravito 是一個由眾多 **動力模組 (Kinetic Modules)** 組成的龐大銀河系。這些模組高度解耦，您可以根據實際需求，像拼湊積木般自由組合。

---

<div class="not-prose space-y-12">

## 核心引擎 (Core Engines)
<div class="ecosystem-grid">
  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">SINGULARITY</span>
    <h3 class="module-title">PlanetCore</h3>
    <code class="module-pkg">gravito-core</code>
    <p class="module-desc">銀河系的引力中心。提供極致輕量的 IoC 容器、生命週期管理與外掛系統。</p>
  </div>
  
  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">PHOTON</span>
    <h3 class="module-title">Photon HTTP</h3>
    <code class="module-pkg">@gravito/photon</code>
    <p class="module-desc">光子。高性能 HTTP 引擎，基於 Hono 與 Bun，提供超低延遲的請求處理架構。</p>
  </div>

  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">PULSE</span>
    <h3 class="module-title">Pulse CLI</h3>
    <code class="module-pkg">@gravito/pulse</code>
    <p class="module-desc">開發者的脈搏。結合 Bun 性能的高效能指令工具，處理腳手架生成與自動化任務。</p>
  </div>

  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">BEAM</span>
    <h3 class="module-title">Beam Client</h3>
    <code class="module-pkg">@gravito/beam</code>
    <p class="module-desc">粒子束。輕量級客戶端通訊工具，為前端提供類型安全的 API 調用介面。</p>
  </div>
</div>

## 數據與存儲 (Data & Storage)
<div class="ecosystem-grid">
  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">MATTER</span>
    <h3 class="module-title">Atlas ORM</h3>
    <code class="module-pkg">@gravito/atlas</code>
    <p class="module-desc">物質。企業級 ORM，支持 Drizzle-like 語法與極致的類型推斷。</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">DARK MATTER</span>
    <h3 class="module-title">Dark Matter</h3>
    <code class="module-pkg">@gravito/dark-matter</code>
    <p class="module-desc">暗物質。專為 MongoDB 打造的高性能驅動，支持複雜的文檔查詢與關聯。</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">PLASMA</span>
    <h3 class="module-title">Plasma Redis</h3>
    <code class="module-pkg">@gravito/plasma</code>
    <p class="module-desc">電漿。高效能 Redis 整合，用於快取、Session 與分散式鎖系統。</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">STASIS</span>
    <h3 class="module-title">Stasis Cache</h3>
    <code class="module-pkg">@gravito/stasis</code>
    <p class="module-desc">延遲。智慧型多級快取系統，能在毫秒級內凍結與讀取高頻數據。</p>
  </div>

  <div class="module-card data group">
    <div class="card-accent"></div>
    <span class="module-code">NEBULA</span>
    <h3 class="module-title">Nebula Storage</h3>
    <code class="module-pkg">@gravito/nebula</code>
    <p class="module-desc">星雲。雲端儲存與檔案管理系統，支持 S3、GCS 與本地文件驅動。</p>
  </div>
</div>

## 前端與渲染 (Frontend & Rendering)
<div class="ecosystem-grid">
  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">MOMENTUM</span>
    <h3 class="module-title">Ion Bridge</h3>
    <code class="module-pkg">@gravito/ion</code>
    <p class="module-desc">動量。全棧通訊橋接器，消弭前端 SPA 與後端 MVC 的界限。</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">PRISM</span>
    <h3 class="module-title">Prism View</h3>
    <code class="module-pkg">@gravito/prism</code>
    <p class="module-desc">稜鏡。高性能樣板渲染引擎，內建圖片優化與現代 SSR 渲染技術。</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">FREEZE</span>
    <h3 class="module-title">Freeze SSG</h3>
    <code class="module-pkg">@gravito/freeze</code>
    <p class="module-desc">冰封。靜態網站生成器，為您的應用提供極致的載入性能與 SEO。</p>
  </div>
</div>

## 安全與防護 (Security & Fortification)
<div class="ecosystem-grid">
  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">SENTINEL</span>
    <h3 class="module-title">Sentinel Auth</h3>
    <code class="module-pkg">@gravito/sentinel</code>
    <p class="module-desc">哨兵。核心身份認證系統，提供 JWT、Session 與強大的 Guard 守衛機制。</p>
  </div>

  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">FORTIFY</span>
    <h3 class="module-title">Fortify UI</h3>
    <code class="module-pkg">@gravito/fortify</code>
    <p class="module-desc">強化。端到端的身分驗證工作流，包含登入、註冊、密碼重置等完整 Scaffolding。</p>
  </div>

  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">MASS</span>
    <h3 class="module-title">Mass Validator</h3>
    <code class="module-pkg">@gravito/mass</code>
    <p class="module-desc">質量。高性能資料驗證引擎，確保流入系統的資料符合嚴格的類型規範。</p>
  </div>

  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">IMPULSE</span>
    <h3 class="module-title">Impulse Request</h3>
    <code class="module-pkg">@gravito/impulse</code>
    <p class="module-desc">表單請求驗證，支援 Zod 與 Valibot，並提供授權 Hook 與型別安全的驗證資料。</p>
  </div>

  <div class="module-card security group">
    <div class="card-accent"></div>
    <span class="module-code">PULSAR</span>
    <h3 class="module-title">Pulsar Session</h3>
    <code class="module-pkg">@gravito/pulsar</code>
    <p class="module-desc">Session 與 CSRF 管理，支援快取、Redis、檔案與 SQLite 等多種驅動。</p>
  </div>
</div>

## 通訊與廣播 (Comm & Signals)
<div class="ecosystem-grid">
  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">RIPPLE</span>
    <h3 class="module-title">Ripple WS</h3>
    <code class="module-pkg">@gravito/ripple</code>
    <p class="module-desc">漣漪。基於 WebSockets 的實時通訊模組，實現瞬時數據同步。</p>
  </div>

  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">SIGNAL</span>
    <h3 class="module-title">Signal Mail</h3>
    <code class="module-pkg">@gravito/signal</code>
    <p class="module-desc">信號。專業級郵件發送系統，支持多種 SMTP 與 API 驅動。</p>
  </div>

  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">FLARE</span>
    <h3 class="module-title">Flare Notify</h3>
    <code class="module-pkg">@gravito/flare</code>
    <p class="module-desc">耀斑。多渠道通知中心，處理 Web Push、簡訊與即時訊息通知。</p>
  </div>

  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">RADIANCE</span>
    <h3 class="module-title">Radiance Broadcast</h3>
    <code class="module-pkg">@gravito/radiance</code>
    <p class="module-desc">多驅動廣播模組，支援 Pusher、Ably、Redis 與 WebSocket 整合。</p>
  </div>

  <div class="module-card comm group">
    <div class="card-accent"></div>
    <span class="module-code">RIPPLE CLIENT</span>
    <h3 class="module-title">Ripple Client</h3>
    <code class="module-pkg">@gravito/ripple-client</code>
    <p class="module-desc">前端 WebSocket 客戶端，提供 React Hooks 與 Vue Composables 介面。</p>
  </div>
</div>

## 環境與觀測 (Env & Observability)
<div class="ecosystem-grid">
  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">LUMINOSITY</span>
    <h3 class="module-title">Luminosity SEO</h3>
    <code class="module-pkg">@gravito/luminosity</code>
    <p class="module-desc">亮度。SEO 智慧引擎，自動管理 Meta 數據與搜尋引擎索引優化。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">COSMOS</span>
    <h3 class="module-title">Cosmos I18n</h3>
    <code class="module-pkg">@gravito/cosmos</code>
    <p class="module-desc">宇宙。企業級多國語言管理方案，支持動態翻譯與在地化策略。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">CONSTELLATION</span>
    <h3 class="module-title">Constellation</h3>
    <code class="module-pkg">@gravito/constellation</code>
    <p class="module-desc">星座。自動化 Sitemap 與站點拓補生成工具，提升站點索引效率。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">HORIZON</span>
    <h3 class="module-title">Horizon Scheduler</h3>
    <code class="module-pkg">@gravito/horizon</code>
    <p class="module-desc">事象地平線。分散式任務排程系統，支持精密的 Cron 表達式與集群鎖定。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">ECHO</span>
    <h3 class="module-title">Echo Webhooks</h3>
    <code class="module-pkg">@gravito/echo</code>
    <p class="module-desc">回聲。智慧 Webhook 接收與派遣系統，輕鬆整合第三方服務的實時通知。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">MONITOR</span>
    <h3 class="module-title">Monitor Observability</h3>
    <code class="module-pkg">@gravito/monitor</code>
    <p class="module-desc">健康檢查、Prometheus 指標與 OpenTelemetry 追蹤，提供完整可觀測性。</p>
  </div>
</div>

## 流程與自動化 (Workflow & Automation)
<div class="ecosystem-grid">
  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">FLUX</span>
    <h3 class="module-title">Flux Workflow</h3>
    <code class="module-pkg">@gravito/flux</code>
    <p class="module-desc">狀態機工作流程引擎，支援重試、逾時與可插拔的儲存介面。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">STREAM</span>
    <h3 class="module-title">Stream Queue</h3>
    <code class="module-pkg">@gravito/stream</code>
    <p class="module-desc">高效能工作佇列，支援多驅動與內嵌或獨立 worker。</p>
  </div>
</div>

## 內容與媒體 (Content & Media)
<div class="ecosystem-grid">
  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">MONOLITH</span>
    <h3 class="module-title">Monolith CMS</h3>
    <code class="module-pkg">@gravito/monolith</code>
    <p class="module-desc">檔案式 CMS，將 Markdown 集合轉換成可查詢的內容 API。</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">FORGE</span>
    <h3 class="module-title">Forge Media</h3>
    <code class="module-pkg">@gravito/forge</code>
    <p class="module-desc">影像與影片處理管線，支援狀態追蹤與儲存整合。</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">SITE</span>
    <h3 class="module-title">Site Toolkit</h3>
    <code class="module-pkg">@gravito/site</code>
    <p class="module-desc">以 Monolith、Cosmos、Constellation 組成的靜態內容工具。</p>
  </div>
</div>

## 工具與開發體驗 (Tooling & DX)
<div class="ecosystem-grid">
  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">SCAFFOLD</span>
    <h3 class="module-title">Scaffold Generator</h3>
    <code class="module-pkg">@gravito/scaffold</code>
    <p class="module-desc">提供 MVC、DDD 與 Clean Architecture 等專案生成器。</p>
  </div>

  <div class="module-card group">
    <div class="card-accent"></div>
    <span class="module-code">CREATE</span>
    <h3 class="module-title">Create Gravito App</h3>
    <code class="module-pkg">create-gravito-app</code>
    <p class="module-desc">快速建立新專案的啟動工具，內建多種範本。</p>
  </div>
</div>

## 整合與客戶端 (Adapters & Clients)
<div class="ecosystem-grid">
  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">FREEZE REACT</span>
    <h3 class="module-title">Freeze React</h3>
    <code class="module-pkg">@gravito/freeze-react</code>
    <p class="module-desc">Freeze 的 React 綁定，提供 StaticLink 與語系工具。</p>
  </div>

  <div class="module-card frontend group">
    <div class="card-accent"></div>
    <span class="module-code">FREEZE VUE</span>
    <h3 class="module-title">Freeze Vue</h3>
    <code class="module-pkg">@gravito/freeze-vue</code>
    <p class="module-desc">Freeze 的 Vue 綁定，提供 StaticLink 與語系工具。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">LUX CLI</span>
    <h3 class="module-title">Luminosity CLI</h3>
    <code class="module-pkg">@gravito/luminosity-cli</code>
    <p class="module-desc">提供 Sitemap 統計、壓實與快取預熱的 CLI 工具。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">LUX PHOTON</span>
    <h3 class="module-title">Luminosity Photon Adapter</h3>
    <code class="module-pkg">@gravito/luminosity-adapter-photon</code>
    <p class="module-desc">Luminosity 在 Photon 的中介層整合。</p>
  </div>

  <div class="module-card env group">
    <div class="card-accent"></div>
    <span class="module-code">LUX EXPRESS</span>
    <h3 class="module-title">Luminosity Express Adapter</h3>
    <code class="module-pkg">@gravito/luminosity-adapter-express</code>
    <p class="module-desc">Luminosity 在 Express 的中介層整合。</p>
  </div>
</div>

</div>

---

## 如何安裝？

所有的動力模組都可以透過 Bun 輕鬆安裝。您可以根據專案需求，自由決定您的應用程式需要哪些引力支援。
