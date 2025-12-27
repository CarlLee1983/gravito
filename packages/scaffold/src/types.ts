/**
 * Architecture types supported by the scaffolding system.
 */
export type ArchitectureType = 'enterprise-mvc' | 'clean' | 'ddd'

/**
 * Options for scaffolding a new project.
 */
export interface ScaffoldOptions {
  /**
   * Project name
   */
  name: string

  /**
   * Target directory (absolute path)
   */
  targetDir: string

  /**
   * Architecture type
   */
  architecture: ArchitectureType

  /**
   * Package manager to use
   * @default 'bun'
   */
  packageManager?: 'bun' | 'npm' | 'yarn' | 'pnpm'

  /**
   * Whether to initialize git
   * @default true
   */
  initGit?: boolean

  /**
   * Whether to install dependencies
   * @default true
   */
  installDeps?: boolean

  /**
   * Whether to include Spectrum debug dashboard
   * @default false
   */
  withSpectrum?: boolean

  /**
   * Additional context variables for templates
   */
  context?: Record<string, unknown>
}

/**
 * Result of scaffolding operation.
 */
export interface ScaffoldResult {
  success: boolean
  targetDir: string
  filesCreated: string[]
  errors?: string[]
}

/**
 * Directory structure node.
 */
export interface DirectoryNode {
  type: 'file' | 'directory'
  name: string
  content?: string
  template?: string
  children?: DirectoryNode[]
}
