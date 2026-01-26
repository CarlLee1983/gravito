import { spawnSync } from 'node:child_process'
import { constants } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import pc from 'picocolors'

/**
 * Options for the Gravito Doctor diagnostic command.
 *
 * @public
 */
type DoctorOptions = {
  /** Whether to attempt automatic repairs for detected issues. */
  fix?: boolean
}

/**
 * A diagnostic check function.
 *
 * @param context - The diagnostic context.
 * @returns A promise that resolves with the diagnostic result.
 * @private
 */
type DoctorCheck = (context: DoctorContext) => Promise<DoctorResult>

/**
 * Context provided to diagnostic checks.
 *
 * @public
 */
interface DoctorContext {
  /** The current working directory. */
  cwd: string
  /** The path to the .env file. */
  envPath?: string
  /** Function to retrieve current environment variables. */
  getEnv: () => Record<string, string>
  /** Function to reload environment variables from disk. */
  refreshEnv: () => Promise<void>
}

/**
 * Result of a diagnostic check.
 *
 * @public
 */
interface DoctorResult {
  /** The name of the check. */
  name: string
  /** Whether the check passed. */
  ok: boolean
  /** The severity of the issue if the check failed. */
  severity: 'info' | 'warning' | 'error'
  /** A concise summary of the result. */
  summary: string
  /** The root cause of the issue if the check failed. */
  rootCause?: string
  /** The impact of the issue if the check failed. */
  impact?: string
  /** A suggested command to fix the issue manually. */
  fixCommand?: string
  /** A function to automatically fix the issue. */
  autoFix?: () => Promise<string>
  /** A note about the fix that was applied. */
  fixNote?: string
}

/**
 * Run Gravito health checks and diagnostics.
 *
 * Scans the project for common configuration issues, version mismatches,
 * and environmental problems. Optionally attempts to fix identified issues.
 *
 * @param options - Diagnostic options.
 * @returns A promise that resolves when the diagnostics are complete.
 * @public
 */
export async function doctor(options: DoctorOptions = {}) {
  const cwd = process.cwd()
  let envState = await loadEnvFile(cwd)

  const context: DoctorContext = {
    cwd,
    envPath: envState.path,
    getEnv: () => envState.env,
    async refreshEnv() {
      envState = await loadEnvFile(cwd)
      context.envPath = envState.path
    },
  }

  const checks: DoctorCheck[] = [
    checkEnvFile,
    checkPortConfig,
    checkDatabaseEnv,
    checkMigrations,
    checkRedisConfig,
    checkPermissions,
    checkNodeVersion,
    checkBunVersion,
  ]

  const issues: DoctorResult[] = []
  const successes: string[] = []

  for (const check of checks) {
    let result = await check(context)
    if (result.ok) {
      successes.push(`${result.name}: ${result.summary}`)
      continue
    }

    if (options.fix && result.autoFix) {
      try {
        result.fixNote = await result.autoFix()
        await context.refreshEnv()
        const recheck = await check(context)
        if (recheck.ok) {
          successes.push(`${result.name}: ${recheck.summary} (auto fix applied)`)
          continue
        }
        result = { ...recheck, fixNote: result.fixNote }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        result.fixNote = `Auto fix failed: ${message}`
      }
    }

    issues.push(result)
  }

  printSummary(successes, issues, options.fix)

  process.exit(issues.length > 0 ? 1 : 0)
}

/**
 * Print a summary of diagnostic results to the console.
 *
 * @param successes - A list of successful check summaries.
 * @param issues - A list of identified issues.
 * @param autoFixEnabled - Whether auto-fix mode was enabled.
 * @private
 */
function printSummary(successes: string[], issues: DoctorResult[], autoFixEnabled?: boolean) {
  console.log(pc.bold('\n🌡️  Gravito Doctor'))

  if (issues.length === 0) {
    console.log(pc.green('All checks passed.'))
    if (successes.length > 0) {
      console.log(pc.dim(successes.join('\n')))
    }
    if (autoFixEnabled) {
      console.log(pc.green('Auto fix mode applied where available.'))
    }
    return
  }

  for (const issue of issues) {
    const icon = issue.severity === 'error' ? '✗' : '⚠️'
    const color = issue.severity === 'error' ? pc.red : pc.yellow
    console.log(color(`\n${icon} ${issue.name}`))
    console.log(pc.gray(issue.summary))
    if (issue.rootCause) {
      console.log(`  ${pc.bold('Root cause')}: ${issue.rootCause}`)
    }
    if (issue.impact) {
      console.log(`  ${pc.bold('Impact')}: ${issue.impact}`)
    }
    if (issue.fixCommand) {
      console.log(pc.cyan(`  Fix: ${issue.fixCommand}`))
    }
    if (issue.fixNote) {
      console.log(pc.green(`  ${issue.fixNote}`))
    }
  }

  if (autoFixEnabled) {
    console.log(pc.green('\nAuto fix mode attempted for supported checks.'))
  } else {
    console.log(pc.dim('\nRun `bun gravito doctor --fix` to attempt automatic repairs.'))
  }
}

/**
 * Load and parse the .env file from the specified directory.
 *
 * @param cwd - The directory containing the .env file.
 * @returns A promise that resolves with the parsed environment and the file path.
 * @private
 */
async function loadEnvFile(cwd: string): Promise<{ env: Record<string, string>; path: string }> {
  const envPath = path.join(cwd, '.env')
  try {
    const raw = await fs.readFile(envPath, 'utf-8')
    return { env: parseEnv(raw), path: envPath }
  } catch {
    return { env: {}, path: envPath }
  }
}

/**
 * Parse a raw environment file string into a record of key-value pairs.
 *
 * @param raw - The raw .env file content.
 * @returns A record of environment variables.
 * @private
 */
function parseEnv(raw: string): Record<string, string> {
  const env: Record<string, string> = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const [key, ...rest] = trimmed.split('=')
    if (!key) {
      continue
    }
    let value = rest.join('=').trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key.trim()] = value
  }

  return env
}

/**
 * Diagnostic check for the presence of the .env file.
 *
 * @param context - The diagnostic context.
 * @returns A promise that resolves with the diagnostic result.
 * @private
 */
async function checkEnvFile(context: DoctorContext): Promise<DoctorResult> {
  const envPath = path.join(context.cwd, '.env')
  try {
    await fs.access(envPath)
    return {
      name: 'Environment file',
      ok: true,
      severity: 'info',
      summary: '.env is present',
    }
  } catch {
    const examplePath = path.join(context.cwd, 'env.example')
    const issue: DoctorResult = {
      name: 'Environment file',
      ok: false,
      severity: 'error',
      summary: '.env is missing from the project root',
      rootCause:
        'The default environment template has not been copied, so the runtime cannot see configuration keys.',
      impact:
        'Config, secrets, and runtime keys are undefined－the app may refuse to boot or run with unsafe defaults.',
      fixCommand: 'cp env.example .env',
    }

    try {
      await fs.access(examplePath)
      issue.autoFix = async () => {
        await fs.copyFile(examplePath, envPath)
        await context.refreshEnv()
        return 'Copied env.example → .env'
      }
    } catch {
      // No auto fix available when template is missing.
    }

    return issue
  }
}

async function checkPortConfig(context: DoctorContext): Promise<DoctorResult> {
  const env = context.getEnv()
  const portRaw = env.PORT ?? process.env.PORT

  if (!portRaw) {
    return {
      name: 'Port configuration',
      ok: false,
      severity: 'warning',
      summary: 'PORT is not defined in .env or environment',
      rootCause:
        'No port key provided, so Gravito will fallback to the default (3000) which may collide with other services.',
      impact: 'Dev loop or staging instances risk port conflicts.',
      fixCommand: 'Add `PORT=3000` (or your preferred port) to .env',
      autoFix: async () => {
        if (!context.envPath) {
          throw new Error('No .env file path is available to write PORT')
        }
        await fs.appendFile(context.envPath, '\nPORT=3000\n')
        await context.refreshEnv()
        return 'Appended PORT=3000 to .env'
      },
    }
  }

  const portNumber = Number(portRaw)
  if (Number.isNaN(portNumber) || portNumber <= 0) {
    return {
      name: 'Port configuration',
      ok: false,
      severity: 'error',
      summary: 'PORT value is not a valid number',
      rootCause: 'The PORT key exists but contains text that cannot be parsed as a port.',
      impact: 'Gravito cannot bind to an invalid port, so the dev server will fail.',
      fixCommand: 'Set `PORT=3000` (or another 1024-65535 port) in .env',
    }
  }

  if (portNumber > 65535) {
    return {
      name: 'Port configuration',
      ok: false,
      severity: 'warning',
      summary: 'PORT value is outside the registered range',
      rootCause: 'The configured port exceeds 65535 and is not valid for TCP/UDP.',
      impact:
        'The server will fallback to the runtime default and may not start on the expected port.',
      fixCommand: 'Use a port between 1024 and 65535 (e.g. `PORT=3000`) in .env',
    }
  }

  return {
    name: 'Port configuration',
    ok: true,
    severity: 'info',
    summary: `PORT=${portNumber}`,
  }
}

async function checkDatabaseEnv(context: DoctorContext): Promise<DoctorResult> {
  const env = context.getEnv()
  const hasUrl = Boolean(env.DATABASE_URL || env.DB_URL || env.DB_CONNECTION)

  if (!hasUrl) {
    return {
      name: 'Database connection',
      ok: false,
      severity: 'error',
      summary: 'Database URL is not configured',
      rootCause: 'Environment keys such as DATABASE_URL or DB_CONNECTION are missing.',
      impact: 'Atlas (and other orbits) cannot connect to the database, so queries will fail.',
      fixCommand:
        'Add `DATABASE_URL=postgres://user:pass@localhost:5432/mydb` (or the driver you use) to .env',
    }
  }

  return {
    name: 'Database connection',
    ok: true,
    severity: 'info',
    summary: 'Database URL is configured',
  }
}

async function checkMigrations(context: DoctorContext): Promise<DoctorResult> {
  const migrationsDir = path.join(context.cwd, 'src', 'database', 'migrations')
  const drizzleConfig = path.join(context.cwd, 'drizzle.config.ts')

  let hasDrizzleConfig = false
  try {
    await fs.access(drizzleConfig)
    hasDrizzleConfig = true
  } catch {
    hasDrizzleConfig = false
  }

  try {
    const files = await fs.readdir(migrationsDir)
    const migrationFiles = files.filter((file) => file.endsWith('.ts'))

    if (migrationFiles.length === 0) {
      return {
        name: 'Migration status',
        ok: false,
        severity: hasDrizzleConfig ? 'warning' : 'error',
        summary: hasDrizzleConfig ? 'No migration files detected' : 'No migrations found',
        rootCause: 'The migrations folder is empty, so there is nothing to apply.',
        impact: 'Database structure is undefined until at least one migration runs.',
        fixCommand:
          'Run `bun gravito make:migration create_initial_schema` (or add a migration under src/database/migrations).',
      }
    }

    const summaryParts = [`${migrationFiles.length} migration(s) available`]
    if (hasDrizzleConfig) {
      summaryParts.push('(Drizzle)')
    } else {
      summaryParts.push('(Atlas)')
    }

    return {
      name: 'Migration status',
      ok: true,
      severity: 'info',
      summary: summaryParts.join(' '),
    }
  } catch {
    return {
      name: 'Migration status',
      ok: false,
      severity: 'warning',
      summary: 'Migrations directory is missing',
      rootCause: 'src/database/migrations does not exist.',
      impact: 'There are no migration artifacts for Gravito to apply.',
      fixCommand: 'Create the `src/database/migrations` folder and add migration files.',
    }
  }
}

async function checkRedisConfig(context: DoctorContext): Promise<DoctorResult> {
  const env = context.getEnv()
  const hasRedisUrl = Boolean(env.REDIS_URL)
  const hasHostPort = Boolean(env.REDIS_HOST && env.REDIS_PORT)

  if (!hasRedisUrl && !hasHostPort) {
    return {
      name: 'Redis configuration',
      ok: false,
      severity: 'warning',
      summary: 'Redis connection keys are not set',
      rootCause: 'REDIS_URL or REDIS_HOST/REDIS_PORT are missing from configuration.',
      impact: 'Caching + queues depending on Redis cannot bootstrap.',
      fixCommand: 'Add `REDIS_URL=redis://localhost:6379` or set both REDIS_HOST and REDIS_PORT.',
    }
  }

  return {
    name: 'Redis configuration',
    ok: true,
    severity: 'info',
    summary: 'Redis keys are provided',
  }
}

async function checkPermissions(context: DoctorContext): Promise<DoctorResult> {
  try {
    await fs.access(context.cwd, constants.R_OK | constants.W_OK)
    return {
      name: 'Filesystem permissions',
      ok: true,
      severity: 'info',
      summary: 'Project root is readable and writable',
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      name: 'Filesystem permissions',
      ok: false,
      severity: 'error',
      summary: 'Unable to read/write the project directory',
      rootCause: message,
      impact:
        'Gravito cannot scaffold, build, or cache because the runtime lacks directory permissions.',
      fixCommand:
        'Fix ownership / permissions (e.g. `sudo chown -R $(whoami) .` or `chmod u+rwx .`).',
    }
  }
}

async function checkNodeVersion(): Promise<DoctorResult> {
  const version = process.versions.node
  if (!version) {
    return {
      name: 'Node.js version',
      ok: false,
      severity: 'error',
      summary: 'Node.js version is unavailable',
      rootCause: 'The current runtime does not expose `process.versions.node`.',
      impact: 'Modules that rely on Node APIs may misbehave.',
      fixCommand: 'Ensure Node 18+ is installed (https://nodejs.org).',
    }
  }

  const major = Number(version.split('.')[0])
  if (major < 18) {
    return {
      name: 'Node.js version',
      ok: false,
      severity: 'error',
      summary: `Node.js ${version} detected`,
      rootCause: 'Older Node versions do not support the modern syntax Gravito leverages.',
      impact: 'The dev server and bundles may fail at runtime.',
      fixCommand: 'Upgrade Node.js to v18 or newer.',
    }
  }

  return {
    name: 'Node.js version',
    ok: true,
    severity: 'info',
    summary: `Node.js ${version}`,
  }
}

function detectBunVersion(): string | null {
  try {
    const result = spawnSync('bun', ['--version'], { encoding: 'utf-8' })
    if (result.status === 0 && result.stdout) {
      return result.stdout.trim()
    }
  } catch {
    // ignore
  }
  return null
}

async function checkBunVersion(): Promise<DoctorResult> {
  const builtin = process.versions.bun
  const detected = builtin ?? detectBunVersion()

  if (!detected) {
    return {
      name: 'Bun runtime',
      ok: false,
      severity: 'warning',
      summary: 'Bun is unavailable',
      rootCause: 'The CLI is running under Node.js or Bun is not installed globally.',
      impact: 'Gravito loses its native Bun DX perks (bun dev, bun build).',
      fixCommand: 'Install Bun via https://bun.sh/#install',
    }
  }

  const major = Number(detected.split('.')[0])
  if (Number.isNaN(major) || major < 1) {
    return {
      name: 'Bun runtime',
      ok: false,
      severity: 'warning',
      summary: `Bun ${detected} detected`,
      rootCause: 'A beta or unsupported Bun version is in use.',
      impact: 'Some Bun-first commands may behave unpredictably.',
      fixCommand:
        'Upgrade Bun to the latest stable release (`curl -fsSL https://bun.sh/install | bash`).',
    }
  }

  return {
    name: 'Bun runtime',
    ok: true,
    severity: 'info',
    summary: `Bun ${detected}`,
  }
}
