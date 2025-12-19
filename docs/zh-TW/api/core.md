---
title: Core 核心
description: Gravito 框架的微核心 (Micro-kernel) 架構。
---

# ☄️ Core 核心 (PlanetCore)

`@gravito/core` 是 Gravito 生態系統的心臟。它實現了一種微核心架構，功過 **Orbits**（基礎設施）與 **Satellites**（功能插件）來擴展框架能力。

## 🪐 PlanetCore

`PlanetCore` 是協調應用程式生命週期的主要類別。

```typescript
import { PlanetCore } from '@gravito/core'

const core = new PlanetCore()
```

### 生命週期方法

- **`boot()`**：初始化所有已註冊的 Orbits 並準備服務容器 (Service Container)。
- **`liftoff(options)`**：啟動底層 HTTP 引擎（適配器）。
- **`orbit(OrbitClass)`**：以程式化方式註冊基礎設施模組。
- **`use(SatelliteClass)`**：以程式化方式註冊功能插件模組。

## 🛠️ 適配器 (Adapters)

Gravito 的設計目標是與引擎無關。目前，它為 **Hono** 提供了一等公民級別的支援。

```typescript
import { HonoAdapter } from '@gravito/adapter-hono'

core.liftoff({
  adapter: new HonoAdapter(),
  port: 3000
})
```

## 🏗️ 建構 Orbits

Orbit 是一個將特定基礎設施服務整合到核心中的類別。

```typescript
export class MyOrbit {
  async register(core: PlanetCore) {
    // 將服務註冊到容器中
    core.container.singleton('myService', () => new MyService())
  }

  async boot(core: PlanetCore) {
    // 執行初始化邏輯
  }
}
```

## 🛰️ 建構 Satellites

Satellites 是輕量級的功能模組，用於消費 Orbits 提供的服務。

```typescript
export default function MyExtension(core: PlanetCore) {
  const router = core.container.make('router')
  
  router.get('/hello', (c) => c.text('Hello from Satellite!'))
}
```
