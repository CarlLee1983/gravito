import type { ProfileConfig } from './ProfileResolver'

/**
 * package.json 結構
 */
export interface PackageJson {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

/**
 * 驗證結果
 */
export interface ValidationResult {
  /** 是否通過驗證 */
  valid: boolean
  /** 錯誤訊息列表 (阻塞性問題) */
  errors: string[]
  /** 警告訊息列表 (非阻塞性問題) */
  warnings: string[]
}

/**
 * Driver 依賴規則
 */
interface DependencyRule {
  /** Driver 名稱 */
  driver: string
  /** 必需的 packages */
  requiredPackages: string[]
  /** 說明 */
  description: string
}

/**
 * Feature 衝突規則
 */
interface ConflictRule {
  /** 衝突的 features */
  features: string[]
  /** 衝突原因 */
  reason: string
}

/**
 * 依賴驗證器
 *
 * 負責驗證 Profile 配置的依賴完整性，包括：
 * - Driver 必需的 packages
 * - Feature 之間的衝突
 * - Feature 的依賴關係
 *
 * @example
 * ```typescript
 * const validator = new DependencyValidator()
 * const result = validator.validate(profileConfig, packageJson)
 *
 * if (!result.valid) {
 *   console.error('依賴驗證失敗:', result.errors)
 * }
 * ```
 *
 * @since 3.1.0
 * @public
 */
export class DependencyValidator {
  /**
   * Driver 到 Package 的映射規則
   */
  private static readonly DRIVER_DEPENDENCIES: readonly DependencyRule[] = [
    {
      driver: 'none',
      requiredPackages: [],
      description: 'No database driver - developer to choose and install',
    },
    {
      driver: 'redis',
      requiredPackages: ['@gravito/ion'],
      description: 'Redis cache/queue driver requires @gravito/ion',
    },
    {
      driver: 'postgresql',
      requiredPackages: ['@gravito/atlas', 'pg'],
      description: 'PostgreSQL driver requires @gravito/atlas and pg',
    },
    {
      driver: 'mysql',
      requiredPackages: ['@gravito/atlas', 'mysql2'],
      description: 'MySQL driver requires @gravito/atlas and mysql2',
    },
    {
      driver: 'sqlite',
      requiredPackages: ['@gravito/atlas', 'better-sqlite3'],
      description: 'SQLite driver requires @gravito/atlas and better-sqlite3',
    },
    {
      driver: 's3',
      requiredPackages: ['@gravito/stasis', '@aws-sdk/client-s3'],
      description: 'S3 storage driver requires @gravito/stasis and AWS SDK',
    },
    {
      driver: 'r2',
      requiredPackages: ['@gravito/stasis', '@aws-sdk/client-s3'],
      description: 'R2 storage driver requires @gravito/stasis and AWS SDK',
    },
  ]

  /**
   * Feature 衝突規則
   */
  private static readonly CONFLICTS: readonly ConflictRule[] = [
    {
      features: ['postgres', 'mysql', 'sqlite'],
      reason: '不能同時使用多個資料庫 driver (PostgreSQL, MySQL, SQLite)',
    },
  ]

  /**
   * Feature 依賴映射
   */
  private static readonly FEATURE_DEPENDENCIES: Record<string, string[]> = {
    stream: ['@gravito/beam'],
    monitor: ['@gravito/spectrum'],
    graphql: ['@gravito/constellation'],
  }

  /**
   * 驗證 Profile 配置
   *
   * @param config - Profile 配置
   * @param packageJson - 專案的 package.json 內容
   * @returns 驗證結果
   */
  validate(config: ProfileConfig, packageJson: PackageJson): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 1. 檢查 driver 依賴
    this.validateDriverDependencies(config, packageJson, errors)

    // 2. 檢查 feature 衝突
    this.validateFeatureConflicts(config, errors)

    // 3. 檢查 feature 依賴
    this.validateFeatureDependencies(config, packageJson, warnings)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 驗證 driver 依賴
   */
  private validateDriverDependencies(
    config: ProfileConfig,
    packageJson: PackageJson,
    errors: string[]
  ): void {
    for (const [service, driver] of Object.entries(config.drivers)) {
      const rule = DependencyValidator.DRIVER_DEPENDENCIES.find((r) => r.driver === driver)

      if (rule) {
        for (const pkg of rule.requiredPackages) {
          if (!this.hasPackage(packageJson, pkg)) {
            errors.push(`缺少依賴: ${pkg} (${service} driver '${driver}' 所需)`)
          }
        }
      }
    }
  }

  /**
   * 驗證 feature 衝突
   */
  private validateFeatureConflicts(config: ProfileConfig, errors: string[]): void {
    for (const conflict of DependencyValidator.CONFLICTS) {
      const conflictingFeatures = conflict.features.filter((f) => config.features.includes(f))

      if (conflictingFeatures.length > 1) {
        errors.push(`Feature 衝突: ${conflictingFeatures.join(', ')} - ${conflict.reason}`)
      }
    }
  }

  /**
   * 驗證 feature 依賴
   */
  private validateFeatureDependencies(
    config: ProfileConfig,
    packageJson: PackageJson,
    warnings: string[]
  ): void {
    for (const feature of config.features) {
      const requiredPackages = DependencyValidator.FEATURE_DEPENDENCIES[feature]

      if (requiredPackages) {
        for (const pkg of requiredPackages) {
          if (!this.hasPackage(packageJson, pkg)) {
            warnings.push(`Feature "${feature}" 需要 ${pkg}`)
          }
        }
      }
    }
  }

  /**
   * 檢查 package.json 是否包含指定 package
   */
  private hasPackage(packageJson: PackageJson, packageName: string): boolean {
    return (
      packageJson.dependencies?.[packageName] !== undefined ||
      packageJson.devDependencies?.[packageName] !== undefined
    )
  }

  /**
   * 建議安裝缺失的依賴
   *
   * @param result - 驗證結果
   * @returns 安裝命令建議
   */
  static suggestInstallCommand(result: ValidationResult): string | null {
    if (result.errors.length === 0) {
      return null
    }

    // 從錯誤訊息中提取缺失的 package 名稱
    const missingPackages = result.errors
      .map((err) => {
        const match = err.match(/缺少依賴: ([@\w/-]+)/)
        return match ? match[1] : null
      })
      .filter((pkg): pkg is string => pkg !== null)

    if (missingPackages.length === 0) {
      return null
    }

    return `bun add ${missingPackages.join(' ')}`
  }
}
