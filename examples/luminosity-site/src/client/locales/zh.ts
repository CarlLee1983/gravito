export default {
  nav: {
    features: '功能特性',
    docs: '開發文件',
    github: 'GitHub',
    start: '開始使用',
  },
  hero: {
    tag: 'Luminosity Core v1.0 已啟動',
    title: '原子級',
    subtitle: '網站地圖引擎',
    desc: '專為超大規模打造的高效能 Sitemap 引擎。增量索引、零延遲串流，以及智慧 SEO 管理。',
    ctaPro: '開始使用',
    ctaDocs: '查看文件',
  },
  scroll: '滾動探索',
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
      desc: '可程式化控制搜尋引擎爬蟲，直接整合至 Hono 與 Express。',
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
  },
}
