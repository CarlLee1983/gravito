---
title: Core 核心
description: Gravito 框架的微核心 (Micro-kernel) 架構。
---

# Core 核心 (PlanetCore)

`@gravito/core` 是 Gravito 生態系統的心臟。它實現了一種微核心架構，透過 **Kinetic Modules**（基礎設施）與 **Satellites**（功能外掛）來擴展框架能力。

## PlanetCore

`PlanetCore` 是協調應用程式生命週期的主要類別。

```typescript
import { PlanetCore } from '@gravito/core'

const core = new PlanetCore()
```

### 生命週期方法

- **`boot()`**：初始化所有已註冊的 Kinetic Modules 並準備服務容器 (Service Container)。
- **`liftoff(options)`**：啟動底層 HTTP 引擎（適配器）。
- **`orbit(ModuleClass)`**：以程式化方式註冊基礎設施模組。
- **`use(SatelliteClass)`**：以程式化方式註冊功能外掛模組。

## 適配器 (Adapters)

Gravito 搭載了高效能的 **Gravito Core 引擎**，原生支援 Bun 與 Deno 等現代化執行環境。

```typescript
import { GravitoAdapter } from '@gravito/core'

core.liftoff({
  adapter: new GravitoAdapter(),
  port: 3000
})
```

## 建構 Kinetic Modules

Kinetic Module 是一個將特定基礎設施服務整合到核心中的類別。

```typescript
export class MyKineticModule {
  async register(core: PlanetCore) {
    // 將服務註冊到容器中
    core.container.singleton('myService', () => new MyService())
  }

  async boot(core: PlanetCore) {
    // 執行初始化邏輯
  }
}
```

## 建構 Satellites

Satellites 是輕量級的功能模組，用於消費 Kinetic Modules 提供的服務。

```typescript
export default function MyExtension(core: PlanetCore) {
  const router = core.container.make('router')

  router.get('/hello', (c) => c.text('Hello from Satellite!'))
}
```
