/**
 * @gravito/nova - Bun Shell Orchestration Engine
 *
 * Type-safe, shell-injection-resistant shell command execution for Gravito.
 * Provides template-literal-based API with automatic argument escaping,
 * pipeline composition, and PlanetCore integration.
 *
 * @example
 * ```typescript
 * import { Shell, OrbitNova } from '@gravito/nova'
 *
 * // Standalone usage
 * const result = await Shell.run`ls -la ${directory}`
 *
 * // With Gravito
 * const nova = new OrbitNova()
 * core.addOrbit(nova)
 * // Now available in controllers via ctx.get('shell')
 * ```
 *
 * @packageDocumentation
 */

export { NovaError, NovaShellError } from './errors'
// Orbit integration
export { OrbitNova } from './OrbitNova'
export { Pipeline } from './Pipeline'
// Core exports
export { Shell } from './Shell'
export { ShellCommand } from './ShellCommand'
// Types and errors
export type { ShellResult, ShellRunOptions } from './types'
