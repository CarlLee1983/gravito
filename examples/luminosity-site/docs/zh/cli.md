---
title: CLI 命令列工具
order: 4
---

# CLI 命令列工具

Luminosity 提供強大的命令列介面 (CLI)，讓您管理 Sitemap、檢查索引狀態，並在 CI/CD 流程中自動化任務。

## 使用方式

如果在專案中本地安裝：

```bash
bun x lux <指令> [選項]
```

或者在 `package.json` 中加入腳本別名：

```json
{
  "scripts": {
    "lux:gen": "lux generate",
    "lux:stats": "lux stats"
  }
}
```

## 指令列表

### `generate`

透過 CLI 手動觸發 Sitemap 產生過程。這對於 Cron Jobs 或建置掛鉤 (Build Hooks) 非常有用。

```bash
bun x lux generate [options]
```

**選項:**
- `-c, --config <path>`: 設定檔路徑 (預設: `luminosity.config.ts`)
- `--dry-run`: 模擬產生而不寫入檔案。

### `stats`

檢查 Sitemap 索引的當前狀態。檢視 URL 總數、檔案大小及碎片化細節。

```bash
bun x lux stats
```

**輸出範例:**
```text
┌  Luminosity Status
│  總 URL 數:   1,240,592
│  索引大小:    45.2 MB
│  片段數:      12
└  狀態: 就緒
```

### `warm`

強制執行快取預熱或壓縮程序。建議在重大流量事件前或大量資料寫入後執行。

```bash
bun x lux warm
```

### `init`

在當前目錄下建立一個新的 Luminosity 設定檔模板。

```bash
bun x lux init
```

## CI/CD 整合

Luminosity CLI 設計為遵循標準結束碼 (成功為 0，錯誤為 1)，非常適合 CI 管線。

**範例: GitHub Actions**

```yaml
steps:
  - uses: actions/checkout@v4
  - name: 安裝依賴
    run: bun install
  - name: 產生 Sitemaps
    run: bun x lux generate
  - name: 部署
    run: ./deploy.sh
```
