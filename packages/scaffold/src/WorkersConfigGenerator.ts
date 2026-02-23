/**
 * Workers Configuration Generator
 *
 * Generates configuration for the @gravito/stream workers system,
 * supporting both Bun and Node.js runtime environments.
 */

/**
 * Workers configuration options
 */
export interface WorkersConfig {
  /** Runtime environment: auto-detect, force Bun, or force Node.js */
  runtime?: 'auto' | 'bun' | 'node'

  /** Pool configuration */
  pool?: {
    /** Maximum number of concurrent workers (default: 4) */
    poolSize?: number

    /** Minimum number of warm workers (default: 0) */
    minWorkers?: number

    /** Health check interval in ms (default: 30000) */
    healthCheckInterval?: number
  }

  /** Worker execution settings */
  execution?: {
    /** Max execution time per job in ms (default: 30000) */
    maxExecutionTime?: number

    /** Max memory per worker in MB (default: unlimited) */
    maxMemory?: number

    /** Idle timeout before worker termination in ms (default: 60000) */
    idleTimeout?: number

    /** Isolate context for each job (default: false) */
    isolateContexts?: boolean
  }

  /** Bun-specific optimizations */
  bun?: {
    /** Enable memory-saving mode (default: false) */
    smol?: boolean

    /** Modules to preload (single path or array) */
    preload?: string | string[]

    /** Inspector port for debugging (optional) */
    inspectPort?: number
  }
}

/**
 * Generate workers configuration for gravito.config.ts
 */
export class WorkersConfigGenerator {
  /**
   * Generate basic workers configuration
   */
  static generateBasicWorkerConfig(): string {
    return `  /**
   * Workers Configuration
   *
   * Manages job execution in isolated worker threads.
   * Automatically selects best available runtime (Bun or Node.js).
   */
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
  },`
  }

  /**
   * Generate advanced workers configuration with Bun optimizations
   */
  static generateAdvancedWorkerConfig(): string {
    return `  /**
   * Workers Configuration
   *
   * Manages job execution in isolated worker threads.
   * Automatically selects best available runtime (Bun or Node.js).
   *
   * Performance characteristics:
   * - Bun: 2-241x faster message passing, 20-30% less memory (smol mode)
   * - Node.js: Stable, widely tested, compatible
   */
  workers: {
    // Runtime environment
    // Options:
    //   'auto'  - Auto-detect (Bun if available, else Node.js)
    //   'bun'   - Force Bun runtime (recommended for performance)
    //   'node'  - Force Node.js runtime (for compatibility)
    runtime: process.env.WORKERS_RUNTIME as 'auto' | 'bun' | 'node' ?? 'auto',

    // Worker pool configuration
    pool: {
      // Maximum concurrent workers
      // Higher values = more parallelism, more memory
      poolSize: Number.parseInt(process.env.WORKERS_POOL_SIZE ?? '4', 10),

      // Minimum number of warm workers
      // Workers kept alive even when idle
      minWorkers: Number.parseInt(process.env.WORKERS_MIN_WORKERS ?? '1', 10),

      // Health check interval (ms)
      // Periodically checks for dead workers and maintains minWorkers
      healthCheckInterval: 30000,
    },

    // Job execution settings
    execution: {
      // Maximum execution time per job (ms)
      // Jobs exceeding this are forcefully terminated
      maxExecutionTime: Number.parseInt(process.env.WORKERS_MAX_EXECUTION_TIME ?? '30000', 10),

      // Maximum memory per worker (MB)
      // 0 = unlimited, useful for preventing memory leaks
      maxMemory: Number.parseInt(process.env.WORKERS_MAX_MEMORY ?? '0', 10),

      // Idle timeout before worker termination (ms)
      // Workers are terminated if idle for this duration to save resources
      idleTimeout: Number.parseInt(process.env.WORKERS_IDLE_TIMEOUT ?? '60000', 10),

      // Isolate context for each job
      // If true: new worker for each job (slower but safer isolation)
      // If false: reuse workers (faster but shared context)
      isolateContexts: process.env.WORKERS_ISOLATE_CONTEXTS === 'true',
    },

    // Bun-specific optimizations (only used when runtime = 'bun')
    bun: {
      // Enable memory-saving mode
      // Reduces per-worker memory by 20-30% with minimal performance impact
      smol: process.env.WORKERS_BUN_SMOL === 'true',

      // Modules to preload before worker starts
      // Useful for large libraries or frequently used dependencies
      preload: process.env.WORKERS_BUN_PRELOAD
        ? process.env.WORKERS_BUN_PRELOAD.split(',').map((p) => p.trim())
        : undefined,

      // Inspector port for debugging Bun workers
      // Set to a port number to enable debugging (e.g., 9229)
      inspectPort: process.env.WORKERS_BUN_INSPECT_PORT
        ? Number.parseInt(process.env.WORKERS_BUN_INSPECT_PORT, 10)
        : undefined,
    },
  },`
  }

  /**
   * Generate performance-optimized workers configuration for production
   */
  static generateProductionWorkerConfig(): string {
    return `  /**
   * Workers Configuration (Production Optimized)
   *
   * Tuned for maximum throughput and resource efficiency.
   * Assumes Bun runtime with production workloads.
   */
  workers: {
    // Auto-detect runtime (Bun preferred, falls back to Node.js)
    runtime: 'auto' as const,

    pool: {
      // Higher pool size for production workloads
      poolSize: Number.parseInt(process.env.WORKERS_POOL_SIZE ?? '8', 10),

      // Keep 2 warm workers ready
      minWorkers: 2,

      // Check health every 30 seconds
      healthCheckInterval: 30000,
    },

    execution: {
      // 30-second timeout for jobs
      maxExecutionTime: 30000,

      // Limit memory to prevent OOM
      maxMemory: Number.parseInt(process.env.WORKERS_MAX_MEMORY ?? '512', 10),

      // 60-second idle timeout
      idleTimeout: 60000,

      // Don't isolate contexts (faster execution)
      isolateContexts: false,
    },

    bun: {
      // Enable Bun's memory optimization
      smol: true,

      // Preload heavy modules if applicable
      preload: process.env.WORKERS_BUN_PRELOAD?.split(',').map((p) => p.trim()),
    },
  },`
  }

  /**
   * Generate environment variables documentation for workers
   */
  static generateWorkersEnvDocs(): string {
    return `# Workers Configuration Environment Variables

## Runtime Selection
- \`WORKERS_RUNTIME\` - Runtime environment ('auto', 'bun', 'node') - Default: 'auto'

## Pool Configuration
- \`WORKERS_POOL_SIZE\` - Maximum concurrent workers - Default: 4
- \`WORKERS_MIN_WORKERS\` - Minimum warm workers - Default: 0

## Execution Settings
- \`WORKERS_MAX_EXECUTION_TIME\` - Max job duration (ms) - Default: 30000
- \`WORKERS_MAX_MEMORY\` - Max memory per worker (MB, 0=unlimited) - Default: 0
- \`WORKERS_IDLE_TIMEOUT\` - Idle timeout (ms) - Default: 60000
- \`WORKERS_ISOLATE_CONTEXTS\` - Isolate context per job ('true'/'false') - Default: false

## Bun-Specific Optimizations
- \`WORKERS_BUN_SMOL\` - Enable memory-saving mode ('true'/'false') - Default: false
- \`WORKERS_BUN_PRELOAD\` - Preload modules (comma-separated paths) - Default: undefined
- \`WORKERS_BUN_INSPECT_PORT\` - Inspector port for debugging - Default: undefined
`
  }
}
