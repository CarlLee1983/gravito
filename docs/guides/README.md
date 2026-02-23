# docs/guides - 開發指南與教學文檔

**最後更新日期**: 2026-02-23
**檔案夾狀態**: ✅ 已整理優化

---

## 📋 檔案夾概況

本檔案夾包含 Gravito 框架的完整開發指南、使用教學和最佳實踐，幫助開發者快速上手和深入掌握框架各個方面。

### 文件分類（15 個）

| 分類 | 文件數 | 用途 |
|------|--------|------|
| **快速入門** | 1 個 | 新手快速上手 (任務拆解) |
| **核心功能** | 9 個 | 框架各個模組的詳細指南 (含 RequestScope) |
| **AI 開發** | 3 個 | AI Agent 和文檔寫作指南 |
| **最佳實踐** | 2 個 | 開發模式和測試範例 |

---

## 📂 目錄結構

```
docs/guides/
├── 🚀 任務索引
│   └── historical-task-index.md          (任務拆解索引)
│
├── 📚 核心功能指南 (core/)
│   ├── circuit-breaker.md                (518 行) ⭐⭐⭐⭐⭐
│   ├── circuit-breaker-metrics.md        (448 行) ⭐⭐⭐⭐
│   ├── bull-queue-integration.md         (582 行) ⭐⭐⭐⭐⭐
│   ├── dlq-and-retry.md                  (599 行) ⭐⭐⭐⭐⭐
│   ├── observability.md                  (532 行) ⭐⭐⭐⭐
│   └── pool-management.md                (110 行) ⭐⭐⭐
│
├── 🧪 請求生命週期 (RequestScope)
│   ├── RequestScope.md                   (完整指南) ⭐⭐⭐⭐⭐
│   ├── RequestScope-quick-start.md       (5 分鐘上手) ⭐⭐⭐⭐
│   └── RequestScope-orbit-example.md     (Satellite 整合範例) ⭐⭐⭐⭐
│
├── 🤖 AI 開發指南 (ai/)
│   ├── gravito-ai-guide.md               (327 行) ⭐⭐⭐⭐⭐
│   ├── gravito-agent-guide.md            (155 行) ⭐⭐⭐⭐
│   └── documentation-writing-guide.md    (63 行)  ⭐⭐⭐
│
├── 📖 最佳實踐
│   ├── development-examples.md           (636 行) ⭐⭐⭐⭐⭐
│   └── testing-patterns.md               (905 行) ⭐⭐⭐⭐⭐
│
└── README.md                             (本檔案)
```

---

## 🎯 快速導航

### 「我想了解...」

**剛開始使用 Gravito？**
→ 讀 `historical-task-index.md`（了解專案實施歷史）

**異步事件系統、DLQ、重試機制？**
→ 讀 `core/dlq-and-retry.md`（完整指南）

**電路斷路器（熔斷器）？**
→ 先讀 `core/circuit-breaker.md`（基本概念）
→ 再讀 `core/circuit-breaker-metrics.md`（監控指標）

**Bull Queue 隊列系統？**
→ 讀 `core/bull-queue-integration.md`（集成指南）

**系統可觀測性？**
→ 讀 `core/observability.md`（監控與追蹤）

**數據庫連接池管理？**
→ 讀 `core/pool-management.md`（連接池配置）

**開發實例和測試模式？**
→ 讀 `development-examples.md` 和 `testing-patterns.md`

**為框架編寫 AI Agent？**
→ 先讀 `ai/gravito-ai-guide.md`（整體架構）
→ 再讀 `ai/gravito-agent-guide.md`（快速實施）

**文檔寫作規範（供 AI Agent）？**
→ 讀 `ai/documentation-writing-guide.md`（風格指南）

---

## 📚 詳細文件說明

### 🚀 任務索引

#### historical-task-index.md (185 行)
**適合**: 想了解專案開發歷史與任務進度的開發者
**閱讀時間**: 5-10 分鐘
**內容**:
- 核心開發任務索引
- 項目總覽與歸檔文檔連結
- 實施階段回顧
- 快速連結至實施全紀錄

---

### 📖 核心功能指南

#### circuit-breaker.md (518 行) ⭐⭐⭐⭐⭐
**適合**: 開發者、架構師
**閱讀時間**: 15-20 分鐘
**內容**:
- 電路斷路器概念
- 三態模型詳解
- 配置與使用方法
- 實際使用範例
- 狀態轉換規則

---

#### circuit-breaker-metrics.md (448 行) ⭐⭐⭐⭐
**適合**: DevOps、性能工程師、監控人員
**閱讀時間**: 15-20 分鐘
**內容**:
- Prometheus 指標定義
- Grafana 儀表板設置
- 告警規則配置
- 監控查詢範例

---

#### bull-queue-integration.md (582 行) ⭐⭐⭐⭐⭐
**適合**: 開發者、架構師
**閱讀時間**: 20-25 分鐘
**內容**:
- Bull Queue 架構
- 集成步驟
- Worker 線程池
- 性能優化
- 遷移指南

---

#### dlq-and-retry.md (599 行) ⭐⭐⭐⭐⭐
**適合**: 開發者、可靠性工程師
**閱讀時間**: 20-25 分鐘
**內容**:
- 死信隊列概念
- 重試引擎配置
- 故障處理策略
- 最佳實踐

---

#### observability.md (532 行) ⭐⭐⭐⭐
**適合**: DevOps、監控人員、開發者
**閱讀時間**: 15-20 分鐘
**內容**:
- OpenTelemetry 集成
- 追蹤系統配置
- 指標導出
- Grafana 設置

---

#### pool-management.md (110 行) ⭐⭐⭐
**適合**: 開發者、DBA
**閱讀時間**: 5-10 分鐘
**內容**:
- 連接池概念
- 配置參數
- 性能調優

---

### 🤖 AI 開發指南

#### gravito-ai-guide.md (327 行) ⭐⭐⭐⭐⭐
**適合**: AI Agent、開發者
**閱讀時間**: 20-30 分鐘
**內容**:
- 核心架構（Galaxy Architecture）
- 技術棧
- 編碼規範
- 驗收標準
- 項目結構

---

#### gravito-agent-guide.md (155 行) ⭐⭐⭐⭐
**適合**: AI Agent 開發者
**閱讀時間**: 15-20 分鐘
**內容**:
- 快速啟動
- 項目結構
- 核心元件模式
- 最佳實踐
- Bootstrapping

---

#### documentation-writing-guide.md (63 行) ⭐⭐⭐
**適合**: 文檔作者、AI Agent
**閱讀時間**: 5-10 分鐘
**內容**:
- 文檔風格指南
- 寫作原則
- 語氣與格式
- 模板結構

---

### 📖 最佳實踐

#### development-examples.md (636 行) ⭐⭐⭐⭐⭐
**適合**: 開發者
**閱讀時間**: 20-30 分鐘
**內容**:
- 實際開發案例
- 常見場景實現
- 代碼片段和範例
- 最佳實踐

---

#### testing-patterns.md (905 行) ⭐⭐⭐⭐⭐
**適合**: 開發者、QA
**閱讀時間**: 30-45 分鐘
**內容**:
- 測試策略
- 單元測試模式
- 集成測試
- E2E 測試
- 測試框架與工具

---

## 🔄 清理歷史（2026-02-08）

### 執行的優化工作

✅ **重命名不清晰的文件**:
- `docs-ai-prompt.md` → `documentation-writing-guide.md`
  - 原因：原名稱 `docs-ai-prompt` 容易混淆，新名稱更清晰地表達用途

✅ **新增導引文檔**:
- `README.md` (本檔案)
  - 提供完整的目錄導引和快速導航

### 最佳化建議（待未來實施）

📋 **中期優化**:
1. 檢查 `circuit-breaker.md` 和 `circuit-breaker-metrics.md` 的重複內容
2. 確認 `pool-management.md` 內容完整性（目前 110 行，相對較少）
3. 評估 `gravito-agent-guide.md` 是否需要擴展

📋 **長期改進**:
1. 為 `core/` 子目錄新增 README 子導引
2. 為 `ai/` 子目錄新增 README 子導引
3. 建立文件版本控制（日期標籤）
4. 定期更新過時的範例代碼

---

## 🛠️ 如何使用本目錄

### 對於新手開發者
1. 先讀 `historical-task-index.md` 了解專案背景
2. 根據需求選擇相應的核心功能指南
3. 查看 `development-examples.md` 的實例代碼

### 對於經驗豐富的開發者
1. 查閱特定功能的詳細指南（DLQ、Circuit Breaker 等）
2. 參考 `testing-patterns.md` 設計測試策略
3. 使用 `development-examples.md` 作為快速參考

### 對於 AI Agent 開發者
1. 優先閱讀 `ai/gravito-ai-guide.md`（框架總體設計）
2. 查看 `ai/gravito-agent-guide.md`（快速實施模式）
3. 參考 `ai/documentation-writing-guide.md`（文檔規範）

### 對於 DevOps/監控人員
1. 查看相應功能的 metrics/observability 指南
2. 參考 Prometheus 查詢和 Grafana 配置
3. 設置告警規則

---

## 📚 相關資源

**架構文檔**:
- `docs/WHITEPAPER_ZH_TW.md` - Galaxy Architecture 白皮書
- `docs/claude/design.md` - 框架設計文檔

**性能基準**:
- `docs/benchmarks/` - 性能測試報告
- `docs/benchmarks/README.md` - 基準指南

**API 參考**:
- 待補充...

---

## 📝 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.1 | 2026-02-08 | 優化版本：重命名不清晰文件、新增導引 |
| 1.0 | 2026-02-01 | 初始文檔夾建立 |

---

## 💡 貢獻指南

### 更新文檔時
1. 保持與 `documentation-writing-guide.md` 的一致性
2. 更新本 README 中的行數和描述（如有變更）
3. 在版本歷史中記錄更新

### 新增文檔時
1. 確認是否應放在 `core/`、`ai/` 或根目錄
2. 更新本 README 的目錄結構和導引
3. 遵循 `documentation-writing-guide.md` 的規範

---

**此份 README 由 Claude Code 自動生成及維護**
**最後整理日期**: 2026-02-23
**檔案夾狀態**: ✅ 已整理優化，組織清晰
