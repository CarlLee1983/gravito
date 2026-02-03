---
title: 除錯儀表板 (Spectrum)
description: 即時監控 Gravito 應用程式的請求、日誌與資料庫查詢。
---

# 除錯儀表板 (Spectrum)

> **Spectrum** 是 Gravito 的即時觀測儀表板。它為你的應用程式提供了一個「望遠鏡」視角，無需配置任何外部 APM 工具即可掌握系統內部的運作狀況。

## 快速安裝

將 Spectrum 新增至專案中最快的方式是使用 Gravito CLI：

```bash
gravito add:spectrum
```

這個指令會自動執行：
1. 安裝 `@gravito/spectrum` 套件。
2. 在你的 `gravito.config.ts` 或主入口檔案中註冊 `SpectrumOrbit`。
3. 配置預設的儲存機制。

## 主要功能

### ⚡️ 即時數據串流
Spectrum 使用 **Server-Sent Events (SSE)** 將數據推送到儀表板。你不需要重新整理頁面就能看到新的請求或日誌——它們會在發生的瞬間立即顯示。

### 🌐 HTTP 請求檢查
擷取所有進入應用的 HTTP 流量。你可以檢查：
- 請求標頭 (Headers)、查詢參數 (Query) 和主體 (Body)。
- 回應狀態碼與標頭。
- 總執行時間（延遲）。
- **請求重放 (Request Replay)**：按一下即可重新執行擷取到的請求，方便除錯邏輯或重現錯誤。

### 🗄️ 資料庫分析器
Spectrum 會自動與 `@gravito/atlas` 連動，擷取請求期間執行的每一筆 SQL 查詢。
- 查看原始 SQL 及其參數綁定。
- 追蹤查詢效能以識別瓶頸。
- 關聯性：每一筆查詢都會連結到觸發它的特定 HTTP 請求。

### 📜 整合式日誌
你的應用程式日誌會直接串流到儀表板。Spectrum 會將日誌與 HTTP 請求進行關聯，因此你可以清楚看到在特定使用者操作期間產生了哪些日誌。

---

## 手動設定

如果你偏好手動設定 Spectrum，請在應用程式入口處註冊 `SpectrumOrbit`：

```typescript
import { PlanetCore } from 'gravito-core'
import { SpectrumOrbit } from '@gravito/spectrum'

const core = new PlanetCore()

// 建議僅在開發環境啟用
if (process.env.NODE_ENV !== 'production') {
  await core.orbit(new SpectrumOrbit({
    path: '/gravito/spectrum' // 選填：自定義路徑
  }))
}

await core.liftoff()
```

---

## 配置選項

你可以透過 `SpectrumOrbit` 的建構函式來自定義 Spectrum：

| 選項 | 型別 | 預設值 | 描述 |
| :--- | :--- | :--- | :--- |
| `path` | `string` | `/gravito/spectrum` | 儀表板的 URL 路徑。 |
| `storage` | `SpectrumStorage` | `MemoryStorage` | 擷取數據的儲存位置。 |
| `gate` | `Function` | `() => true` | 儀表板的存取授權邏輯。 |
| `sampleRate` | `number` | `1.0` | 擷取請求的百分比 (0.0 到 1.0)。 |

### 儲存策略 (Storage)

- **MemoryStorage**: 零配置，儲存在記憶體中。當伺服器重啟時數據會消失。適合本機開發。
- **FileStorage**: 將數據持久化至 JSONL 檔案。適合用於分析導致伺服器重啟的崩潰問題。

```typescript
import { SpectrumOrbit, FileStorage } from '@gravito/spectrum'

new SpectrumOrbit({
  storage: new FileStorage({ directory: './storage/spectrum' })
})
```

### 安全權限 (Gates)

透過定義 `gate` 來保護你的除錯數據。如果你在共享環境啟用 Spectrum，這點至關重要。

```typescript
new SpectrumOrbit({
  gate: async (context) => {
    const user = context.get('user')
    return user?.isAdmin === true
  }
})
```

---

## 生產環境安全性

**注意：** Spectrum 會擷取敏感數據（包括請求標頭和主體）。如果在生產環境中使用：
1. **務必** 實作 `gate` 進行權限控管。
2. **切勿** 以明文記錄密碼或信用卡號等敏感資訊。
3. **使用取樣率**: 設定 `sampleRate: 0.1` (10%) 以減少效能損耗和磁碟佔用。

---

## 下一步
參閱 [日誌指南](./logging.md) 了解如何強化你的日誌數據以配合 Spectrum 使用。
