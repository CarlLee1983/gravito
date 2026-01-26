# @gravito/launchpad

> 🚀 Instant Deployment System for Bun. Container lifecycle management and zero-downtime deployment.

**Gravito Launchpad** is a specialized orchestration system built for the Bun runtime. It uses a unique "Rocket Pool" architecture to pre-warm containers, enabling sub-second deployments by injecting code into already running instances instead of building images from scratch.

## ✨ Core Features

- **🔥 Rocket Pool**: Pre-warmed container pool eliminates cold start times.
- **💉 Payload Injection**: Skip `docker build`. Code is injected via `docker cp` in milliseconds.
- **🏗️ DDD Architecture**: Built on `@gravito/enterprise` with rigorous state machine management.
- **♻️ Auto-Recycling**: Containers are automatically refurbished and returned to the pool after missions.
- **🤖 GitHub Integration**: Built-in webhook handler for PR previews and automated comments.
- **🛡️ Secure Isolation**: Each deployment runs in an isolated container environment.
- **📡 Real-time Telemetry**: Integrated with `@gravito/ripple` for live deployment progress updates via WebSockets.
- **🕸️ Dynamic Proxying**: High-performance routing to active deployments using Bun's native HTTP capabilities.

## 🏗️ Architecture Overview

Launchpad follows **Clean Architecture** principles and is implemented as a **Gravito Orbit**:

### Domain Layer (`src/Domain`)
- **Rocket**: The aggregate root representing a container instance and its lifecycle state.
- **Mission**: Represents a deployment task (repository URL, commit SHA, branch).
- **Status Machine**: Strictly manages transitions (`Idle` -> `Assigned` -> `Deployed` -> `Recycling`).
- **Events**: Domain events for tracking lifecycle changes.

### Application Layer (`src/Application`)
- **PoolManager**: Orchestrates the lifecycle of Rockets (warmup, assignment, recycling).
- **MissionControl**: High-level facade for launching missions and coordinating injection.
- **PayloadInjector**: Handles the git operations and the physical injection of code into containers.
- **RefurbishUnit**: Cleans up and resets used containers for return to the pool.

### Infrastructure Layer (`src/Infrastructure`)
- **DockerAdapter**: Low-level communication with the Docker daemon.
- **ShellGitAdapter**: Git operations via shell commands.
- **OctokitGitHubAdapter**: Interaction with GitHub API for status updates and PR comments.
- **CachedRocketRepository**: Persistent storage for Rocket states using `@gravito/stasis`.
- **BunProxyAdapter**: Manages reverse proxying to active containers with sub-millisecond overhead.

## 🚀 Quick Start

### Installation

```bash
bun add @gravito/launchpad
```

### Basic Usage (As an Orbit)

The most common way to use Launchpad is as part of a Gravito application:

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

### Manual Mission Launch

```typescript
import { MissionControl, Mission } from '@gravito/launchpad'

// Assuming container is available via Gravito Core
const ctrl = container.make<MissionControl>('launchpad.ctrl')

const mission = Mission.create({
  id: 'mission-123',
  repoUrl: 'https://github.com/example/repo.git',
  branch: 'main'
})

const rocketId = await ctrl.launch(mission, (type, data) => {
  console.log(`[Telemetry] ${type}:`, data)
})
```

## ⚙️ Configuration

Launchpad relies on a working Docker environment.

| Environment Variable | Description | Default |
|----------------------|-------------|---------|
| `GITHUB_TOKEN` | Token for GitHub API access | (Required for PR comments) |
| `GITHUB_WEBHOOK_SECRET` | Secret for verifying webhooks | (Optional) |
| `POOL_SIZE` | Target number of pre-warmed containers | `3` |
| `CACHE_DRIVER` | Storage driver for Rocket states | `file` |

## 🧪 Testing

```bash
bun test
```

## 📄 License

MIT © Gravito Framework
