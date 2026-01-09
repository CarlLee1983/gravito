/**
 * BaseGenerator - Abstract base class for architecture generators.
 *
 * Provides common functionality for generating project structures,
 * including directory creation, file generation, and context management.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { FileMerger } from '../FileMerger'
import type { ArchitectureType, DirectoryNode } from '../types'
import { StubGenerator, type StubVariables } from './StubGenerator'

// Helper for recursive directory walking
async function walk(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir)
  const paths: string[] = []
  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) {
      paths.push(...(await walk(filePath)))
    } else {
      paths.push(filePath)
    }
  }
  return paths
}

/**
 * Context passed to generators during scaffolding.
 */
export interface GeneratorContext {
  /**
   * Project name
   */
  name: string

  /**
   * Project name in various cases
   */
  namePascalCase: string
  nameCamelCase: string
  nameSnakeCase: string
  nameKebabCase: string

  /**
   * Target directory
   */
  targetDir: string

  /**
   * Architecture type
   */
  architecture: ArchitectureType

  /**
   * Package manager
   */
  packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm'

  /**
   * Current year (for license headers)
   */
  year: string

  /**
   * Current date
   */
  date: string

  /**
   * Additional custom context
   */
  [key: string]: unknown
}

/**
 * Configuration for generators.
 */
export interface GeneratorConfig {
  /**
   * Directory containing stub templates
   */
  templatesDir: string

  /**
   * Verbose logging
   */
  verbose?: boolean
}

/**
 * Abstract base class for architecture generators.
 */
export abstract class BaseGenerator {
  protected config: GeneratorConfig
  protected stubGenerator: StubGenerator
  protected fileMerger: FileMerger
  protected filesCreated: string[] = []

  constructor(config: GeneratorConfig) {
    this.config = config
    this.stubGenerator = new StubGenerator({
      stubsDir: config.templatesDir,
      outputDir: '', // Set per-generation
    })
    this.fileMerger = new FileMerger()
  }

  /**
   * Get the architecture type this generator handles.
   */
  abstract get architectureType(): ArchitectureType

  /**
   * Get the display name for this architecture.
   */
  abstract get displayName(): string

  /**
   * Get the description for this architecture.
   */
  abstract get description(): string

  /**
   * Get the directory structure for this architecture.
   */
  abstract getDirectoryStructure(context: GeneratorContext): DirectoryNode[]

  /**
   * Generate the project scaffold.
   *
   * @param context - Generator context
   * @returns Array of created file paths
   */
  async generate(context: GeneratorContext): Promise<string[]> {
    this.filesCreated = []

    // Create directory structure
    const structure = this.getDirectoryStructure(context)
    await this.createStructure(context.targetDir, structure, context)

    // Generate common files
    await this.generateCommonFiles(context)

    // Apply Profile Overlays
    await this.applyOverlays(context)

    // Apply Feature Overlays
    await this.applyFeatureOverlays(context)

    return this.filesCreated
  }

  /**
   * Create directory structure recursively.
   */
  protected async createStructure(
    basePath: string,
    nodes: DirectoryNode[],
    context: GeneratorContext
  ): Promise<void> {
    for (const node of nodes) {
      const fullPath = path.resolve(basePath, node.name)

      if (node.type === 'directory') {
        await fs.mkdir(fullPath, { recursive: true })
        this.log(`📁 Created directory: ${node.name}`)

        if (node.children) {
          await this.createStructure(fullPath, node.children, context)
        }
      } else {
        // File
        await fs.mkdir(path.dirname(fullPath), { recursive: true })

        if (node.template) {
          // Generate from template
          const templatePath = path.resolve(this.config.templatesDir, node.template)
          try {
            const template = await fs.readFile(templatePath, 'utf-8')
            const content = this.stubGenerator.render(template, context as unknown as StubVariables)
            await fs.writeFile(fullPath, content, 'utf-8')
          } catch {
            // Template not found, use content or create empty
            await fs.writeFile(fullPath, node.content ?? '', 'utf-8')
          }
        } else if (node.content) {
          await fs.writeFile(fullPath, node.content, 'utf-8')
        } else {
          // Create empty file
          await fs.writeFile(fullPath, '', 'utf-8')
        }

        this.filesCreated.push(fullPath)
        this.log(`📄 Created file: ${node.name}`)
      }
    }
  }

  /**
   * Generate common files (package.json, .env, etc.)
   */
  protected async generateCommonFiles(context: GeneratorContext): Promise<void> {
    // package.json
    await this.writeFile(context.targetDir, 'package.json', this.generatePackageJson(context))

    // .env.example
    await this.writeFile(context.targetDir, '.env.example', this.generateEnvExample(context))

    // .env (copy of example)
    await this.writeFile(context.targetDir, '.env', this.generateEnvExample(context))

    // .gitignore
    await this.writeFile(context.targetDir, '.gitignore', this.generateGitignore())

    // tsconfig.json
    await this.writeFile(context.targetDir, 'tsconfig.json', this.generateTsConfig())

    // Docker files
    await this.writeFile(context.targetDir, 'Dockerfile', this.generateDockerfile(context))
    await this.writeFile(context.targetDir, '.dockerignore', this.generateDockerIgnore())

    // ARCHITECTURE.md
    await this.writeFile(
      context.targetDir,
      'ARCHITECTURE.md',
      this.generateArchitectureDoc(context)
    )

    // Generate check scripts
    await this.generateCheckScripts(context)

    // Generate AI Skills
    await this.generateSkills(context)
  }

  /**
   * Copy AI Skills to the project
   */
  protected async generateSkills(context: GeneratorContext): Promise<void> {
    const skillsDir = path.resolve(this.config.templatesDir, 'skills')
    const targetSkillsDir = path.join('.skills')

    try {
      await fs.access(skillsDir)
    } catch {
      // Skills directory does not exist in templates, skip
      return
    }

    const files = await walk(skillsDir)
    for (const filePath of files) {
      const relativePath = path.relative(skillsDir, filePath)
      const targetPath = path.join(targetSkillsDir, relativePath)

      // Read source content
      let content = await fs.readFile(filePath, 'utf-8')

      // Process as template (for SKILL.md and others)
      try {
        content = this.stubGenerator.render(content, context as unknown as StubVariables)
      } catch {
        // Skip if not renderable
      }

      await this.writeFile(context.targetDir, targetPath, content)
    }
  }

  /**
   * Apply profile-specific overlays
   */
  protected async applyOverlays(context: GeneratorContext): Promise<void> {
    const profile = context.profile as string
    if (!profile) return

    const overlayDir = path.resolve(this.config.templatesDir, 'overlays', profile)
    await this.copyOverlayDirectory(overlayDir, context)
  }

  /**
   * Apply feature-specific overlays
   */
  protected async applyFeatureOverlays(context: GeneratorContext): Promise<void> {
    const features = (context.features as string[]) || []
    for (const feature of features) {
      const overlayDir = path.resolve(this.config.templatesDir, 'features', feature)
      await this.copyOverlayDirectory(overlayDir, context)
    }
  }

  /**
   * Helper to copy/merge an overlay directory into the target
   */
  protected async copyOverlayDirectory(
    sourceDir: string,
    context: GeneratorContext
  ): Promise<void> {
    try {
      await fs.access(sourceDir)
    } catch {
      // Overlay does not exist, skip
      return
    }

    const files = await walk(sourceDir)
    for (const filePath of files) {
      const relativePath = path.relative(sourceDir, filePath)

      // Read source content
      let content = await fs.readFile(filePath, 'utf-8')

      // Process if it's a template?
      // For overlays, we generally assume they might be templates too.
      // But maybe we keep it simple for now.
      // If we want templating in overlays, we can use StubGenerator.
      try {
        content = this.stubGenerator.render(content, context as unknown as StubVariables)
      } catch {
        // Ignore render errors (might not be a template)
      }

      await this.writeFile(context.targetDir, relativePath, content)
    }
  }

  /**
   * Write a file and track it.
   */
  protected async writeFile(
    basePath: string,
    relativePath: string,
    content: string
  ): Promise<void> {
    const fullPath = path.resolve(basePath, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })

    let finalContent = content

    // Check if file exists (merge if so)
    try {
      const existingContent = await fs.readFile(fullPath, 'utf-8')
      finalContent = this.fileMerger.merge(relativePath, existingContent, content)
      if (finalContent !== content) {
        this.log(`🔄 Merged file: ${relativePath}`)
      }
    } catch {
      // File doesn't exist, just write
    }

    await fs.writeFile(fullPath, finalContent, 'utf-8')
    this.filesCreated.push(fullPath)
    this.log(`📄 Created file: ${relativePath}`)
  }

  /**
   * Generate package.json content.
   */
  protected generatePackageJson(context: GeneratorContext): string {
    const profile = (context.profile as string) || 'core'

    // Base dependencies for all profiles
    const baseDependencies: Record<string, string> = {
      '@gravito/core': '^1.0.0-beta.5',
      '@gravito/atlas': '^1.0.0-beta.5',
      '@gravito/plasma': '^1.0.0-beta.5',
      '@gravito/stream': '^1.0.0-beta.5',
    }

    // Profile-specific dependencies
    if (profile === 'enterprise' || profile === 'scale') {
      baseDependencies['@gravito/quasar'] = '^1.0.0-beta.5'
      baseDependencies['@gravito/horizon'] = '^1.0.0-beta.5'
    }

    // Additional optional dependencies
    if (context.withSpectrum) {
      baseDependencies['@gravito/spectrum'] = '^1.0.0-beta.1'
    }

    const pkg = {
      name: context.nameKebabCase,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'bun run --watch src/bootstrap.ts',
        build: 'bun build ./src/bootstrap.ts --outdir ./dist --target bun',
        start: 'bun run dist/bootstrap.js',
        test: 'bun test',
        typecheck: 'tsc --noEmit',
        check: 'bun run typecheck && bun run test',
        'check:deps': 'bun run scripts/check-dependencies.ts',
        validate: 'bun run check && bun run check:deps',
        precommit: 'bun run validate',
        'docker:build': `docker build -t ${context.nameKebabCase} .`,
        'docker:run': `docker run -it -p 3000:3000 ${context.nameKebabCase}`,
      },
      dependencies: baseDependencies,
      devDependencies: {
        'bun-types': 'latest',
        typescript: '^5.0.0',
      },
    }

    return JSON.stringify(pkg, null, 2)
  }

  /**
   * Generate Dockerfile content.
   */
  protected generateDockerfile(context: GeneratorContext): string {
    const entrypoint = context.architecture === 'ddd' ? 'dist/main.js' : 'dist/bootstrap.js'

    return `FROM oven/bun:1.0 AS base
WORKDIR /usr/src/app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Build application
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Final production image
FROM base AS release
COPY --from=build /usr/src/app/${entrypoint} index.js
COPY --from=build /usr/src/app/package.json .

# Create a non-root user for security
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.js" ]
`
  }

  /**
   * Generate .dockerignore content.
   */
  protected generateDockerIgnore(): string {
    return `node_modules
dist
.git
.env
*.log
.vscode
.idea
tests
`
  }

  /**
   * Generate .env.example content.
   */
  protected generateEnvExample(context: GeneratorContext): string {
    const profile = (context.profile as string) || 'core'

    // Base configuration for all profiles
    let envContent = `# ============================================================================
# Application Configuration
# ============================================================================

APP_NAME=${context.name}
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:3000
APP_KEY=

# ============================================================================
# Database Configuration
# ============================================================================

# Database Connection (sqlite, postgres, mysql)
DB_CONNECTION=${profile === 'core' ? 'sqlite' : 'postgres'}

# SQLite Configuration (when DB_CONNECTION=sqlite)
DB_DATABASE=database/database.sqlite

# PostgreSQL Configuration (when DB_CONNECTION=postgres)
${
  profile !== 'core'
    ? `DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=${context.name}
DB_USERNAME=postgres
DB_PASSWORD=
DB_SSLMODE=prefer`
    : `# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=${context.name}
# DB_USERNAME=postgres
# DB_PASSWORD=
# DB_SSLMODE=prefer`
}

# MySQL Configuration (when DB_CONNECTION=mysql)
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=${context.name}
# DB_USERNAME=root
# DB_PASSWORD=

# ============================================================================
# Redis Configuration (@gravito/plasma)
# ============================================================================

# Default Redis Connection
REDIS_CONNECTION=default
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Redis Connection Options
REDIS_CONNECT_TIMEOUT=10000
REDIS_COMMAND_TIMEOUT=5000
REDIS_KEY_PREFIX=
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Cache-specific Redis Connection (optional, falls back to default)
# REDIS_CACHE_HOST=127.0.0.1
# REDIS_CACHE_PORT=6379
# REDIS_CACHE_PASSWORD=
REDIS_CACHE_DB=1

# Queue-specific Redis Connection (optional, falls back to default)
# REDIS_QUEUE_HOST=127.0.0.1
# REDIS_QUEUE_PORT=6379
# REDIS_QUEUE_PASSWORD=
REDIS_QUEUE_DB=2

# ============================================================================
# Cache Configuration (@gravito/stasis)
# ============================================================================

# Cache Driver (memory, file, redis)
CACHE_DRIVER=${profile === 'core' ? 'memory' : 'redis'}

# File Cache Path (when CACHE_DRIVER=file)
CACHE_PATH=storage/framework/cache

# Redis Cache Configuration (when CACHE_DRIVER=redis)
REDIS_CACHE_CONNECTION=cache
REDIS_CACHE_PREFIX=cache:

# ============================================================================
# Queue Configuration (@gravito/stream)
# ============================================================================

# Queue Connection (sync, memory, database, redis, kafka, sqs, rabbitmq)
QUEUE_CONNECTION=${profile === 'core' ? 'sync' : 'redis'}

# Database Queue Configuration (when QUEUE_CONNECTION=database)
QUEUE_TABLE=jobs

# Redis Queue Configuration (when QUEUE_CONNECTION=redis)
REDIS_PREFIX=queue:

`

    // Add profile-specific configurations
    if (profile === 'enterprise' || profile === 'scale') {
      envContent += `# Kafka Queue Configuration (when QUEUE_CONNECTION=kafka)
# KAFKA_BROKERS=localhost:9092
# KAFKA_CONSUMER_GROUP_ID=gravito-workers
# KAFKA_CLIENT_ID=${context.name}

# AWS SQS Queue Configuration (when QUEUE_CONNECTION=sqs)
# AWS_REGION=us-east-1
# SQS_QUEUE_URL_PREFIX=
# SQS_VISIBILITY_TIMEOUT=30
# SQS_WAIT_TIME_SECONDS=20

# RabbitMQ Queue Configuration (when QUEUE_CONNECTION=rabbitmq)
# RABBITMQ_URL=amqp://localhost
# RABBITMQ_EXCHANGE=gravito.events
# RABBITMQ_EXCHANGE_TYPE=fanout

`
    }

    // Add logging configuration
    envContent += `# ============================================================================
# Logging Configuration
# ============================================================================

LOG_LEVEL=debug
`

    return envContent
  }

  /**
   * Generate .gitignore content.
   */
  protected generateGitignore(): string {
    return `# Dependencies
node_modules/

# Build output
dist/

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# System
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Database
*.sqlite
*.sqlite-journal

# Coverage
coverage/
`
  }

  /**
   * Generate tsconfig.json content.
   */
  protected generateTsConfig(): string {
    const config = {
      compilerOptions: {
        target: 'ESNext',
        module: 'ESNext',
        moduleResolution: 'bundler',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        declaration: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        types: ['bun-types'],
        outDir: './dist',
        rootDir: './src',
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    }

    return JSON.stringify(config, null, 2)
  }

  /**
   * Generate ARCHITECTURE.md content.
   * Override in subclasses for architecture-specific docs.
   */
  protected abstract generateArchitectureDoc(context: GeneratorContext): string

  /**
   * Generate check scripts for project validation.
   */
  protected async generateCheckScripts(context: GeneratorContext): Promise<void> {
    // Create scripts directory
    const scriptsDir = path.resolve(context.targetDir, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })

    // Generate check-dependencies.ts
    await this.writeFile(
      scriptsDir,
      'check-dependencies.ts',
      this.generateCheckDependenciesScript()
    )

    // Generate check.sh
    await this.writeFile(scriptsDir, 'check.sh', this.generateCheckShellScript())

    // Generate pre-commit.sh
    await this.writeFile(scriptsDir, 'pre-commit.sh', this.generatePreCommitScript())

    // Generate CHECK_SYSTEM.md
    await this.writeFile(context.targetDir, 'CHECK_SYSTEM.md', this.generateCheckSystemDoc(context))
  }

  /**
   * Generate check-dependencies.ts script content.
   */
  protected generateCheckDependenciesScript(): string {
    return `/**
 * 相依套件版本檢查腳本
 * 
 * 檢查 package.json 中的套件是否為最新穩定版本
 * 並提供更新建議
 */

import { readFileSync } from 'fs'
import { join } from 'path'

interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface PackageInfo {
  name: string
  current: string
  latest: string
  outdated: boolean
}

const colors = {
  reset: '\\x1b[0m',
  green: '\\x1b[32m',
  yellow: '\\x1b[33m',
  red: '\\x1b[31m',
  blue: '\\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(\`\${colors[color]}\${message}\${colors.reset}\`)
}

async function getLatestVersion(packageName: string): Promise<string | null> {
  try {
    const response = await fetch(\`https://registry.npmjs.org/\${packageName}/latest\`)
    if (!response.ok) return null
    const data = await response.json()
    return data.version
  } catch {
    return null
  }
}

function parseVersion(version: string): string {
  // 移除 ^, ~, >= 等前綴
  return version.replace(/^[\\^~>=<]/, '')
}

async function checkPackage(
  name: string,
  currentVersion: string
): Promise<PackageInfo | null> {
  // 跳過本地連結的套件
  if (currentVersion.startsWith('link:') || currentVersion.startsWith('workspace:')) {
    return null
  }

  const current = parseVersion(currentVersion)
  const latest = await getLatestVersion(name)

  if (!latest) {
    return null
  }

  return {
    name,
    current,
    latest,
    outdated: current !== latest,
  }
}

async function main() {
  log('\\n=== 相依套件版本檢查 ===\\n', 'blue')

  const packageJsonPath = join(process.cwd(), 'package.json')
  const packageJson: PackageJson = JSON.parse(
    readFileSync(packageJsonPath, 'utf-8')
  )

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  log(\`檢查 \${Object.keys(allDependencies).length} 個套件...\\n\`, 'yellow')

  const results: PackageInfo[] = []
  const outdated: PackageInfo[] = []
  const upToDate: PackageInfo[] = []

  // 檢查所有套件
  for (const [name, version] of Object.entries(allDependencies)) {
    const info = await checkPackage(name, version)
    if (info) {
      results.push(info)
      if (info.outdated) {
        outdated.push(info)
      } else {
        upToDate.push(info)
      }
    }
  }

  // 顯示結果
  if (upToDate.length > 0) {
    log(\`\\n✓ 已是最新版本 (\${upToDate.length}):\`, 'green')
    upToDate.forEach((pkg) => {
      log(\`  \${pkg.name}: \${pkg.current}\`, 'green')
    })
  }

  if (outdated.length > 0) {
    log(\`\\n⚠ 需要更新 (\${outdated.length}):\`, 'yellow')
    outdated.forEach((pkg) => {
      log(\`  \${pkg.name}: \${pkg.current} → \${pkg.latest}\`, 'yellow')
    })
  }

  // 總結
  log('\\n=== 檢查結果 ===', 'blue')
  log(\`總計: \${results.length} 個套件\`, 'blue')
  log(\`最新: \${upToDate.length} 個\`, 'green')
  log(\`需更新: \${outdated.length} 個\`, outdated.length > 0 ? 'yellow' : 'green')

  // 如果有需要更新的套件，返回非零退出碼
  if (outdated.length > 0) {
    log('\\n建議執行以下命令更新套件：', 'yellow')
    log('  bun update', 'yellow')
    process.exit(1)
  } else {
    log('\\n✓ 所有套件都是最新版本！', 'green')
    process.exit(0)
  }
}

main().catch((error) => {
  log(\`\\n錯誤: \${error.message}\`, 'red')
  process.exit(1)
})
`
  }

  /**
   * Generate check.sh script content.
   */
  protected generateCheckShellScript(): string {
    return `#!/bin/bash

# 專案檢查腳本
# 執行所有必要的檢查：類型檢查、測試、依賴檢查等

set -e

# 顏色定義
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

echo -e "\${BLUE}=== 專案檢查 ===\${NC}\\n"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
  echo -e "\${RED}錯誤: 請在專案根目錄執行此腳本\${NC}"
  exit 1
fi

# 檢查 Bun 是否安裝
if ! command -v bun &> /dev/null; then
  echo -e "\${RED}錯誤: 未找到 bun，請先安裝 Bun\${NC}"
  exit 1
fi

# 1. 類型檢查
echo -e "\${YELLOW}[1/3] 執行類型檢查...\${NC}"
if bun run typecheck; then
  echo -e "\${GREEN}✓ 類型檢查通過\${NC}\\n"
else
  echo -e "\${RED}✗ 類型檢查失敗\${NC}"
  exit 1
fi

# 2. 執行測試
echo -e "\${YELLOW}[2/3] 執行測試...\${NC}"
if bun test; then
  echo -e "\${GREEN}✓ 測試通過\${NC}\\n"
else
  echo -e "\${RED}✗ 測試失敗\${NC}"
  exit 1
fi

# 3. 檢查依賴版本（可選，因為需要網路連線）
echo -e "\${YELLOW}[3/3] 檢查依賴版本...\${NC}"
if bun run check:deps; then
  echo -e "\${GREEN}✓ 依賴檢查完成\${NC}\\n"
else
  echo -e "\${YELLOW}⚠ 依賴檢查有警告（某些套件可能需要更新）\${NC}\\n"
fi

echo -e "\${GREEN}=== 所有檢查完成 ===\${NC}"
`
  }

  /**
   * Generate pre-commit.sh script content.
   */
  protected generatePreCommitScript(): string {
    return `#!/bin/bash

# Pre-commit Hook
# 在 git commit 前自動執行檢查
# 
# 安裝方式：
#   ln -s ../../scripts/pre-commit.sh .git/hooks/pre-commit
#   或
#   cp scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit

set -e

# 顏色定義
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

echo -e "\${BLUE}=== Pre-commit 檢查 ===\${NC}\\n"

# 切換到專案根目錄
cd "$(git rev-parse --show-toplevel)"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
  echo -e "\${RED}錯誤: 找不到 package.json\${NC}"
  exit 1
fi

# 檢查 Bun 是否安裝
if ! command -v bun &> /dev/null; then
  echo -e "\${RED}錯誤: 未找到 bun，請先安裝 Bun\${NC}"
  exit 1
fi

# 1. 類型檢查（快速檢查）
echo -e "\${YELLOW}[1/2] 執行類型檢查...\${NC}"
if bun run typecheck; then
  echo -e "\${GREEN}✓ 類型檢查通過\${NC}\\n"
else
  echo -e "\${RED}✗ 類型檢查失敗\${NC}"
  echo -e "\${YELLOW}提示: 請修正類型錯誤後再提交\${NC}"
  exit 1
fi

# 2. 執行測試（可選，如果測試時間較長可以註解掉）
echo -e "\${YELLOW}[2/2] 執行測試...\${NC}"
if bun test; then
  echo -e "\${GREEN}✓ 測試通過\${NC}\\n"
else
  echo -e "\${RED}✗ 測試失敗\${NC}"
  echo -e "\${YELLOW}提示: 請修正測試錯誤後再提交\${NC}"
  exit 1
fi

echo -e "\${GREEN}=== Pre-commit 檢查通過 ===\${NC}\\n"
`
  }

  /**
   * Generate CHECK_SYSTEM.md documentation.
   */
  protected generateCheckSystemDoc(context: GeneratorContext): string {
    return `# 專案檢查系統

本專案已建立完整的本地檢查機制，無需依賴 GitHub CI。

## 快速開始

### 執行完整檢查
\`\`\`bash
bun run validate
\`\`\`

### 執行單項檢查
\`\`\`bash
# 類型檢查
bun run typecheck

# 測試
bun run test

# 依賴版本檢查
bun run check:deps
\`\`\`

## 可用命令

### Package.json 腳本

| 命令 | 說明 |
|------|------|
| \`bun run typecheck\` | TypeScript 類型檢查 |
| \`bun run test\` | 執行所有測試 |
| \`bun run check\` | 類型檢查 + 測試 |
| \`bun run check:deps\` | 檢查依賴版本 |
| \`bun run validate\` | 完整驗證（類型 + 測試 + 依賴） |
| \`bun run precommit\` | 等同於 \`validate\` |

### Shell 腳本

| 腳本 | 說明 |
|------|------|
| \`./scripts/check.sh\` | 完整專案檢查（Shell 版本） |
| \`./scripts/pre-commit.sh\` | Pre-commit hook 腳本 |

## Pre-commit Hook（推薦）

安裝 pre-commit hook 後，每次 \`git commit\` 前會自動執行檢查：

\`\`\`bash
# 安裝 pre-commit hook
ln -s ../../scripts/pre-commit.sh .git/hooks/pre-commit

# 或使用複製方式
cp scripts/pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
\`\`\`

**功能：**
- ✅ 自動執行類型檢查
- ✅ 自動執行測試
- ❌ 檢查失敗時阻止提交

**跳過檢查（不推薦）：**
\`\`\`bash
git commit --no-verify -m "緊急修復"
\`\`\`

## 檢查項目

### 1. 類型檢查
- 使用 \`tsc --noEmit\` 檢查 TypeScript 類型
- 確保沒有類型錯誤

### 2. 測試
- 執行所有單元測試和整合測試
- 確保測試通過

### 3. 依賴檢查（可選）
- 檢查套件版本是否為最新
- 提供更新建議
- 需要網路連線

## 工作流程建議

### 開發時
1. 開發功能
2. 提交前執行 \`bun run validate\`
3. 修正問題
4. 提交程式碼

### 使用 Pre-commit Hook（推薦）
1. 安裝 pre-commit hook（只需一次）
2. 正常開發和提交
3. 檢查會自動執行
4. 如有問題，修正後重新提交

## 檔案結構

\`\`\`
${context.nameKebabCase}/
├── package.json              # 檢查腳本定義
├── scripts/
│   ├── check.sh              # 完整檢查腳本（Shell）
│   ├── check-dependencies.ts  # 依賴版本檢查
│   └── pre-commit.sh         # Pre-commit hook
└── CHECK_SYSTEM.md           # 本文件
\`\`\`

## 注意事項

1. **依賴檢查需要網路連線**：\`check:deps\` 需要連接到 npm registry
2. **測試時間**：如果測試時間較長，可以編輯 \`pre-commit.sh\` 註解掉測試部分
3. **類型錯誤**：專案中可能還有一些既有的類型錯誤，建議逐步修正

## 故障排除

### 檢查失敗
1. 查看錯誤訊息
2. 修正問題
3. 重新執行檢查

### 跳過檢查
只有在緊急情況下才使用：
\`\`\`bash
git commit --no-verify
\`\`\`

### 移除 Pre-commit Hook
\`\`\`bash
rm .git/hooks/pre-commit
\`\`\`
`
  }

  /**
   * Log a message if verbose mode is enabled.
   */
  protected log(message: string): void {
    if (this.config.verbose) {
      console.log(message)
    }
  }

  /**
   * Create generator context from options.
   */
  static createContext(
    name: string,
    targetDir: string,
    architecture: ArchitectureType,
    packageManager: 'bun' | 'npm' | 'yarn' | 'pnpm' = 'bun',
    extra: Record<string, unknown> = {}
  ): GeneratorContext {
    const now = new Date()

    // Convert name to various cases
    const pascalCase = name
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^./, (c) => c.toUpperCase())

    const camelCase = pascalCase.replace(/^./, (c) => c.toLowerCase())

    const snakeCase = name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/[-\s]+/g, '_')

    const kebabCase = name
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/[_\s]+/g, '-')

    return {
      name,
      namePascalCase: pascalCase,
      nameCamelCase: camelCase,
      nameSnakeCase: snakeCase,
      nameKebabCase: kebabCase,
      targetDir,
      architecture,
      packageManager,
      year: now.getFullYear().toString(),
      date: now.toISOString().split('T')[0] ?? now.toISOString().slice(0, 10),
      ...extra,
    }
  }
}
