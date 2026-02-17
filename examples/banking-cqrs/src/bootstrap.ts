import type { PlanetCore } from '@gravito/core'
import { migrate } from '../database/migrations/index'
import { CqrsProvider } from './Providers/CqrsProvider'
import { registerRoutes } from './routes'

export async function bootstrapDatabase(core: PlanetCore): Promise<void> {
  // 註冊 CQRS 提供者
  core.register(new CqrsProvider())

  // 執行資料庫遷移
  await migrate()

  // 註冊路由
  const router = core.container.make('router')
  registerRoutes(router)
}
