# Flash Sale System - Gravito Framework Demo

高併發搶購系統的參考實現，用於驗證 Gravito 框架在真實場景中的表現。

## 🎯 目標

此項目是「吃自己狗糧」的核心工作：
- ✅ 建立生產級搶購系統
- ✅ 發現框架的不足和異常
- ✅ 推動框架改進與最佳化
- ✅ 產出實戰案例研究

## 📚 文檔

- **[ROADMAP.md](./ROADMAP.md)** - 13 週開發里程碑
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系統設計與決策
- **[SETUP.md](./docs/SETUP.md)** - 本地開發環境設定

## 🚀 快速開始

### 前置條件

```bash
# Node.js + Bun
# PostgreSQL（本地或 Docker）
# Redis（本地或 Docker）
```

### 本地開發

```bash
# 安裝依賴
bun install

# 啟動開發環境
docker-compose up -d

# 執行遷移
bun run db:migrate

# 啟動應用
bun run dev
```

### 訪問應用

- API 伺服器：http://localhost:3000
- API 文檔：http://localhost:3000/docs
- Redis GUI：http://localhost:8081

## 📁 項目結構

```
examples/flash-sale-fullstack/
├── src/
│   ├── app.ts              # 應用入口
│   ├── gravito.config.ts   # Gravito 配置
│   └── middleware/         # 自訂中間件（限流、驗證等）
├── satellites/             # 符號連結到 ../../satellites/
│   ├── flash-sale/
│   └── inventory-lock/
├── tests/                  # 集成測試
├── load-tests/             # 性能測試腳本
├── migrations/             # 資料庫遷移
├── docker-compose.yml      # 開發環境
└── docs/
    ├── API.md              # API 文檔
    ├── DATABASE.md         # 資料庫架構
    └── PERFORMANCE.md      # 性能報告
```

## 🔍 發現的框架問題

所有發現的框架問題記錄在根目錄的 `FRAMEWORK_ISSUES.md`。

主要發現（待填入）：
- [ ] 分佈式鎖機制
- [ ] 高頻事件性能
- [ ] 資料庫連接池管理
- [ ] ...

## 🧪 測試

### 單元 + 集成測試

```bash
bun test
bun test --coverage
```

### 性能測試

```bash
# 使用 k6 進行負載測試
bun run test:load

# 或手動運行 k6
k6 run load-tests/k6-test.js
```

## 📊 里程碑進度

- **Milestone 1: MVP** (Week 1-2) - 基礎搶購功能 ⏳ 待開始
- **Milestone 2: 高併發** (Week 3-5) - 並發控制與優化 ⏳ 待開始
- **Milestone 3: 性能** (Week 6-7) - 基準與優化 ⏳ 待開始
- **Milestone 4: 文檔** (Week 8) - 完整文檔化 ⏳ 待開始

詳細進度見 [ROADMAP.md](./ROADMAP.md)。

## 🤝 貢獻

此項目是 Gravito 框架的官方示例，所有改進都應透過 PR 提交到主 repo。

## 📝 許可

MIT © Gravito Framework
