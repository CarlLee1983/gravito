import { existsSync } from 'node:fs'
import path from 'node:path'
import { Painter as pc } from '@gravito/chromatic'
import { CliError } from '../errors/CliError'
import { CliErrorCodes } from '../errors/codes'

const ENTRY_CANDIDATES = [
  'src/index.ts',
  'src/main.ts',
  'app.ts',
  'index.ts',
]

export function resolveEntryPath(entry: string, cwd: string = process.cwd()): string {
  const explicit = path.resolve(cwd, entry)

  if (entry !== 'src/index.ts') {
    return explicit
  }

  if (existsSync(path.resolve(cwd, 'gravito.config.ts'))) {
    return path.resolve(cwd, 'src/index.ts')
  }

  for (const candidate of ENTRY_CANDIDATES) {
    const resolved = path.resolve(cwd, candidate)
    if (existsSync(resolved)) {
      return resolved
    }
  }

  return explicit
}

/**
 * Generate Orbit/Satellite dependency graph.
 *
 * @param options - Generation options.
 * @param options.entry - The entry file of the application.
 * @param options.format - The output format (dot, json).
 * @public
 */
export async function depsGraph(options: { entry: string; format: 'dot' | 'json' }) {
  try {
    const entryPath = resolveEntryPath(options.entry)

    console.error(pc.cyan(`\n🔍 Analyzing dependencies in ${path.relative(process.cwd(), entryPath) || entryPath}...`))

    // Import the app
    const module = await import(entryPath)
    const mod = typeof module === 'object' && module !== null ? module : {}
    const defaultExport = typeof mod.default === 'object' && mod.default !== null ? mod.default : undefined

    // Try to find PlanetCore instance
    const core = mod.core || defaultExport?.core || mod.app?.core || defaultExport?.app?.core

    if (!core || !Array.isArray(core.installedOrbits)) {
      throw new CliError(500, CliErrorCodes.APP_INSTANCE_NOT_FOUND, {
        message: 'Could not find a valid Gravito PlanetCore instance in the entry file.',
      })
    }

    const orbits = core.installedOrbits

    if (options.format === 'json') {
      console.log(JSON.stringify(orbits, null, 2))
    } else {
      // DOT format
      let dot = 'digraph GravitoDependencies {\n'
      dot += '  rankdir=LR;\n'
      dot += '  node [shape=box, style=filled, fontname="Helvetica", fontsize=11];\n'

      for (const orbit of orbits) {
        const isLeaf = orbit.dependencies.length === 0
        if (isLeaf) {
          dot += `  "${orbit.name}" [fillcolor="#c8e6c9"];\n`
        } else {
          dot += `  "${orbit.name}" [fillcolor="#e1f5fe"];\n`
        }
        for (const dep of orbit.dependencies) {
          dot += `  "${orbit.name}" -> "${dep}";\n`
        }
      }

      dot += '}\n'
      console.log(dot)
    }

    const summary = `\n${pc.bold('Orbits analyzed:')} ${orbits.length}\n`
    console.error(pc.green(`\n✨ Dependency graph generated successfully!`))
    console.error(summary)

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(pc.red(`Failed to generate dependency graph: ${message}`))
    process.exit(1)
  }
}
