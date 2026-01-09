---
title: Flux Enterprise Workflow Plan
description: 用 RabbitMQ 與 Flux 建立企業級消息驅動工作流的實作規劃。
---

# Flux Enterprise Workflow 計劃

## 目標
建一套可在企業環境驗證的 Flux 實作：
- 以 RabbitMQ 當 Broker，將事件透過 queue 推進整個工作流。  
- Flux step 必須支援重試、逾時與錯誤處理，並能記錄 trace。  
- 使用 Docker Compose 啟 RabbitMQ + Gravito app，實際模擬消息進來後的完整 lifecycle。  
- 讓 `flux run` 及 trace sink 原生可觀察每一步（包含失敗與重試），並把此流程納入 DX 驗證腳本。

## 架構概覽

```
Producer (POST /orders) → RabbitMQ → Gravito Consumer → Flux workflow → Trace Sink
                                            ↑
                                        Metrics / Alerts
```

### RabbitMQ Broker
- Compose 啟 `rabbitmq:3-management`，設定 exchange/queue `orders.workflow`.  
- 提供可觀察的管理 UI（username/password 於 .env），讓團隊能看到 pick-up rate、dead-letter 等。

### Gravito Consumer + Flux
- Gravito app 裡註冊 `OrbitFlux`，或直接 `FluxEngine` 透過 DI。  
- consumer 用 `amqplib`（或 Gravito queue orbit）訂閱 queue，將 message body 傳進 `FluxEngine.execute('orderWorkflow', payload)`.  
- workflow 定義例如：`validate-order` → `reserve-stock` → `charge-payment` → `notify`. 每步可配置 `retry`/`timeout`/`error handler`。  
- Step 失敗時可標記 `retryCount`，並將錯誤存入 `FluxTraceSink` 供觀察。

### Trace & Observability
- 使用 `JsonFileTraceSink` 或 `atlas` 表格 `flux_traces` 來保存 step events（status、attempt、duration、error）。  
- 透過 CLI command `flux trace:list --workflow orderWorkflow --status failed` 查重試記錄。  
- 可選擇連接 `FluxConsoleLogger` 進行即時 log。

## 驗證流程

1. `docker compose up` 啟 RabbitMQ + Gravito app。  
2. `bun run examples/flux-enterprise/scripts/publish-order.ts` 發 POST/AMQP 消息，把 payload push 到 `orders.workflow`。  
3. Consumer 取出後，Flux workflow 開始執行；透過 trace sink 確認每個 step 被跑過。  
4. 故意在某 step（例如 `reserve-stock`）設定 `throw new Error` 並配 `retry`，觀察 queue 紀錄、重試次數與 trace log。  
5. `gravito doctor` 檢查 `.env`、RabbitMQ 連線、Flux engine service，確認不存在健康問題。  
6. 提供 `bun test` 以模擬訊息失敗/成功案例，並驗證 trace sink 中有 `completed` / `failed` 事件。

## Deliverables

- `docker-compose.flux.yml`：含 `rabbitmq`、`flux-enterprise` app 服務。  
- `examples/flux-enterprise` example：包含 `consumer.ts`、`workflows/order.ts`、`trace sink`、`flux-enterprise.ts` 驗證腳本。  
- `examples/flux-enterprise/scripts/publish-order.ts`：能用 `bun run` 放入 queue。  
- `docs/flux/enterprise-plan.md`（此文件）+ `examples/flux-enterprise/README.md`：說明啟動、發訊息、觀察 output。  
- `docs/en/guide/flux-workflow.md` / zh-TW 擴充一節：連結此 enterprise demo 並說明如何檢視 trace/重試。

## 成功標準

1. Docker Compose 可在本地啟動 RabbitMQ 與 Gravito，並透過 CLI 發送 payload 觸發 Flux。  
2. 每個 Flux step 的 trace 能在 `JsonFileTraceSink` 或 `flux_traces` 表中被查到，並顯示 retry 次數與錯誤。  
3. `bun run flux-enterprise.ts`（script）會依序跑 install/build/migrate/doctor/tests 流程並報告任何失敗階段。  
4. 文檔註明如何部署、觸發、觀察 trace log 以及如何重試失敗。  
5. 可於 CI/CI pipeline 裡加入此驗證腳本，確保 queue+Flux 整合不回歸。
