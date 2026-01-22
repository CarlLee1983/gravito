/**
 * Template engine type definitions
 *
 * @public
 * @since 3.1.0
 */

/**
 * Options for rendering templates.
 */
export interface RenderOptions {
  /** Legacy layout support - specifies a layout file to use */
  layout?: string
  /** Additional data to pass to the template */
  [key: string]: unknown
}

/**
 * Custom helper function signature.
 */
export type HelperFunction = (
  args: Record<string, string | number | boolean>,
  data: Record<string, unknown>
) => string

/**
 * Render context for section and stack management
 */
export interface RenderContext {
  /** Sections captured from @section directives */
  sections: Map<string, string>
  /** Stacks captured from @push directives */
  stacks: Map<string, string[]>
}

/**
 * Compiled template metadata
 */
export interface CompiledMetadata {
  hasConditionals: boolean
  hasLoops: boolean
  hasComponents: boolean
}

/**
 * Compiler options
 */
export interface CompilerOptions {
  /** Strict mode - throw on undefined vars */
  strict?: boolean
  /** Debug mode - add source maps */
  debug?: boolean
}
