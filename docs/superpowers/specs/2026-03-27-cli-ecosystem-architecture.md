# CLI 生態系架構構想

> 三層 CLI 框架 + AI Agent Skill 生成流程 — 純設計文件，不在本專案實作

## 願景

開發一套可複用的 CLI 框架，讓未來任何應用都能快速產出 platform CLI，搭配 AI Skill 讓 Agent 透過自然語言操作。

```
使用者口語需求 → AI Agent + Skill → CLI 命令 → 平台/工具操作
```

## 兩大 CLI 類型

| 類型 | 用途 | 資料來源 | 認證 | 範例 |
|------|------|---------|------|------|
| **SaaS CLI** | 操作遠端平台服務 | 遠端 API | OAuth / API Key | `myapp users list`、`myapp deploy` |
| **Tool CLI** | 本地工具、開發輔助、自動化 | 本地檔案系統 / stdin | 不需要 | codegen、轉換、分析、批次處理 |

兩者可能交叉（如 `vercel` 既 build 本地也 deploy 遠端），框架層支援但不強制混用。

---

## 三層架構

```
@gravito/cli-kit                    ← 核心基礎設施
│  命令定義（defineCommand）
│  ok/fail 結構化回傳
│  輸出格式（JSON / human dual mode）
│  錯誤處理（結構化錯誤物件）
│  Command Manifest + Introspection
│  測試工具
│
├── @gravito/platform-cli           ← SaaS CLI 框架層
│     認證 adapter（OAuth 瀏覽器流 + API Key）
│     API 通訊（已帶 auth 的 HTTP client）
│     Session / credentials 管理（~/.config/<app>/）
│     Remote resource CRUD 慣例
│
├── @gravito/tool-cli               ← Tool CLI 框架層
│     檔案系統操作輔助
│     stdin/stdout 串流處理
│     進度回報（stderr、人類模式）
│     本地 config / cache 管理
│
└── （可選）混合模式
      同一個 CLI 同時使用 platform + tool 能力
```

### 層級職責對比

| 面向 | cli-kit | platform-cli | tool-cli |
|------|---------|-------------|----------|
| 角色 | 共用核心 | SaaS 擴充 | 本地工具擴充 |
| 注入 handler | `args`, `flags` | + `api`（HTTP client） | + `fs`, `stdin`, `cwd` |
| 離線使用 | N/A | 不行 | 可以 |
| 認證 | 無 | OAuth + API Key | 無（或本地 config） |

---

## 認證設計（platform-cli）

支援兩種認證模式：

### OAuth 瀏覽器流

```bash
myapp auth login
# → 開啟瀏覽器授權頁
# → 本地起 callback server 接收 token
# → 存入 ~/.config/myapp/credentials.json
```

### API Key 模式

```bash
myapp auth login --with-token
# → 提示貼上 API Key
# → 驗證 key 有效性
# → 存入 credentials
```

### 共用認證命令

```bash
myapp auth login          # 登入（預設 OAuth）
myapp auth login --with-token  # API Key 登入
myapp auth logout         # 登出、清除 credentials
myapp auth status --json  # 查詢認證狀態
# → { "ok": true, "data": { "user": "carl", "method": "oauth", "expires": "..." } }
```

---

## 概念 API 範例

> 以下為概念範例，說明 API 設計方向，非實際程式碼

### SaaS CLI

```typescript
import { createPlatformCLI } from '@gravito/platform-cli'
import { defineCommand, ok } from '@gravito/cli-kit'

const listUsers = defineCommand({
  name: 'users.list',
  description: '列出所有使用者',
  category: 'users',
  sideEffects: false,
  idempotent: true,
  flags: [
    { name: 'role', type: 'string', description: '依角色篩選' }
  ],
  async handler({ flags, api }) {
    const users = await api.get('/users', { role: flags.role })
    return ok(users)
  }
})

createPlatformCLI({
  name: 'myapp',
  version: '1.0.0',
  auth: {
    oauth: { clientId: '...', scopes: ['read', 'write'] },
    apiKey: { header: 'X-API-Key' }
  },
  api: { baseUrl: 'https://api.myapp.com' },
  commands: [listUsers]
})
```

### Tool CLI

```typescript
import { createToolCLI } from '@gravito/tool-cli'
import { defineCommand, ok } from '@gravito/cli-kit'

const convert = defineCommand({
  name: 'convert',
  description: '轉換檔案格式',
  category: 'transform',
  sideEffects: true,
  idempotent: true,
  args: [
    { name: 'input', description: '輸入檔案路徑', required: true }
  ],
  flags: [
    { name: 'from', type: 'string', required: true },
    { name: 'to', type: 'string', required: true },
    { name: 'output', alias: 'o', type: 'string' }
  ],
  async handler({ args, flags, fs }) {
    const content = await fs.read(args.input)
    const result = transform(content, flags.from, flags.to)
    if (flags.output) {
      await fs.write(flags.output, result)
      return ok({ output: flags.output, size: result.length })
    }
    return ok(result, { raw: true })
  }
})

createToolCLI({
  name: 'mytool',
  version: '1.0.0',
  commands: [convert]
})
```

### 混合模式

```typescript
import { createCLI } from '@gravito/cli-kit'
import { withPlatform } from '@gravito/platform-cli'
import { withTools } from '@gravito/tool-cli'

createCLI({
  name: 'myapp',
  version: '1.0.0',
  plugins: [
    withPlatform({ auth: { ... }, api: { ... } }),
    withTools()
  ],
  commands: [buildLocal, deployRemote]
})
```

---

## AI Agent 整合流程

```
Step 1: 開發 CLI
  └─ 用 cli-kit + platform-cli 或 tool-cli 定義命令
  └─ 遵守設計原則（見 ai-agent-cli-design-principles.md）

Step 2: 匯出 Manifest
  └─ myapp --export-manifest --json
  └─ 輸出所有命令的結構化描述

Step 3: 生成 Skill
  └─ 用 skill-creator 讀取 manifest
  └─ 產出 AI skill 檔案
  └─ 包含：命令總覽、認證流程、常見 workflow、錯誤處理

Step 4: Agent 操作
  └─ 使用者：「幫我把 role 是 admin 的使用者列出來」
  └─ Agent 讀取 skill → 執行 myapp users list --role=admin --json
  └─ 解析 { ok, data, meta } 回傳結果
```

---

## 建議開發順序

| 順序 | 套件 | 原因 |
|------|------|------|
| 1 | `@gravito/cli-kit` | 核心基礎，兩種 CLI 都依賴 |
| 2 | `@gravito/tool-cli` | 較簡單，無認證，可快速驗證 cli-kit 設計 |
| 3 | `@gravito/platform-cli` | 加入認證與 API 通訊，複雜度較高 |
| 4 | Manifest → Skill 生成流程 | 串接 AI Agent 生態，完成端到端體驗 |

---

## 相關文件

- [AI Agent-Friendly CLI Design Principles](2026-03-27-ai-agent-cli-design-principles.md) — 22 條設計原則（12 條核心 + 10 條 Dbcli 實戰經驗）

## 經驗驗證

`@carllee1983/dbcli` v0.5.1-beta 已實踐本架構中多項設計，驗證了以下模式的可行性：
- Tool CLI 模式（本地資料庫操作）
- 多格式輸出（table / json / csv）
- AI Skill 安裝（`skill install claude|gemini|cursor`）
- 兩層正交安全模型（permission + blacklist）
- $env 參照語法（secrets 解耦）
- 原子寫入 + 並發鎖 + 錯誤復原
- 背景版本檢查
- i18n 多語系
