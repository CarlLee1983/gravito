---
title: Golden Path
description: 每個 Gravito preset 都自帶的「黃金路徑」：路由、資料夾、feature slice 與測試。
---

# Golden Path

每個 Gravito Preset 都不是單純 Demo，而是證明整個堆疊可用的「Golden Path」。當你生成專案時，以下內容會自動就緒：

## 1. routes/、app/、database/

- **`routes/`** 包含明確命名的路由檔（`api.ts`、`web.ts`、`ws.ts`），並把請求導向 `app/controllers`。  
- **`app/`** 擺放 service、controller、form request、resource，以及 view adapter。feature slice 統一放在 `app/features/<feature>`。  
- **`database/`** 包含 Atlas migration、seeder 與 domain model，預設會有 `create_users_table.ts`、`profiles`、`settings`。  
- 這些檔案都被 `gravito.config.ts`（或 `gravito.config.mjs`）串接到 orbit、middleware 與路由中。

## 2. Feature Slice：Auth + Profile + Settings

Golden Path 包含的 feature slice：

- **Auth**：整合 Sentinel/Fortify（註冊、登入、登出、重設密碼、Email 驗證），controller + form request 與事件流程已接上。  
- **Profile**：含 GET/PUT 的 `ProfileController`，搭配 DTO 驗證與讀取已驗證使用者的 service。  
- **Settings**：儲存使用者偏好（主題、通知），提供 RESTful CRUD，並透過 Atlas model persist。  

每一層（route → controller → service → persistence）都有實作與範例，方便開發者追蹤請求流。

## 3. 每條路都有測試

Golden Path 要求每個 Preset 包含至少兩種類型的測試：

1. **Auth 測試**：驗證註冊、登入、登出流程，以及 middleware 的存取控制。  
2. **CRUD 測試**：至少一個 resource（通常是 settings 或 profile）的建立/讀取/更新/刪除。  

測試放在 `tests/http` 或 `tests/feature`，使用 Gravito 的 `HttpTester` 模擬請求，在 Bun 原生環境下也能快速執行，保持 Dev Loop 高度回饋。

## 4. 驗收檢查表

Golden Path 要你確認：

- `bun dev` 能夠啟動、watch、typecheck 所有路由與 controller。  
- `bun test` 可以穩定跑通 Auth + CRUD 測試。  
- `bun gravito doctor` 回報健康（env、db、redis、migration、Node/Bun）。  
- 各重要目錄都遵循 [Config Contract](./config-contract.md) 定義，讓 orbit wiring 一致可預期。

想知道每個 Preset 會產生哪些資料夾與檔案，請利用 [預設模板](./presets.md)；需要一致的命名與日誌欄位，請閱讀 [Config Contract](./config-contract.md)。
