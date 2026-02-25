import fs from 'node:fs/promises'
import path from 'node:path'
import { Painter as pc } from '@gravito/chromatic'

/**
 * Cache named routes to a JSON manifest file.
 *
 * Scans the application's entry point, exports named routes from the router,
 * and saves them to the specified output file for faster lookup at runtime.
 *
 * @param options - Caching options.
 * @param options.entry - The entry file of the application.
 * @param options.output - The path to the output manifest file.
 * @returns A promise that resolves when the routes are cached.
 * @public
 */
export async function routeCache(options: { entry: string; output?: string }) {
  try {
    const cwd = process.cwd()
    const entryPath = path.resolve(cwd, options.entry)
    const outputPath = path.resolve(cwd, options.output ?? 'bootstrap/cache/routes.json')

    const module = await import(entryPath)
    const core = module.default?.core || module.core

    if (!core?.router?.exportNamedRoutes) {
      throw new Error('Could not find core.router.exportNamedRoutes().')
    }

    const manifest = core.router.exportNamedRoutes()

    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2), 'utf-8')

    console.log(pc.green(`✅ Routes cached to ${path.relative(cwd, outputPath)}`))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`❌ Failed to cache routes: ${message}`))
    process.exit(1)
  }
}

/**
 * Clear the cached routes manifest file.
 *
 * @param options - Clearing options.
 * @param options.output - The path to the manifest file to remove.
 * @returns A promise that resolves when the cache is cleared.
 * @public
 */
export async function routeClear(options: { output?: string }) {
  try {
    const cwd = process.cwd()
    const outputPath = path.resolve(cwd, options.output ?? 'bootstrap/cache/routes.json')

    await fs.rm(outputPath, { force: true })
    console.log(pc.green(`✅ Routes cache cleared: ${path.relative(cwd, outputPath)}`))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`❌ Failed to clear route cache: ${message}`))
    process.exit(1)
  }
}
