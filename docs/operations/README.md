# 運維和操作指南

歡迎來到 Gravito 運維文檔。本目錄包含所有關於部署、升級、發佈和維護 Gravito 的指南。

## 📑 目錄結構

### 🔄 系統遷移指南（[migration/](./migration/)）

對應 Gravito v1.3+ 的系統升級和功能遷移：

| 指南 | 用途 | 複雜度 |
|------|------|--------|
| [異步事件系統遷移](./migration/async-events.md) | 從同步到非同步事件系統 | 低 |
| [Bull Queue 持久化隊列](./migration/queue.md) | 從內存隊列到 Redis 隊列 | 中 |
| [Connection Pool 管理升級](./migration/pool.md) | 連接池 v1.3 新功能 | 低 |
| [遷移指南索引](./migration/README.md) | 遷移決策和最佳實踐 | - |

👉 **新手入門**：先讀 [migration/README.md](./migration/README.md)

---

### 🔧 開發和集成指南

| 指南 | 用途 |
|------|------|
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | 開發過程中的常見問題和解決方案 |
| [EXTENDING_ATLAS_GUIDE.md](./EXTENDING_ATLAS_GUIDE.md) | 擴展 Atlas ORM 和數據庫功能 |
| [CHANGESETS_INTEGRATION_GUIDE.md](./CHANGESETS_INTEGRATION_GUIDE.md) | Changesets 工作流集成 |
| [TURBOREPO_INTEGRATION_GUIDE.md](./TURBOREPO_INTEGRATION_GUIDE.md) | Turborepo 集成和最佳實踐 |

---

### 📦 發佈和版本管理

| 指南 | 用途 |
|------|------|
| [NPM_PUBLISHING_GUIDE.md](./NPM_PUBLISHING_GUIDE.md) | 發佈包到 npm 的完整流程 |
| [NPM_OTP_GUIDE.md](./NPM_OTP_GUIDE.md) | npm 雙因素認證配置 |
| [VERSION_STRATEGY.md](./VERSION_STRATEGY.md) | 版本號策略和更新流程 |

---

### 🧪 測試和驗證

| 指南 | 用途 |
|------|------|
| [LOCAL_CI_VALIDATION.md](./LOCAL_CI_VALIDATION.md) | 本地 CI 驗證和測試 |
| [MIGRATION_FROM_HONO.md](./MIGRATION_FROM_HONO.md) | 從 Hono 遷移到 Photon 的指南 |

---

### 👥 其他資源

| 資源 | 用途 |
|------|------|
| [AGENTS.md](./AGENTS.md) | AI Agent 開發指南 |
| [MIGRATION.md](./MIGRATION.md) | API 棄用遷移指南 |

---

## 🎯 快速導航

### 我想要...

#### 升級和遷移相關
- **升級 Gravito 到 v1.3**：→ [migration/README.md](./migration/README.md)
- **遷移事件系統**：→ [migration/async-events.md](./migration/async-events.md)
- **遷移到 Redis 隊列**：→ [migration/queue.md](./migration/queue.md)
- **升級連接池功能**：→ [migration/pool.md](./migration/pool.md)
- **處理 API 棄用**：→ [MIGRATION.md](./MIGRATION.md)
- **從 Hono 遷移**：→ [MIGRATION_FROM_HONO.md](./MIGRATION_FROM_HONO.md)

#### 開發相關
- **解決開發問題**：→ [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- **擴展 Atlas**：→ [EXTENDING_ATLAS_GUIDE.md](./EXTENDING_ATLAS_GUIDE.md)
- **設置 Changesets**：→ [CHANGESETS_INTEGRATION_GUIDE.md](./CHANGESETS_INTEGRATION_GUIDE.md)
- **配置 Turborepo**：→ [TURBOREPO_INTEGRATION_GUIDE.md](./TURBOREPO_INTEGRATION_GUIDE.md)

#### 發佈相關
- **發佈到 npm**：→ [NPM_PUBLISHING_GUIDE.md](./NPM_PUBLISHING_GUIDE.md)
- **配置 2FA**：→ [NPM_OTP_GUIDE.md](./NPM_OTP_GUIDE.md)
- **管理版本號**：→ [VERSION_STRATEGY.md](./VERSION_STRATEGY.md)

#### 測試相關
- **本地驗證 CI**：→ [LOCAL_CI_VALIDATION.md](./LOCAL_CI_VALIDATION.md)

---

## 📋 按角色查看指南

### 👨‍💻 開發者

1. 開始開發前：[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
2. 修改數據庫層：[EXTENDING_ATLAS_GUIDE.md](./EXTENDING_ATLAS_GUIDE.md)
3. 提交代碼前：[LOCAL_CI_VALIDATION.md](./LOCAL_CI_VALIDATION.md)
4. 處理棄用的 API：[MIGRATION.md](./MIGRATION.md)

### 🚀 DevOps/運維

1. 升級系統：[migration/README.md](./migration/README.md)
2. 發佈版本：[NPM_PUBLISHING_GUIDE.md](./NPM_PUBLISHING_GUIDE.md)
3. 管理版本：[VERSION_STRATEGY.md](./VERSION_STRATEGY.md)
4. 配置 2FA：[NPM_OTP_GUIDE.md](./NPM_OTP_GUIDE.md)

### 🏗️ 架構師

1. 系統遷移：[migration/README.md](./migration/README.md)
2. 異步事件系統：[migration/async-events.md](./migration/async-events.md)
3. 隊列架構：[migration/queue.md](./migration/queue.md)
4. 連接池管理：[migration/pool.md](./migration/pool.md)

### 🤖 AI Agent 開發者

- [AGENTS.md](./AGENTS.md) - AI Agent 開發和集成指南

---

## 📊 文檔統計

| 類別 | 文檔數 | 行數 | 大小 |
|------|--------|------|------|
| **系統遷移** | 4 | 2,343 | ~78 KB |
| **開發指南** | 4 | ~600 | ~23 KB |
| **發佈指南** | 3 | ~500 | ~18 KB |
| **其他** | 4 | ~300 | ~10 KB |
| **總計** | 15 | ~3,700 | ~129 KB |

---

## 🔍 常見問題

### Q: 應該從哪個指南開始？

**A:** 取決於你的角色：
- **開發者**：[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
- **運維**：[migration/README.md](./migration/README.md)
- **架構師**：[migration/README.md](./migration/README.md)

### Q: 系統遷移指南和 API 棄用遷移有什麼區別？

**A:**
- **系統遷移** ([migration/](./migration/))：升級 Gravito 版本時的功能遷移（如升級到 v1.3）
- **API 棄用遷移** ([MIGRATION.md](./MIGRATION.md))：當某個 API 被棄用時的代碼遷移

### Q: 發佈流程是什麼？

**A:** 按順序執行：
1. 更新版本號：[VERSION_STRATEGY.md](./VERSION_STRATEGY.md)
2. 編寫 Changelog：[CHANGESETS_INTEGRATION_GUIDE.md](./CHANGESETS_INTEGRATION_GUIDE.md)
3. 本地驗證：[LOCAL_CI_VALIDATION.md](./LOCAL_CI_VALIDATION.md)
4. 發佈到 npm：[NPM_PUBLISHING_GUIDE.md](./NPM_PUBLISHING_GUIDE.md)

### Q: 遇到開發問題怎麼辦？

**A:** 查看 [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) 的常見問題章節。

---

## 🔗 相關資源

### 主文檔
- [README.md](../README.md) - 項目概述
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 貢獻指南
- [WHITEPAPER_ZH_TW.md](../WHITEPAPER_ZH_TW.md) - 架構白皮書

### 包文檔
- [packages/](../packages/) - 核心包文檔
- [satellites/](../satellites/) - 業務領域衛星文檔
- [templates/](../templates/) - 項目模板

### 工具命令
```bash
# 構建
bun run build

# 測試
bun run test

# 類型檢查
bun run typecheck

# 格式化
bun run format
```

---

## 🆘 支持和反饋

遇到問題或有改進建議？

1. **查看相關指南** - 大多數問題在指南中都有答案
2. **提交 Issue** - [GitHub Issues](https://github.com/gravitoio/gravito-core/issues)
3. **參加討論** - [GitHub Discussions](https://github.com/gravitoio/gravito-core/discussions)

---

## 📅 最近更新

| 文件 | 更新日期 | 版本 |
|------|---------|------|
| migration/ | 2026-02-08 | 1.0 |
| pool.md | 2026-02-08 | 1.3.0 |
| queue.md | 2026-02-07 | 1.0 |
| async-events.md | 2026-02-03 | 1.0.0 |
| DEVELOPMENT_GUIDE.md | - | - |
| NPM_PUBLISHING_GUIDE.md | - | - |

---

**版本**：1.0
**更新日期**：2026-02-08
**維護者**：Gravito 開發團隊

💡 **提示**：使用搜索功能（Ctrl+F）快速查找指南。
