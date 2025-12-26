export default {
  site: {
    title: 'Gravito Framework - 為創造者打造的高效能後端生態系統',
    description:
      '極致開發框架。具備原生企業級系統（消息隊列、排程、微服務架構）與 AI 優化的型別契約，專為大規模系統擴展而生。',
    keywords: 'Bun 框架, Gravito 核心, Inertia.js 橋接器, 企業級 TS 框架, 微內核架構, AI 友善開發',
  },
  nav: {
    features: '核心功能',
    benchmarks: '效能測試',
    docs: '文件',
    releases: '更新日誌',
    about: '關於',
    github: 'GitHub',
  },
  hero: {
    title: 'GRAVITO',
    core: 'CORE',
    tagline: '極致輕量企業級核心',
    startBtn: '快速上手',
    githubBtn: 'GitHub 源碼',
    deployBtn: '立即部署',
  },
  stack: {
    title: '頂級技術棧',
    subtitle: '為未來而建',
    bun_title: 'Bun Runtime',
    bun_desc: '疾速運行時，原生支援編譯與測試。',
    engine_title: 'Gravito Core',
    engine_desc: '自主開發的高效能核心，具備 Nano-overhead I/O 與精確的請求生命週期管理。',
    ts_title: 'TypeScript',
    ts_desc: '全架構型別安全，從第一行程式開始。',
  },
  features: {
    sectionBadge: '1.0 核心發佈',
    sectionTitle: '架構之',
    sectionTitleHighlight: 'Gravito 生態系統',
    sectionDesc: 'Gravito 採用微內核設計，首波 1.0 版本將釋出最穩定且強大的基礎模組。',
    kernel_title: 'PlanetCore',
    kernel_subtitle: '核心靈魂',
    kernel_desc: '自主開發的高效能微內核，負責極速 I/O 協調與生命週期管理，是所有模組的引力中心。',
    inertia_title: 'Ion',
    inertia_subtitle: '全棧橋接 (Inertia)',
    inertia_desc: '讓後端完全掌控前端 UI，打造如 SPA 般的流暢體驗。',
    cli_title: 'Pulse',
    cli_subtitle: '生產力工具 (CLI)',
    cli_desc: '自動化骨架生成與開發指令，讓創意不再受阻。',
    seo_title: 'Luminosity',
    seo_subtitle: '智慧索引 (SEO)',
    seo_desc: '自動化 Sitemap 生成與 Meta 管理，優化搜尋引擎收錄。',
    image_title: 'Prism',
    image_subtitle: '性能奇點 (Image)',
    image_desc:
      '參考 Next.js 優點的圖片優化元件。自動處理 CLS、延遲載入與響應式 `srcset`，且具備零客戶端下載負擔。',
    i18n_title: 'Cosmos',
    i18n_subtitle: '全球引力 (I18n)',
    i18n_desc: '原生多語系偵測與路徑路由，具備強大的型別安全翻譯機制，輕鬆擴展全球市場。',
    getStarted: '開始使用',
  },
  features_page: {
    hero_title: '突破極限的自主架構',
    hero_subtitle: 'Gravito Core (PlanetCore) 是我們一切創新的起源。',
    core_deep_dive_title: '為何堅持自主研發核心？',
    core_deep_dive_desc:
      '在現有的開發生態中，我們發現大多數框架雖然功能強大，但往往伴隨著沈重的運行時負擔與不可控的外部依賴。Gravito Core 的誕生是為了重新奪回對性能的絕對掌控。',
    adv_title: 'Core 強大之處',
    adv1_title: '毫秒級路由預解析',
    adv1_desc:
      '不同於其他框架在運行時進行動態正則匹配，Gravito Core 在啟動階段就將路由樹優化為最簡跳轉路徑，實現真正的零損耗轉發。',
    adv2_title: '引擎無關 (Engine Agnostic)',
    adv2_desc:
      '核心與底層 HTTP 引擎完全解耦。您可以隨時在 Photon、Bun Native 或 Express 間切換，而無需修改任何業務邏輯。',
    adv3_title: 'AI 代理人友好 (AI-First)',
    adv3_desc:
      '深度的型別推導與可預測的代碼契約，這不是巧合，而是專為讓 Cursor、Windsurf 等 AI 助手能「理解」您的系統而設計的架構。',
    adv4_title: '極致輕量與零依賴',
    adv4_desc:
      '核心體積保持在極低水平，且不強加任何外部依賴。您只需為實際啟用的模組消耗性能，絕無多餘的運行負擔。',
    perf_title: '極致性能範式',
    perf_desc:
      '每一微秒都至關重要。PlanetCore 消除了不必要的抽象層，為您的應用提供最原始、最直接的性能表現。',
    perf_latency: '回應延遲',
    perf_boot: '啟動時間',
    perf_deps: '外部依賴',
    ready_title: '準備好感受引力了嗎？',
    choices_title: '為什麼是這些技術？',
    bun_title: '為什麼選擇 Bun 而非 Node.js？',
    bun_desc:
      'Bun 不僅是一個運行時，更是為了現代 Web 打造的全能引擎。它提供了 Node.js 無法比擬的啟動速度、原生高性能 HTTP server 以及內建的打包工具。在 Gravito 中，Bun 讓我們的冷啟動時間縮短了 10 倍以上，且免去了繁瑣的配置。',
    ts_title: '為什麼堅持 TypeScript？',
    ts_desc:
      '我們相信「型別即文檔」。TypeScript 提供的靜態檢查與型別推導是構建大型系統的基石。更重要的是，在 AI 協作開發的時代，清晰的型別定義能讓 AI 代理人提供更精準的代碼建議，極大地提升開發效率。',
    // Galaxy Architecture 對比
    compare_title: 'Galaxy 架構 vs 傳統框架',
    compare_subtitle: '為什麼 Gravito 優於 Hono、Express 及其他框架',
    vs_arch_title: '微內核 + Orbits 可插拔模組',
    vs_arch_desc:
      '不同於單層 HTTP 框架，Gravito 採用 Galaxy 架構——微內核 (PlanetCore) 搭配可插拔 Orbits。按需加載：認證 (Sentinel)、快取 (Stasis)、ORM (Atlas) 等。',
    vs_adapter_title: 'HTTP Adapter 抽象層',
    vs_adapter_desc:
      '透明切換 Photon、Bun Native 或 Express 模式，無需修改任何業務邏輯。實現真正的引擎無關設計。',
    vs_hooks_title: 'WordPress 風格 Hook 系統',
    vs_hooks_desc:
      '強大的 Filters 和 Actions 讓您攔截和修改請求生命週期的任何部分。精確自定義錯誤處理、日誌和回應。',
    vs_router_title: 'Laravel 風格流暢路由',
    vs_router_desc:
      'Controller 路由、FormRequest 驗證、Resource Routes、Route Model Binding、命名路由與 URL 生成——全部內建。',
    vs_ioc_title: 'IoC 依賴注入容器',
    vs_ioc_desc:
      '企業級依賴注入，支援單例管理、Service Providers 和 register/boot 生命週期——Hono 完全缺乏這些功能。',
    vs_native_title: 'Bun Native Adapter',
    vs_native_desc:
      '在 Bun 環境運行時，Gravito 自動使用自研 RadixRouter，實現 O(log n) 路由匹配，零抽象開銷。',
  },
  benchmarks: {
    sectionBadge: '性能實驗室',
    sectionTitle: '超越極限的',
    sectionTitleHighlight: '效率',
    sectionDesc: '基於原生核心與 Bun 的強大基礎，Gravito 將性能損耗降至極低水平。',
    rps_title: '每秒請求數 (RPS)',
    rps_desc: '相較於傳統 Node.js 框架，我們提供數倍的吞吐量。',
    latency_title: '平均延遲 (Latency)',
    latency_desc: '極致優化的路由算法，確保請求幾乎即時回應。',
    startup_title: '冷啟動速度 (Cold Start)',
    startup_desc: '毫秒級的啟動時間，特別適合 Serverless 與容器化部署。',
    env_note: '* 測試環境：Bun v1.1.x, Ubuntu 22.04 LTS.',
  },
  stats: {
    efficiency: '運行效率',
    bottleneck: '核心瓶頸',
    integrity: '架構完整性',
  },
  footer: {
    desc: '為創造者打造的高效能框架。基於自主研發核心與 Bun 驅動，追求極致速度與簡約架構。',
    ecosystem: '生態系統',
    links: '連結',
    home: '首頁',
    lux: 'Luminosity (Lux)',
    lux_note: 'Luminosity (Lux) — 基於 Gravito Core 的 Sitemap 引擎。',
    connect: '社群',
    copyright: 'Gravito Framework. 採用 MIT 授權。',
  },
  about: {
    heroTitle: '重力加速',
    heroSubtitle: '開發者的極限邊界',
    missionTitle: '我們的使命',
    missionDesc: '為開發者提供一個既尊重開發時間、又尊重機器資源的框架。',
    pillarsTitle: '奇點三大支柱',
    pillar1_title: '無與倫比的速度',
    pillar1_desc: '透過原生核心與 Bun 的深度整合，我們徹底消除了傳統開發堆棧的肥厚與臃腫。',
    pillar2_title: '架構師的禪意',
    pillar2_desc:
      '融合經典 MVC 的優雅與現代 Node.js 生態（如 Next.js）的靈活性。Gravito 既能微縮至純粹的內容網站，也能擴展為高密度的企業級核心應用。',
    pillar3_title: '精準解決痛點',
    pillar3_desc:
      '我們博採眾長，並針對企業級開發中發現的框架缺口提供獨家解決方案，解決傳統框架難以處理的效能與擴展性瓶頸。',
    teamTitle: '架構師與創造者',
    teamDesc:
      'Gravito 由一群相信框架應是解決方案、而非負擔的創造者打造。我們專注於填補現有技術堆棧中的空白，為開發者與 AI 代理人提供最精確的開發路徑處理。',
    architectureTitle: '天體級架構設計',
    architectureSubtitle: '微內核與動力模組 (Micro-Kernel & Kinetic Modules)',
    kernelTitle: 'PlanetCore (微內核)',
    kernelDesc:
      '極致精簡的核心，僅處理最關鍵的生命週期與 I/O 協調。它始終保持纖細，絕不干擾您的開發。',
    orbitTitle: '動力模組',
    orbitDesc:
      '想要 React？加入 Ion。想要 Vue？加入 Ion。想要 HTML？加入 Prism。想要 SEO？加入 Luminosity。需要資料庫？加入 Atlas（1.0 版本暫不上架）。根據需求加載模組，杜絕任何不必要的資源浪費。',
    scaleTitle: '無限擴展能力',
    scaleDesc: '從單一文件的微型 API 到全球級企業系統，架構會根據項目的「引力」自動適配。',
    aiTitle: 'AI 優先的開發合約',
    aiSubtitle: '為「人機協作」而生',
    aiFeature1Title: '可預測的代碼模式',
    aiFeature1Desc:
      '嚴格的 MVC 與 Service Layer 分層，確保 AI 助手能以最高精確度理解並生成業務邏輯。',
    aiFeature2Title: 'CLI 驅動開發',
    aiFeature2Desc: '結構化的 CLI 輸出與模版腳手架，讓 AI 代理人能高品質地代勞複雜的工程任務。',
    aiFeature3Title: '零歧義型別系統',
    aiFeature3Desc:
      '全模組覆蓋的 TypeScript 原生支持，提供清晰的代碼合約，徹底消除 AI 的「幻覺」問題。',
    // 痛點解決
    painSubtitle: '解決企業級開發瓶頸',
    painTitle: '痛點驅動的進化',
    pain1Title: 'SEO 與 SPA 的終極橋樑',
    pain1Desc:
      '透過 Luminosity 的整合渲染，Gravito 完美解決了單頁應用在搜尋引擎可見性上的陳年難題。',
    pain2Title: '高密度資源調度',
    pain2Desc: '基於微內核設計，Gravito 在高併發環境下比傳統框架節省高達 60% 的資源佔用。',
    pain3Title: '破解邏輯碎片化',
    pain3Desc: '統一的 Service Layer 與 模組通信機制，確保大型專案邏輯不因演進而腐化。',
    pain4Title: 'AI 協同對齊',
    pain4Desc: '高度可預測的架構讓 AI 代理人能自動化維護複雜代碼庫，大幅降低人力成本。',
    // 企業級 DNA 詳解
    dnaSubtitle: '超越腳本開發的悖論',
    dnaTitle: '原生企業級系統',
    dnaComparisonTitle: '架構深度之爭',
    dnaNodeGaps:
      '大多數 Node/Bun 框架以「前端思維」打造，缺乏排程、消息隊列等系統級設計，導致整合混亂且碎片化。',
    dnaLaravelGaps:
      'Laravel 雖然完整度高，但在 Bun 時代其擁腫的內核與性能瓶頸，已無法滿足新一代高併發應用的需求。',
    dnaGravitoAdv:
      'Gravito 在 Bun 與原創核心的極速基礎上，原生整合了排程與隊列機制，提供最高等級的基礎架構支援。',
    featDecouplingTitle: '微服務無痛抽離',
    featDecouplingDesc:
      '從消息消費者 (Consumer) 到解耦服務。Gravito 的架構允許您在擴展時直接抽離功能模組成為獨立微服務，無需任何重新開發。',
    featPluginsTitle: '插件主權與資產系統',
    featPluginsDesc:
      '雙模態擴充機制。每個插件都是一個「微型 Gravito」實體，包含完整的路由、控制器與遷移。支援「瞬時轉化模式」（空核心即刻變身特定服務）與「遞歸覆寫模式」（對現有功能進行邏輯與 UI 覆蓋）。',
    featAITypesTitle: 'LLM 優化的型別契約',
    featAITypesDesc:
      '採用 AI 訓練最完整的 TypeScript 語言。透過極其嚴謹的型別系統，徹底消除 AI 生成代碼時的分歧與幻覺。',
    queueTitle: '萬向 Kinetic Queue (Stream)',
    queueDesc:
      '一套介意，無限可能。全方位驅動支援的野心：Redis, Amazon SQS, RabbitMQ, Kafka 等。無需更動業務邏輯即可實現基礎設施的無縫遷移。',
    ctaTitle: '準備好進入奇點了嗎？',
    ctaSubtitle: '加入下一代企業級開發者的行列。',
    ctaButton: '立即開始',
  },
}
