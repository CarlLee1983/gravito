# pdf2api Design Spec

> 將 PDF 格式的 API 文件轉換為 OpenAPI 3.x spec 的 CLI 工具，支援混合式解析（規則 + AI Agent 協作）

## 產品定位

| 面向 | 決定 |
|------|------|
| 名稱 | `@carllee1983/pdf2api` |
| 類型 | 獨立 Tool CLI（與 Gravito 無耦合） |
| 主要使用者 | AI Agent（Claude Code / Gemini / Cursor / Codex） |
| 次要使用者 | 開發者手動操作 |
| 核心功能 | PDF API 文件 → OpenAPI 3.x spec |
| 語言支援 | 繁體中文 + 英文 |
| 設計原則 | 遵循 AI Agent-Friendly CLI Design Principles |

## 架構：Pipeline + AI Agent 協作

### 核心概念

CLI 本身**零 LLM 依賴**，負責 PDF 預處理與 OpenAPI 組裝。LLM 理解的部分由操作 CLI 的 AI Agent 自身完成，透過 Skill 教學協作流程。

```
AI Agent (Claude Code / Gemini / Cursor / Codex)
  |  <- Skill 教學如何操作
  |
  |-- pdf2api inspect file.pdf --json   <- 取得結構化預處理結果
  |-- Agent 自身理解內容、提取 endpoints  <- LLM 能力由 Agent 本身提供
  +-- pdf2api assemble endpoints.json    <- 組裝成 OpenAPI spec
```

### Pipeline 流程

```
PDF 檔案
  |
  v
[Extract] 提取原始內容
  |  |-- unpdf: 文字提取 + 頁面分割
  |  +-- pdfplumber (Python subprocess): 表格擷取
  |
  v
[Chunk] 智慧分段
  |  |-- 依標題層級切分
  |  |-- 表格獨立成 chunk
  |  +-- 程式碼區塊辨識
  |
  v
[Classify] 規則式分類
  |  |-- endpoint_definition (URL + Method)
  |  |-- parameter_table (參數表格)
  |  |-- response_example (回應範例)
  |  |-- auth_description (認證說明)
  |  |-- error_codes (錯誤碼列表)
  |  +-- general_text (其他描述)
  |
  v
結構化 JSON 輸出 (inspect)
  |
  v
[Agent 理解] AI Agent 分析 chunks
  |  |-- 辨識 endpoints、參數、回應
  |  |-- 推斷缺失資訊 (base URL、auth 方式)
  |  +-- 組裝成 assemble 所需的 JSON
  |
  v
[Assemble] 組裝 OpenAPI 3.x (assemble)
  |
  v
[Validate] 驗證 spec 正確性 (validate)
```

## CLI 介面

### 三個命令

```bash
# 預處理：提取 + 分段 + 分類（純本地）
pdf2api inspect api-doc.pdf --json

# 組裝：將 Agent 解析好的 endpoints 組裝成 OpenAPI（檔案輸入）
pdf2api assemble endpoints.json -o api-spec.yaml

# 組裝：stdin 輸入（Agent 可直接 pipe）
echo '{ ... }' | pdf2api assemble --stdin -o api-spec.yaml

# 驗證產出的 spec
pdf2api validate api-spec.yaml

# 環境診斷
pdf2api doctor

# 批次預處理
pdf2api inspect ./docs/*.pdf --outdir ./chunks/

# 指定頁面範圍（大型 PDF）
pdf2api inspect large-doc.pdf --pages 1-50 --json
```

### 輸出行為

遵循 AI Agent-Friendly 原則：

- **stdout** = 結構化資料（JSON / YAML）
- **stderr** = 進度、日誌、警告
- `--json` 模式下 stdout 為 `{ ok, data }` 或 `{ ok, error }` 結構
- 預設為 human-friendly 格式

### Exit Code

| Code | 意義 | 範例 |
|------|------|------|
| 0 | 成功 | 正常完成 |
| 1 | 解析失敗 | PDF 內容無法辨識 |
| 2 | 組裝失敗 | assemble 輸入格式不合法 |
| 3 | 輸入錯誤 | 檔案不存在、非 PDF 格式 |
| 4 | 驗證失敗 | 產出的 OpenAPI spec 不合法 |

### 結構化錯誤輸出

```json
{
  "ok": false,
  "error": {
    "code": "E2001",
    "type": "EXTRACT_FAILED",
    "message": "無法從 PDF 提取文字內容",
    "suggestion": "此 PDF 可能是掃描圖片，建議先用 OCR 工具處理",
    "context": { "file": "scanned-doc.pdf", "pages": 12 }
  }
}
```

## 資料格式

### `inspect` 輸出格式

```json
{
  "ok": true,
  "data": {
    "source": "bank-api-v2.pdf",
    "pages": 42,
    "language": "zh-TW",
    "chunks": [
      {
        "id": "chunk-001",
        "page": 3,
        "type": "endpoint_definition",
        "confidence": 0.92,
        "content": "POST /api/v1/transfer",
        "raw_text": "...",
        "table": null
      },
      {
        "id": "chunk-002",
        "page": 3,
        "type": "parameter_table",
        "confidence": 0.87,
        "content": null,
        "raw_text": "...",
        "table": {
          "headers": ["參數名稱", "型別", "必填", "說明"],
          "rows": [
            ["amount", "number", "是", "轉帳金額"],
            ["to_account", "string", "是", "目標帳號"]
          ]
        }
      },
      {
        "id": "chunk-003",
        "page": 4,
        "type": "response_example",
        "confidence": 0.95,
        "content": "{ \"code\": 200, \"data\": { \"tx_id\": \"...\" } }",
        "raw_text": "...",
        "table": null
      }
    ],
    "stats": {
      "total_chunks": 156,
      "by_type": {
        "endpoint_definition": 23,
        "parameter_table": 31,
        "response_example": 18,
        "auth_description": 3,
        "error_codes": 5,
        "general_text": 76
      }
    }
  }
}
```

### Chunk 類型定義

| type | 說明 | 映射至 OpenAPI |
|------|------|---------------|
| `endpoint_definition` | URL + HTTP Method | `paths[path][method]` |
| `parameter_table` | 參數表格 | `parameters` / `requestBody` |
| `response_example` | 回應範例 | `responses[code].content` |
| `auth_description` | 認證說明 | `securitySchemes` |
| `error_codes` | 錯誤碼列表 | `responses[4xx/5xx]` |
| `general_text` | 其他描述 | `description` / `info` |

### Confidence 機制

每個 chunk 帶 `confidence: 0.0 ~ 1.0`：

- **0.8+**：高信心，Agent 可直接使用
- **0.5 ~ 0.8**：中等，Agent 應交叉驗證
- **< 0.5**：低信心，Agent 可忽略或請使用者確認

### `assemble` 輸入格式

Agent 解析 chunks 後，產出此結構給 `assemble`：

```json
{
  "info": {
    "title": "Bank Transfer API",
    "version": "2.0.0",
    "description": "..."
  },
  "servers": [{ "url": "https://api.bank.com/v1" }],
  "endpoints": [
    {
      "path": "/transfer",
      "method": "post",
      "summary": "執行轉帳",
      "parameters": [],
      "requestBody": {
        "properties": {
          "amount": { "type": "number", "description": "轉帳金額" },
          "to_account": { "type": "string", "description": "目標帳號" }
        },
        "required": ["amount", "to_account"]
      },
      "responses": {
        "200": { "description": "成功", "example": { "tx_id": "..." } }
      }
    }
  ]
}
```

## 技術選型

| 元件 | 選擇 | 理由 |
|------|------|------|
| Runtime | **Bun** | 與 Gravito 生態一致、快速啟動 |
| 語言 | **TypeScript (strict)** | 型別安全 |
| 文字提取 | **unpdf** (1.8MB, MIT) | 最輕量、Bun 原生相容、pdfjs worker 已 inline |
| 表格擷取 | **pdfplumber** (Python subprocess) | 表格品質最佳、CJK 穩定、零 API 成本 |
| CLI 框架 | **parseArgs** (Node/Bun 內建) | 零依賴 |
| OpenAPI 驗證 | **@readme/openapi-parser** | 成熟的 OpenAPI 3.x 驗證 |
| 測試 | **bun:test** | 內建、快速 |
| 格式化 | **Biome** | 與 Gravito 一致 |

### pdfplumber 整合方式

```
pdf2api inspect file.pdf --json
  |
  |-- unpdf: 提取純文字 + 頁面中繼資料
  |
  |-- pdfplumber (subprocess):
  |   $ python3 -m pdf2api_bridge extract-tables file.pdf
  |   -> stdout: JSON 表格陣列
  |
  +-- 合併結果 -> chunk + classify -> 輸出
```

- CLI 內附輕量 Python bridge script（`bridge/extract_tables.py`）
- 首次執行時自動偵測 `python3` + `pdfplumber` 是否可用
- 若不可用，降級為純文字模式並警告使用者

### 安裝體驗

```bash
# CLI 本體
npm install -g @carllee1983/pdf2api

# 表格支援（可選）
pip install pdfplumber

# 驗證環境
pdf2api doctor
# ok  pdf2api v1.0.0
# ok  Python 3.12 found
# ok  pdfplumber 0.11.x found
# ok  All features available
```

## 邊界案例處理

| 案例 | 處理策略 |
|------|---------|
| 掃描式 PDF（純圖片） | 偵測後報錯，建議先 OCR |
| 加密 PDF | 報錯，提示需要密碼 |
| 超大 PDF（500+ 頁） | 支援 `--pages 1-50` 範圍選取 |
| 混合語言（中英夾雜） | language 欄位標記，chunk 保留原始語言 |
| 表格跨頁 | chunk 階段做跨頁合併偵測 |
| 無 API 內容的 PDF | inspect 回傳空 chunks + 警告，不報錯 |
| pdfplumber 未安裝 | 降級為純文字模式，stderr 警告 |

## Skill 協作模式

### 協作流程

```
使用者：「幫我把這份銀行 API PDF 轉成 OpenAPI spec」
  |
  v
AI Agent 載入 pdf2api Skill
  |
  v
Step 1: pdf2api inspect bank-api.pdf --json
  |  -> 取得結構化 chunks
  v
Step 2: Agent 分析 chunks（用自身 LLM 能力）
  |  |-- 辨識 endpoints、參數、回應
  |  |-- 推斷缺失資訊（base URL、auth 方式）
  |  +-- 組裝成 assemble 所需的 JSON
  v
Step 3: pdf2api assemble endpoints.json -o spec.yaml
  |  -> 產出合法 OpenAPI 3.x
  v
Step 4: pdf2api validate spec.yaml --json
  |  -> 驗證 spec 正確性
  v
完成，交付 spec.yaml 給使用者
```

### 跨平台 Skill

每個 AI 平台一份 Skill（內容相同，格式適配），隨 CLI 一起發佈：

| 平台 | Skill 格式 | 檔案 |
|------|-----------|------|
| Claude Code | `.claude/skills/` | `skills/claude.md` |
| Gemini CLI | `GEMINI.md` 引用 | `skills/gemini.md` |
| Cursor | `.cursor/rules/` | `skills/cursor.md` |
| Codex | `AGENTS.md` 引用 | `skills/codex.md` |

### Skill 教學內容摘要

```markdown
# pdf2api Skill

## 你能做什麼
將 PDF 格式的 API 文件轉換為 OpenAPI 3.x spec

## 工作流程
1. 使用 `pdf2api inspect <file> --json` 取得預處理結果
2. 分析 chunks，提取 API 結構：
   - type: endpoint_definition -> 辨識 method + path
   - type: parameter_table -> 提取參數定義
   - type: response_example -> 解析回應格式
   - type: auth_description -> 辨識認證方式
3. 組裝成 assemble 格式的 JSON
4. 使用 `pdf2api assemble <json> -o <output>` 產出 spec
5. 使用 `pdf2api validate <spec>` 驗證

## Chunk 類型 -> OpenAPI 映射
- endpoint_definition -> paths[path][method]
- parameter_table -> parameters / requestBody
- response_example -> responses[code].content
- auth_description -> securitySchemes
- error_codes -> responses[4xx/5xx]

## 常見問題處理
- 中文參數名稱：保留原名作為 description，推斷英文 field name
- 缺少 base URL：提示使用者補充或從文件標題推斷
- 表格格式混亂：逐行分析，用 confidence 過濾低品質 chunks
```

## 專案結構

```
pdf2api/
|-- src/
|   |-- index.ts                 # CLI 進入點
|   |-- commands/
|   |   |-- inspect.ts           # inspect 命令
|   |   |-- assemble.ts          # assemble 命令
|   |   |-- validate.ts          # validate 命令
|   |   +-- doctor.ts            # doctor 環境診斷
|   |-- pipeline/
|   |   |-- extract.ts           # PDF -> 原始內容
|   |   |-- chunk.ts             # 原始內容 -> 分段
|   |   +-- classify.ts          # 分段 -> 分類標註
|   |-- assembler/
|   |   |-- openapi-builder.ts   # endpoints JSON -> OpenAPI 3.x
|   |   +-- schema-inferrer.ts   # 從範例推斷 JSON Schema
|   |-- validators/
|   |   +-- openapi-validator.ts # OpenAPI spec 驗證
|   |-- bridge/
|   |   +-- pdfplumber.ts        # Python subprocess 管理
|   |-- output/
|   |   |-- formatter.ts         # dual mode 輸出（human / json）
|   |   +-- result.ts            # ok/fail 結構化回傳
|   +-- types/
|       |-- chunk.ts             # Chunk 型別定義
|       |-- endpoint.ts          # Endpoint 中間格式
|       +-- config.ts            # CLI 設定
|-- bridge/
|   +-- extract_tables.py        # pdfplumber Python bridge script
|-- skills/                      # AI Agent Skill 檔案
|   |-- claude.md
|   |-- gemini.md
|   |-- cursor.md
|   +-- codex.md
|-- tests/
|   |-- pipeline/
|   |   |-- extract.test.ts
|   |   |-- chunk.test.ts
|   |   +-- classify.test.ts
|   |-- assembler/
|   |   +-- openapi-builder.test.ts
|   |-- commands/
|   |   +-- inspect.test.ts
|   +-- fixtures/                # 測試用 PDF 檔案
|       |-- simple-api.pdf
|       |-- chinese-bank-api.pdf
|       +-- complex-table-api.pdf
|-- package.json
|-- tsconfig.json
|-- biome.json
+-- README.md
```

## 未來擴充方向

- **Template 模式**：為常見 PDF 格式定義 template，規則式處理已知格式
- **MCP Tool Definition 輸出**：除了 OpenAPI，也能輸出 MCP tool definition
- **整合至 @gravito/tool-cli**：成熟後遷移至 Gravito CLI 生態系
- **OCR 支援**：整合 Tesseract 或雲端 OCR 處理掃描式 PDF
- **Plugin 架構**：支援自訂 Extractor adapter（雲端 API、其他 Python 庫）
