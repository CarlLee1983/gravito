/**
 * Repository Service Provider
 *
 * 註冊所有資料存儲庫到 IoC 容器
 */

import type { Container, PlanetCore } from '@gravito/core'
import { ServiceProvider } from '@gravito/core'
import { getLogger } from '@infrastructure/logging/Logger'
import { MockProductRepository } from '@infrastructure/repositories/MockProductRepository'
import { MockUserRepository } from '@infrastructure/repositories/MockUserRepository'

export class RepositoryServiceProvider extends ServiceProvider {
  /**
   * 註冊資料存儲庫
   */
  register(container: Container): void {
    // 註冊 UserRepository
    container.singleton('UserRepository', () => {
      const userRepo = new MockUserRepository()

      // 初始化測試用戶
      userRepo.seedTestUsers()

      return userRepo
    })

    // 註冊 ProductRepository
    container.singleton('ProductRepository', () => {
      const productRepo = new MockProductRepository()

      // 初始化測試商品
      productRepo.seedTestProducts()

      return productRepo
    })
  }

  /**
   * 啟動存儲庫服務
   */
  async boot(_core: PlanetCore): Promise<void> {
    const logger = getLogger()
    logger.info('[Repository Service] ✅ 資料存儲庫已註冊')
  }
}
