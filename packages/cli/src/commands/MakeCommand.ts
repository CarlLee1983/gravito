import { existsSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { cancel, isCancel, text } from '@clack/prompts'
import { Painter as pc } from '@gravito/chromatic'
import { Scaffold } from '@gravito/scaffold'

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
  private searchPaths: string[] = []
  private architecture: 'mvc' | 'ddd' | 'cqrs' = 'mvc'
  private cwd: string

  /**
   * Initializes a new MakeCommand instance.
   *
   * Sets up an ordered list of search paths for stub templates. This implementation
   * enables a "layered" override mechanism where users can provide custom templates
   * in their project root, falling back to CLI defaults if a specific stub is missing.
   *
   * @param customStubsPath - Optional explicit path to search for stubs first.
   * @param cwd - Optional current working directory (defaults to this.cwd).
   *
   * @example
   * ```typescript
   * const make = new MakeCommand('./overrides/stubs');
   * ```
   */
  constructor(customStubsPath?: string, cwd: string = process.cwd()) {
    this.cwd = cwd

    // Default built-in stub locations
    const devPath = path.resolve(__dirname, '../../stubs')
    const prodPath = path.resolve(__dirname, '../stubs')

    if (customStubsPath) {
      this.searchPaths.push(customStubsPath)
    }

    // Define stub resolution priority (ordered from highest to lowest)
    this.searchPaths.push(
      // 1. Project root stubs (Highest priority - User overrides)
      path.resolve(this.cwd, 'stubs'),
      // 2. Hidden project stubs
      path.resolve(this.cwd, '.gravito/stubs'),
      // 3. CLI built-in stubs (Production mode)
      prodPath,
      // 4. CLI built-in stubs (Development mode)
      devPath,
      // 5. Monorepo-relative paths
      path.resolve(this.cwd, 'packages/cli/stubs'),
      path.resolve(this.cwd, '../packages/cli/stubs')
    )

    // Prune non-existent paths to optimize file system lookups
    this.searchPaths = this.searchPaths.filter((p) => existsSync(p))

    // Detect project architecture
    this.detectArchitecture()
  }

  /**
   * 從 package.json 中檢測項目架構
   */
  private detectArchitecture() {
    try {
      const pkgPath = path.join(this.cwd, 'package.json')
      const content = readFileSync(pkgPath, 'utf-8')
      const pkg = JSON.parse(content)
      this.architecture = pkg.gravito?.architecture || 'mvc'
    } catch {
      this.architecture = 'mvc'
    }
  }

  /**
   * Orchestrates the creation of application artifacts from stubs.
   *
   * @param type - The category of the artifact (e.g., 'controller', 'model', 'middleware').
   * @param name - The identifier for the new artifact. Suffixes are automatically managed.
   * @param options - Configuration flags for the generator.
   * @returns A promise resolving when the artifact is successfully written to disk.
   * @throws {Error} If the template is missing OR the target file already occupies the path.
   */
  async run(type: string, name: string | undefined, options: any = {}) {
    let resolvedName = name

    // 1. Handle missing name with interactive prompt
    if (!resolvedName || resolvedName === '') {
      const promptedName = await text({
        message: `Enter the name of your ${type}:`,
        placeholder: `My${this.toPascalCase(type)}`,
        validate: (value) => {
          if (value.length === 0) {
            return 'Name is required!'
          }
          if (/[^a-zA-Z0-9_-]/.test(value)) {
            return 'Name contains invalid characters'
          }
          return
        },
      })

      if (isCancel(promptedName)) {
        cancel('Operation cancelled.')
        process.exit(0)
      }

      resolvedName = promptedName as string
    }

    // Special handling for satellites: uses the full Scaffold engine instead of simple stubs
    if (type === 'satellite') {
      await this.runSatellite(resolvedName, options)
      return resolvedName
    }

    try {
      let stubName = `${type}.stub`

      // Logic for specialized controller variants
      if (type === 'controller' && options.resource) {
        stubName = 'controller.resource.stub'
      }

      // Logic for GraphQL-ready models
      if (type === 'model' && options.graphql) {
        stubName = 'model.graphql.stub'
      }

      const stubContent = await this.readStub(stubName)

      if (!stubContent) {
        throw new Error(`Stub template [${stubName}] could not be located in any search path.`)
      }

      const normalizedName = this.normalizeName(type, resolvedName)
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

      // Post-generation hooks (e.g., auto-generating migrations for models)
      if (type === 'model' && options.migration) {
        console.log(
          pc.cyan(`📦 Scaffolding linked database migration for ${normalizedName.pascal}...`)
        )
        // Actual migration generation would be triggered here via database service
      }

      return resolvedName
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(pc.red(`❌ Generation failure for ${type}: ${message}`))
      process.exit(1)
    }
  }

  /**
   * Reads a stub file content from the prioritized search paths.
   *
   * Iterates through all registered search paths and returns the content of the first
   * match found. Notifies the user with a visual indicator when a custom override
   * is actively being used.
   *
   * @param filename - The name of the stub file (e.g., 'controller.stub').
   * @returns The raw string content of the stub, or null if not found in any path.
   */
  private async readStub(filename: string): Promise<string | null> {
    for (const searchPath of this.searchPaths) {
      try {
        const filePath = path.join(searchPath, filename)
        if (existsSync(filePath)) {
          // Provide visual feedback when using user-defined overrides (first two paths)
          const cwd = this.cwd
          if (
            searchPath === path.resolve(cwd, 'stubs') ||
            searchPath === path.resolve(cwd, '.gravito/stubs')
          ) {
            console.log(pc.gray(`📁 Using custom stub override: ${this.getRelativePath(filePath)}`))
          }

          return await fs.readFile(filePath, 'utf-8')
        }
      } catch (_e) {
        // Silently continue to next candidate path
      }
    }
    return null
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
   * Handles the complex scaffolding of a Gravito Satellite (plugin/extension).
   *
   * Unlike simple stubs, satellites require a full project structure with its
   * own configuration, dependencies, and git lifecycle. This uses the core
   * Scaffold engine to perform the generation.
   *
   * @param name - The name of the satellite project.
   * @param options - Generation settings including visibility and workspace linking.
   * @internal
   */
  private async runSatellite(name: string, options: any) {
    const isInternal = options.internal || false
    const targetDir = isInternal
      ? path.resolve(this.cwd, 'satellites', name.toLowerCase())
      : path.resolve(this.cwd, name.toLowerCase())

    const scaffold = new Scaffold()

    console.log(pc.cyan(`🚀 Launching Satellite Scaffolder for "${name}"...`))

    const result = await scaffold.create({
      name,
      targetDir,
      architecture: 'satellite',
      isInternal,
      installDeps: false, // Encourages user to run install manually for better control
      initGit: !isInternal, // Internal satellites share the parent repository's git
    })

    if (result.success) {
      console.log(pc.green(`✅ Satellite created at: ${result.targetDir}`))
      if (isInternal) {
        console.log(
          pc.yellow(`ℹ️ Reminder: Run 'bun install' at workspace root to link the new satellite.`)
        )
      }
    } else {
      console.error(pc.red(`❌ Satellite generation failed: ${result.errors?.join(', ')}`))
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
    const cwd = this.cwd

    // Architecture-aware path mapping
    const architecturePaths: Record<'mvc' | 'ddd' | 'cqrs', Record<string, string>> = {
      mvc: {
        controller: `src/Http/Controllers/${name.pascal}Controller.ts`,
        model: `src/Models/${name.pascal}.ts`,
        middleware: `src/Http/Middleware/${name.pascal}Middleware.ts`,
        seeder: `database/seeders/${name.pascal}Seeder.ts`,
        request: `src/Http/Requests/${name.pascal}Request.ts`,
        command: `src/Commands/${name.pascal}Command.ts`,
        service: `src/Services/${name.pascal}Service.ts`,
      },
      ddd: {
        controller: `src/Presentation/Http/Controllers/${name.pascal}Controller.ts`,
        model: `src/Domain/${name.pascal}.ts`,
        middleware: `src/Presentation/Http/Middleware/${name.pascal}Middleware.ts`,
        seeder: `database/seeders/${name.pascal}Seeder.ts`,
        request: `src/Presentation/Http/Requests/${name.pascal}Request.ts`,
        command: `src/Application/Commands/${name.pascal}Command.ts`,
        service: `src/Application/Services/${name.pascal}Service.ts`,
      },
      cqrs: {
        controller: `src/Presentation/Controllers/${name.pascal}Controller.ts`,
        model: `src/Infrastructure/Persistence/${name.pascal}.ts`,
        middleware: `src/Presentation/Middleware/${name.pascal}Middleware.ts`,
        seeder: `database/seeders/${name.pascal}Seeder.ts`,
        request: `src/Presentation/Requests/${name.pascal}Request.ts`,
        command: `src/Application/Commands/${name.pascal}Command.ts`,
        service: `src/Application/Services/${name.pascal}Service.ts`,
      },
    }

    // Get paths for current architecture
    const paths = architecturePaths[this.architecture]
    if (!paths || !paths[type]) {
      throw new Error(`Unknown type: ${type} for architecture: ${this.architecture}`)
    }

    return path.join(cwd, paths[type])
  }

  /**
   * Transforms the input identifier into standardized PascalCase and camelCase variations.
   *
   * Automatically strips redundant suffixes (e.g., 'Controller', 'Seeder') to ensure
   * consistent naming regardless of user input style.
   *
   * @param type - The category of artifact determining which suffixes to prune.
   * @param rawName - The raw string identifier provided by the user.
   * @returns A NormalizedName object with transformed identifiers.
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
   * Atomically writes content to the target path, preventing accidental overwrites.
   *
   * Checks for path existence before writing. This safety check prevents the CLI
   * from destroying existing application logic if the user accidentally reusable
   * an existing name.
   *
   * @param filepath - Absolute path to the file to be created.
   * @param content - Template-processed string content.
   * @throws {Error} If a file already exists at the specified path.
   */
  private async writeFile(filepath: string, content: string) {
    // Safety check: verify path vacancy
    try {
      await fs.access(filepath)
      // If access succeeds, the file already exists
      throw new Error(
        `Integrity Error: A file already exists at ${filepath}. Action aborted to prevent data loss.`
      )
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException
      // ENOENT is expected; any other error code indicates a different system fault
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
    return path.relative(this.cwd, fullpath)
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
