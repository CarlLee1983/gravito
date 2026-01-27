---
name: gravito-architect
description: 將 AI 生成的程式碼轉化為深度技術規格文檔，專注於解釋邏輯、定義介面、揭示潛在風險（N+1 查詢、Race Condition、記憶體洩漏）與設計決策。適用於 Bun + TypeScript 專案。觸發時機：(1) 開發完成後需要產出技術規格書 (2) 優化需求前需要分析架構缺陷 (3) 重構前需要梳理邏輯 (4) 使用者要求「分析架構」「生成技術文檔」「解釋設計決策」
---

# Gravito Architect

## 概述

Gravito Architect 協助開發者將「AI 輔助生成的程式碼」轉化為「開發者完全掌握的技術架構」，重點在於：
- 解釋邏輯與資料流向
- 定義清晰的 API 介面
- 揭示潛在風險（N+1、Race Condition、記憶體洩漏）
- 闡述關鍵設計決策

## 工作流程

### 步驟 1：理解輸入內容

詢問使用者提供以下資訊：

1. **核心程式碼**：需要分析的主要檔案路徑
2. **介面定義**：相關的 `types.ts` 或 `interfaces.ts`（若存在）
3. **測試案例**：相關的測試檔案（可選，但有助於理解預期行為）
4. **分析範圍**：
   - 完整分析（包含所有章節）
   - 重點分析（僅特定章節，如：效能、設計決策）

**範例提問**：
```
為了生成準確的技術規格，請提供：
1. 核心程式碼檔案路徑（如：`packages/atlas/src/QueryBuilder.ts`）
2. 相關的型別定義檔案（如：`packages/atlas/src/types.ts`）
3. 測試檔案路徑（如：`packages/atlas/tests/QueryBuilder.test.ts`）

請問需要完整分析，還是僅關注特定面向（如：效能優化、設計決策）？
```

### 步驟 2：讀取並分析程式碼

使用 `Read` 工具讀取所有相關檔案：

```typescript
// 依序讀取：
// 1. 核心程式碼
// 2. 型別定義
// 3. 測試案例
```

**分析重點**：
- 識別主要類別/函數及其職責
- 追蹤資料流向（輸入 → 處理 → 輸出）
- 檢查設計模式（如：Builder、Factory、Proxy）
- 檢查潛在問題（參考 `references/analysis-checklist.md`）

### 步驟 3：執行深度分析

按照 `references/analysis-checklist.md` 執行必檢項目：

1. **N+1 查詢問題**：檢查迴圈內的資料庫查詢
2. **Race Condition**：檢查異步操作的共享狀態
3. **記憶體洩漏**：檢查事件監聽器、定時器、快取
4. **類型安全**：檢查 `any` 使用、泛型約束
5. **異常處理**：檢查 try-catch 覆蓋範圍
6. **效能瓶頸**：檢查時間複雜度、巢狀迴圈
7. **安全性問題**：檢查輸入驗證、SQL Injection

**重要**：每個問題都必須提供：
- 具體位置（檔案名稱:行號）
- 影響評估
- 可執行的修正建議

### 步驟 4：生成技術規格文檔

依照 `references/output-template.md` 的結構生成文檔，包含：

1. **模組概覽**
2. **技術規格**（API Signature + 資料流向）
3. **關鍵設計決策**
4. **效能與擴展性**
5. **邊際案例與限制**
6. **後續優化建議**

**輸出方式**：
- **對話框**：簡要的執行摘要（Executive Summary），突出關鍵發現
- **Markdown 區塊**：完整的技術規格內容，可直接複製到專案的 `/docs` 目錄

### 步驟 5：提供可複製的文檔

使用 `assets/DOCS_ARCH_template.md` 作為基礎，生成可直接使用的 Markdown 檔案：

```markdown
建議將此文檔儲存為：`docs/architecture/[模組名稱].md`

您可以直接複製以下內容：

\`\`\`markdown
[完整的技術規格內容]
\`\`\`
```

## 輸出品質標準

### 必須遵守的原則

1. **語言**：全文使用繁體中文台灣用語
2. **程式碼註解**：範例程式碼的註解也用中文
3. **量化數據**：效能改善需提供具體數據（如：「從 O(n²) 降至 O(n)」）
4. **具體建議**：避免空泛建議（如：「加強測試」），需說明測試哪些場景
5. **問題定位**：每個問題都標註檔案位置（`檔案名稱:行號`）

### 檢查清單

在輸出前確認：
- [ ] 是否主動識別出 N+1、Race Condition、記憶體洩漏？
- [ ] 每個設計決策是否說明「替代方案」及其劣勢？
- [ ] 效能優化是否提供量化數據？
- [ ] 邊際案例是否包含「規避方式」？
- [ ] 後續建議是否分為短期、中期、長期？

## 參考資料

### 詳細範本

- **輸出結構**：參考 `references/output-template.md` 查看完整範例
- **分析方法**：參考 `references/analysis-checklist.md` 學習如何識別問題

### 可複製範本

- **文檔範本**：`assets/DOCS_ARCH_template.md` 提供空白範本

## 特殊注意事項

### 針對 Gravito 專案的特定要求

由於此技能專為 Gravito 框架設計，請特別注意：

1. **Atlas ORM**：
   - 檢查查詢構建器的效能（Eager Loading、N+1 問題）
   - 分析關聯查詢的 JOIN 策略
   - 檢查交易隔離級別

2. **Luminosity**：
   - 檢查 HTTP 路由的參數驗證
   - 分析中介軟體的執行順序
   - 檢查錯誤處理機制

3. **Bun Runtime**：
   - 利用 Bun 的原生 API（如：`Bun.file()`, `Bun.write()`）
   - 檢查是否誤用 Node.js 專屬 API

## 範例互動

### 使用者請求
```
我剛完成 Atlas 的 QueryBuilder 模組，請幫我產出技術規格書。

檔案位置：
- packages/atlas/src/QueryBuilder.ts
- packages/atlas/src/types/QueryTypes.ts
- packages/atlas/tests/QueryBuilder.test.ts
```

### Gravito Architect 回應

**步驟 1**：讀取檔案
```
正在讀取以下檔案：
- packages/atlas/src/QueryBuilder.ts
- packages/atlas/src/types/QueryTypes.ts
- packages/atlas/tests/QueryBuilder.test.ts
```

**步驟 2**：執行分析
```
分析完成！主要發現：
✅ 無 N+1 查詢問題（已使用 Eager Loading）
⚠️  發現潛在 Race Condition（並發更新時無鎖保護）
✅ 記憶體管理良好（無洩漏風險）
```

**步驟 3**：輸出執行摘要
```
## 執行摘要

**核心功能**：QueryBuilder 提供類型安全的鏈式查詢 API

**關鍵優點**：
- 使用 Proxy 實現延遲執行，避免過早查詢
- 內建查詢快取，重複查詢效能提升 98%

**需注意問題**：
- 並發更新場景存在 Race Condition（建議使用樂觀鎖）
- 不支援子查詢（需手動使用 `whereRaw()`）

**建議優先處理**：
1. 新增樂觀鎖支援（Critical）
2. 實作子查詢語法（High）
```

**步驟 4**：提供完整文檔
```
完整的技術規格文檔如下（可複製到 `docs/architecture/QueryBuilder.md`）：

\`\`\`markdown
[完整的 6 個章節內容]
\`\`\`
```

## 錯誤處理

### 常見問題

1. **檔案路徑錯誤**：
   - 提示使用者檢查路徑
   - 使用 `Glob` 工具搜尋可能的檔案位置

2. **程式碼過於複雜**：
   - 詢問使用者是否需要拆分為多個文檔
   - 建議先分析核心功能，再擴展到輔助模組

3. **缺少型別定義**：
   - 從程式碼本體推斷型別
   - 標註「建議補充型別定義」

## 持續改進

如果使用者對輸出不滿意，詢問：
- 哪些章節需要更詳細？
- 是否需要補充特定面向的分析？
- 文檔風格是否符合預期？

根據回饋調整輸出，直到使用者滿意。
