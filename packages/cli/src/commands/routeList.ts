import path from 'node:path'
import { Painter as pc } from '@gravito/chromatic'
import { CliError } from '../errors/CliError'
import { CliErrorCodes } from '../errors/codes'

/**
 * Check if a value is a plain object record.
 *
 * @param value - The value to check.
 * @returns True if the value is a record, false otherwise.
 * @private
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Simplified route object structure from Photon.
 */
type PhotonRouteLike = { method: string; path: string; name?: string }

/**
 * Simplified Photon application structure.
 */
type PhotonAppLike = { routes: PhotonRouteLike[] }

/**
 * Type guard to check if a value resembles a Photon application instance.
 *
 * @param value - The value to check.
 * @returns True if the value matches the PhotonAppLike interface.
 * @private
 */
function isPhotonAppLike(value: unknown): value is PhotonAppLike {
  return (
    isRecord(value) &&
    Array.isArray(value.routes) &&
    value.routes.every(
      (r) =>
        isRecord(r) &&
        typeof r.method === 'string' &&
        typeof r.path === 'string' &&
        (r.name === undefined || typeof r.name === 'string')
    )
  )
}

/**
 * List all registered routes in the application.
 *
 * Scans the application's entry point, finds the Photon app instance,
 * and prints a formatted table of all defined routes.
 *
 * @param options - Listing options.
 * @param options.entry - The entry file of the application.
 * @returns A promise that resolves when the routes are listed.
 * @public
 */
export async function routeList(options: { entry: string }) {
  try {
    const cwd = process.cwd()
    const entryPath = path.resolve(cwd, options.entry)

    // Import the app
    const module = await import(entryPath)
    // Try to find the Photon app instance
    // Standard pattern: import { app } from './index' or default export
    // Gravito Core usually wraps it. core.app is the Photon instance.

    const mod = isRecord(module) ? module : {}
    const defaultExport = isRecord(mod.default) ? mod.default : undefined
    const coreCandidate = defaultExport?.core ?? mod.core
    const core = isRecord(coreCandidate) ? coreCandidate : undefined

    const routerCandidate = core?.router
    const exportNamedRoutes =
      isRecord(routerCandidate) && typeof routerCandidate.exportNamedRoutes === 'function'
        ? (routerCandidate.exportNamedRoutes as () => Record<
            string,
            { method: string; path: string; domain?: string }
          >)
        : null

    const namedRoutes = exportNamedRoutes ? exportNamedRoutes() : {}

    const nameBySignature = new Map<string, string>()
    for (const [name, def] of Object.entries(namedRoutes)) {
      nameBySignature.set(`${def.method} ${def.path}`, name)
    }

    const appCandidate = core?.app ?? defaultExport ?? mod.app
    const photonApp: PhotonAppLike | null = isPhotonAppLike(appCandidate) ? appCandidate : null

    if (!photonApp) {
      throw new CliError(500, CliErrorCodes.APP_INSTANCE_NOT_FOUND, {
        message: 'Could not look up Photon app instance in entry file.',
      })
    }

    console.log(pc.bold(`\n📍 Registered Routes`))
    console.log(
      pc.gray('--------------------------------------------------------------------------------')
    )
    console.log(pc.bold('METHOD'.padEnd(10)) + pc.bold('PATH'.padEnd(40)) + pc.bold('NAME/HANDLER'))
    console.log(
      pc.gray('--------------------------------------------------------------------------------')
    )

    // Photon .routes is an array of objects
    // route structure: { method: string, path: string, handler: Function, name?: string }
    for (const route of photonApp.routes) {
      const method = route.method
      const pathStr = route.path
      const name = route.name || nameBySignature.get(`${method} ${pathStr}`) || '-'

      // Colorize method
      let methodColored = method
      switch (method) {
        case 'GET':
          methodColored = pc.cyan(method)
          break
        case 'POST':
          methodColored = pc.yellow(method)
          break
        case 'PUT':
          methodColored = pc.blue(method)
          break
        case 'DELETE':
          methodColored = pc.red(method)
          break
        case 'PATCH':
          methodColored = pc.magenta(method)
          break
      }

      console.log(
        methodColored.padEnd(19) + // extra padding for ansi codes? No, manual padding might be tricky with colors
          pathStr.padEnd(40) +
          name
      )
    }
    console.log('')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`Failed to list routes: ${message}`))
    process.exit(1)
  }
}
