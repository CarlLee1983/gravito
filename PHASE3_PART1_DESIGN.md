# Phase 3 Part 1：模組生成命令 - 詳細設計

**Status**: 🎯 Design Phase
**Date**: 2026-03-10
**Focus**: 在現有項目中動態生成新的 DDD 模組

---

## 📋 概述

Phase 3 Part 1 的目標是實現 `gravito module generate` 命令，允許開發者在現有的 Gravito DDD 項目中快速生成新的模組。

### 核心需求
- 🎯 支援三種模組類型（simple/advanced/cqrs-query）
- 🎯 自動整合到現有項目結構
- 🎯 自動更新路由系統
- 🎯 支援模組間依賴
- 🎯 支援事件訂閱配置

### 預期成果
```bash
# 在既有項目中生成新模組
cd payment-system
gravito module generate Payment --ddd-type advanced
gravito module generate Analytics --ddd-type cqrs-query --subscribe PaymentCompleted
```

---

## 🏗️ 架構設計

### 整體流程

```
用戶命令
  ↓
參數驗證 & 項目檢測
  ↓
模組配置（互動或 flag）
  ↓
代碼生成
  ├─ Domain Layer
  ├─ Application Layer
  ├─ Presentation Layer
  └─ Infrastructure Layer
  ↓
自動整合
  ├─ 更新 routes.ts
  ├─ 更新 package.json（如需要）
  └─ 配置事件訂閱
  ↓
生成 README 和測試樁
  ↓
驗證和報告
```

### 目錄結構

```
payment-system/
├── src/
│   ├── Modules/
│   │   ├── Existing/          # 現有模組
│   │   ├── Payment/           # ← 新生成的模組
│   │   │   ├── Domain/
│   │   │   │   ├── Entities/
│   │   │   │   ├── ValueObjects/
│   │   │   │   ├── Repositories/
│   │   │   │   ├── Services/
│   │   │   │   └── Events/
│   │   │   ├── Application/
│   │   │   │   ├── Services/
│   │   │   │   └── DTOs/
│   │   │   ├── Presentation/
│   │   │   │   ├── Controllers/
│   │   │   │   ├── Resources/
│   │   │   │   └── Routes/
│   │   │   ├── Infrastructure/
│   │   │   │   └── Repositories/
│   │   │   └── index.ts
│   │   └── Analytics/         # 另一個新生成的模組
│   ├── routes.ts              # 自動更新
│   └── ...
├── tests/
│   ├── Unit/Payment/          # 新模組的樁測試
│   ├── Integration/Payment/
│   └── Feature/Payment/
├── package.json               # 如需要自動更新
├── gravito.config.ts          # 可選：模組配置
└── README.md

```

---

## 🔧 實現細節

### 1. 命令定義

**文件**: `packages/cli/src/commands/module.ts`

```typescript
/**
 * Module generation command
 * Usage: gravito module generate <name> [type] [options]
 *
 * Examples:
 *   gravito module generate Payment --ddd-type advanced
 *   gravito module generate Analytics --ddd-type cqrs-query
 *   gravito module generate Settings --ddd-type simple
 */
export async function moduleCommand(options: ModuleOptions = {}) {
  // 1. 驗證當前項目是 Gravito DDD 項目
  // 2. 讀取現有項目配置
  // 3. 提示使用者輸入（如果沒有使用 flag）
  // 4. 驗證模組名稱不重複
  // 5. 調用 ModuleGenerator.generate()
  // 6. 自動整合到現有項目
  // 7. 報告結果
}

interface ModuleOptions {
  name?: string
  dddType?: 'simple' | 'advanced' | 'cqrs-query'
  dependsOn?: string[]
  subscribesTo?: string[]
  packageManager?: 'bun' | 'npm' | 'yarn' | 'pnpm'
  skipTests?: boolean
}
```

### 2. 模組生成器

**文件**: `packages/scaffold/src/tools/ModuleGenerator.ts`

```typescript
interface ModuleGenerationContext {
  projectName: string
  moduleName: string
  moduleNameKebabCase: string
  dddType: 'simple' | 'advanced' | 'cqrs-query'
  targetDir: string
  projectRoot: string
  dependsOn: string[]
  subscribesTo: string[]
}

class ModuleGenerator {
  /**
   * 生成一個完整的 DDD 模組
   */
  async generate(context: ModuleGenerationContext): Promise<GenerationResult> {
    // 1. 建立模組目錄結構
    // 2. 生成各層的文件
    // 3. 回傳生成的文件列表
  }

  /**
   * 自動整合到現有項目
   */
  async integrate(context: ModuleGenerationContext): Promise<void> {
    // 1. 更新 routes.ts
    // 2. 配置事件訂閱
    // 3. 更新 package.json（如需要）
  }

  /**
   * 驗證模組生成的完整性
   */
  async validate(modulePath: string): Promise<ValidationReport> {
    // 1. 檢查所有必需的文件存在
    // 2. 驗證 TypeScript 編譯
    // 3. 檢查導入的完整性
  }
}
```

### 3. 項目檢測

**文件**: `packages/scaffold/src/tools/ProjectDetector.ts`

```typescript
class ProjectDetector {
  /**
   * 檢測當前目錄是否是 Gravito DDD 項目
   */
  async detectProject(projectRoot: string): Promise<ProjectInfo> {
    return {
      isGravitoDdd: true,
      architecture: 'ddd',
      modules: ['Health', 'Auth', 'User'],  // 現有模組
      packageManager: 'bun',
      config: {
        // gravito.config.ts 的配置
      },
    }
  }

  /**
   * 檢測模組名稱是否已存在
   */
  async moduleExists(projectRoot: string, moduleName: string): Promise<boolean>

  /**
   * 讀取現有模組信息
   */
  async getExistingModules(projectRoot: string): Promise<ModuleInfo[]>
}
```

### 4. 自動路由整合

**文件**: `packages/scaffold/src/tools/RouteIntegrator.ts`

```typescript
class RouteIntegrator {
  /**
   * 自動更新 src/routes.ts，註冊新模組的路由
   */
  async integrateModule(
    projectRoot: string,
    moduleName: string
  ): Promise<void> {
    // 原始 routes.ts:
    // import { registerHealthRoutes } from './Modules/Health/Presentation/Routes/health.routes'
    // export async function registerRoutes(core: PlanetCore) {
    //   registerHealthRoutes(core)
    // }

    // 更新後:
    // import { registerPaymentRoutes } from './Modules/Payment/Presentation/Routes/payment.routes'
    // export async function registerRoutes(core: PlanetCore) {
    //   registerHealthRoutes(core)
    //   registerPaymentRoutes(core)  // ← 新增
    // }
  }
}
```

### 5. 事件訂閱配置

**文件**: `packages/scaffold/src/tools/EventSubscriptionConfigurator.ts`

```typescript
class EventSubscriptionConfigurator {
  /**
   * 配置模組訂閱特定的領域事件
   */
  async configureSubscriptions(
    projectRoot: string,
    moduleName: string,
    events: string[]
  ): Promise<void> {
    // 在 ModuleEventSubscriber 中註冊訂閱
    // 例如：Analytics 模組訂閱 PaymentCompleted 事件
  }
}
```

---

## 📝 文件模板

### Domain Layer - Aggregate

**模板**: `packages/scaffold/templates/module/domain/aggregate.ts.template`

```typescript
import { AggregateRoot } from '@gravito/enterprise'
import { BaseEntity } from '@/Shared/Domain/BaseEntity'
import { {{className}}Id } from './{{className}}Id'
import { {{className}}Status } from '../ValueObjects/{{className}}Status'

/**
 * {{className}} Aggregate Root
 *
 * Represents a {{className}} in the domain
 */
export class {{className}} extends AggregateRoot<{{className}}Id> {
  readonly id: {{className}}Id
  readonly status: {{className}}Status
  readonly createdAt: Date

  constructor(
    id: {{className}}Id,
    status: {{className}}Status,
    createdAt: Date
  ) {
    super()
    this.id = id
    this.status = status
    this.createdAt = createdAt
  }

  static create(id: {{className}}Id, status: {{className}}Status): {{className}} {
    return new {{className}}(id, status, new Date())
  }

  changeStatus(newStatus: {{className}}Status): void {
    this.status = newStatus
  }
}
```

### Application Layer - Service

**模板**: `packages/scaffold/templates/module/application/service.ts.template`

```typescript
import type { PlanetCore } from '@gravito/core'
import type { I{{className}}Repository } from '../../Domain/Repositories/I{{className}}Repository'
import { {{className}}Repository } from '../../Infrastructure/Repositories/{{className}}Repository'
import { {{className}}DTO } from '../DTOs/{{className}}DTO'

/**
 * {{serviceName}} Service
 *
 * Application service for {{className}} operations
 */
export class {{serviceName}} {
  private repository: I{{className}}Repository

  constructor(core: PlanetCore) {
    this.repository = new {{className}}Repository()
  }

  async get{{className}}(id: string): Promise<{{className}}DTO | null> {
    const entity = await this.repository.findById(id)
    if (!entity) return null
    return {{className}}DTO.fromEntity(entity)
  }

  // Add more service methods as needed
}
```

### Presentation Layer - Routes

**模板**: `packages/scaffold/templates/module/presentation/routes.ts.template`

```typescript
import type { PlanetCore } from '@gravito/core'
import { {{className}}Controller } from '../Controllers/{{className}}Controller'

/**
 * Register {{moduleName}} routes
 */
export function register{{className}}Routes(core: PlanetCore): void {
  const controller = new {{className}}Controller(core)

  // Define your routes here
  // Example: core.router.get('/api/{{kebab-case}}/{{:id}}', (ctx) => controller.get(ctx))
}
```

---

## 🧪 測試計畫

### Unit Tests

```typescript
describe('ModuleGenerator', () => {
  it('should generate simple module with all required files', async () => {})
  it('should generate advanced module with event sourcing support', async () => {})
  it('should generate cqrs-query module with read model structure', async () => {})
  it('should validate generated module structure', async () => {})
  it('should create correct DTO classes', async () => {})
})

describe('ProjectDetector', () => {
  it('should detect Gravito DDD project', async () => {})
  it('should list existing modules', async () => {})
  it('should detect duplicate module names', async () => {})
})

describe('RouteIntegrator', () => {
  it('should add module import to routes.ts', async () => {})
  it('should add route registration call', async () => {})
  it('should maintain correct import order', async () => {})
})
```

### Integration Tests

```typescript
describe('Module Generation Integration', () => {
  it('should generate and integrate a complete module', async () => {
    // 1. 使用 gravito module generate 命令
    // 2. 驗證文件已生成
    // 3. 驗證項目仍可編譯
    // 4. 驗證新路由可訪問
  })

  it('should support multiple modules in same project', async () => {
    // 1. 生成多個模組
    // 2. 驗證它們不會相互干擾
    // 3. 驗證所有路由都可工作
  })

  it('should handle module dependencies correctly', async () => {
    // 1. 生成依賴其他模組的模組
    // 2. 驗證依賴解析
    // 3. 驗證循環依賴檢測
  })
})
```

### Feature Tests

```typescript
describe('Module Generation CLI', () => {
  it('should generate module via CLI with interactive prompts', async () => {})
  it('should support CLI flags for non-interactive mode', async () => {})
  it('should validate all generated files after creation', async () => {})
  it('should provide helpful error messages on failure', async () => {})
})
```

---

## 🛠️ CLI 命令規範

### 基本使用

```bash
# 互動模式
gravito module generate
# 提示: 模組名稱? Payment
# 提示: DDD 類型? advanced
# 提示: 依賴於其他模組嗎? (optional)
# 提示: 訂閱事件? (optional)

# 非互動模式
gravito module generate Payment --ddd-type advanced --pm bun
```

### Flags

| Flag | 說明 | 例子 |
|------|------|------|
| `--ddd-type` | 模組類型 | `--ddd-type advanced` |
| `--depends-on` | 依賴的模組 | `--depends-on Auth,User` |
| `--subscribes-to` | 訂閱的事件 | `--subscribes-to PaymentCompleted,OrderCreated` |
| `--pm` | 套件管理器 | `--pm bun` |
| `--skip-tests` | 不生成測試樁 | `--skip-tests` |

### 錯誤處理

```bash
# ❌ 不是 Gravito DDD 項目
$ gravito module generate Payment
❌ 錯誤: 當前目錄不是 Gravito DDD 項目
    確保你在 gravito init 建立的項目根目錄中

# ❌ 模組已存在
$ gravito module generate Health
❌ 錯誤: 模組 "Health" 已存在
    請使用不同的模組名稱

# ❌ 無效的類型
$ gravito module generate Payment --ddd-type invalid
❌ 錯誤: 無效的 DDD 類型: "invalid"
    允許的值: simple, advanced, cqrs-query
```

---

## 📊 成功指標

### 功能完整性
- [ ] 可生成三種模組類型
- [ ] 自動路由整合
- [ ] 事件訂閱配置
- [ ] 依賴管理
- [ ] 測試樁生成

### 質量指標
- [ ] TypeScript 編譯 0 errors
- [ ] 單元測試 > 90% 覆蓋率
- [ ] 集成測試全部通過
- [ ] Biome linting 通過
- [ ] 代碼風格一致

### 用戶體驗
- [ ] 清晰的錯誤信息
- [ ] 有用的成功提示
- [ ] 詳細的文檔
- [ ] 完整的使用範例

---

## 📈 實施里程碑

```
Week 1:
  Day 1: 命令框架 + ProjectDetector
  Day 2: ModuleGenerator 核心
  Day 3: 各層文件生成
  Day 4: RouteIntegrator + EventSubscriptionConfigurator
  Day 5: 單元測試

Week 2:
  Day 1-2: 集成測試
  Day 3: CLI 命令完善
  Day 4: 文檔編寫
  Day 5: 最終測試和打磨
```

---

## 🎯 交付成果

### 代碼
- ✅ `packages/cli/src/commands/module.ts` (150-200 行)
- ✅ `packages/scaffold/src/tools/ModuleGenerator.ts` (400-500 行)
- ✅ `packages/scaffold/src/tools/ProjectDetector.ts` (200-300 行)
- ✅ `packages/scaffold/src/tools/RouteIntegrator.ts` (150-200 行)
- ✅ `packages/scaffold/src/tools/EventSubscriptionConfigurator.ts` (100-150 行)
- ✅ 多個模板文件

### 測試
- ✅ 25-30 個單元測試
- ✅ 10-15 個集成測試
- ✅ 5-10 個 CLI 功能測試

### 文檔
- ✅ `MODULE_GENERATION_GUIDE.md` - 完整指南
- ✅ `MODULE_GENERATION_API.md` - API 文檔
- ✅ 使用範例
- ✅ 故障排除指南

---

## ✅ 下一步

1. **確認設計**: 審視本設計文檔
2. **設置環境**: 準備開發環境
3. **開始實施**: Week 1 Day 1
4. **定期檢查**: 每日進度報告

---

**設計完成**: 2026-03-10
**準備就緒**: ✅
**下一步**: 開始實施 Part 1

Built with ❤️ using Gravito Framework + Claude Code
