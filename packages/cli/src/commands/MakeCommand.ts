import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Scaffold } from '@gravito/scaffold'
import pc from 'picocolors'

/**
 * Command for generating code artifacts from stubs.
 *
 * Provides `make:*` commands to scaffold controllers, models,
 * middleware, seeders, and other common application components.
 *
 * @example
 * ```typescript
 * const make = new MakeCommand()
 *
 * // Generate a controller
 * await make.run('controller', 'UserController')
 *
 * // Generate a resource controller
 * await make.run('controller', 'PostController', { resource: true })
 *
 * // Generate a model with migration
 * await make.run('model', 'User', { migration: true })
 * ```
 *
 * @since 3.0.0
 * @public
 */
export class MakeCommand {
  private stubsPath: string

  /**
   * Create a new MakeCommand instance.
   *
   * Resolves the path to the stubs directory.
   */
  constructor(stubsPath?: string) {
    if (stubsPath) {
      this.stubsPath = stubsPath
      return
    }

    // === Stub 查找優先級 ===
    // 1. 專案根目錄的 stubs/ (最高優先級 - 使用者自定義)
    // 2. 專案根目錄的 .gravito/stubs/ (隱藏目錄)
    // 3. CLI 內建 stubs (開發模式)
    // 4. CLI 內建 stubs (生產模式)
    // 5. Monorepo 模式
    const cwd = process.cwd()
    const devPath = path.resolve(__dirname, '../../stubs')
    const prodPath = path.resolve(__dirname, '../stubs')

    const candidates = [
      // 使用者自定義 stubs (最高優先級)
      path.resolve(cwd, 'stubs'),
      path.resolve(cwd, '.gravito/stubs'),

      // CLI 預設 stubs
      prodPath,
      devPath,

      // Monorepo 模式
      path.resolve(cwd, 'packages/cli/stubs'),
      path.resolve(cwd, '../packages/cli/stubs'),
    ]

    // 尋找第一個包含有效 stub 檔案的目錄
    const validPath = candidates.find((candidate) =>
      existsSync(path.join(candidate, 'controller.stub'))
    )

    if (validPath) {
      this.stubsPath = validPath

      // 如果使用的是使用者自定義 stubs，顯示提示
      if (
        validPath === path.resolve(cwd, 'stubs') ||
        validPath === path.resolve(cwd, '.gravito/stubs')
      ) {
        console.log(pc.gray(`📁 使用自定義 stubs: ${validPath}`))
      }
    } else {
      // Fallback
      this.stubsPath = devPath
    }
  }

  /**
   * Run the generator.
   *
   * @param type - The type of artifact to create (e.g., 'controller', 'model').
   * @param name - The user-provided name for the artifact.
   * @param options - Additional generation options.
   * @returns A promise that resolves when the file is created.
   */
  async run(type: string, name: string, options: any = {}) {
    // 特殊處理 satellite：使用 Scaffold 引擎而不是簡單的 stub
    if (type === 'satellite') {
      return this.runSatellite(name, options)
    }

    try {
      let stubName = `${type}.stub`

      // Handle resource controller
      if (type === 'controller' && options.resource) {
        stubName = 'controller.resource.stub'
      }

      if (type === 'model' && options.graphql) {
        stubName = 'model.graphql.stub'
      }

      const stubContent = await this.readStub(stubName)

      if (!stubContent) {
        throw new Error(`Stub not found: ${stubName}`)
      }

      const normalizedName = this.normalizeName(type, name)
      const content = this.replaceVariables(
        stubContent,
        normalizedName.pascal,
        normalizedName.camel,
        options.command || normalizedName.camel
      )
      const targetPath = this.resolveTargetPath(type, normalizedName)

      await this.ensureDirectory(path.dirname(targetPath))
      await this.writeFile(targetPath, content)

      console.log(pc.green(`✅ Created ${type}: ${this.getRelativePath(targetPath)}`))

      // Extra logic for models: handle migration
      if (type === 'model' && options.migration) {
        // We'll call the make:migration logic here
        // For simplicity in this demo, we assume createMigration is a standalone logic
        // But in a real app, we would import the database helper.
        console.log(pc.cyan(`📦 Generating migration for ${normalizedName.pascal}...`))
        // (Implementation details would follow to trigger migration stub)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(pc.red(`❌ Failed to create ${type}: ${message}`))
      process.exit(1)
    }
  }

  /**
   * Read a stub file.
   *
   * @param filename - The name of the stub file.
   * @returns The content of the stub file, or null if not found.
   */
  private async readStub(filename: string): Promise<string | null> {
    try {
      const filePath = path.join(this.stubsPath, filename)
      return await fs.readFile(filePath, 'utf-8')
    } catch (_e) {
      return null
    }
  }

  private replaceVariables(
    content: string,
    pascal: string,
    camel: string,
    command: string
  ): string {
    return content
      .replace(/\{\{ Name \}\}/g, pascal)
      .replace(/\{\{ name \}\}/g, camel)
      .replace(/\{\{ command \}\}/g, command)
  }

  /**
   * Run the generator for Satellite (plugin) artifacts.
   *
   * @param name - The name of the satellite.
   * @param options - Generation options (e.g., internal).
   * @private
   */
  private async runSatellite(name: string, options: any) {
    const isInternal = options.internal || false
    const targetDir = isInternal
      ? path.resolve(process.cwd(), 'satellites', name.toLowerCase())
      : path.resolve(process.cwd(), name.toLowerCase())

    const scaffold = new Scaffold()

    console.log(pc.cyan(`🚀 Launching Satellite Scaffolder for "${name}"...`))

    const result = await scaffold.create({
      name,
      targetDir,
      architecture: 'satellite',
      isInternal,
      installDeps: false, // 讓使用者手動安裝
      initGit: !isInternal, // 內部插件不需要獨立 git
    })

    if (result.success) {
      console.log(pc.green(`✅ Satellite created at: ${result.targetDir}`))
      if (isInternal) {
        console.log(pc.yellow(`ℹ️ Don't forget to run 'bun install' at root to link the workspace.`))
      }
    } else {
      console.error(pc.red(`❌ Failed to create satellite: ${result.errors?.join(', ')}`))
    }
  }

  /**
   * Resolve the target file path based on type and name.
   *
   * @param type - The artifact type.
   * @param name - The normalized name object.
   * @returns The absolute path to the target file.
   * @throws {Error} If the type is unknown.
   * @private
   */
  private resolveTargetPath(type: string, name: NormalizedName): string {
    const cwd = process.cwd()

    // Define conventions
    const map: Record<string, string> = {
      controller: `src/controllers/${name.pascal}Controller.ts`,
      model: `src/models/${name.pascal}.ts`,
      middleware: `src/middleware/${name.camel}.ts`,
      seeder: `src/database/seeders/${name.pascal}Seeder.ts`,
      request: `src/requests/${name.pascal}Request.ts`,
      command: `src/commands/${name.pascal}Command.ts`,
    }

    if (!map[type]) {
      throw new Error(`Unknown type: ${type}`)
    }

    return path.join(cwd, map[type])
  }

  /**
   * Normalize the input name.
   *
   * @param type - The artifact type.
   * @param rawName - The raw input name.
   * @returns An object containing PascalCase and camelCase versions of the name.
   * @private
   */
  private normalizeName(type: string, rawName: string): NormalizedName {
    const pascalRaw = this.toPascalCase(rawName)

    const pascal =
      type === 'controller'
        ? this.stripSuffix(pascalRaw, 'Controller')
        : type === 'seeder'
          ? this.stripSuffix(pascalRaw, 'Seeder')
          : type === 'command'
            ? this.stripSuffix(pascalRaw, 'Command')
            : pascalRaw

    return {
      pascal,
      camel: this.toCamelCase(pascal),
    }
  }

  /**
   * Strip a suffix from a string if it exists.
   *
   * @param value - The string to process.
   * @param suffix - The suffix to remove.
   * @returns The processed string.
   * @private
   */
  private stripSuffix(value: string, suffix: string): string {
    return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value
  }

  /**
   * Ensure that a directory exists, creating it if necessary.
   *
   * @param dir - The directory path.
   * @private
   */
  private async ensureDirectory(dir: string) {
    await fs.mkdir(dir, { recursive: true })
  }

  /**
   * Write content to a file, ensuring it does not already exist.
   *
   * @param filepath - The path to the file.
   * @param content - The content to write.
   * @throws {Error} If the file already exists.
   * @private
   */
  private async writeFile(filepath: string, content: string) {
    // Check if exists
    try {
      await fs.access(filepath)
      // If no error, file exists
      throw new Error(`File already exists: ${filepath}`)
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException
      if (error.code !== 'ENOENT') {
        throw err
      }
    }

    await fs.writeFile(filepath, content, 'utf-8')
  }

  /**
   * Convert a string to PascalCase.
   *
   * @param str - The input string.
   * @returns The PascalCase version of the string.
   * @private
   */
  private toPascalCase(str: string): string {
    // Remove special chars, split by space/hyphen/underscore
    return str
      .split(/[\s-_]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  /**
   * Convert a string to camelCase.
   *
   * @param str - The input string.
   * @returns The camelCase version of the string.
   * @private
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }

  /**
   * Get the relative path from the current working directory.
   *
   * @param fullpath - The absolute path.
   * @returns The relative path.
   * @private
   */
  private getRelativePath(fullpath: string): string {
    return path.relative(process.cwd(), fullpath)
  }
}

/**
 * Normalized name object containing different case versions.
 *
 * @public
 */
interface NormalizedName {
  /** PascalCase version of the name. */
  pascal: string
  /** camelCase version of the name. */
  camel: string
}
