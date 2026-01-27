import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * A utility for conditionally joining CSS class names with Tailwind CSS support.
 *
 * Combines `clsx` for conditional logic and `tailwind-merge` to efficiently
 * resolve Tailwind class conflicts (e.g., 'px-2 px-4' becomes 'px-4').
 *
 * @param inputs - Variadic list of class values (strings, objects, arrays, booleans).
 * @returns A single string of resolved and merged class names.
 *
 * @example
 * ```ts
 * cn('px-2 py-1', 'px-4'); // Returns 'py-1 px-4'
 * cn('base', isActive && 'active', { 'hidden': !isVisible });
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
