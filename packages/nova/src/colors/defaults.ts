import type { ColorConfig, ShellColorScheme } from '../types'

/**
 * Default color scheme for shell output formatting.
 * Uses semantic colors for consistent visual feedback.
 * @internal
 */
export const DEFAULT_SHELL_COLORS: ShellColorScheme = {
  running: '#0099ff', // Bright blue for running/pending
  success: '#00cc66', // Green for success
  error: '#ff3333', // Red for error
  stderr: '#ffaa00', // Orange for stderr/warnings
  label: '#0099ff', // Bright blue for labels
  useSymbols: true,
}

/**
 * Default color configuration for shell commands.
 * Respects NO_COLOR environment variable.
 * @internal
 */
export const DEFAULT_COLOR_CONFIG: ColorConfig = {
  enabled: !process.env.NO_COLOR,
  scheme: DEFAULT_SHELL_COLORS,
}

/**
 * Unicode and ASCII symbols for shell output formatting.
 * Automatically falls back to ASCII on unsupported terminals.
 * @internal
 */
export const SYMBOLS = {
  // Status indicators
  running: '⟳', // or ↻ or ⋯
  success: '✓', // or ✔ or ●
  error: '✗', // or ✘ or ○
  warning: '⚠', // or ⚡

  // Structural elements
  separator: '─', // or -
  pipe: '│', // or |
  corner: '└', // or L
  branch: '├', // or |-

  // Spacing
  space: ' ',
  arrow: '→', // or ->
  bullet: '•', // or *
}

/**
 * Fallback ASCII symbols for terminals without Unicode support.
 * @internal
 */
export const ASCII_SYMBOLS = {
  running: '...',
  success: '✓',
  error: '✗',
  warning: '!',
  separator: '-',
  pipe: '|',
  corner: 'L',
  branch: '|-',
  space: ' ',
  arrow: '->',
  bullet: '*',
}
