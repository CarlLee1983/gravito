# Workers Configuration Examples

## 完整的 gravito.config.ts 示例

### 基礎配置（Core Profile）

```typescript
import type { GravitoConfig as Config } from '@gravito/core'

export const GravitoConfig: Config & any = {
  basePath: process.cwd(),
  port: 3000,

  database: {
    default: 'sqlite',
    connections: {
      sqlite: {
        driver: 'sqlite',
        filename: 'database.sqlite',
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Workers Configuration (Basic)
  // ─────────────────────────────────────────────────────────────────────────
  workers: {
    // Runtime environment: 'auto' | 'bun' | 'node'
    // Default: 'auto' (auto-detect)
    runtime: process.env.WORKERS_RUNTIME as 'auto' | 'bun' | 'node' ?? 'auto',

    // Worker pool configuration
    pool: {
      // Maximum concurrent workers
      poolSize: Number.parseInt(process.env.WORKERS_POOL_SIZE ?? '4', 10),

      // Minimum warm workers
      minWorkers: Number.parseInt(process.env.WORKERS_MIN_WORKERS ?? '0', 10),

      // Health check interval (ms)
      healthCheckInterval: 30000,
    },

    // Job execution settings
    execution: {
      // Maximum execution time per job (ms)
      maxExecutionTime: Number.parseInt(process.env.WORKERS_MAX_EXECUTION_TIME ?? '30000', 10),

      // Maximum memory per worker (MB, 0 = unlimited)
      maxMemory: Number.parseInt(process.env.WORKERS_MAX_MEMORY ?? '0', 10),

      // Idle timeout before worker termination (ms)
      idleTimeout: Number.parseInt(process.env.WORKERS_IDLE_TIMEOUT ?? '60000', 10),

      // Isolate context for each job
      isolateContexts: process.env.WORKERS_ISOLATE_CONTEXTS === 'true',
    },
  },
}
```

### 進階配置（Scale Profile）

```typescript
export const GravitoConfig: Config & any = {
  // ... other config ...

  workers: {
    // Auto-detect, prefer Bun
    runtime: process.env.WORKERS_RUNTIME as 'auto' | 'bun' | 'node' ?? 'auto',

    pool: {
      // Higher pool size for production
      poolSize: Number.parseInt(process.env.WORKERS_POOL_SIZE ?? '8', 10),

      // Keep 2 warm workers
      minWorkers: Number.parseInt(process.env.WORKERS_MIN_WORKERS ?? '2', 10),

      healthCheckInterval: 30000,
    },

    execution: {
      maxExecutionTime: Number.parseInt(process.env.WORKERS_MAX_EXECUTION_TIME ?? '30000', 10),
      maxMemory: Number.parseInt(process.env.WORKERS_MAX_MEMORY ?? '512', 10),
      idleTimeout: Number.parseInt(process.env.WORKERS_IDLE_TIMEOUT ?? '60000', 10),
      isolateContexts: false,
    },

    // Bun-specific optimizations (only used if runtime is 'bun')
    bun: {
      // Enable memory-saving mode
      smol: process.env.WORKERS_BUN_SMOL === 'true' ?? false,

      // Preload modules
      preload: process.env.WORKERS_BUN_PRELOAD
        ? process.env.WORKERS_BUN_PRELOAD.split(',').map((p) => p.trim())
        : undefined,

      // Inspector port for debugging
      inspectPort: process.env.WORKERS_BUN_INSPECT_PORT
        ? Number.parseInt(process.env.WORKERS_BUN_INSPECT_PORT, 10)
        : undefined,
    },
  },
}
```

### 生產優化配置（Enterprise Profile）

```typescript
export const GravitoConfig: Config & any = {
  // ... other config ...

  workers: {
    // Force auto-detection for best runtime
    runtime: 'auto' as const,

    pool: {
      // High concurrency for enterprise
      poolSize: Number.parseInt(process.env.WORKERS_POOL_SIZE ?? '16', 10),

      // Keep 4 warm workers ready
      minWorkers: 4,

      // Check health every 30 seconds
      healthCheckInterval: 30000,
    },

    execution: {
      // 30-second timeout
      maxExecutionTime: 30000,

      // Memory limit to prevent OOM
      maxMemory: Number.parseInt(process.env.WORKERS_MAX_MEMORY ?? '512', 10),

      // 60-second idle timeout
      idleTimeout: 60000,

      // Don't isolate contexts for performance
      isolateContexts: false,
    },

    // Aggressive Bun optimization
    bun: {
      // Enable memory-saving mode
      smol: true,

      // Preload heavy dependencies
      preload: process.env.WORKERS_BUN_PRELOAD
        ? process.env.WORKERS_BUN_PRELOAD.split(',').map((p) => p.trim())
        : [
            // Common preload candidates
            // '@gravito/stream',
            // '@gravito/signal',
          ],

      // Optional debugging support
      inspectPort:
        process.env.NODE_ENV === 'development'
          ? Number.parseInt(process.env.WORKERS_BUN_INSPECT_PORT ?? '9229', 10)
          : undefined,
    },
  },
}
```

## 環境變數配置

### 基本設置

```bash
# .env

# Workers Runtime Selection
WORKERS_RUNTIME=auto                    # auto, bun, or node

# Pool Configuration
WORKERS_POOL_SIZE=4                     # Maximum concurrent workers
WORKERS_MIN_WORKERS=0                   # Minimum warm workers

# Execution Settings
WORKERS_MAX_EXECUTION_TIME=30000        # 30 seconds
WORKERS_MAX_MEMORY=0                    # 0 = unlimited
WORKERS_IDLE_TIMEOUT=60000              # 60 seconds
WORKERS_ISOLATE_CONTEXTS=false          # Don't isolate each job
```

### Bun 優化設置

```bash
# Bun-specific configuration (only used if runtime='bun' or auto-detected)
WORKERS_BUN_SMOL=true                   # Enable memory-saving mode
WORKERS_BUN_PRELOAD=""                  # Preload modules (comma-separated)
WORKERS_BUN_INSPECT_PORT=9229           # Optional debugging port
```

### 開發環境

```bash
# .env.development

WORKERS_RUNTIME=auto
WORKERS_POOL_SIZE=2                     # Lower for development
WORKERS_MIN_WORKERS=0
WORKERS_MAX_EXECUTION_TIME=60000        # Longer timeout for debugging
WORKERS_MAX_MEMORY=256
WORKERS_ISOLATE_CONTEXTS=true           # Isolate for debugging
WORKERS_BUN_SMOL=false                  # Disable optimization
WORKERS_BUN_INSPECT_PORT=9229           # Enable debugging
```

### 生產環境

```bash
# .env.production

WORKERS_RUNTIME=auto                    # Auto-select best runtime
WORKERS_POOL_SIZE=16                    # High concurrency
WORKERS_MIN_WORKERS=4                   # Keep 4 warm
WORKERS_MAX_EXECUTION_TIME=30000
WORKERS_MAX_MEMORY=512                  # 512 MB per worker
WORKERS_IDLE_TIMEOUT=60000
WORKERS_ISOLATE_CONTEXTS=false          # Reuse workers for performance
WORKERS_BUN_SMOL=true                   # Aggressive optimization
WORKERS_BUN_INSPECT_PORT=                # No debugging in production
```

## 使用示例

### 在應用中訪問 Workers 配置

```typescript
import { GravitoConfig } from './gravito.config'

// 獲取 workers 配置
const workersConfig = GravitoConfig.workers

// 創建 WorkerPool
import { WorkerPool } from '@gravito/stream'

const pool = new WorkerPool({
  poolSize: workersConfig.pool.poolSize,
  minWorkers: workersConfig.pool.minWorkers,
  maxExecutionTime: workersConfig.execution.maxExecutionTime,
  maxMemory: workersConfig.execution.maxMemory,
  runtime: workersConfig.runtime,
})

// 提交 job
await pool.execute(job)
```

### 根據環境切換配置

```typescript
const workersConfig = {
  development: {
    poolSize: 2,
    minWorkers: 0,
    maxExecutionTime: 60000,
  },
  production: {
    poolSize: 16,
    minWorkers: 4,
    maxExecutionTime: 30000,
  },
}

const env = process.env.NODE_ENV || 'development'
const pool = new WorkerPool(workersConfig[env as keyof typeof workersConfig])
```

## 配置檢查清單

### 開發環境
- [ ] `WORKERS_RUNTIME=auto` 或 `bun` (用於測試 Bun)
- [ ] `WORKERS_POOL_SIZE` 設置為 2-4
- [ ] `WORKERS_ISOLATE_CONTEXTS=true` (便於調試)
- [ ] `WORKERS_BUN_INSPECT_PORT` 設置（可選）

### 生產環境
- [ ] `WORKERS_RUNTIME=auto` (自動選擇最佳)
- [ ] `WORKERS_POOL_SIZE` 根據 CPU 核心數調整
- [ ] `WORKERS_MIN_WORKERS` 設置 2-4（保持熱備）
- [ ] `WORKERS_BUN_SMOL=true` (如果支持 Bun)
- [ ] `WORKERS_MAX_MEMORY` 根據服務器內存設置

## 常見配置模式

### 輕量級應用（Core）
```
poolSize: 4
minWorkers: 0
maxExecutionTime: 30000
isolateContexts: false
```

### 中等應用（Scale）
```
poolSize: 8
minWorkers: 2
maxExecutionTime: 30000
maxMemory: 256
isolateContexts: false
bun.smol: true
```

### 企業應用（Enterprise）
```
poolSize: 16
minWorkers: 4
maxExecutionTime: 30000
maxMemory: 512
isolateContexts: false
bun.smol: true
bun.preload: [預加載關鍵模組]
```
