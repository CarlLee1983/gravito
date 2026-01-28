# 剩餘任務：建立文件驗證 CI 流程

## 任務概述

建立自動化文件品質檢查系統，確保所有架構文檔符合既定標準，並在 PR 階段自動驗證。

## 已完成工作

✅ **Task 1-3 已完成並提交** (Commit: `e5817365`)
- 建立文檔標準模板系統 (`docs/.templates/`)
- 建立自動化依賴分析工具 (`scripts/generate-dependency-graph.ts`)
- 完整增強 5 個 Tier A 核心文檔 (core, atlas, photon, ion, ripple)
- 新增 110+ 個完整 TypeScript 程式碼範例
- 文檔覆蓋率從 18.9% 提升至 85%+

## 待完成任務：Task 4

### 目標
建立 GitHub Actions CI 工作流，自動驗證文檔品質

### 需要建立的檔案

#### 1. `.github/workflows/docs-validation.yml`
GitHub Actions 工作流程定義

**觸發條件**:
- Push 到 `main` 分支時檔案路徑符合 `docs/**`
- PR 到 `main` 分支時檔案路徑符合 `docs/**`

**執行步驟**:
```yaml
- 檢出代碼
- 設定 Bun 環境
- 安裝依賴
- 執行文檔驗證腳本
- 生成驗證報告
- 驗證失敗時阻擋合併
```

#### 2. `scripts/validate-docs.ts`
文檔驗證腳本（使用 Bun + TypeScript）

**驗證項目**:

1. **代碼語法驗證**
   - 掃描所有 Markdown 文件中的 TypeScript/JavaScript 代碼區塊
   - 使用 TypeScript Compiler API 驗證語法正確性
   - 檢查 import 路徑是否合理
   - 報告語法錯誤的位置（文件名:行號）

2. **連結有效性驗證**
   - 檢查內部連結（相對路徑、錨點）
   - 驗證引用的檔案是否存在
   - 驗證錨點是否對應到實際標題
   - 報告斷掉的連結

3. **Mermaid 圖表驗證**
   - 掃描 Mermaid 代碼區塊
   - 驗證基本語法結構
   - 檢查圖表類型（graph, flowchart, sequenceDiagram 等）
   - 報告語法錯誤

4. **文檔結構驗證**
   - 檢查 YAML frontmatter 完整性
     - 必要欄位: title, version, status, tier, last_updated
   - 檢查必要章節存在性
     - 快速開始 (Quick Start)
     - API 參考 (API Reference)
     - 架構設計 (Architecture Design)
   - 檢查代碼範例數量（Tier A 至少 15 個）

5. **模板符合度驗證**
   - 比對 `docs/.templates/` 中的模板結構
   - 檢查章節順序是否一致
   - 驗證標題層級是否正確

**輸出格式**:
```typescript
interface ValidationResult {
  file: string
  passed: boolean
  errors: Array<{
    type: 'syntax' | 'link' | 'mermaid' | 'structure' | 'template'
    line?: number
    message: string
    severity: 'error' | 'warning'
  }>
}
```

**退出代碼**:
- `0`: 所有驗證通過
- `1`: 有 error 級別的問題
- `2`: 腳本執行失敗

### 技術需求

**工具和套件**:
- Bun runtime (已安裝)
- TypeScript Compiler API (`npm:typescript`)
- Markdown 解析器 (`npm:remark` 或 `npm:markdown-it`)
- YAML 解析器 (`npm:js-yaml`)
- Glob 文件搜尋 (Bun 內建)

**測試需求**:
- 使用 `bun test` 編寫單元測試
- 測試各種驗證場景（成功/失敗案例）
- 測試邊界條件

### 參考資源

**相關檔案**:
- `docs/.templates/architecture-doc-template.md` - 架構文檔標準模板
- `docs/.templates/orbit-doc-template.md` - Orbit 模組標準模板
- `docs/.templates/README.md` - 模板使用指南
- `scripts/generate-dependency-graph.ts` - 現有腳本範例（Bun + TypeScript）

**架構文檔位置**:
- `docs/architecture/*.md` - 37 個架構文檔檔案

**代碼風格參考**:
- 使用 Bun 原生 API（如 `Bun.file()`, `Bun.Glob`）
- 遵循專案現有的 TypeScript 風格
- 使用 immutable 模式（避免 mutation）
- 完整的錯誤處理

### 預期成果

完成後應能：
1. 在本地執行 `bun run scripts/validate-docs.ts` 驗證所有文檔
2. CI 自動在 PR 階段執行驗證
3. 驗證失敗時提供清晰的錯誤報告
4. 阻止不符合標準的文檔合併

### 預估時間
4-6 小時

### 優先級
高 - 確保文檔品質的關鍵基礎設施

---

## 開始新 Session 的指令

```bash
# 確認當前分支和狀態
git status

# 查看最新提交
git log --oneline -3

# 開始實作 Task 4
# 建議先實作 scripts/validate-docs.ts
# 然後建立 .github/workflows/docs-validation.yml
# 最後編寫測試
```

## 注意事項

1. **不要修改已提交的文檔** - Task 1-3 已完成並提交
2. **使用 Bun 原生 API** - 避免不必要的依賴
3. **完整測試** - 確保驗證邏輯正確可靠
4. **清晰的錯誤訊息** - 幫助開發者快速定位問題
5. **效能考量** - 驗證 37 個文檔需要在合理時間內完成

## 問題諮詢

如有任何問題，可參考：
- TypeScript Compiler API: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
- GitHub Actions 文檔: https://docs.github.com/en/actions
- Bun 文檔: https://bun.sh/docs
