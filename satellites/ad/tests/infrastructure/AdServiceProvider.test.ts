import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { CreateAdUseCase } from '../../src/Application/UseCases/CreateAdUseCase'
import type { DeleteAdUseCase } from '../../src/Application/UseCases/DeleteAdUseCase'
import type { DeliverAdUseCase } from '../../src/Application/UseCases/DeliverAdUseCase'
import type { ListAdsUseCase } from '../../src/Application/UseCases/ListAdsUseCase'
import type { ToggleAdStatusUseCase } from '../../src/Application/UseCases/ToggleAdStatusUseCase'
import type { UpdateAdUseCase } from '../../src/Application/UseCases/UpdateAdUseCase'
import type { IAdRepository } from '../../src/Domain/Contracts/IAdRepository'
import type { AdminAdController } from '../../src/Infrastructure/Http/Controllers/AdminAdController'
import type { PublicAdController } from '../../src/Infrastructure/Http/Controllers/PublicAdController'
import { AdServiceProvider } from '../../src/index'

// -- Mock Container --

function createMockContainer() {
  const bindings = new Map<string, (c: any) => unknown>()

  return {
    singleton: mock((key: string, factory: (c: any) => unknown) => {
      bindings.set(key, factory)
    }),
    make: <T>(key: string): T => {
      const factory = bindings.get(key)
      if (!factory) {
        throw new Error(`Container key not found: ${key}`)
      }
      // 建立 container proxy 讓工廠能解析依賴
      const containerProxy = { make: <U>(k: string): U => createMockContainer().make<U>(k) }
      // 使用自身以便循環解析
      return factory({
        make: (k: string) => {
          const f = bindings.get(k)
          if (f) return f(containerProxy)
          throw new Error(`Container key not found: ${k}`)
        },
      }) as T
    },
    bindings,
  }
}

// -- Mock PlanetCore --

function createMockCore() {
  const routes: Array<{ method: string; path: string }> = []

  const routerGroup = {
    get: mock((path: string, _handler: any) => {
      routes.push({ method: 'GET', path })
      return routerGroup
    }),
    post: mock((path: string, _handler: any) => {
      routes.push({ method: 'POST', path })
      return routerGroup
    }),
    put: mock((path: string, _handler: any) => {
      routes.push({ method: 'PUT', path })
      return routerGroup
    }),
    patch: mock((path: string, _handler: any) => {
      routes.push({ method: 'PATCH', path })
      return routerGroup
    }),
    delete: mock((path: string, _handler: any) => {
      routes.push({ method: 'DELETE', path })
      return routerGroup
    }),
  }

  const router = {
    prefix: mock((_p: string) => ({
      group: mock((fn: (r: typeof routerGroup) => void) => fn(routerGroup)),
    })),
    get: mock((path: string, _handler: any) => {
      routes.push({ method: 'GET', path })
    }),
    post: mock((path: string, _handler: any) => {
      routes.push({ method: 'POST', path })
    }),
  }

  return {
    core: {
      hooks: {
        doAction: mock(async () => {}),
      },
      logger: {
        info: mock(() => {}),
      },
      router,
      container: createMockContainer(),
    },
    routes,
  }
}

// =====================================================
// AdServiceProvider
// =====================================================

describe('AdServiceProvider', () => {
  let provider: AdServiceProvider
  let container: ReturnType<typeof createMockContainer>
  let mockCore: ReturnType<typeof createMockCore>

  beforeEach(() => {
    provider = new AdServiceProvider()
    container = createMockContainer()
    mockCore = createMockCore()
    provider.setCore(mockCore.core as any)
  })

  // -- register --

  describe('register', () => {
    it('註冊 Repository 到容器', () => {
      provider.register(container as any)

      expect(container.singleton).toHaveBeenCalled()
      // 確認 ad.repo.ad key 被註冊
      expect(container.bindings.has('ad.repo.ad')).toBe(true)
    })

    it('註冊所有 6 個 UseCase', () => {
      provider.register(container as any)

      expect(container.bindings.has('ad.usecase.createAd')).toBe(true)
      expect(container.bindings.has('ad.usecase.listAds')).toBe(true)
      expect(container.bindings.has('ad.usecase.updateAd')).toBe(true)
      expect(container.bindings.has('ad.usecase.toggleAdStatus')).toBe(true)
      expect(container.bindings.has('ad.usecase.deleteAd')).toBe(true)
      expect(container.bindings.has('ad.usecase.deliverAd')).toBe(true)
    })

    it('註冊兩個 Controller', () => {
      provider.register(container as any)

      expect(container.bindings.has('ad.controller.admin')).toBe(true)
      expect(container.bindings.has('ad.controller.public')).toBe(true)
    })

    it('正確的註冊數量（1 repo + 6 usecases + 2 controllers = 9）', () => {
      provider.register(container as any)

      expect(container.singleton).toHaveBeenCalledTimes(9)
    })
  })

  // -- boot --

  describe('boot', () => {
    it('設定管理後台路由群組', () => {
      provider.register(container as any)
      provider.boot?.call(provider, mockCore.core as any)

      // 確認 prefix 被呼叫
      expect(mockCore.core.router.prefix).toHaveBeenCalledWith('/api/admin/v1/ads')
    })

    it('設定公開 API 路由', () => {
      provider.register(container as any)
      provider.boot?.call(provider, mockCore.core as any)

      // 確認公開路由被設定
      const postRoutes = mockCore.routes.filter((r) => r.method === 'POST')
      const getRoutes = mockCore.routes.filter((r) => r.method === 'GET')
      expect(postRoutes.length).toBeGreaterThanOrEqual(1)
      expect(getRoutes.length).toBeGreaterThanOrEqual(1)
    })

    it('輸出啟動日誌', () => {
      provider.register(container as any)
      provider.boot?.call(provider, mockCore.core as any)

      expect(mockCore.core.logger.info).toHaveBeenCalled()
    })

    it('core 未設定時不拋出錯誤', () => {
      const emptyProvider = new AdServiceProvider()
      // 不設定 core
      expect(() => emptyProvider.boot?.call(emptyProvider, undefined as any)).not.toThrow()
    })
  })
})
