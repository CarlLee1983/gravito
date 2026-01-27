---
title: Pulse CLI
description: 了解如何使用 Gravito 的命令列工具 Pulse。
---

# Pulse CLI

> `gravito`（或 `pulse`）是 Gravito 內建的交互式命令行工具，靈感來自 Laravel Artisan。它是開發、管理與部署 Gravito 應用程式的核心工具。

## 全域選項

| 選項 | 描述 |
| :--- | :--- |
| `--help`, `-h` | 顯示該指令的幫助訊息。 |
| `--version`, `-v` | 顯示當前 CLI 版本。 |

## 常見指令

### 專案管理

```bash
# 建立新專案
gravito create my-app

# 顯示所有註冊路由
gravito route:list

# 進入互動式 REPL
gravito tinker

# 診斷配置與環境問題
gravito doctor
```

### 程式碼生成 (Make)

```bash
# 建立控制器
gravito make:controller UserController

# 建立中間件
gravito make:middleware AuthGuard

# 建立 UseCase (需要 @gravito/enterprise)
gravito make:use-case CreateUser

# 建立 Job (需要 @gravito/stream)
gravito make:job ProcessPayment
```

### 系統維護

```bash
# 執行資料庫遷移 (需要 @gravito/atlas)
gravito migrate
gravito migrate:status

# 執行任務排程 (需要 @gravito/horizon)
gravito schedule:run
```

## 自定義指令

您可以透過簡單的類別定義自己的 CLI 指令。

```typescript
import { Command } from '@gravito/pulse'

export default class WelcomeCommand extends Command {
  static signature = 'greet {name}'
  static description = '向使用者打招呼'

  async handle() {
    const name = this.argument('name')
    this.info(`你好, ${name}!`)
  }
}
```

隨後在 `gravito.config.ts` 中註冊此指令即可使用。

---

## 下一步
查看 [部署指南](./deployment.md) 將您的應用程式推上雲端。
