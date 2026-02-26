export default {
  nav: {
    features: '功能特性',
    docs: '開發文件',
    github: 'GitHub',
    start: '開始使用',
  },
  hero: {
    tag: 'Luminosity Core v2.0 已啟動',
    title: '原子級',
    subtitle: '網站地圖引擎',
    desc: '專為超大規模打造的高效能 Sitemap 引擎。增量索引、零延遲串流，以及智慧 SEO 管理。',
    ctaPro: '開始使用',
    ctaDocs: '查看文件',
  },
  scroll: '滾動探索',
  learn_more: '了解更多',
  features: {
    lsm: {
      title: 'LSM 樹增量引擎',
      desc: '受現代資料庫啟發。將新 URL 追加至日誌並在背景合併，實現百萬級更新且無停機時間。',
    },
    enterprise: {
      title: '企業級架構',
      desc: '內建互斥鎖 (Mutex) 與 Stale-while-revalidate 快取機制。在大流量生產環境中安全無虞。',
    },
    index: {
      title: '自動 Sitemap 索引',
      desc: '自動將 Sitemap 分割為分頁索引，完美解決 Google 的 50,000 URL 限制。',
    },
    proxy: {
      title: 'Robots.txt 代理',
      desc: '可程式化控制搜尋引擎爬蟲，直接整合至 Photon 與 Express。',
    },
    meta: {
      title: 'Meta 標籤管理器',
      desc: '類型安全的 Meta、OpenGraph、Twitter Cards 與 JSON-LD 結構化資料生成。',
    },
  },
  features_page: {
    hero: {
      title: '精密',
      highlight: '工程。',
      desc: 'Luminosity 從底層重新打造，重新定義了順序儲存效能的極限。',
    },
    core: {
      title: '',
      highlight: '奇異點',
      suffix: '核心',
      desc: '透過客製化的 LSM-Tree 引擎，Luminosity 實現接近硬體物理極限的寫入速度。我們的架構消除了傳統 B-Tree 的碎片化與鎖競爭問題。',
    },
    points: {
      atomic: {
        title: '原子級順序寫入',
        desc: '透過純日誌結構合併流 (LSM) 繞過隨機 I/O 瓶頸。',
      },
      compaction: {
        title: '動態壓縮',
        desc: '智慧多執行緒壓縮，利用閒置週期進行優化。',
      },
      zerocopy: {
        title: '零拷貝序列化',
        desc: '利用直接記憶體存取 (DMA) 實現極速資料傳輸。',
      },
      tiered: {
        title: '分層儲存',
        desc: '自動將熱資料移動到更快的層級，以獲得峰值效能。',
      },
    },
    cta: {
      title: '準備好引爆您的資料了嗎？',
      btn: '閱讀文件',
    },
    architecture: {
      title: '管線',
      highlight: '架構可視化',
      desc: '資料在刷新到不可變磁碟段 (SSTables) 之前，會先流經記憶體優先的緩衝區 (MemTable)。這確保了在大量寫入操作期間，讀取操作零阻塞。',
      step1: '攝取串流',
      step2: '記憶體緩衝',
      step3: '不可變磁碟段',
      step4: '布隆過濾器查找',
    },
    governance: {
      title: '爬蟲',
      highlight: '治理',
      desc: 'Luminosity 是您基礎設施的護盾。它能智慧管理搜尋引擎機器人的流量，確保您的核心應用資源永遠不會因激進的索引操作而耗盡。',
      cards: {
        rate_limit: {
          title: '自適應速率限制',
          desc: '自動限制每分鐘超過 1000 次請求的機器人，同時將 Googlebot 和 Bing 列入白名單。',
        },
        stale: {
          title: '陳舊內容優先驗證 (SWR)',
          desc: '在高負載期間向機器人提供稍舊的快取內容，確保可用性的感受。',
        },
      },
    },
    cli: {
      title: '命令列',
      highlight: '主控權',
      desc: '從終端機控制整個引擎。直接整合至您的 CI/CD 流程，實現自動化快取預熱與索引優化。',
    },
  },
  benchmark: {
    title: '極致',
    subtitle: '效能',
    metric: '基準測試：100 萬 URL / SQLite 來源',
    urls: 'URL 總數',
    throughput: '吞吐量',
    memory: '記憶體峰值',
    build: '最終建置',
    benchmark_cta: '查看完整基準測試報告',
  },
  legal: {
    privacy: {
      title: '隱私權政策',
      lastUpdated: '最後更新：2026年1月',
      section1: {
        title: '我們的數據哲學',
        content:
          'Luminosity 是專為結構分析而設計的 SEO 引擎，而非用戶監視工具。我們不會追蹤您使用我們工具管理的站點訪客，也不會從您的基礎設施中收集個人資料。',
      },
      section2: {
        title: '結構化情報',
        content:
          '我們僅處理網站地圖生成和爬蟲治理所需的元數據。這包括 URL 集合、優先級權重和更改頻率。這些數據保留在您受控的環境中。',
      },
      section3: {
        title: 'Cookies 與資產',
        content:
          '本官網站點使用極少量的 Cookies 來實現核心功能，並透過 Vercel 進行基礎效能分析。我們不使用第三方追蹤像素。',
      },
    },
    terms: {
      title: '服務條款',
      lastUpdated: '最後更新：2026年1月',
      section1: {
        title: '開源傳承',
        content: 'Luminosity 基於 MIT 授權。它是按「原樣」提供的企業級軟體，專為精準與規模而生。',
      },
      section2: {
        title: '系統完整性',
        content:
          '用戶有責任確保其 robots.txt 和 sitemap 配置符合搜尋引擎指南。Gravito 不對因配置不當導致的 SEO 波動負責。',
      },
      section3: {
        title: '倫理治理',
        content:
          '不得利用 Luminosity 進行惡意爬取、透過網站地圖轟炸進行 DoS 攻擊，或任何違反網路生態系統完整性的活動。',
      },
    },
  },
  not_found: {
    title: '404 - 頁面未找到',
    heading: '迷失於虛空',
    subheading: '您所尋找的頁面已漂流至軌道之外。',
    description: '它可能已被移動、刪除，或者根本不存在於這個維度。',
    homeButton: '返回首頁',
    docsButton: '瀏覽文件',
    backLink: '返回上一頁',
  },
}
