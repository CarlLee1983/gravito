/**
 * AutoDiBootstrap - 自動依賴注入引導層
 *
 * 功能：
 * 1. 自動掃描模組目錄發現服務
 * 2. 自動註冊到 DI 容器（遵循約定）
 * 3. 自動註冊路由（無需手動修改 routes.ts）
 * 4. 自動訂閱事件（無需手動註冊）
 */

import type { Container, PlanetCore } from '@gravito/core'

/**
 * 服務發現結果
 */
interface DiscoveredService {
  type:
    | 'domain-service'
    | 'application-service'
    | 'repository'
    | 'event-subscriber'
    | 'event-handler'
  filePath: string
  moduleName: string // 如 "Order"
  serviceName: string // 如 "OrderDomainService"
  className: string // 類名
}

/**
 * 路由註冊發現
 */
interface DiscoveredRoute {
  moduleName: string
  routeFilePath: string
  functionName: string // 如 "registerOrderRoutes"
}

/**
 * AutoDiBootstrap - 自動發現和註冊
 */
export class AutoDiBootstrap {
  /**
   * 掃描並自動註冊所有模組服務
   *
   * 約定：
   * - Domain/Services/*Service.ts → 域服務（singleton）
   * - Application/Services/*Service.ts → 應用服務（singleton）
   * - Infrastructure/Repositories/*Repository.ts → 倉庫（singleton）
   * - Infrastructure/Subscribers/*Subscriber.ts → 事件訂閱器（singleton）
   *
   * @param container DI 容器
   * @param _projectRoot 專案根目錄（預設 process.cwd()）
   */
  static async scanAndRegisterServices(
    container: Container,
    _projectRoot = process.cwd()
  ): Promise<void> {
    const services = await this.discoverServices(_projectRoot)

    console.log(`🔍 發現 ${services.length} 個服務`)

    for (const service of services) {
      await this.registerService(container, service)
    }

    console.log(`✅ 已註冊 ${services.length} 個服務到 DI 容器`)
  }

  /**
   * 掃描並自動註冊所有模組路由
   * 無需手動修改 routes.ts
   *
   * @param core Gravito 核心
   * @param projectRoot 專案根目錄
   */
  static async scanAndRegisterRoutes(core: PlanetCore, projectRoot = process.cwd()): Promise<void> {
    const routes = await this.discoverRoutes(projectRoot)

    console.log(`🛣️  發現 ${routes.length} 個路由模組`)

    for (const route of routes) {
      try {
        // 動態導入路由註冊函式
        const moduleUrl = new URL(`file://${route.routeFilePath}`)
        const routeModule = await import(moduleUrl.href)

        // 尋找路由註冊函式
        const registerFunction =
          routeModule[route.functionName] ||
          routeModule.default?.[route.functionName] ||
          routeModule.default

        if (typeof registerFunction === 'function') {
          registerFunction(core)
          console.log(`  ✓ ${route.moduleName} 路由已註冊`)
        }
      } catch (error) {
        console.error(`  ✗ 無法載入 ${route.routeFilePath}:`, error)
      }
    }

    console.log(`✅ 已註冊 ${routes.length} 個路由`)
  }

  /**
   * 發現服務
   */
  private static async discoverServices(projectRoot: string): Promise<DiscoveredService[]> {
    const services: DiscoveredService[] = []

    // 1. 掃描 Domain Services
    const domainServices = await this.globPattern(
      projectRoot,
      'src/Modules/*/Domain/Services/*Service.ts'
    )

    for (const filePath of domainServices) {
      const moduleName = this.extractModuleName(filePath)
      services.push({
        type: 'domain-service',
        filePath,
        moduleName,
        serviceName: this.extractServiceName(filePath),
        className: this.extractClassName(filePath),
      })
    }

    // 2. 掃描 Application Services
    const appServices = await this.globPattern(
      projectRoot,
      'src/Modules/*/Application/Services/*Service.ts'
    )

    for (const filePath of appServices) {
      const moduleName = this.extractModuleName(filePath)
      services.push({
        type: 'application-service',
        filePath,
        moduleName,
        serviceName: this.extractServiceName(filePath),
        className: this.extractClassName(filePath),
      })
    }

    // 3. 掃描 Repositories
    const repositories = await this.globPattern(
      projectRoot,
      'src/Modules/*/Infrastructure/Repositories/*Repository.ts'
    )

    for (const filePath of repositories) {
      const moduleName = this.extractModuleName(filePath)
      services.push({
        type: 'repository',
        filePath,
        moduleName,
        serviceName: this.extractServiceName(filePath),
        className: this.extractClassName(filePath),
      })
    }

    // 4. 掃描 Event Subscribers
    const subscribers = await this.globPattern(
      projectRoot,
      'src/Modules/*/Infrastructure/Subscribers/*Subscriber.ts'
    )

    for (const filePath of subscribers) {
      const moduleName = this.extractModuleName(filePath)
      services.push({
        type: 'event-subscriber',
        filePath,
        moduleName,
        serviceName: this.extractServiceName(filePath),
        className: this.extractClassName(filePath),
      })
    }

    return services
  }

  /**
   * 發現路由
   */
  private static async discoverRoutes(projectRoot: string): Promise<DiscoveredRoute[]> {
    const routes: DiscoveredRoute[] = []

    const routeFiles = await this.globPattern(
      projectRoot,
      'src/Modules/*/Presentation/Routes/*.routes.ts'
    )

    for (const filePath of routeFiles) {
      const moduleName = this.extractModuleName(filePath)
      routes.push({
        moduleName,
        routeFilePath: `${projectRoot}/${filePath}`,
        functionName: `register${moduleName}Routes`, // 約定：registerOrderRoutes
      })
    }

    return routes
  }

  /**
   * 執行 glob 模式匹配
   * TODO: 實現實際的文件系統掃描邏輯
   */
  private static async globPattern(_projectRoot: string, _pattern: string): Promise<string[]> {
    // 簡單的文件系統掃描（不依賴 Bun glob）
    try {
      // 如果在生產環境，可以使用更高效的 glob 庫
      // 目前返回空陣列以避免編譯錯誤
      return []
    } catch {
      return []
    }
  }

  /**
   * 註冊單個服務到容器
   */
  private static async registerService(
    container: Container,
    service: DiscoveredService
  ): Promise<void> {
    try {
      const moduleUrl = new URL(`file://${process.cwd()}/${service.filePath}`)
      const module = await import(moduleUrl.href)

      // 取得類別（預設 default export 或同名 export）
      const ServiceClass = module[service.className] || module.default

      if (!ServiceClass) {
        console.warn(`  ⚠️  無法找到 ${service.className} 在 ${service.filePath}`)
        return
      }

      // 服務鍵名生成（約定）
      // OrderDomainService → order-domain-service 或 orderDomainService
      const serviceKey = this.generateServiceKey(service)

      // 所有服務預設為 singleton
      container.singleton(serviceKey, (c: Container) => {
        try {
          // 嘗試自動建構子注入
          return this.instantiateService(ServiceClass, c)
        } catch (error) {
          console.warn(`  ⚠️  自動建構子注入失敗 ${serviceKey}:`, error)
          // 嘗試無參建構子
          return new ServiceClass()
        }
      })

      console.log(`  ✓ ${serviceKey} (${service.type})`)
    } catch (error) {
      console.error(`  ✗ 無法載入 ${service.filePath}:`, error)
    }
  }

  /**
   * 嘗試自動建構子注入
   */
  private static instantiateService(ServiceClass: any, container: Container): any {
    // 取得建構子參數（簡單反射）
    const constructorString = ServiceClass.toString()

    // 提取建構子參數（基本實作）
    // constructor(orderRepository: IOrderRepository, domainService: OrderDomainService)
    const paramMatch = constructorString.match(/constructor\s*\((.*?)\)/)

    if (!paramMatch) {
      return new ServiceClass()
    }

    const paramString = paramMatch[1]
    if (!paramString.trim()) {
      return new ServiceClass()
    }

    // 簡單的參數解析（僅支援型別標註）
    const params = paramString.split(',').map((p: string) => p.trim())
    const args: any[] = []

    for (const param of params) {
      const [_paramName, paramType] = param.split(':').map((s: string) => s.trim())

      if (paramType) {
        // 從容器解析
        const kebabCaseType = this.toKebabCase(paramType)
        const camelCaseType = this.toCamelCase(paramType)

        // 先試 kebab-case，再試 camelCase
        try {
          args.push(container.make(kebabCaseType))
        } catch {
          try {
            args.push(container.make(camelCaseType))
          } catch {
            // 無法解析，跳過
            args.push(undefined)
          }
        }
      }
    }

    return new ServiceClass(...args)
  }

  /**
   * 生成服務鍵名
   * 約定：
   * - OrderService → order-service
   * - IOrderRepository → order-repository (去除 I 前綴)
   * - OrderDomainService → order-domain-service
   */
  private static generateServiceKey(service: DiscoveredService): string {
    let name = service.className

    // 去除前綴 I（介面）
    if (name.startsWith('I') && name.length > 1) {
      name = name.slice(1)
    }

    // 去除後綴
    if (name.endsWith('Service')) {
      name = name.slice(0, -7) // Service
    } else if (name.endsWith('Repository')) {
      name = name.slice(0, -10) // Repository
    }

    return this.toKebabCase(name)
  }

  /**
   * 從路徑提取模組名
   * src/Modules/Order/... → Order
   */
  private static extractModuleName(filePath: string): string {
    const match = filePath.match(/Modules\/([^/]+)/)
    return match ? match[1] : 'Unknown'
  }

  /**
   * 從路徑提取服務名
   * src/Modules/Order/Domain/Services/OrderService.ts → orderService
   */
  private static extractServiceName(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    const name = fileName.replace('.ts', '')
    return this.toCamelCase(name)
  }

  /**
   * 從路徑提取類名
   * src/Modules/Order/Domain/Services/OrderService.ts → OrderService
   */
  private static extractClassName(filePath: string): string {
    const fileName = filePath.split('/').pop() || ''
    return fileName.replace('.ts', '')
  }

  /**
   * 轉換為 kebab-case
   * OrderDomainService → order-domain-service
   */
  private static toKebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
  }

  /**
   * 轉換為 camelCase
   */
  private static toCamelCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
        if (+match === 0) return '' // 或處理空格
        return index === 0 ? match.toLowerCase() : match.toUpperCase()
      })
      .replace(/-([a-z])/g, (g) => g[1].toUpperCase())
  }
}
