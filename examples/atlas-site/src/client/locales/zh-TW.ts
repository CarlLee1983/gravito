export default {
    nav: {
        home: '首頁',
        features: '功能',
        docs: '文件',
        gravito: 'Gravito 官網',
        install: '安裝'
    },
    hero: {
        subtitle: 'ATLAS:',
        title_line1: '在重力邊緣',
        title_line2: '建構秩序與結構',
        desc: 'Gravito 生態系的通用資料庫介面。以宇宙般的精確度查詢、遷移與建構您的資料。',
        demo_label: '即時演示',
        demo_comment: '// 初始化 Atlas 連線與查詢',
        console_output: '控制台輸出:',
        rerun: '重新執行',
        loading: '正在星際串流中執行查詢...'
    },
    features: {
        title: '掌控數據宇宙',
        subtitle: 'Atlas 不僅僅是 ORM。它是導航數據重力井的精密儀器。',
        orm_title: 'Eloquent 風格模型',
        orm_desc: 'Atlas 將 Active Record 模式帶入了 TypeScript 環境。透過裝飾器定義模型、管理生命週期鉤子 (Hooks)，並享受與 Laravel Eloquent 旗鼓相當的強大關聯處理 (HasMany, BelongsTo) 能力。',
        query_title: '流暢軌道構建器 (Orbit Builder)',
        query_desc: '使用鏈式 API 構建複雜查詢。原生支援預加載 (with)、分頁以及資料庫事務 (Transactions)，專為從 PHP 轉換至邊緣運算的開發匠人設計，提供極致的可讀性。',
        migration_title: '人性化版本控制',
        migration_desc: '資料庫遷移就像 Git 一樣運作。Up 和 Down 方法提供了一種安全、可預測的方式，以熟悉的 Laravel 風格語法在多個環境中進化您的資料庫架構。',
        seeding_title: '數據工廠 (Seeding Factory)',
        seeding_desc: '使用藍圖生成完美的測試數據。Atlas Factories 和 Seeders 允許您在幾秒鐘內為測試環境填充數百萬條記錄，就像對行星進行地球化改造一樣輕鬆。',
        raw_title: '原始奇點 (Raw Query)',
        raw_desc: '當您需要直接執行 SQL 時，Atlas 提供了純淨且具備保護功能的介面。支援命名綁定 (Named Bindings) 和原始執行，確保您永遠不會失去對底層的掌控。',
        security_shield: '注入攻擊防護盾',
        security_auto_bind: '自動參數化綁定',
        security_sandbox: '查詢執行沙箱',
        evolution_title: '數據存取的進化演進',
        evolution_desc: 'Atlas 橫跨了生態系之間的鴻溝。我們提取了 Laravel Eloquent ORM 傳奇般的開發體驗 (DX)，並將其與 Drizzle 的極致性能相結合。無需沉重的二進制引擎，無需複雜的專有語言，只有純粹而強大的表達力。',
        stream_title: '記憶體安全數據流',
        stream_desc: '處理數百萬條記錄，幾乎零記憶體佔用。使用基於游標的迭代和延遲水合技術處理海量數據，不會導致系統堆栈溢出。',
        stream_lazy: '延遲水合',
        stream_lazy_sub: '零水和成本',
        stream_cursor: '異步游標',
        stream_cursor_sub: '低主機內存佔用',
        stream_chunk: '自動分塊',
        stream_chunk_sub: '受控的批次處理',
        eloquent_pattern: 'Eloquent 模式',
        migration_engine: '遷移引擎 (Migration Engine)',
        blueprints_factories: '藍圖與工廠 (Blueprints & Factories)',
        bare_metal: '數據庫直連 (Bare Metal)',
        up: 'Up',
        up_desc: '向前部署變更',
        down: 'Down',
        down_desc: '立即回滾錯誤',
        timestamp_mgmt: '自動時間戳管理',
        lifecycle_hooks: '生命週期鉤子 Hooks',
        json_serialization: '內建 JSON 序列化',
        security_protected: '受保護狀態'
    },
    installation: {
        title: '初始化重力 (Initialize)',
        requires: '需要 Gravito 生態系或作為標準獨立套件使用。',
        transferred: '系統狀態：已傳輸',
        bun_optimized: '針對 Bun 執行環境優化',
        bun_desc: 'Atlas 在 Bun 上釋放其全部的重力潛能，提供亞毫秒級的查詢效能。同時完全相容於 Node.js/npm 環境。',
        tabs: {
            bun: 'Bun (推薦)',
            npm: 'npm',
            yarn: 'Yarn',
            pnpm: 'pnpm'
        }
    },
    footer: {
        rights: '© 2025 Gravito Framework. MIT 授權。',
        part_of: 'Gravito 生態系成員',
        return_home: '返回 Gravito 主站'
    }
}
