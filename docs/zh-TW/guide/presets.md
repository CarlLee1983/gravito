---
title: 預設模板
description: Gravito 的四種官方 Preset（minimal、app、realtime、worker），每種都是可直接投入的 Golden Path。
---

# 預設模板

Gravito 不讓你在一堆套件中選擇，而是提供四種親測可用的 Preset，每個都含同一套 Golden Path（路由、App、資料庫、Auth/Profile/Settings、測試）。選定 Preset 就是選定一條已驗證的起跑線，剩下的事情是專注業務。

| Preset | 適用場景 | 主要 Orbits/模組 | 成品交付 |
|--------|----------|------------------|-----------|
| `minimal` | 單向 API / Edge / Micro | Gravito Core + Atlas + Spectrum（可選） | 單一 `routes/api.ts` + `controllers/api/*` + `tests/http/api.test.ts`，沒有前端，專注在 `bun dev`/`bun test` 循環。 |
| `app` | 傳統 Web / Inertia App | Gravito Core + Atlas + Ion + Prism + Inertia Bridge | 完整 MVC：`routes/web.ts`、`views/`、Inertia React/Vue entry、`app/services`，並內建 Auth/Profile/Settings feature slice（含 UI + controllers）。 |
| `realtime` | WebSocket 廣播與 Echo 體驗 | `@gravito/ripple` + `@gravito/echo` + Atlas + Spectrum | `routes/ws.ts` + `handlers/broadcast.ts` + Presence/Private channel + Auth + `tests/websocket` 連線與事件驗證。 |
| `worker` | 佇列與 background job | `@gravito/stream` + Stasis/Redis + Atlas + Monitor | `src/workers/**` entry + `jobs/` + `Stream Job` + `Queue` + Graceful Shutdown，附 `tests/jobs` 驗證 retry/failure。 |

每個 Preset 還會提供：

- `routes/`、`app/`、`database/` 的 Golden Path 結構與 Auth/Profile/Settings feature slice。  
- 至少 2 條測試：一條覆蓋 Auth、另一條覆蓋 CRUD。  
- 遵循統一 Config Contract 的 `gravito.config.ts`/環境配置。  
- 保證 Dev Loop 冷啟動 < 1.5s、即時重載所有變更、`bun dev` + `bun test` 腳本可運作。

若你要針對每個 Preset 觀察路由與測試的 Golden Path，可接著讀 [Golden Path 指南](./golden-path.md)，想確保設定與日誌欄位一致則看 [Config Contract](./config-contract.md)。
