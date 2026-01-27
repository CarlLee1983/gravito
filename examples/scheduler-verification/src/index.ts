import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PlanetCore } from '@gravito/core'
import { OrbitHorizon } from '@gravito/horizon'
import { type CacheProvider, OrbitCache } from '@gravito/stasis'

/**
 * 模擬一個分散式快取（例如 Redis），用於鎖定任務。
 * 使用檔案系統模擬跨進程共享存儲。
 */
class SharedSimulatedCache implements CacheProvider {
  private storageDir = join(process.cwd(), 'storage/cache-sim')

  constructor() {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true })
    }
  }

  private getPath(key: string) {
    return join(this.storageDir, `${Buffer.from(key).toString('hex')}.json`)
  }

  async get<T>(key: string): Promise<T | null> {
    const path = this.getPath(key)
    if (!existsSync(path)) {
      return null
    }

    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'))
      if (Date.now() > data.expires) {
        unlinkSync(path)
        return null
      }
      return data.value as T
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const expires = Date.now() + (ttlSeconds || 3600) * 1000
    const path = this.getPath(key)
    writeFileSync(path, JSON.stringify({ value, expires }))
  }

  async delete(key: string): Promise<void> {
    const path = this.getPath(key)
    if (existsSync(path)) {
      unlinkSync(path)
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null
  }

  async clear(): Promise<void> {
    // 簡單清理
  }
}

// 實例名稱 (模擬多實例環境，可透過環境變數傳入)
const INSTANCE_NAME = process.env.INSTANCE_NAME || 'Default-Worker'

// 1. 啟動核心
const core = await PlanetCore.boot({
  config: {
    scheduler: {
      lock: { driver: 'cache' },
      nodeRole: process.env.NODE_ROLE || 'worker',
    },
  },
  orbits: [
    // 註冊共享快取 (分散式鎖定核心)
    new OrbitCache({
      provider: new SharedSimulatedCache(),
    }),
    new OrbitHorizon(),
  ],
})

const scheduler = core.container.make<any>('scheduler')

console.log(`[${INSTANCE_NAME}] 🚀 排程服務已啟動，角色: ${core.config.get('scheduler.nodeRole')}`)

// 2. 定義任務清單 (可以在此指定不同的任務)

/**
 * 任務 A: 系統心跳 (廣播模式)
 * 每個實例都會執行，通常用於局部維護。
 */
scheduler
  .task('system-heartbeat', async () => {
    console.log(`[${INSTANCE_NAME}] 💓 心跳偵測中... (每分鐘執行)`)
  })
  .everyMinute()

/**
 * 任務 B: 關鍵數據同步 (分散式鎖定模式)
 * 核心驗證：即使有 100 個實例，每分鐘也只有「一個」實例能執行此任務。
 * 這是自動擴展架構下最重要的功能。
 */
scheduler
  .task('critical-data-sync', async () => {
    console.log(`[${INSTANCE_NAME}] 💎 [執行成功] 開始同步關鍵數據... (只有我搶到了鎖)`)
    // 模擬耗時操作
    await new Promise((resolve) => setTimeout(resolve, 2000))
    console.log(`[${INSTANCE_NAME}] ✅ 數據同步完成。`)
  })
  .everyMinute()
  .onOneServer() // 開啟分散式鎖定
  .onNode('worker') // 限制只有角色為 worker 的節點可執行

/**
 * 任務 C: 特定節點任務
 * 驗證根據 Node Role 過濾任務。
 */
scheduler
  .task('admin-report', async () => {
    console.log(`[${INSTANCE_NAME}] 📊 生成管理報表...`)
  })
  .everyMinute()
  .onNode('admin') // 此實例預設是 'worker'，所以這不會執行

// 3. 模擬常駐執行 (Daemon Mode)
// 在生產環境中會使用 `gravito schedule:work`
console.log(`[${INSTANCE_NAME}] ⏳ 正在等待任務觸發 (每分鐘檢查一次)...`)

// 手動模擬 Scheduler 的 Tick 循環 (每 10 秒檢查一次是否有到期任務)
setInterval(async () => {
  // console.log(`[${INSTANCE_NAME}] 🔍 掃描到期任務...`)
  await scheduler.run()
}, 10000)
