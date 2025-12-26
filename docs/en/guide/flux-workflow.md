---
title: Flux Workflow
description: State-machine workflow engine with retries and storage adapters.
---

# Flux Workflow

Flux is a platform-agnostic workflow engine that models business processes as explicit state machines. It supports retries, timeouts, and storage adapters.

## When to use Flux

Use Flux for multi-step processes that need visibility, retries, and clean separation between steps.

## Installation

```bash
bun add @gravito/flux
```

## Quick Start

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

## Core Concepts

- Steps are ordered and can read/write shared context data.
- Commits represent terminal actions that should be durable.
- Storage adapters let you persist workflow state.

## Next Steps

- Offload heavy work via [Queues](./queues.md)
- Schedule recurring flows with [Horizon](./horizon.md)
