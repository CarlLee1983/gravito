import { describe, expect, it } from 'bun:test'
import { DependencyValidator } from '../src/DependencyValidator'
import type { ProfileConfig } from '../src/ProfileResolver'

describe('DependencyValidator', () => {
  const validator = new DependencyValidator()

  it('正確配置應通過驗證', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'postgresql',
        cache: 'redis',
        queue: 'redis',
        storage: 's3',
        session: 'redis',
      },
      features: ['stream', 'monitor'],
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        '@gravito/atlas': '^2.1.0',
        '@gravito/ion': '^3.0.1',
        '@gravito/stasis': '^3.0.1',
        '@gravito/beam': '^1.0.0-alpha.2',
        '@gravito/spectrum': '^1.0.0',
        pg: '^8.0.0',
        '@aws-sdk/client-s3': '^3.0.0',
      },
    }

    const result = validator.validate(config, packageJson)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('應該檢測缺少的 Redis 依賴', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'sqlite',
        cache: 'redis', // 需要 @gravito/ion
        queue: 'sync',
        storage: 'local',
        session: 'file',
      },
      features: [],
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        '@gravito/atlas': '^2.1.0',
        'better-sqlite3': '^9.0.0',
        // 缺少 @gravito/ion
      },
    }

    const result = validator.validate(config, packageJson)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('@gravito/ion')
  })

  it('應該檢測缺少的 PostgreSQL 依賴', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'postgresql',
        cache: 'memory',
        queue: 'sync',
        storage: 'local',
        session: 'file',
      },
      features: [],
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        '@gravito/atlas': '^2.1.0',
        // 缺少 pg
      },
    }

    const result = validator.validate(config, packageJson)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some((err) => err.includes('pg'))).toBe(true)
  })

  it('應該檢測 feature 衝突', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'postgresql',
        cache: 'memory',
        queue: 'sync',
        storage: 'local',
        session: 'file',
      },
      features: ['postgres', 'mysql'], // 衝突！
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        '@gravito/atlas': '^2.1.0',
        pg: '^8.0.0',
        mysql2: '^3.0.0',
      },
    }

    const result = validator.validate(config, packageJson)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('衝突')
  })

  it('應該檢測 feature 依賴 (警告)', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'sqlite',
        cache: 'memory',
        queue: 'sync',
        storage: 'local',
        session: 'file',
      },
      features: ['stream'], // 需要 @gravito/beam
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        '@gravito/atlas': '^2.1.0',
        'better-sqlite3': '^9.0.0',
        // 缺少 @gravito/beam
      },
    }

    const result = validator.validate(config, packageJson)

    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('stream')
    expect(result.warnings[0]).toContain('@gravito/beam')
  })

  it('應該能建議安裝命令', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'redis',
        cache: 'redis',
        queue: 'redis',
        storage: 'local',
        session: 'redis',
      },
      features: [],
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        // 缺少 @gravito/ion
      },
    }

    const result = validator.validate(config, packageJson)
    const installCmd = DependencyValidator.suggestInstallCommand(result)

    expect(installCmd).toBeTruthy()
    expect(installCmd).toContain('bun add')
    expect(installCmd).toContain('@gravito/ion')
  })

  it('正確配置不應建議安裝命令', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'sqlite',
        cache: 'memory',
        queue: 'sync',
        storage: 'local',
        session: 'file',
      },
      features: [],
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        '@gravito/atlas': '^2.1.0',
        'better-sqlite3': '^9.0.0',
      },
    }

    const result = validator.validate(config, packageJson)
    const installCmd = DependencyValidator.suggestInstallCommand(result)

    expect(installCmd).toBeNull()
  })

  it('應該能檢測 MySQL 依賴', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'mysql',
        cache: 'memory',
        queue: 'sync',
        storage: 'local',
        session: 'file',
      },
      features: [],
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        '@gravito/atlas': '^2.1.0',
        // 缺少 mysql2
      },
    }

    const result = validator.validate(config, packageJson)

    expect(result.valid).toBe(false)
    expect(result.errors.some((err) => err.includes('mysql2'))).toBe(true)
  })

  it('應該能檢測 S3 storage 依賴', () => {
    const config: ProfileConfig = {
      drivers: {
        database: 'sqlite',
        cache: 'memory',
        queue: 'sync',
        storage: 's3',
        session: 'file',
      },
      features: [],
    }

    const packageJson = {
      dependencies: {
        '@gravito/core': '^1.2.1',
        '@gravito/atlas': '^2.1.0',
        'better-sqlite3': '^9.0.0',
        // 缺少 @gravito/stasis 和 @aws-sdk/client-s3
      },
    }

    const result = validator.validate(config, packageJson)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some((err) => err.includes('@gravito/stasis'))).toBe(true)
    expect(result.errors.some((err) => err.includes('@aws-sdk/client-s3'))).toBe(true)
  })
})
