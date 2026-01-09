/**
 * Scaffold - Main API for project scaffolding
 *
 * Provides a unified interface for generating project structures
 * with different architectural patterns.
 */

import path from 'node:path'
import { ActionDomainGenerator } from './generators/ActionDomainGenerator'
import { BaseGenerator } from './generators/BaseGenerator'
import { CleanArchitectureGenerator } from './generators/CleanArchitectureGenerator'
import { DddGenerator } from './generators/DddGenerator'
import { EnterpriseMvcGenerator } from './generators/EnterpriseMvcGenerator'
import { SatelliteGenerator } from './generators/SatelliteGenerator'
import { LockGenerator } from './LockGenerator'
import { ProfileResolver } from './ProfileResolver'
import type { ArchitectureType, ScaffoldOptions, ScaffoldResult } from './types'

export class Scaffold {
  private templatesDir: string
  private verbose: boolean

  constructor(options: { templatesDir?: string; verbose?: boolean } = {}) {
    this.templatesDir = options.templatesDir ?? path.resolve(__dirname, '../templates')
    this.verbose = options.verbose ?? false
  }

  /**
   * Get all available architecture types.
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
        type: 'satellite',
        name: 'Gravito Satellite',
        description: 'Plug-and-play module for the Gravito ecosystem',
      },
    ]
  }

  /**
   * Create a new project scaffold.
   */
  async create(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const generator = this.createGenerator(options.architecture)
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
   * Create a generator for the specified architecture.
   */
  private createGenerator(type: ArchitectureType): BaseGenerator {
    const config = {
      templatesDir: this.templatesDir,
      verbose: this.verbose,
    }

    switch (type) {
      case 'enterprise-mvc':
        return new EnterpriseMvcGenerator(config)
      case 'clean':
        return new CleanArchitectureGenerator(config)
      case 'ddd':
        return new DddGenerator(config)
      case 'action-domain':
        return new ActionDomainGenerator(config)
      case 'satellite':
        return new SatelliteGenerator(config)
      default:
        throw new Error(`Unknown architecture type: ${type}`)
    }
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
