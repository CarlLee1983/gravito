---
title: Flux 工作流程
description: 具備重試與儲存介面的狀態機工作流程引擎。
---

# Flux 工作流程

Flux 是平台無關的工作流程引擎，將商業流程建模為明確的狀態機，並支援重試、逾時與儲存介面。

## 適用情境

適合需要多步驟處理、可觀測性與可重試能力的流程。

## 安裝

```bash
bun add @gravito/flux
```

## 快速開始

```ts
import { FluxEngine, createWorkflow } from '@gravito/flux'

const onboarding = createWorkflow('onboarding')
  .input<{ userId: string }>()
  .step('load-user', async (ctx) => {
    ctx.data.user = await users.find(ctx.input.userId)
  })
  .commit('send-email', async (ctx) => {
    await mail.sendWelcome(ctx.data.user)
  })

const engine = new FluxEngine()
await engine.execute(onboarding, { userId: 'u_123' })
```

## 核心概念

- Steps 可讀寫共用狀態資料。
- Commit 表示需要確保落地的關鍵操作。
- 儲存介面可保存流程狀態。

## 下一步

- 使用 [佇列](./queues.md) 分流重任務
- 透過 [Horizon](./horizon.md) 排程週期性流程
