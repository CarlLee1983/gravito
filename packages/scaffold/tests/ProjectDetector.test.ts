import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { ProjectDetector } from '../src/tools/ProjectDetector'

describe('ProjectDetector', () => {
  const testDir = './test-project-detector'

  beforeEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('detectProject', () => {
    test('should detect a valid Gravito DDD project', async () => {
      // Create minimal Gravito project structure
      const srcDir = path.join(testDir, 'src')
      const modulesDir = path.join(srcDir, 'Modules')
      fs.mkdirSync(modulesDir, { recursive: true })

      // Create a sample module
      fs.mkdirSync(path.join(modulesDir, 'Health'), { recursive: true })

      // Create necessary project files
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          type: 'module',
        })
      )

      fs.writeFileSync(
        path.join(testDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      )

      const detector = new ProjectDetector()
      const projectInfo = await detector.detectProject(testDir)

      expect(projectInfo).toBeDefined()
      expect(projectInfo.isGravitoDdd).toBe(true)
      expect(projectInfo.architecture).toBe('ddd')
      expect(Array.isArray(projectInfo.modules)).toBe(true)
    })

    test('should return false for non-Gravito projects', async () => {
      // Create minimal non-Gravito structure
      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'non-gravito-project',
        })
      )

      const detector = new ProjectDetector()
      const projectInfo = await detector.detectProject(testDir)

      expect(projectInfo.isGravitoDdd).toBe(false)
    })

    test('should list existing modules', async () => {
      // Create project with multiple modules
      const modulesDir = path.join(testDir, 'src', 'Modules')
      fs.mkdirSync(path.join(modulesDir, 'Health'), { recursive: true })
      fs.mkdirSync(path.join(modulesDir, 'Auth'), { recursive: true })
      fs.mkdirSync(path.join(modulesDir, 'User'), { recursive: true })

      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
        })
      )

      const detector = new ProjectDetector()
      const projectInfo = await detector.detectProject(testDir)

      expect(projectInfo.modules).toContain('Health')
      expect(projectInfo.modules).toContain('Auth')
      expect(projectInfo.modules).toContain('User')
      expect(projectInfo.modules.length).toBe(3)
    })
  })

  describe('moduleExists', () => {
    test('should return true for existing module', async () => {
      const modulesDir = path.join(testDir, 'src', 'Modules', 'Payment')
      fs.mkdirSync(modulesDir, { recursive: true })

      const detector = new ProjectDetector()
      const exists = await detector.moduleExists(testDir, 'Payment')

      expect(exists).toBe(true)
    })

    test('should return false for non-existing module', async () => {
      fs.mkdirSync(path.join(testDir, 'src', 'Modules'), { recursive: true })

      const detector = new ProjectDetector()
      const exists = await detector.moduleExists(testDir, 'NonExistent')

      expect(exists).toBe(false)
    })

    test('should be case-sensitive', async () => {
      const modulesDir = path.join(testDir, 'src', 'Modules', 'Payment')
      fs.mkdirSync(modulesDir, { recursive: true })

      const detector = new ProjectDetector()
      const existsLower = await detector.moduleExists(testDir, 'payment')
      const existsCorrect = await detector.moduleExists(testDir, 'Payment')

      expect(existsCorrect).toBe(true)
      expect(existsLower).toBe(false)
    })
  })

  describe('getExistingModules', () => {
    test('should return module information', async () => {
      // Create modules with some structure
      const healthDir = path.join(testDir, 'src', 'Modules', 'Health')
      fs.mkdirSync(path.join(healthDir, 'Domain'), { recursive: true })
      fs.mkdirSync(path.join(healthDir, 'Application'), { recursive: true })

      fs.writeFileSync(path.join(healthDir, 'index.ts'), 'export {}')

      const detector = new ProjectDetector()
      const modules = await detector.getExistingModules(testDir)

      expect(Array.isArray(modules)).toBe(true)
      expect(modules.length).toBeGreaterThan(0)

      const healthModule = modules.find((m) => m.name === 'Health')
      expect(healthModule).toBeDefined()
      expect(healthModule?.path).toBeDefined()
    })

    test('should handle empty modules directory', async () => {
      fs.mkdirSync(path.join(testDir, 'src', 'Modules'), { recursive: true })

      const detector = new ProjectDetector()
      const modules = await detector.getExistingModules(testDir)

      expect(Array.isArray(modules)).toBe(true)
      expect(modules.length).toBe(0)
    })
  })

  describe('detectPackageManager', () => {
    test('should detect bun via bun.lockb', async () => {
      fs.writeFileSync(path.join(testDir, 'bun.lockb'), '')

      const detector = new ProjectDetector()
      const pm = await detector.detectPackageManager(testDir)

      expect(pm).toBe('bun')
    })

    test('should detect npm via package-lock.json', async () => {
      fs.writeFileSync(path.join(testDir, 'package-lock.json'), '{}')

      const detector = new ProjectDetector()
      const pm = await detector.detectPackageManager(testDir)

      expect(pm).toBe('npm')
    })

    test('should detect yarn via yarn.lock', async () => {
      fs.writeFileSync(path.join(testDir, 'yarn.lock'), '')

      const detector = new ProjectDetector()
      const pm = await detector.detectPackageManager(testDir)

      expect(pm).toBe('yarn')
    })

    test('should detect pnpm via pnpm-lock.yaml', async () => {
      fs.writeFileSync(path.join(testDir, 'pnpm-lock.yaml'), '')

      const detector = new ProjectDetector()
      const pm = await detector.detectPackageManager(testDir)

      expect(pm).toBe('pnpm')
    })

    test('should default to bun when no lock file found', async () => {
      const detector = new ProjectDetector()
      const pm = await detector.detectPackageManager(testDir)

      expect(pm).toBe('bun')
    })
  })

  describe('validateModuleName', () => {
    test('should validate correct module names', async () => {
      const detector = new ProjectDetector()

      expect(detector.validateModuleName('Payment')).toBe(true)
      expect(detector.validateModuleName('UserAuth')).toBe(true)
      expect(detector.validateModuleName('OrderProcessing')).toBe(true)
    })

    test('should reject invalid module names', async () => {
      const detector = new ProjectDetector()

      expect(detector.validateModuleName('payment')).toBe(false) // lowercase
      expect(detector.validateModuleName('123Module')).toBe(false) // starts with number
      expect(detector.validateModuleName('Module-Name')).toBe(false) // contains hyphen
      expect(detector.validateModuleName('module name')).toBe(false) // contains space
    })
  })
})
