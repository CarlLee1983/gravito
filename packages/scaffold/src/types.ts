/**
 * Architecture patterns supported by the scaffolding engine.
 *
 * @public
 * @since 3.0.0
 */
export type ArchitectureType =
  | 'enterprise-mvc'
  | 'clean'
  | 'ddd'
  | 'satellite'
  | 'action-domain'
  | 'standalone-engine'

/**
 * Configuration options for creating a new project via Scaffold.
 *
 * @public
 * @since 3.0.0
 */
export interface ScaffoldOptions {
  /** The name of the new project (e.g., 'my-api'). */
  name: string

  /** Absolute path where the project files should be generated. */
  targetDir: string

  /** The primary architectural pattern to apply. */
  architecture: ArchitectureType

  /** Preferred package manager for dependency installation. @default 'bun' */
  packageManager?: 'bun' | 'npm' | 'yarn' | 'pnpm'

  /** Whether to run `git init` in the target directory. @default true */
  initGit?: boolean

  /** Whether to automatically run `install` after file generation. @default true */
  installDeps?: boolean

  /** If true, includes the Spectrum observability dashboard in the scaffolded app. */
  withSpectrum?: boolean

  /** Internal flag for official Gravito satellite projects. */
  isInternal?: boolean

  /** Selected project profile determining the set of included orbits/packages. */
  profile?: 'core' | 'scale' | 'enterprise'

  /** List of additional feature orbits to include (e.g., 'redis', 'queue', 'otel'). */
  features?: string[]

  /** Additional template variables to be used during file generation. */
  context?: Record<string, unknown>
}

/**
 * The outcome of a scaffolding operation.
 *
 * @public
 * @since 3.0.0
 */
export interface ScaffoldResult {
  /** True if the operation completed without fatal errors. */
  success: boolean
  /** The absolute path where the project was created. */
  targetDir: string
  /** List of relative file paths that were successfully generated. */
  filesCreated: string[]
  /** Any non-fatal error messages encountered during generation. */
  errors?: string[]
}

/**
 * Represents a node in the project file structure blueprint.
 *
 * Used to define the skeleton of a new project before generation.
 *
 * @public
 * @since 3.0.0
 */
export interface DirectoryNode {
  /** The type of node (file vs folder). */
  type: 'file' | 'directory'
  /** The name of the file or directory. */
  name: string
  /** Literal string content if this is a file node. */
  content?: string
  /** The name or path of a template to use for this file's content. */
  template?: string
  /** Nested nodes if this is a directory. */
  children?: DirectoryNode[]
}
