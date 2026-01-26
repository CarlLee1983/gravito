# @gravito/launchpad (繁體中文)

> 🚀 Bun 專用的即時部署系統。容器生命週期管理與零停機部署。

**Gravito Launchpad** 是專為 Bun 執行環境設計的協調系統。它採用獨特的「火箭池 (Rocket Pool)」架構來預熱容器，透過將程式碼直接注入已運行的實例而非重新構建映像檔，實現亞秒級 (sub-second) 的快速部署。

## ✨ 核心特性

- **🔥 火箭池 (Rocket Pool)**：預熱容器池，消除冷啟動時間。
- **💉 載荷注入 (Payload Injection)**：跳過 `docker build`。透過 `docker cp` 在毫秒內完成程式碼注入。
- **🏗️ DDD 架構**：基於 `@gravito/enterprise` 構建，具備嚴謹的狀態機管理。
- **♻️ 自動回收**：任務完成後，容器會自動翻新並返回池中供後續使用。
- **🤖 GitHub 整合**：內建 Webhook 處理程序，支持 PR 預覽部署與自動化評論。
- **🛡️ 安全隔離**：每個部署都在隔離的容器環境中運行。
- **📡 即時遙測**：整合 `@gravito/ripple`，透過 WebSockets 提供部署進度的即時更新。
- **🕸️ 動態代理**：利用 Bun 原生 HTTP 能力，為活動部署提供高性能路由。

## 🏗️ 架構概覽

Launchpad 遵循 **整潔架構 (Clean Architecture)** 原則，並作為一個 **Gravito Orbit** 實作：

### 領域層 (Domain Layer - `src/Domain`)
- **Rocket (火箭)**：代表容器實例及其生命週期狀態的聚合根 (Aggregate Root)。
- **Mission (任務)**：代表部署任務（儲存庫 URL、Commit SHA、分支）。
- **Status Machine (狀態機)**：嚴格管理狀態轉換 (`Idle` -> `Assigned` -> `Deployed` -> `Recycling`)。
- **Events (事件)**：用於追蹤生命週期變化的領域事件。

### 應用層 (Application Layer - `src/Application`)
- **PoolManager (池管理器)**：協調火箭的生命週期（預熱、分配、回收）。
- **MissionControl (任務控制中心)**：啟動任務並協調注入的高層外觀 (Facade)。
- **PayloadInjector (載荷注入器)**：處理 Git 操作及將程式碼物理注入容器。
- **RefurbishUnit (翻新單元)**：清理並重置已使用的容器以返回池中。

### 基礎設施層 (Infrastructure Layer - `src/Infrastructure`)
- **DockerAdapter**：與 Docker 守護進程的低階通訊。
- **ShellGitAdapter**：透過 Shell 指令進行 Git 操作。
- **OctokitGitHubAdapter**：與 GitHub API 互動以更新狀態及發佈 PR 評論。
- **CachedRocketRepository**：使用 `@gravito/stasis` 持久化火箭狀態。
- **BunProxyAdapter**：為活動容器提供亞毫秒級開銷的反向代理。

## 🚀 快速上手

### 安裝

```bash
bun add @gravito/launchpad
```

### 基本用法 (作為 Orbit)

在 Gravito 應用中使用 Launchpad 的最常見方式：

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitCache } from '@gravito/stasis'
import { OrbitRipple } from '@gravito/ripple'
import { LaunchpadOrbit } from '@gravito/launchpad'

const ripple = new OrbitRipple({ path: '/ws' })

const core = await PlanetCore.boot({
  orbits: [
    new OrbitCache(), 
    ripple, 
    new LaunchpadOrbit(ripple)
  ],
})

await core.bootstrap()
```

### 手動啟動任務

```typescript
import { MissionControl, Mission } from '@gravito/launchpad'

// 假設容器已透過 Gravito Core 提供
const ctrl = container.make<MissionControl>('launchpad.ctrl')

const mission = Mission.create({
  id: 'mission-123',
  repoUrl: 'https://github.com/example/repo.git',
  branch: 'main'
})

const rocketId = await ctrl.launch(mission, (type, data) => {
  console.log(`[遙測] ${type}:`, data)
})
```

## ⚙️ 配置

Launchpad 依賴於運作正常的 Docker 環境。

| 環境變數 | 說明 | 預設值 |
|----------------------|-------------|---------|
| `GITHUB_TOKEN` | GitHub API 存取權杖 | (PR 評論必填) |
| `GITHUB_WEBHOOK_SECRET` | 驗證 Webhook 的密鑰 | (選填) |
| `POOL_SIZE` | 預熱容器的目標數量 | `3` |
| `CACHE_DRIVER` | 火箭狀態的儲存驅動 | `file` |

## 🧪 測試

```bash
bun test
```

## 📄 授權

MIT © Gravito Framework
