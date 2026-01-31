import type { Rocket } from './Rocket'

/**
 * 負責與底層容器引擎（如 Docker）溝通的轉接器介面
 */
export interface IDockerAdapter {
  createBaseContainer(): Promise<string>
  copyFiles(containerId: string, sourcePath: string, targetPath: string): Promise<void>
  executeCommand(
    containerId: string,
    command: string[]
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>

  /**
   * 獲取容器映射到宿主機的真實端口
   */
  getExposedPort(containerId: string, containerPort?: number): Promise<number>

  removeContainer(containerId: string): Promise<void>
  /**
   * 根據 Label 批量移除容器
   */
  removeContainerByLabel(label: string): Promise<void>

  streamLogs(containerId: string, onData: (data: string) => void): void
  getStats(containerId: string): Promise<{ cpu: string; memory: string }>
}

/**
 * 負責動態反向代理與域名路由的轉接器
 */
export interface IRouterAdapter {
  /**
   * 註冊一個域名映射到指定的目標 (URL)
   */
  register(domain: string, targetUrl: string): void

  /**
   * 註銷域名
   */
  unregister(domain: string): void

  /**
   * 啟動代理伺服器
   */
  start(port: number): void
}

/**
 * 負責代碼獲取
 */
export interface IGitAdapter {
  clone(repoUrl: string, branch: string): Promise<string>
}

/**
 * 負責動態反向代理與域名路由的轉接器
 */
export interface IRouterAdapter {
  register(domain: string, targetUrl: string): void
  unregister(domain: string): void
  start(port: number): void
}

/**
 * 負責與 GitHub API 互動的轉接器
 */
export interface IGitHubAdapter {
  verifySignature(payload: string, signature: string, secret: string): boolean
  postComment(repoOwner: string, repoName: string, prNumber: number, comment: string): Promise<void>
}

/**
 * 負責持久化火箭狀態的儲存庫介面
 */
export interface IRocketRepository {
  save(rocket: Rocket): Promise<void>
  findById(id: string): Promise<Rocket | null>
  findIdle(): Promise<Rocket | null>
  findAll(): Promise<Rocket[]>
  delete(id: string): Promise<void>
}

/**
 * Pool 管理配置
 *
 * @public
 * @since 1.3.0
 */
export interface PoolConfig {
  /** 最大 Rocket 數量（硬限制） */
  maxRockets: number
  /** 初始預熱數量 */
  warmupCount: number
  /** 最大等待隊列長度 */
  maxQueueSize: number
  /** 隊列超時時間（毫秒） */
  queueTimeoutMs: number
  /** 資源不足時的策略：'queue' | 'reject' | 'dynamic' */
  exhaustionStrategy: 'queue' | 'reject' | 'dynamic'
  /** 動態建立的限制（僅當 exhaustionStrategy 為 'dynamic' 時） */
  dynamicLimit?: number
}

/**
 * Pool 管理預設配置
 *
 * @public
 * @since 1.3.0
 */
export const DEFAULT_POOL_CONFIG: PoolConfig = {
  maxRockets: 20,
  warmupCount: 3,
  maxQueueSize: 50,
  queueTimeoutMs: 30000,
  exhaustionStrategy: 'queue',
  dynamicLimit: 5,
}

/**
 * 容器清理策略配置
 *
 * @public
 * @since 1.3.0
 */
export interface RefurbishConfig {
  /** 清理策略：'deep-clean' | 'destroy-recreate' */
  strategy: 'deep-clean' | 'destroy-recreate'
  /** 深度清理命令（僅 deep-clean 策略） */
  cleanupCommands?: string[]
  /** 清理超時（毫秒） */
  cleanupTimeoutMs: number
  /** 清理失敗時的處理：'decommission' | 'retry' */
  failureAction: 'decommission' | 'retry'
  /** 最大重試次數（僅 retry 模式） */
  maxRetries: number
}

/**
 * 容器清理預設配置
 *
 * @public
 * @since 1.3.0
 */
export const DEFAULT_REFURBISH_CONFIG: RefurbishConfig = {
  strategy: 'deep-clean',
  cleanupCommands: [
    // 1. 殺掉所有使用者進程
    'pkill -9 -u bun || true',
    'pkill -9 -u root -f "bun|node" || true',
    // 2. 清理應用目錄
    'rm -rf /app/* /app/.* 2>/dev/null || true',
    // 3. 清理暫存檔案
    'rm -rf /tmp/* /var/tmp/* 2>/dev/null || true',
    // 4. 清理 bun 暫存
    'rm -rf /root/.bun/install/cache/tmp/* 2>/dev/null || true',
    'rm -rf /home/bun/.bun/install/cache/tmp/* 2>/dev/null || true',
    // 5. 清理日誌
    'rm -rf /var/log/*.log 2>/dev/null || true',
  ],
  cleanupTimeoutMs: 30000,
  failureAction: 'decommission',
  maxRetries: 2,
}
