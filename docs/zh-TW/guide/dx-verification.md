---
title: DX 驗證流程
description: 使用 workflow demo 驗證 Gravito 的開發者體驗棧。
---

# DX 驗證流程

本頁說明如何透過 workflow demo 與輔助腳本，驗證 Gravito 在 Dev Loop、Doctor、Preset、Golden Path 與相容的 Config Contract 上持續達標。

## 1. 執行 workflow demo 腳本

```bash
cd examples/workflow-demo
bun run workflow-demo.ts
```

腳本涵蓋關鍵檢查點：

- **安裝依賴**：`bun install --frozen-lockfile` 固定依賴版本。
- **建構 CLI**：在 `packages/cli` 內跑 `bun run build`，產生包裝了新 `doctor`/`db:migrate` 行為的 `gravito`。
- **Atlas 遷移**：透過本地 CLI 的 `bun gravito db:migrate --fresh`，重新建立 `users`、`api_tokens`、`products`、`settings` 等表格。新版的 `MigrationDriver`/`AtlasMigrationDriver` 會在沒有 `drizzle.config.ts` 時自動切換到 Atlas。
- **Doctor**：`gravito doctor` 會檢查 `.env`、`PORT`、資料庫連線、遷移狀態、Redis、權限、Node 與 Bun 版本。務必用剛 build 出來、包含這些改動的 CLI（避免全域版本仍要求 `gravito.lock.json`）來執行 doctor。
- **測試**：`bun test` 執行 `tests/http` 中的 Auth 與 Products 測試，確認 Golden Path API 行為正常。

腳本通過即代表 `gravito doctor`、Atlas persistence 與驗證流程仍緊密連動。

## 2. 手動驗證步驟

可將步驟拆開來觀察特定階段：

1. `bun gravito db:migrate --fresh` - 確認遷移可重複執行並清空資料。
2. `bun gravito doctor` - 每次修改 CLI 或 orbit 後都跑一次，檢查 doctor 是否能列出新問題、並且不再卡在缺少 Drizzle metadata。
3. `bun test` (位置在 `examples/workflow-demo`) - 重新跑 Auth + CRUD 測試，確保 HTTP 端點與認證邏輯沒有被破壞。

## 3. 自動化建議

- 鼓勵展示者或 CI job 直接呼叫 `bun run workflow-demo.ts`，腳本會在失敗的 stage 印出步驟名稱，方便快速定位。
- 每當新增 Golden Path 功能，請把對應測試加入 `examples/workflow-demo/tests/http`，讓 `bun test` 持續代表真實流程。
- 若加入或更新遷移，記得同步更新 `src/database/migrations` 並確保 `bun gravito db:migrate --fresh` 能收斂，必要時再調整 Atlas migration driver。

## 推薦參考

- [Better Than Laravel: Five DX Pillars](./dx-pillars.md) - 了解正在驗證的五大方向。
- [Config Contract](./config-contract.md) - Doctor 使用一致的 config/env key 來找出非一致 orb 產生的問題。
