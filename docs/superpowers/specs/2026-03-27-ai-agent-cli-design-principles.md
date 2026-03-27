# AI Agent-Friendly CLI Design Principles

> Gravito CLI 工具生態系設計規範 — 讓 AI Agent 能高效、可靠地操作 CLI 工具

## 背景與目標

Gravito 計畫開發大量 CLI 工具作為框架配套，主要服務對象包括：
- Claude Code / Cursor 等 IDE AI（透過 Bash tool）
- 自建 AI Agent 系統（透過 MCP / tool calling）
- CI/CD pipeline 自動化 Agent

設計原則針對**未來新開發的 CLI**，不強制改造現有工具。

## 設計方向

**Hybrid 慣例 + 輕量 Schema**：
1. 定義設計慣例作為核心原則
2. 提供 `@gravito/cli-kit` 封裝共用基礎設施
3. 每個命令可選擇性附帶 Command Manifest（輕量 schema）

---

## 核心設計原則

### 1. Machine-First, Human-Friendly

CLI 的主要消費者是 Agent，人類是次要使用者。設計決策衝突時，優先考慮 Agent 的需求。

### 2. Predictable I/O Contract

每個命令的輸入和輸出都是可預測的合約：
- 相同輸入 → 相同輸出結構（值可以不同，結構必須一致）
- 不在 stdout 混入 log、spinner、進度條等副作用輸出
- **stdout** = 資料（JSON 或結構化結果），**stderr** = 人類訊息（log、進度、警告）

### 3. Dual Output Mode

- 預設人類友善格式
- `--json` flag 啟用 JSON 輸出（Agent 模式）
- JSON 模式下禁止任何非 JSON 輸出到 stdout

### 4. Structured Error Contract

錯誤是結構化物件，不是字串：

```json
{
  "ok": false,
  "error": {
    "code": "E1001",
    "type": "SCHEMA_INVALID",
    "message": "Config file has invalid schema",
    "suggestion": "Run 'gravito config validate' to see details",
    "context": { "file": "gravito.config.ts", "line": 42 }
  }
}
```

人類模式下同樣資訊以可讀格式呈現。

### 5. Composable by Default

- 細粒度原子命令 + 粗粒度 workflow 捷徑
- 原子命令的輸出可作為下一個命令的輸入（pipe-friendly）
- Workflow 命令內部組合原子命令，不另寫邏輯

### 6. Zero Interactivity in Agent Mode

- `--json` 模式下永遠不能出現互動式 prompt
- 缺少必要參數時直接報錯，不要詢問
- 人類模式可以有互動 prompt 做引導

---

## 命名與 Flag 慣例

### 命令命名

```
gravito <domain> <action> [target] [flags]
```

- **domain**：操作領域（`db`、`seo`、`auth`、`config`）
- **action**：動詞（`list`、`create`、`validate`、`migrate`）
- **target**：可選的具體對象（`gravito db migrate up`）

### 標準動詞表

| 動詞 | 語意 | 範例 |
|------|------|------|
| `list` | 列出資源 | `gravito db list migrations` |
| `get` | 取得單一資源 | `gravito config get theme` |
| `create` | 建立資源 | `gravito auth create token` |
| `update` | 修改資源 | `gravito config update --key=val` |
| `delete` | 刪除資源 | `gravito db delete migration v3` |
| `validate` | 驗證正確性 | `gravito schema validate` |
| `run` | 執行流程 | `gravito workflow run deploy` |
| `describe` | 輸出命令的 manifest | `gravito db describe migrate` |

### 全域 Flag

所有命令必須支援：

| Flag | 短寫 | 用途 |
|------|------|------|
| `--json` | `-j` | JSON 輸出模式 |
| `--quiet` | `-q` | 只輸出結果，無額外訊息 |
| `--verbose` | `-v` | 詳細輸出 |
| `--dry-run` | | 預覽操作，不實際執行 |
| `--help` | `-h` | 顯示說明 |
| `--version` | `-V` | 顯示版本 |

### 成功輸出標準結構

```json
{
  "ok": true,
  "data": { "..." : "..." },
  "meta": {
    "command": "db.migrate.up",
    "duration_ms": 342,
    "timestamp": "2026-03-27T10:00:00Z"
  }
}
```

- `ok` 永遠存在，Agent 第一個檢查的欄位
- `data` 是命令的實際結果
- `meta` 提供執行脈絡，方便 Agent 記錄與除錯

### Exit Code 慣例

| Code | 語意 |
|------|------|
| `0` | 成功 |
| `1` | 一般錯誤（命令邏輯失敗） |
| `2` | 使用方式錯誤（參數不對、flag 不合法） |
| `3` | 外部依賴錯誤（DB 連不上、網路失敗） |

---

## Command Manifest 與 Agent Introspection

### Command Manifest

每個命令可選擇性附帶一份 manifest：

```typescript
interface CommandManifest {
  name: string                    // "db.migrate.up"
  description: string             // 人類可讀描述
  category: string                // "database"
  args: ArgDefinition[]           // 位置參數
  flags: FlagDefinition[]         // flag 定義
  output: OutputSchema            // 輸出結構描述
  examples: Example[]             // 使用範例
  sideEffects: boolean            // 是否有副作用（寫入、刪除）
  idempotent: boolean             // 是否冪等
}
```

`sideEffects` 和 `idempotent` 是給 Agent 的關鍵訊號：
- `sideEffects: false` → Agent 可安全重複呼叫（查詢類）
- `idempotent: true` → Agent 重試安全

### Introspection 三層探索

```bash
# 第一層：列出所有可用命令
gravito --list --json

# 第二層：描述單一命令（輸出 manifest）
gravito db describe migrate

# 第三層：全量匯出（供 MCP 整合或 Agent 快取）
gravito --export-manifest --json
```

### MCP 整合路徑

Manifest 可直接轉換為 MCP tool definition：

```
CommandManifest → MCP Tool Schema
  name         → tool.name
  description  → tool.description
  args + flags → tool.inputSchema
  output       → （保留供未來用）
  sideEffects  → 決定是否需要 human-in-the-loop confirmation
```

---

## `@gravito/cli-kit` 共用基礎設施

### 模組結構

```
@gravito/cli-kit/
├── output       # 輸出格式化（JSON / human dual mode）
├── errors       # 結構化錯誤建立與格式化
├── manifest     # Command manifest 定義、載入、匯出
├── runner       # 命令執行器（解析 flag → 執行 handler → 格式化輸出）
└── testing      # CLI 測試工具（snapshot、output assertion）
```

### 使用範例

```typescript
import { defineCommand, ok, fail } from '@gravito/cli-kit'

export const migrateUp = defineCommand({
  name: 'db.migrate.up',
  description: '執行待處理的資料庫遷移',
  category: 'database',
  sideEffects: true,
  idempotent: true,

  args: [
    { name: 'target', description: '目標版本', required: false }
  ],

  flags: [
    { name: 'step', alias: 's', type: 'number', description: '執行幾步' }
  ],

  async handler({ args, flags }) {
    const migrations = await findPending(args.target)
    if (!migrations.length) {
      return ok({ applied: [], message: 'No pending migrations' })
    }

    const applied = await applyMigrations(migrations, flags.step)
    return ok({ applied, count: applied.length })
  }
})
```

### 關鍵設計決策

1. **`ok()` / `fail()` 強制結構化回傳** — handler 不直接 `console.log`，回傳結構化結果，runner 根據 `--json` flag 決定輸出格式

2. **自動行為** — runner 自動處理全域 flag、捕捉未處理例外、注入 meta、偵測 TTY 加入顏色

3. **測試友善** — `defineCommand` 回傳的命令可程式化呼叫，`@gravito/cli-kit/testing` 提供 `runCommand()` 測試工具

---

## 漸進式採用策略

```
Phase 1: 慣例先行
  └─ 遵守命名、flag、輸出格式慣例
  └─ 使用 @gravito/cli-kit 的 output + errors 模組
  └─ 新 CLI 立即可被 Agent 透過 --json 操作

Phase 2: Manifest 加持
  └─ 為高頻命令加上 Command Manifest
  └─ 啟用 --list / describe / --export-manifest
  └─ Agent 可自動探索 CLI 能力

Phase 3: MCP 整合
  └─ 從 manifest 自動生成 MCP tool definitions
  └─ 建立 @gravito/mcp-bridge 或類似套件
  └─ AI Agent 透過 MCP protocol 直接操作，不需 Bash
```

每個 phase 獨立可用，不需要一次到位。Phase 1 就足以讓 Claude Code 等 Agent 有效操作。

---

## 安全模型（源自 Dbcli 實戰經驗）

### 13. Layered Access Control

當 CLI 操作敏感資源時，設計兩層正交的存取控制：

| 層 | 控制什麼 | 範例 |
|---|---------|------|
| **操作權限** | 能做什麼動作 | `permission: [read, write, delete, admin]` |
| **資源黑名單** | 不能碰什麼資源 | `blacklist: [resource-type, resource-id]` |

兩者同時生效、互不干擾。即使有 write 權限，blacklist 的資源仍然不可存取。

### 14. Secrets Decoupling

CLI 的設定檔永遠不包含明文密碼：

| 方案 | 做法 |
|------|------|
| `$env` 參照語法 | `{ "password": { "$env": "DB_PASSWORD" } }` |
| Directory mode | `config.json`（無密碼，可 commit）+ `.env.local`（僅密碼，gitignored） |
| 系統 keychain | credential 存入 OS keychain |

---

## AI Agent 體驗強化（源自 Dbcli 實戰經驗）

### 15. Built-in Skill Generation

CLI 應內建 skill 生成/安裝能力：

```bash
myapp skill show                     # 輸出 skill 內容到 stdout
myapp skill install claude           # → ~/.claude/skills/myapp.md
myapp skill install cursor           # → ~/.cursor/skills/myapp.md
myapp skill generate --from-manifest # Phase 2+：從 manifest 自動生成
```

### 16. Intelligent Error Suggestions

錯誤訊息要猜測使用者想做什麼：

| 技巧 | 做法 |
|------|------|
| 拼字建議 | Levenshtein distance → "Did you mean: `users`?" |
| 操作提示 | `suggestions[]` 附帶可執行的修復步驟 |
| 權限引導 | 明確告知缺什麼權限、怎麼升級 |

JSON 模式下的錯誤結構：

```json
{
  "ok": false,
  "error": {
    "code": "E2001",
    "type": "TABLE_NOT_FOUND",
    "message": "Table 'uesrs' does not exist",
    "suggestions": [
      "Did you mean: 'users'?",
      "Run 'myapp list' to see all available tables"
    ],
    "context": { "input": "uesrs", "closest": "users", "distance": 1 }
  }
}
```

---

## 自我診斷與維運（源自 Dbcli 實戰經驗）

### 17. Self-Diagnostic Commands

每個 CLI 應內建維運命令：

| 命令 | 用途 |
|------|------|
| `doctor` | 環境診斷（依賴、連線、設定正確性） |
| `status` | 當前狀態摘要（認證、設定、版本） |
| `check` | 設定檔驗證 |

`doctor --json` 標準輸出：

```json
{
  "ok": true,
  "data": {
    "checks": [
      { "name": "config", "status": "pass", "detail": "Config loaded" },
      { "name": "auth", "status": "pass", "detail": "Authenticated as carl" },
      { "name": "connection", "status": "fail", "detail": "API unreachable", "suggestion": "Check network" }
    ],
    "summary": { "pass": 2, "fail": 1, "warn": 0 }
  }
}
```

### 18. Background Version Check

版本檢查不能阻塞主命令：

```
preAction:  fire-and-forget 發起版本檢查
主命令:     正常執行，零延遲
postAction: 若有新版，stderr 輸出提示（不影響 stdout JSON）
```

### 19. Shell Completion

提供 `completion` 命令生成 shell 自動補全腳本：

```bash
myapp completion bash >> ~/.bashrc
myapp completion zsh  >> ~/.zshrc
myapp completion fish >> ~/.config/fish/completions/myapp.fish
```

---

## 資料安全與可靠性（源自 Dbcli 實戰經驗）

### 20. Safe File Operations

CLI 涉及檔案寫入時，三重保護：

| 機制 | 用途 | 何時需要 |
|------|------|---------|
| 原子寫入 | temp file → rename | 任何設定檔、快取檔 |
| 並發鎖 | 檔案鎖 + 指數 backoff | 多 process 同時操作 |
| 自動備份 | 操作前備份、失敗 rollback | 修改重要資料前 |

### 21. Smart Caching

| 策略 | 適用場景 |
|------|---------|
| Memory LRU | 單次執行內的重複查詢 |
| Disk cache | 跨執行的資料（schema、metadata） |
| Hot/Cold 分層 | 高頻常駐、低頻 on-demand |

快取相關標準 flag：`--refresh`（忽略快取）、`--reset`（清除快取）、`--cache-dir`（自訂目錄）

### 22. i18n Ready

CLI 訊息支援多語系：

- 訊息集中於 `resources/lang/<locale>/` 目錄
- 環境變數切換（`MYAPP_LANG=zh-TW`）
- 結構化錯誤的 `message` 和 `suggestion` 都走 i18n
- `error.code` 不受語系影響，Agent 靠 code 判斷

---

## 原則速查表

| # | 原則 | 一句話 |
|---|------|--------|
| 1 | Machine-First, Human-Friendly | Agent 是主要消費者，人類體驗不犧牲 |
| 2 | Predictable I/O Contract | 相同輸入 → 相同輸出結構，stdout 不混雜訊 |
| 3 | Dual Output Mode | 預設人類格式，`--json` 給 Agent |
| 4 | Structured Error Contract | 錯誤是物件（code + message + suggestion），不是字串 |
| 5 | Composable by Default | 原子命令可組合，workflow 命令是捷徑 |
| 6 | Zero Interactivity in Agent Mode | `--json` 下禁止 prompt，缺參數就報錯 |
| 7 | Consistent Naming | `domain action [target] [flags]` + 標準動詞表 |
| 8 | Global Flags | `--json` / `--quiet` / `--verbose` / `--dry-run` 全域統一 |
| 9 | ok/fail Response | 統一 `{ ok, data/error, meta }` 結構 |
| 10 | Introspectable | `--list` / `describe` / `--export-manifest` 三層探索 |
| 11 | Side-Effect Aware | manifest 標示 sideEffects + idempotent 供 Agent 決策 |
| 12 | Progressive Adoption | 慣例 → manifest → MCP，三階段漸進 |
| 13 | Layered Access Control | 操作權限 + 資源黑名單，兩層正交 |
| 14 | Secrets Decoupling | 設定檔不含明文密碼，$env 參照或分離儲存 |
| 15 | Built-in Skill Generation | CLI 內建 skill 生成/安裝至各 AI 平台 |
| 16 | Intelligent Error Suggestions | 拼字建議 + 操作提示 + 權限引導 |
| 17 | Self-Diagnostic Commands | doctor / status / check 內建維運命令 |
| 18 | Background Version Check | 版本檢查不阻塞主命令，stderr 提示 |
| 19 | Shell Completion | bash / zsh / fish 自動補全腳本生成 |
| 20 | Safe File Operations | 原子寫入 + 並發鎖 + 自動備份 |
| 21 | Smart Caching | LRU + disk cache + --refresh/--reset flag |
| 22 | i18n Ready | 多語系訊息、error.code 語系無關 |

---

## 經驗來源

- 原則 1-12：從 AI Agent 操作需求推導
- 原則 13-22：從 [@carllee1983/dbcli](https://www.npmjs.com/package/@carllee1983/dbcli) v0.5.1-beta 實戰經驗反哺
