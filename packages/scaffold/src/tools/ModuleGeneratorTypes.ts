/**
 * Types for Module Generation
 */

/**
 * Module generation context with all required information
 */
export interface ModuleGenerationContext {
  /** Project root directory */
  projectRoot: string

  /** Module name (e.g., "Payment") */
  moduleName: string

  /** Module name in kebab-case (e.g., "payment") */
  moduleNameKebabCase: string

  /** DDD module type */
  dddType: 'simple' | 'advanced' | 'cqrs-query'

  /** Target directory for the module */
  targetDir: string

  /** List of modules this one depends on */
  dependsOn?: string[]

  /** Domain events to subscribe to */
  subscribesTo?: string[]

  /** Package manager (bun, npm, yarn, pnpm) */
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm'

  /** Whether to skip test generation */
  skipTests?: boolean
}

/**
 * Result of module generation
 */
export interface GenerationResult {
  success: boolean
  modulePath: string
  filesCreated: string[]
  errors?: string[]
}

/**
 * File to be created in module
 */
export interface GeneratedFile {
  path: string
  content: string
  isTemplate?: boolean
}

/**
 * Module layer structure
 */
export type ModuleLayer = 'Domain' | 'Application' | 'Presentation' | 'Infrastructure'

/**
 * Domain layer components
 */
export interface DomainLayerStructure {
  entities: string[]
  valueObjects: string[]
  repositories: string[]
  services: string[]
  events?: string[]
}

/**
 * Application layer components
 */
export interface ApplicationLayerStructure {
  services: string[]
  dtos: string[]
}

/**
 * Presentation layer components
 */
export interface PresentationLayerStructure {
  controllers: string[]
  resources: string[]
  routes: string[]
}

/**
 * Infrastructure layer components
 */
export interface InfrastructureLayerStructure {
  repositories: string[]
  subscribers?: string[]
}

/**
 * Complete module structure
 */
export interface ModuleStructure {
  modulePath: string
  domain: DomainLayerStructure
  application: ApplicationLayerStructure
  presentation: PresentationLayerStructure
  infrastructure: InfrastructureLayerStructure
  indexFile: string
}
