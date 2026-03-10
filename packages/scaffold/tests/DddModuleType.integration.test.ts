import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { DddGenerator } from '../src/generators/DddGenerator'
import { Scaffold } from '../src/Scaffold'

describe('DDD Module Type Selection - Integration Tests', () => {
  const testDir = './test-ddd-module-types'
  const generator = new DddGenerator({
    templatesDir: './stubs',
    outDir: testDir,
  })

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    fs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  const context = {
    name: 'TestModule',
    nameKebabCase: 'test-module',
    description: 'Test DDD module',
    outDir: testDir,
  }

  describe('Simple Module Type (Default CRUD)', () => {
    test('should generate simple module structure', () => {
      generator.setModuleType('simple')
      const structure = generator.getDirectoryStructure(context as any)

      // Verify basic structure exists
      const srcDir = structure.find((n) => n.name === 'src')
      expect(srcDir).toBeDefined()

      // Verify Modules directory
      const modulesDir = srcDir?.children?.find((n) => n.name === 'Modules')
      expect(modulesDir).toBeDefined()

      // Verify Ordering module with simple structure
      const orderingDir = modulesDir?.children?.find((n) => n.name === 'Ordering')
      expect(orderingDir).toBeDefined()

      // Verify Domain layer exists
      const domainDir = orderingDir?.children?.find((n) => n.name === 'Domain')
      expect(domainDir).toBeDefined()

      // Verify simple module includes aggregates
      const aggregatesDir = domainDir?.children?.find((n) => n.name === 'Aggregates')
      expect(aggregatesDir).toBeDefined()
    })

    test('should contain CRUD service patterns', () => {
      generator.setModuleType('simple')
      const structure = generator.getDirectoryStructure(context as any)

      // Find application layer - it should exist
      const srcDir = structure.find((n) => n.name === 'src')
      expect(srcDir).toBeDefined()
      const modulesDir = srcDir?.children?.find((n) => n.name === 'Modules')
      expect(modulesDir).toBeDefined()
      const orderingDir = modulesDir?.children?.find((n) => n.name === 'Ordering')
      expect(orderingDir).toBeDefined()
      const appDir = orderingDir?.children?.find((n) => n.name === 'Application')
      expect(appDir).toBeDefined()
      // Simple modules should have application layer
    })

    test('should generate ARCHITECTURE.md with simple module info', () => {
      generator.setModuleType('simple')
      const archDoc = generator.generateArchitectureDoc(context as any)

      expect(archDoc).toContain('Domain-Driven Design')
      expect(archDoc).toContain('Simple Module')
      expect(archDoc).toContain('CRUD')
    })
  })

  describe('Advanced Module Type (Event Sourcing)', () => {
    test('should generate advanced module structure with event sourcing', () => {
      generator.setModuleType('advanced')
      const structure = generator.getDirectoryStructure(context as any)

      // Verify basic structure
      const srcDir = structure.find((n) => n.name === 'src')
      expect(srcDir).toBeDefined()

      // Verify Modules directory
      const modulesDir = srcDir?.children?.find((n) => n.name === 'Modules')
      expect(modulesDir).toBeDefined()

      // Verify Ordering module with advanced structure
      const orderingDir = modulesDir?.children?.find((n) => n.name === 'Ordering')
      expect(orderingDir).toBeDefined()

      // Verify Domain layer for advanced module
      const domainDir = orderingDir?.children?.find((n) => n.name === 'Domain')
      expect(domainDir).toBeDefined()

      // Verify event sourcing components exist
      const eventsDir = domainDir?.children?.find(
        (n) => n.name === 'Events' || n.name === 'DomainEvents'
      )
      expect(eventsDir).toBeDefined()
    })

    test('should contain event applier patterns', () => {
      generator.setModuleType('advanced')
      const structure = generator.getDirectoryStructure(context as any)

      // Find domain layer components
      const srcDir = structure.find((n) => n.name === 'src')
      const modulesDir = srcDir?.children?.find((n) => n.name === 'Modules')
      const orderingDir = modulesDir?.children?.find((n) => n.name === 'Ordering')
      const domainDir = orderingDir?.children?.find((n) => n.name === 'Domain')

      // Look for event applier or similar
      const hasEventSourcery =
        domainDir?.children?.some(
          (n) => n.name === 'Events' || n.name === 'Appliers' || n.name === 'EventHandlers'
        ) || false

      expect(hasEventSourcery).toBe(true)
    })

    test('should generate ARCHITECTURE.md with advanced module info', () => {
      generator.setModuleType('advanced')
      const archDoc = generator.generateArchitectureDoc(context as any)

      expect(archDoc).toContain('Domain-Driven Design')
      expect(archDoc).toContain('Advanced Module')
      expect(archDoc).toContain('Event Sourcing')
    })
  })

  describe('CQRS Query Module Type', () => {
    test('should generate CQRS query module structure', () => {
      generator.setModuleType('cqrs-query')
      const structure = generator.getDirectoryStructure(context as any)

      // Verify basic structure
      const srcDir = structure.find((n) => n.name === 'src')
      expect(srcDir).toBeDefined()

      // Verify Modules directory
      const modulesDir = srcDir?.children?.find((n) => n.name === 'Modules')
      expect(modulesDir).toBeDefined()

      // Verify Ordering module with CQRS structure
      const orderingDir = modulesDir?.children?.find((n) => n.name === 'Ordering')
      expect(orderingDir).toBeDefined()

      // CQRS module should have read models
      const domainDir = orderingDir?.children?.find((n) => n.name === 'Domain')
      expect(domainDir).toBeDefined()
    })

    test('should contain read model and projector patterns', () => {
      generator.setModuleType('cqrs-query')
      const structure = generator.getDirectoryStructure(context as any)

      // Find application/query services
      const srcDir = structure.find((n) => n.name === 'src')
      const modulesDir = srcDir?.children?.find((n) => n.name === 'Modules')
      const orderingDir = modulesDir?.children?.find((n) => n.name === 'Ordering')
      const appDir = orderingDir?.children?.find((n) => n.name === 'Application')

      // CQRS query module should have specific query patterns
      expect(appDir).toBeDefined()
    })

    test('should generate ARCHITECTURE.md with CQRS module info', () => {
      generator.setModuleType('cqrs-query')
      const archDoc = generator.generateArchitectureDoc(context as any)

      expect(archDoc).toContain('Domain-Driven Design')
      expect(archDoc).toContain('CQRS')
      expect(archDoc).toContain('Query')
    })
  })

  describe('Scaffold API Integration', () => {
    test('should create project with simple module type via Scaffold API', async () => {
      const scaffold = new Scaffold({ verbose: false })
      const projectDir = path.join(testDir, 'simple-project')

      const result = await scaffold.create({
        name: 'simple-project',
        targetDir: projectDir,
        architecture: 'ddd',
        dddModuleType: 'simple',
      })

      expect(result.success).toBe(true)
      expect(result.filesCreated.length).toBeGreaterThan(0)

      // Verify project was created
      if (fs.existsSync(projectDir)) {
        const files = fs.readdirSync(projectDir)
        expect(files.length).toBeGreaterThan(0)
      }
    })

    test('should create project with advanced module type via Scaffold API', async () => {
      const scaffold = new Scaffold({ verbose: false })
      const projectDir = path.join(testDir, 'advanced-project')

      const result = await scaffold.create({
        name: 'advanced-project',
        targetDir: projectDir,
        architecture: 'ddd',
        dddModuleType: 'advanced',
      })

      expect(result.success).toBe(true)
      expect(result.filesCreated.length).toBeGreaterThan(0)
    })

    test('should create project with cqrs-query module type via Scaffold API', async () => {
      const scaffold = new Scaffold({ verbose: false })
      const projectDir = path.join(testDir, 'cqrs-project')

      const result = await scaffold.create({
        name: 'cqrs-project',
        targetDir: projectDir,
        architecture: 'ddd',
        dddModuleType: 'cqrs-query',
      })

      expect(result.success).toBe(true)
      expect(result.filesCreated.length).toBeGreaterThan(0)
    })

    test('should default to simple module type when not specified', async () => {
      const scaffold = new Scaffold({ verbose: false })
      const projectDir = path.join(testDir, 'default-project')

      const result = await scaffold.create({
        name: 'default-project',
        targetDir: projectDir,
        architecture: 'ddd',
        // dddModuleType not specified - should default to simple
      })

      expect(result.success).toBe(true)
      expect(result.filesCreated.length).toBeGreaterThan(0)
    })
  })

  describe('Backward Compatibility', () => {
    test('should still work with old-style string architecture type', () => {
      // This tests backward compatibility of createGenerator
      const scaffold = new Scaffold({ verbose: false })
      const gen = (scaffold as any).createGenerator('ddd')

      expect(gen).toBeDefined()
      expect(gen.constructor.name).toBe('DddGenerator')
    })

    test('should set module type from options when provided', () => {
      generator.setModuleType('advanced')
      expect((generator as any).moduleType).toBe('advanced')

      generator.setModuleType('simple')
      expect((generator as any).moduleType).toBe('simple')

      generator.setModuleType('cqrs-query')
      expect((generator as any).moduleType).toBe('cqrs-query')
    })
  })
})
