import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ActionDomainGenerator } from './generators/ActionDomainGenerator'
import { BaseGenerator } from './generators/BaseGenerator'
import { CleanArchitectureGenerator } from './generators/CleanArchitectureGenerator'
import { DddGenerator } from './generators/DddGenerator'
import { EnterpriseMvcGenerator } from './generators/EnterpriseMvcGenerator'
import { SatelliteGenerator } from './generators/SatelliteGenerator'
import { StandaloneEngineGenerator } from './generators/StandaloneEngineGenerator'
import { LockGenerator } from './LockGenerator'
import { ProfileResolver } from './ProfileResolver'
import type { ArchitectureType, ScaffoldOptions, ScaffoldResult } from './types'

/**
 * Scaffold is the primary engine for generating Gravito project structures.
 *
 * It orchestrates dynamic template generation, architecture patterns,
 * profile resolution, and environment setup.
 *
 * @example
 * ```typescript
 * const engine = new Scaffold();
 * const result = await engine.create({
 *   name: 'new-app',
 *   targetDir: '/path/to/app',
 *   architecture: 'enterprise-mvc'
 * });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class Scaffold {
  private templatesDir: string
  private verbose: boolean
  private static readonly packageDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  )

  constructor(options: { templatesDir?: string; verbose?: boolean } = {}) {
    this.templatesDir = options.templatesDir ?? path.resolve(Scaffold.packageDir, 'templates')
    this.verbose = options.verbose ?? false
  }

  /**
   * Returns a list of all architectural patterns supported by the engine,
   * along with human-readable names and descriptions.
   *
   * @returns {Array<{type: ArchitectureType, name: string, description: string}>}
   */
  getArchitectureTypes(): Array<{
    type: ArchitectureType
    name: string
    description: string
  }> {
    return [
      {
        type: 'enterprise-mvc',
        name: 'Enterprise MVC',
        description: 'Laravel-inspired MVC with Services and Repositories',
      },
      {
        type: 'clean',
        name: 'Clean Architecture',
        description: "Uncle Bob's Clean Architecture with strict dependency rules",
      },
      {
        type: 'ddd',
        name: 'Domain-Driven Design',
        description: 'Full DDD with Bounded Contexts and CQRS',
      },
      {
        type: 'action-domain',
        name: 'Action Domain',
        description: 'Single Action Controllers pattern for high-clarity APIs',
      },
      {
        type: 'standalone-engine',
        name: 'Standalone Engine',
        description: 'High-performance pure Gravito Engine (minimal)',
      },
      {
        type: 'satellite',
        name: 'Gravito Satellite',
        description: 'Plug-and-play module for the Gravito ecosystem',
      },
    ]
  }

  /**
   * Orchestrates the complete project generation lifecycle.
   * This includes directory creation, file layout, profile resolution,
   * dependency mapping, and optional post-install hooks.
   *
   * @param {ScaffoldOptions} options - Detailed configuration for the new project.
   * @returns {Promise<ScaffoldResult>}
   */
  async create(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const generator = this.createGenerator(options)
    const fs = await import('node:fs/promises')

    // 1. Resolve Profile
    const profileResolver = new ProfileResolver()
    const profileConfig = profileResolver.resolve(options.profile, options.features)

    const context = BaseGenerator.createContext(
      options.name,
      options.targetDir,
      options.architecture,
      options.packageManager ?? 'bun',
      {
        ...options.context,
        withSpectrum: options.withSpectrum ?? false,
        isInternal: options.isInternal ?? false,
        profile: options.profile ?? 'core',
        features: options.features ?? [],
        profileConfig,
      }
    )

    try {
      const filesCreated = await generator.generate(context)

      // 2. Generate Lock File
      const lockGenerator = new LockGenerator()
      const lockContent = lockGenerator.generate(
        options.profile ?? 'core',
        profileConfig,
        'basic', // Default template for now, should come from options if applicable
        '1.0.0'
      )
      const lockPath = path.resolve(options.targetDir, 'gravito.lock.json')
      await fs.writeFile(lockPath, lockContent, 'utf-8')
      filesCreated.push(lockPath)

      return {
        success: true,
        targetDir: options.targetDir,
        filesCreated,
      }
    } catch (error) {
      return {
        success: false,
        targetDir: options.targetDir,
        filesCreated: [],
        errors: [error instanceof Error ? error.message : String(error)],
      }
    }
  }

  /**
   * Create a generator for the specified architecture with options.
   * @param options - Scaffold options including architecture type and module type for DDD
   */
  private createGenerator(options: ScaffoldOptions | ArchitectureType): BaseGenerator {
    const config = {
      templatesDir: this.templatesDir,
      verbose: this.verbose,
    }

    // Support both old-style (type string) and new-style (ScaffoldOptions object) calls
    const type = typeof options === 'string' ? options : options.architecture

    const generator = (() => {
      switch (type) {
        case 'enterprise-mvc':
          return new EnterpriseMvcGenerator(config)
        case 'clean':
          return new CleanArchitectureGenerator(config)
        case 'ddd': {
          const dddGen = new DddGenerator(config)
          // Set module type for DDD if provided in options
          if (typeof options !== 'string' && options.dddModuleType) {
            dddGen.setModuleType(options.dddModuleType)
          }
          return dddGen
        }
        case 'action-domain':
          return new ActionDomainGenerator(config)
        case 'satellite':
          return new SatelliteGenerator(config)
        case 'standalone-engine':
          return new StandaloneEngineGenerator(config)
        default:
          throw new Error(`Unknown architecture type: ${type}`)
      }
    })()

    return generator
  }

  /**
   * Generate a single module (for DDD bounded context).
   */
  async generateModule(
    _targetDir: string,
    _moduleName: string,
    _options: { architecture?: ArchitectureType } = {}
  ): Promise<ScaffoldResult> {
    // TODO: Implement module generation
    // This would generate a single bounded context for DDD
    // or a feature module for other architectures
    throw new Error('Module generation not yet implemented')
  }

  /**
   * Generate a service provider.
   */
  async generateProvider(_targetDir: string, _providerName: string): Promise<ScaffoldResult> {
    // TODO: Implement provider generation
    throw new Error('Provider generation not yet implemented')
  }
}
