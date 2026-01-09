---
title: 除錯與觀測（Spectrum）
description: 使用 Gravito Spectrum 進行請求追蹤、日誌與資料庫查詢觀測。
---

# 除錯與觀測（Spectrum）

Gravito 內建 **Spectrum** 觀測工具。它不是外掛式 APM，而是原生 **Orbit**，能直接掛入框架生命週期，實時攔截請求、日誌與資料庫查詢。

## Spectrum Orbit

在 Gravito 中，基礎設施功能以 Orbit 形式存在。Spectrum（`@gravito/spectrum`）負責 DX 與本地除錯體驗。

### 整合原則

Spectrum 透過三個關鍵點整合：

1. **Middleware 注入**：全域攔截 HTTP request。
2. **Logger 包裝**：包住 `core.logger`，不中斷既有程式碼即可同步記錄。
3. **Atlas Hooks**：偵測 `@gravito/atlas` 時自動掛載 SQL profiling。

## 安裝

```bash
bun add @gravito/spectrum
```

## 標準整合

建議在專案入口（`index.ts` 或 `app.ts`）整合。

### 開發環境啟用（推薦）

```typescript
import { PlanetCore } from '@gravito/core'
import { SpectrumOrbit } from '@gravito/spectrum'

const core = new PlanetCore()

if (process.env.NODE_ENV !== 'production') {
  await core.orbit(new SpectrumOrbit())
}

await core.liftoff()
```

### 生產環境使用（進階）

若要在 production 使用，必須加上安全閘門。

```typescript
import { SpectrumOrbit, FileStorage } from '@gravito/spectrum'

if (process.env.NODE_ENV === 'production') {
  await core.orbit(new SpectrumOrbit({
    storage: new FileStorage({ directory: './storage/spectrum' }),
    gate: async (c) => {
      return c.req.header('x-spectrum-secret') === process.env.SPECTRUM_SECRET
    }
  }))
}
```

## Dashboard 功能

啟動後，Dashboard 路徑：`/gravito/spectrum`。

### 1. Request Timeline
即時查看請求。可重播原始請求以重現問題。

### 2. Database Inspector
檢視 Atlas 產生的 SQL、bindings 與耗時，快速找出 N+1 與效能瓶頸。

### 3. Log Stream
以 request 為上下文串聯 log，知道問題「為什麼」發生。

## 架構

Spectrum 以 **SSE** 推送資料到前端 Dashboard，無需 polling。

資料由可插拔 **Storage Driver** 儲存：
- **MemoryStorage**（預設）：快速、無需設定，重啟即清空。
- **FileStorage**：持久化為 JSONL，適合事後分析。
