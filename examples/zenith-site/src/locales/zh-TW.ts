export default {
  nav: {
    features: '核心功能',
    integration: '整合',
    docs: '文件',
    about: '關於',
  },
  hero: {
    status: '系統運行中',
    title: '控制平面，適用於',
    titleHighlight: 'Flux & Stream',
    description:
      'Gravito Flux & Stream 的零配置控制平面。即時監控、隊列管理、任務審計和自動化警報—無需任何配置檔案。',
    getStarted: '開始使用',
    documentation: '文件',
  },
  features: {
    title: '管理隊列所需的一切功能',
    subtitle: '為現代異步基礎架構打造的全面監控和管理工具',
    realtimeMonitoring: {
      title: '即時監控',
      description: '以毫秒級精度追蹤任務吞吐量和錯誤率。透過即時指標和即時更新監控系統健康狀態。',
    },
    queueManagement: {
      title: '隊列管理',
      description: '輕鬆暫停、恢復和檢查隊列。使用詳細的分頁和過濾功能查看等待、延遲和失敗的任務。',
    },
    jobAuditing: {
      title: '任務審計與搜索',
      description:
        '透過 SQL 永久歷史記錄和全局搜索。同時查詢 Redis（即時）和 SQL（歸檔）以獲得完整可見性。',
    },
    dlqOperations: {
      title: '死信隊列操作',
      description: '直接從 UI 批量重試或清除失敗的任務。檢查堆疊追蹤並一鍵重放特定事件。',
    },
    automatedAlerting: {
      title: '自動化警報',
      description: '針對失敗激增或積壓問題的 Slack 通知。即時檢查並具有冷卻邏輯以防止警報疲勞。',
    },
    scheduleManagement: {
      title: '排程管理',
      description: 'Cron 任務的完整 UI。輕鬆管理排程任務、查看執行歷史並配置重複操作。',
    },
  },
  integration: {
    title: '零配置部署',
    description:
      'Zenith 會自動發現您的 Flux 隊列和 Stream 主題。內建 SQLite 支援意味著本地審計無需資料庫伺服器。只需連接到 Redis 即可開始使用。',
    features: {
      autoDiscovery: '自動發現隊列和主題',
      sqliteSupport: '內建 SQLite 支援用於本地審計',
      workerHealth: 'Worker 健康監控，包含即時 CPU 和 RAM 指標',
      logArchiving: '操作日誌歸檔與歷史搜索',
      batchActions: '批量操作：清除延遲任務、清空隊列、批量操作',
      hybridSearch: '跨 Redis（即時）和 SQL（歸檔）的混合搜索',
    },
  },
  about: {
    title: '關於',
    titleHighlight: 'Zenith',
    whatIs: '什麼是 Zenith？',
    whatIsDescription1:
      'Gravito Zenith 是一部專為極致性能打造的控制平面。它不僅是 Gravito 生態系的指揮中心，更是現代異步架構的監視者—在毫秒之間，洞察系統的每一次心跳。',
    whatIsDescription2:
      '我們拒絕複雜的配置與沉重的代碼侵入。Zenith 採用自用優先（dogfooding）原則，深度整合 @gravito/photon 與 @gravito/stream，為您提供最直覺、最硬核的開發體驗。',
    story: {
      title: '源起：從痛苦中誕生的精準控制',
      content:
        '在管理大規模分佈式系統時，開發者往往面臨兩難：要麼忍受監控工具的高延遲，要麼妥協於數據的淺顯。Laravel Horizon 建立了標準，但當面臨跨語言整合與海量審計需求時，界限便顯露無疑。Zenith 的誕生，是為了徹底打破這些極限。',
    },
    philosophy: {
      title: '願景：無干擾的內省 (Introspection)',
      content:
        '我們認為監控工具不應成為系統的核心負擔。透過 Gravito Pulse 協議，我們實踐了「無干擾的內省」—讓您的代碼保持純粹，同時賦予您如同上帝視角般的全局掌控力。',
    },
    roadmap: {
      title: '藍圖：從隊列解析到全系統編排',
      content:
        '現在的 Zenith 是頂尖的隊列控制中心。未來，我們將引入跨雲節點的自動化擴展、AI 異常偵測診斷，以及致力於成為跨語言微服務架構的終極控制平面。',
    },
    coreFeatures: '核心功能',
    technicalSpecs: '技術架構',
    backend: '後端驅動',
    frontend: '前端介面',
    deployment: '部署哲學',
    additionalCapabilities: '深層功能',
    dlqOperations: '死信隊列操作：',
    dlqOperationsDesc: '直接從 UI 批量重試或清除失敗的任務',
    logArchiving: '操作日誌歸檔：',
    logArchivingDesc: '系統事件和 Worker 活動的持久化儲存，包含歷史搜索',
    batchActions: '批量操作：',
    batchActionsDesc: '清除延遲任務、清空隊列和批量操作',
    retentionManagement: '保留管理：',
    retentionManagementDesc: '可配置的歷史資料自動清理',
    backToHome: '← 返回巔峰',
  },
  features_deep: {
    title: '可觀測性的',
    titleHighlight: '核心架構',
    subtitle: '深度解析驅動下一代關鍵任務監控的底層架構。',

    persistence: {
      title: '混合持久化策略',
      description:
        '為什麼要在即時性與歷史記錄之間做選擇？Zenith 採用雙引擎機制，確保每一筆遙測數據都被精準捕獲。',
      redis: {
        title: '瞬時引擎 (Redis)',
        content:
          '捕捉系統的最原始數據。毫秒級追蹤隊列深度、Worker 狀態與總吞吐量。無需承受磁碟延遲，僅有極致的內存性能。',
      },
      sql: {
        title: '審計引擎 (SQLite/MySQL)',
        content:
          'Zenith 會自動將已完成與失敗的任務數據轉存至 SQL 持久層。這提供了永久、可搜索的審計追蹤，即使 Redis 重啟或內存清理，數據依然穩如磐石。',
      },
    },

    protocol: {
      title: 'Gravito Pulse 協議 (GPP)',
      description: 'GPP 是我們為大規模場景與無干擾設計的輕量級遙測協議。',
      feature1: {
        title: '容錯性傳輸',
        content: '針對高流量傳輸優化，適用於精度與性能皆不可妥協的場景。',
      },
      feature2: {
        title: '原生跨語言支援',
        content:
          '原生支援 PHP, Go 與 Node.js。讓您的微服務體系使用同一種語言對接 Zenith 控制中心。',
      },
      feature3: {
        title: '零配置服務發現',
        content: '透過 Redis 模式匹配實現自動服務發現。告別繁瑣的手動端點映射。',
      },
    },

    performance: {
      title: '頂尖效能基準',
      latency: '每筆任務彙報延遲低於 0.1ms',
      throughput: '標準硬體下可支持每秒 50,000 次操作',
      reliability: '生產環境負載下具備 99.99% 可靠性',
    },
  },
  integrations: {
    title: '星際',
    titleHighlight: '技術共鳴',
    subtitle: 'Zenith 橫跨不同技術棧、語言與基礎設施，實現全域數據同步。',

    core: {
      title: '控制平面核心',
      description:
        '以您的方式部署中央儀表板。將其作為獨立微服務運行，或直接嵌入您現有的基礎架構中。',
      docker_feature: '生產級 Docker 映像檔',
      node_feature: 'Express/Gravito 中間件',
      db_feature: '支援 MySQL/PostgreSQL/SQLite',
    },

    laravel: {
      title: 'Laravel Zenith',
      description:
        '原生應用內 (In-App) 回報器。深度整合至 Laravel，精確捕捉日誌、HTTP 指標與隊列事件。',
      feature1: '應用內事件即時回報',
      feature2: '即時日誌串流',
      feature3: '原生 Artisan 指令整合',
    },

    quasar_lib: {
      title: 'Quasar (Node/Bun)',
      description:
        '適用於 Node.js、Bun 與 Deno 的通用運行時庫。直接嵌入 Worker 代碼，實現細粒度的任務追蹤。',
      feature1: '細粒度任務生命週期追蹤',
      feature2: '零開銷的橋接架構',
      feature3: '支援 BullMQ 與 Bee-Queue',
    },

    quasar_go: {
      title: 'Quasar-Go 代理',
      description: '獨立二進制代理程式。部署於任何主機，無需修改代碼即可監控系統資源與外部隊列。',
      feature1: '零依賴單一二進制檔',
      feature2: '系統級指標監控 (CPU/RAM)',
      feature3: '具備遠端控制能力',
    },

    ecosystem: {
      title: '生態體系',
      redis: 'Redis 6.0+ 分片/集群支援',
      sql: 'MySQL/PostgreSQL/SQLite 持久化審計',
      cloud: '原生的 Docker & K8s 部署模式',
    },
  },
  footer: {
    copyright: '© 2026 Gravito. 版權所有。',
    privacy: '隱私政策',
    terms: '服務條款',
    contact: '聯絡我們',
  },
  privacy: {
    title: '隱私政策',
    lastUpdated: '最後更新：2026年1月',
    section1: {
      title: '數據哲學',
      content:
        '在 Gravito，我們深信數據屬於您。Zenith 的設計初衷是為了「內省 (Introspection)」，而非「提取 (Extraction)」。我們絕不向任何第三方出售、交易或共享您的應用程序指標—您的系統心跳將永遠留在您的星系中。',
    },
    section2: {
      title: '我們收集的數據',
      content:
        '我們僅收集匿名使用數據以改善平台體驗，這包括 Zenith 控制面板內的導航模式和功能使用情況。除您的本地環境外，我們不會訪問您的 Redis 或 SQL 數據存儲內容。',
    },
    section3: {
      title: 'Cookie 與分析',
      content:
        '我們使用最少量的 Cookie 進行會話管理和基礎性能分析（例如 Vercel Analytics），以確保 Web 服務的穩定性。',
    },
  },
  terms: {
    title: '服務條款',
    lastUpdated: '最後更新：2026年1月',
    section1: {
      title: '軟體使用',
      content:
        'Zenith 是根據 MIT 許可證提供的開源工具。雖然我們致力於極致的可靠性，但軟體是「按原樣 (As-Is)」提供的，不提供任何形式的保證。',
    },
    section2: {
      title: '用戶責任',
      content:
        '用戶需自行負責其 Redis 與 SQL 實例的安全。對於因配置錯誤或不當使用 Zenith 控制平面而導致的數據丟失或服務中斷，Gravito 不承擔任何責任。',
    },
    section3: {
      title: '合規使用',
      content:
        'Zenith 旨在用於系統監控和合法的開發用途。嚴禁將其用於任何惡意活動或未經授權的監視行為。',
    },
  },
  contact: {
    title: '聯絡我們',
    subtitle: '與架構師連線',
    description: '有關於整合、定製解決方案的問題，或者只是想打個招呼？我們的團隊隨時待命。',
    email: 'hello@gravito.dev',
    socials: {
      github: 'GitHub 社群',
      twitter: '追蹤我們的旅程',
      discord: '加入 Discord',
    },
  },
}
