import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Conditionally join class names and merge Tailwind CSS classes.
 *
 * It uses `clsx` for conditional logic and `tailwind-merge` to ensure
 * that conflicting Tailwind classes are resolved correctly.
 *
 * @param inputs - A list of class values to be merged.
 * @returns The merged class string.
 *
 * @public
 * @since 3.0.0
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
