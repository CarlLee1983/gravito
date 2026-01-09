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

## 🏗️ Architecture Overview

Launchpad follows **Clean Architecture** principles:

### Domain Layer
- **Rocket**: The aggregate root representing a container instance.
- **Mission**: Represents a deployment task (repo, commit, branch).
- **Status Machine**: Strictly manages transitions (Idle -> Assigned -> Deployed -> Recycling).

### Application Layer
- **PoolManager**: Orchestrates the lifecycle of Rockets (warmup, assignment, recycling).
- **PayloadInjector**: Handles the git clone and code injection process.
- **MissionControl**: High-level facade for launching missions.
- **RefurbishUnit**: Cleans up used containers for reuse.

### Infrastructure Layer
- **DockerAdapter**: Low-level communication with Docker daemon.
- **ShellGitAdapter**: Git operations via shell commands.
- **BunProxyAdapter**: Manages reverse proxying to active containers.

## 🚀 Quick Start

### Installation

```bash
bun add @gravito/launchpad
```

### Basic Usage

```typescript
import { PoolManager, PayloadInjector, Mission } from '@gravito/launchpad'
import { DockerAdapter, ShellGitAdapter, InMemoryRocketRepository } from '@gravito/launchpad/infra'

// Initialize adapters
const docker = new DockerAdapter()
const repo = new InMemoryRocketRepository()
const manager = new PoolManager(docker, repo)

// 1. Warmup the pool (Create 3 idle containers)
await manager.warmup(3)

// 2. Create a mission
const mission = Mission.create({
  id: 'mission-1',
  repoUrl: 'https://github.com/user/repo.git',
  commitSha: 'latest'
})

// 3. Launch! (Assigns a rocket and injects code)
const rocket = await manager.assignMission(mission)
const injector = new PayloadInjector(docker, new ShellGitAdapter())
await injector.deploy(rocket)

console.log(`Mission deployed to http://localhost:${rocket.port}`)
```

### Running as a Service (Orbit)

Launchpad can run as a Gravito Orbit, providing a REST API and Webhook support.

```typescript
import { bootstrapLaunchpad } from '@gravito/launchpad'

const { port } = await bootstrapLaunchpad()
console.log(`Launchpad Server running on port ${port}`)
```

## ⚙️ Configuration

Launchpad relies on Docker. Ensure Docker is installed and running.

| Environment Variable | Description | Default |
|----------------------|-------------|---------|
| `GITHUB_TOKEN` | Token for GitHub API access | (Required for PR comments) |
| `GITHUB_WEBHOOK_SECRET` | Secret for verifying webhooks | (Optional) |
| `POOL_SIZE` | Target number of pre-warmed containers | `3` |

## 🧪 Testing

```bash
bun test
```

## 📄 License

MIT © Gravito Framework