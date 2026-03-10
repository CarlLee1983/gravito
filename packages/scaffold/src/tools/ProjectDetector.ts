import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Module information
 */
export interface ModuleInfo {
  name: string
  path: string
  hasDomain: boolean
  hasApplication: boolean
  hasPresentation: boolean
  hasInfrastructure: boolean
}

/**
 * Project information
 */
export interface ProjectInfo {
  isGravitoDdd: boolean
  architecture?: string
  modules: string[]
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm'
  config?: Record<string, unknown>
}

/**
 * Detects and analyzes Gravito DDD projects
 */
export class ProjectDetector {
  /**
   * Detects if current directory is a Gravito DDD project
   */
  async detectProject(projectRoot: string): Promise<ProjectInfo> {
    const isGravitoDdd = await this.isGravitoDddProject(projectRoot)

    if (!isGravitoDdd) {
      return {
        isGravitoDdd: false,
        modules: [],
        packageManager: await this.detectPackageManager(projectRoot),
      }
    }

    const modules = await this.listModuleNames(projectRoot)
    const packageManager = await this.detectPackageManager(projectRoot)

    return {
      isGravitoDdd: true,
      architecture: 'ddd',
      modules,
      packageManager,
    }
  }

  /**
   * Checks if a module already exists in the project
   * Performs case-sensitive check
   */
  async moduleExists(projectRoot: string, moduleName: string): Promise<boolean> {
    const modulesDir = path.join(projectRoot, 'src', 'Modules')

    try {
      const entries = await fs.promises.readdir(modulesDir)
      // Case-sensitive check
      return entries.includes(moduleName)
    } catch {
      return false
    }
  }

  /**
   * Lists all existing modules in the project
   */
  async getExistingModules(projectRoot: string): Promise<ModuleInfo[]> {
    const modulesDir = path.join(projectRoot, 'src', 'Modules')

    try {
      const entries = await fs.promises.readdir(modulesDir, {
        withFileTypes: true,
      })

      const modules: ModuleInfo[] = []

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const modulePath = path.join(modulesDir, entry.name)
        const subDirs = await fs.promises.readdir(modulePath, {
          withFileTypes: true,
        })
        const subDirNames = subDirs.filter((d) => d.isDirectory()).map((d) => d.name)

        modules.push({
          name: entry.name,
          path: modulePath,
          hasDomain: subDirNames.includes('Domain'),
          hasApplication: subDirNames.includes('Application'),
          hasPresentation: subDirNames.includes('Presentation'),
          hasInfrastructure: subDirNames.includes('Infrastructure'),
        })
      }

      return modules
    } catch {
      return []
    }
  }

  /**
   * Detects the package manager used in the project
   */
  async detectPackageManager(projectRoot: string): Promise<'bun' | 'npm' | 'yarn' | 'pnpm'> {
    const lockFiles = [
      { file: 'bun.lockb', manager: 'bun' as const },
      { file: 'package-lock.json', manager: 'npm' as const },
      { file: 'yarn.lock', manager: 'yarn' as const },
      { file: 'pnpm-lock.yaml', manager: 'pnpm' as const },
    ]

    for (const { file, manager } of lockFiles) {
      const lockPath = path.join(projectRoot, file)
      try {
        await fs.promises.access(lockPath)
        return manager
      } catch {
        // File doesn't exist, try next
      }
    }

    // Default to bun
    return 'bun'
  }

  /**
   * Validates a module name format
   * Rules: Must start with uppercase letter, contain only alphanumeric
   */
  validateModuleName(moduleName: string): boolean {
    // Must start with uppercase letter
    if (!/^[A-Z]/.test(moduleName)) return false

    // Can only contain alphanumeric characters
    if (!/^[A-Za-z0-9]+$/.test(moduleName)) return false

    // Must be at least 2 characters
    if (moduleName.length < 2) return false

    return true
  }

  /**
   * Checks if directory is a Gravito DDD project
   * Criteria:
   *   - Has src/Modules directory
   *   - Has package.json
   *   - Has at least one module
   */
  private async isGravitoDddProject(projectRoot: string): Promise<boolean> {
    try {
      // Check package.json exists
      const packageJsonPath = path.join(projectRoot, 'package.json')
      await fs.promises.access(packageJsonPath)

      // Check src/Modules directory exists
      const modulesDir = path.join(projectRoot, 'src', 'Modules')
      const stats = await fs.promises.stat(modulesDir)

      if (!stats.isDirectory()) return false

      // Check at least one module exists
      const entries = await fs.promises.readdir(modulesDir, {
        withFileTypes: true,
      })
      const hasModules = entries.some((e) => e.isDirectory())

      return hasModules
    } catch {
      return false
    }
  }

  /**
   * Lists module names in src/Modules
   */
  private async listModuleNames(projectRoot: string): Promise<string[]> {
    const modulesDir = path.join(projectRoot, 'src', 'Modules')

    try {
      const entries = await fs.promises.readdir(modulesDir, {
        withFileTypes: true,
      })

      return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    } catch {
      return []
    }
  }
}
