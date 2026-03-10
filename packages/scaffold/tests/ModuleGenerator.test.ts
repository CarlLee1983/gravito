import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { ModuleGenerator } from '../src/tools/ModuleGenerator'
import type { ModuleGenerationContext } from '../src/tools/ModuleGeneratorTypes'

describe('ModuleGenerator', () => {
  const testProjectDir = './test-module-gen-project'
  const modulesDir = path.join(testProjectDir, 'src', 'Modules')

  beforeEach(() => {
    // Clean up
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true })
    }
    // Create test project structure
    fs.mkdirSync(modulesDir, { recursive: true })
    fs.writeFileSync(
      path.join(testProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
      })
    )
  })

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true })
    }
  })

  describe('generate()', () => {
    test('should generate simple module structure', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'Payment',
        moduleNameKebabCase: 'payment',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'Payment'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      const result = await generator.generate(context)

      expect(result.success).toBe(true)
      expect(result.filesCreated.length).toBeGreaterThan(0)
      expect(result.modulePath).toBe(context.targetDir)
    })

    test('should generate advanced module with event sourcing', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'Payment',
        moduleNameKebabCase: 'payment',
        dddType: 'advanced',
        targetDir: path.join(modulesDir, 'Payment'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      const result = await generator.generate(context)

      expect(result.success).toBe(true)
      expect(result.filesCreated.length).toBeGreaterThan(0)

      // Verify event sourcing files exist
      const eventsDir = path.join(context.targetDir, 'Domain', 'Events')
      expect(fs.existsSync(eventsDir)).toBe(true)
    })

    test('should generate CQRS query module', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'Analytics',
        moduleNameKebabCase: 'analytics',
        dddType: 'cqrs-query',
        targetDir: path.join(modulesDir, 'Analytics'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      const result = await generator.generate(context)

      expect(result.success).toBe(true)
      expect(result.filesCreated.length).toBeGreaterThan(0)

      // Verify CQRS query files exist
      const readModelsDir = path.join(context.targetDir, 'Domain', 'ReadModels')
      expect(
        fs.existsSync(readModelsDir) ||
          fs.existsSync(path.join(context.targetDir, 'Application', 'ReadModels'))
      ).toBe(true)
    })
  })

  describe('Domain layer generation', () => {
    test('should create Domain directory structure', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const domainDir = path.join(context.targetDir, 'Domain')
      expect(fs.existsSync(domainDir)).toBe(true)

      // Check subdirectories
      expect(fs.existsSync(path.join(domainDir, 'Entities'))).toBe(true)
      expect(fs.existsSync(path.join(domainDir, 'ValueObjects'))).toBe(true)
      expect(fs.existsSync(path.join(domainDir, 'Repositories'))).toBe(true)
    })

    test('should create aggregate root entity', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const aggregateFile = path.join(context.targetDir, 'Domain', 'Entities', 'User.ts')
      expect(fs.existsSync(aggregateFile)).toBe(true)

      const content = fs.readFileSync(aggregateFile, 'utf-8')
      expect(content).toContain('User')
      expect(content).toContain('AggregateRoot')
    })

    test('should create value objects', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const voDir = path.join(context.targetDir, 'Domain', 'ValueObjects')
      const files = fs.readdirSync(voDir)

      expect(files.length).toBeGreaterThan(0)
      // Should have at least one ValueObject file
      expect(files.some((f) => f.includes('ValueObject'))).toBe(true)
    })

    test('should create repository interface', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const repoFile = path.join(context.targetDir, 'Domain', 'Repositories', `IUserRepository.ts`)
      expect(fs.existsSync(repoFile)).toBe(true)

      const content = fs.readFileSync(repoFile, 'utf-8')
      expect(content).toContain('IUserRepository')
      expect(content).toContain('interface')
    })
  })

  describe('Application layer generation', () => {
    test('should create Application directory structure', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const appDir = path.join(context.targetDir, 'Application')
      expect(fs.existsSync(appDir)).toBe(true)
      expect(fs.existsSync(path.join(appDir, 'Services'))).toBe(true)
      expect(fs.existsSync(path.join(appDir, 'DTOs'))).toBe(true)
    })

    test('should create application service', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const serviceDir = path.join(context.targetDir, 'Application', 'Services')
      const files = fs.readdirSync(serviceDir)

      expect(files.length).toBeGreaterThan(0)
      expect(files.some((f) => f.includes('Service.ts'))).toBe(true)
    })

    test('should create DTOs', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const dtoDir = path.join(context.targetDir, 'Application', 'DTOs')
      const files = fs.readdirSync(dtoDir)

      expect(files.length).toBeGreaterThan(0)
      expect(files.some((f) => f.includes('DTO.ts'))).toBe(true)
    })
  })

  describe('Presentation layer generation', () => {
    test('should create Presentation directory structure', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const presentationDir = path.join(context.targetDir, 'Presentation')
      expect(fs.existsSync(presentationDir)).toBe(true)
      expect(fs.existsSync(path.join(presentationDir, 'Controllers'))).toBe(true)
      expect(fs.existsSync(path.join(presentationDir, 'Routes'))).toBe(true)
    })

    test('should create HTTP controller', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const controllerDir = path.join(context.targetDir, 'Presentation', 'Controllers')
      const files = fs.readdirSync(controllerDir)

      expect(files.length).toBeGreaterThan(0)
      expect(files.some((f) => f.includes('Controller.ts'))).toBe(true)
    })

    test('should create routes', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const routesFile = path.join(context.targetDir, 'Presentation', 'Routes', 'user.routes.ts')
      expect(fs.existsSync(routesFile)).toBe(true)

      const content = fs.readFileSync(routesFile, 'utf-8')
      expect(content).toContain('register')
      expect(content).toContain('routes')
    })
  })

  describe('Infrastructure layer generation', () => {
    test('should create Infrastructure directory structure', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const infraDir = path.join(context.targetDir, 'Infrastructure')
      expect(fs.existsSync(infraDir)).toBe(true)
      expect(fs.existsSync(path.join(infraDir, 'Repositories'))).toBe(true)
    })

    test('should create repository implementation', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const repoFile = path.join(
        context.targetDir,
        'Infrastructure',
        'Repositories',
        'UserRepository.ts'
      )
      expect(fs.existsSync(repoFile)).toBe(true)

      const content = fs.readFileSync(repoFile, 'utf-8')
      expect(content).toContain('UserRepository')
      expect(content).toContain('implements')
    })
  })

  describe('Module index file', () => {
    test('should create module index.ts with exports', async () => {
      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'User'),
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      await generator.generate(context)

      const indexFile = path.join(context.targetDir, 'index.ts')
      expect(fs.existsSync(indexFile)).toBe(true)

      const content = fs.readFileSync(indexFile, 'utf-8')
      expect(content).toContain('export')
    })
  })

  describe('Error handling', () => {
    test('should fail if module already exists', async () => {
      const targetDir = path.join(modulesDir, 'User')
      fs.mkdirSync(targetDir, { recursive: true })

      const context: ModuleGenerationContext = {
        projectRoot: testProjectDir,
        moduleName: 'User',
        moduleNameKebabCase: 'user',
        dddType: 'simple',
        targetDir,
        packageManager: 'bun',
      }

      const generator = new ModuleGenerator()
      const result = await generator.generate(context)

      expect(result.success).toBe(false)
      expect(result.errors?.length).toBeGreaterThan(0)
    })

    test('should fail if invalid context provided', async () => {
      const context = {
        projectRoot: testProjectDir,
        moduleName: '',
        moduleNameKebabCase: 'test',
        dddType: 'simple',
        targetDir: path.join(modulesDir, 'Test'),
        packageManager: 'bun',
      } as any

      const generator = new ModuleGenerator()
      const result = await generator.generate(context)

      expect(result.success).toBe(false)
    })
  })
})
