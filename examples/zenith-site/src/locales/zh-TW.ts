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
      'Gravito Zenith 是 Gravito Flux & Stream 的零配置控制平面。它為您的異步基礎架構提供全面的監控、隊列管理和操作洞察—無需任何配置檔案。',
    whatIsDescription2:
      'Zenith 採用自用優先（dogfooding）原則構建，使用 @gravito/photon 進行 HTTP 服務，使用 @gravito/stream 進行隊列交互，確保其經過實戰測試且適合生產環境。',
    coreFeatures: '核心功能',
    technicalSpecs: '技術規格',
    backend: '後端',
    frontend: '前端',
    deployment: '部署',
    additionalCapabilities: '額外功能',
    dlqOperations: '死信隊列操作：',
    dlqOperationsDesc: '直接從 UI 批量重試或清除失敗的任務',
    logArchiving: '操作日誌歸檔：',
    logArchivingDesc: '系統事件和 Worker 活動的持久化儲存，包含歷史搜索',
    batchActions: '批量操作：',
    batchActionsDesc: '清除延遲任務、清空隊列和批量操作',
    retentionManagement: '保留管理：',
    retentionManagementDesc: '可配置的歷史資料自動清理',
    backToHome: '← 返回首頁',
  },
  footer: {
    copyright: '© 2026 Gravito. 版權所有。',
    privacy: '隱私政策',
    terms: '服務條款',
    contact: '聯絡我們',
  },
}
