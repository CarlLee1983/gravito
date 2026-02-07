---
title: Launchpad Architecture 技術架構規格書
version: 1.3.1
status: Stable
tier: B
last_updated: 2026-02-07
---

# Launchpad Architecture 技術架構規格書

## 模組概覽

**Launchpad** (`@gravito/launchpad`) 是專為 Bun Runtime 設計的容器編排與部署系統。它透過「火箭池」(Rocket Pool) 機制實現零停機、毫秒級的應用部署。

### 核心職責
- **Rocket Pool**: 預熱容器池，消除冷啟動時間。
- **Payload Injection**: 直接注入程式碼，無需重建鏡像。
- **Zero-Downtime**: 綠藍部署與流量無縫切換。
- **GitHub Integration**: 自動化 PR 預覽環境。
- **Queue System**: 流量與任務排隊機制，防止資源耗盡。

## 快速開始

### 1. 安裝
```bash
bun add @gravito/launchpad
```

### 2. 啟動 Launchpad Server
```typescript
import { bootstrapLaunchpad } from '@gravito/launchpad'
import { getRuntimeAdapter } from '@gravito/core'

const config = await bootstrapLaunchpad()
const runtime = getRuntimeAdapter()

// 啟動 HTTP/WebSocket 服務
runtime.serve(config)
```

### 3. 使用 API 部署任務
```bash
curl -X POST http://localhost:4000/launch \
  -H "Content-Type: application/json" \
  -H "x-github-event: pull_request" \
  -d '{"action": "opened", "pull_request": { ... }}'
```

---

## 架構設計

### 1. 核心哲學：Instant Deployment for Bun

Launchpad 的設計核心是追求極致的部署速度。
- **Rocket Pool**: 獨創的「預熱容器池」概念，預先啟動閒置的 Bun 容器 (Rockets)，消除 Cold Start 時間。
- **Payload Injection**: 透過 `docker cp` 直接將程式碼注入已運行的容器，實現毫秒級部署。
- **Clean Architecture**: 嚴格遵循 DDD (Domain-Driven Design) 分層架構，確保核心邏輯與基礎設施 (Docker/Git) 解耦。

### 2. 模組組件分析

### 2.1 Domain Layer (Core Logic)
- **Rocket (Aggregate Root)**: 代表一個容器實例。維護狀態機 (`IDLE` -> `PREPARING` -> `ORBITING` -> `REFURBISHING`)。
- **Mission**: 代表一次部署任務 (Repo, Branch, Commit)。
- **Events**: `MissionAssigned`, `RocketIgnited`, `RocketSplashedDown`。

### 2.2 Application Layer (Orchestration)
- **MissionControl**: 部署流程的總指揮。協調 Pool, Injector, Queue 與 Router。
- **PoolManager**: 負責維護 Rocket Pool 的水位。當有火箭升空時，自動補充新火箭；當任務結束時，回收並翻新火箭。
- **MissionQueue** (new in v1.3): 負責處理並發部署請求。當 Pool 耗盡時，將任務列入等待隊列，支援超時機制與背壓 (Backpressure) 控制。
- **PayloadInjector**: 負責執行 `git clone` 並將代碼注入容器，處理依賴安裝 (`bun install`)。
- **RefurbishUnit**: 負責清理已使用過的容器，使其恢復出廠設定 (Factory Reset)。

### 2.3 Infrastructure Layer (Adapters)
- **DockerAdapter**: 封裝 Docker CLI 指令 (`run`, `exec`, `cp`, `port`)。
- **BunProxyAdapter**: 高效能的反向代理 (Reverse Proxy)，將流量路由到具體的 Rocket 容器端口。
- **CachedRocketRepository**: 使用 `@gravito/stasis` 持久化 Rocket 狀態。
- **InMemoryRocketRepository**: 用於測試或非持久化環境的 Rocket 狀態存儲。

### 2.4 進階配置 (Configuration)
`PoolManager` 支援細粒度的配置，以適應不同的負載需求。

```typescript
// launchpad.config.ts
export const poolConfig = {
  // 硬限制：最多同時運行 20 個容器
  maxRockets: 20,
  // 預熱：啟動時預先準備 5 個閒置容器
  warmupCount: 5,
  // 隊列策略：當池滿時，任務進入隊列（最多 50 個）
  exhaustionStrategy: 'queue',
  maxQueueSize: 50,
  // 超時：隊列等待超過 30 秒則放棄
  queueTimeoutMs: 30000
}
```

---

## 技術規格與設計決策

### 3.1 火箭池架構 (Rocket Pool)
為了達到「秒級部署」，Launchpad 不在部署時建立容器。
- **預熱**: 系統啟動時，預先建立 `POOL_SIZE` (預設 3) 個閒置容器。
- **指派**: 當新的 Pull Request 開啟，直接從池中抓取一個 `IDLE` 狀態的 Rocket。
- **注入**: 將代碼複製進去，執行 `bun install` 與 `bun run`。
- **回收**: PR 關閉後，Rocket 進入 `REFURBISHING` 狀態，清空 `/app` 目錄，重置為 `IDLE`。

### 3.2 網路路由 (Dynamic Routing)
Launchpad 內建了一個基於 Bun 的 HTTP Proxy。
- **域名**: `pr-123.dev.local` -> Rocket A (Port 32768)。
- **機制**: `DockerAdapter` 查詢容器的隨機映射端口 (Ephemeral Port)，並動態註冊到 Router 表中。
- **優點**: 避免端口衝突，且無需配置 Nginx。
- **整合**: 透過 `@gravito/core` 的 `RuntimeAdapter` 與 `BunProxyAdapter` 整合。

### 3.3 GitHub 整合
`LaunchpadOrbit` 監聽 GitHub Webhooks。
- **事件**: `pull_request.opened`, `pull_request.synchronize` (觸發部署), `pull_request.closed` (觸發回收)。
- **反饋**: 自動在 PR 留言部署網址與預覽連結。

---

## API 參考

### MissionControl
- `launch(mission: Mission, onTelemetry): Promise<string>`
- `terminate(missionId: string): Promise<void>`

### PoolManager
- `warmup(count?: number): Promise<void>`
- `getPoolStatus(): Promise<PoolStats>`
- `assignMission(mission: Mission): Promise<Rocket>`
- `recycle(missionId: string): Promise<void>`

### MissionQueue
- `enqueue(mission: Mission): Promise<Rocket>`
- `getStats(): QueueStats`
- `clear(reason: string): void`

### Rocket
- `status: RocketStatus` (getter)
- `currentMission: Mission | null` (getter)
- `containerId: string` (getter)
- `assignMission(mission: Mission): void`
- `ignite(): void`
- `splashDown(): void`

---

## 風險分析與效能評估

### 4.1 依賴安裝時間
雖然容器是預熱的，但 `bun install` 仍需時間。
- **優化**: 使用 `bunfig.toml` 配置本地 Registry 鏡像。
- **快取**: 將宿主機的 `~/.bun/install/cache` 掛載到容器內，大幅加速依賴解析。

```toml
# bunfig.toml (Injected into container)
[install]
# 使用本地快取加速
cache = true

# 設定私有或鏡像 Registry
[install.scopes]
"@gravito" = "http://registry.local:4873"
```

### 4.2 容器髒污 (Container Contamination)
翻新機制 (Refurbish) 若不徹底，可能導致下一個任務受到上一個任務的殘留檔案影響。
- **策略**: 若容器狀態異常，直接銷毀並建立新的，而非勉強翻新。

### 4.3 資源限制
每個 Rocket 都是一個獨立容器，若並發 PR 過多，可能耗盡宿主機記憶體。
- **解決方案 (v1.3)**: 引入 `MissionQueue`，當 `Active Rockets` 達到 `POOL_SIZE + BURST_LIMIT` 時，新任務會進入 FIFO 隊列等待，避免系統崩潰。

---

## 後續優化建議

### 短期 (v1.4)
1. **Log Streaming**: 將容器日誌透過 WebSocket (`@gravito/ripple`) 即時推送到 Dashboard。
2. **Health Check**: 在切換流量前，先對 Rocket 執行 `/health` 檢查。

### 中期 (v1.5)
1. **Multi-Node**: 支援跨多台伺服器的 Rocket Pool (需引入 Service Discovery)。
2. **Custom Dockerfile**: 允許專案提供自定義 `Dockerfile`，而非強制使用通用 Base Image (會犧牲部署速度，但增加靈活性)。

---
*Created by Gravito Architect.*
