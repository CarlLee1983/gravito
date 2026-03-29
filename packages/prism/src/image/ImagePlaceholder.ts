/**
 * ImagePlaceholder - Utilities for Low Quality Image Placeholders (LQIP).
 *
 * Provides helper functions to calculate optimal placeholder sizes and generate
 * CSS styles for blur effects, helping to improve perceived performance and LCP.
 *
 * @public
 * @since 3.1.0
 */

/**
 * Configuration options for LQIP generation.
 */
export interface LQIPOptions {
  /** Original image width */
  width: number
  /** Original image height */
  height: number
  /** Target quality (1-100). Optional. */
  quality?: number
}

/**
 * Calculate minimum LQIP size required to satisfy Chrome's LCP heuristics.
 *
 * Chrome requires an image to have a minimum entropy of 0.05 bits per pixel
 * to be considered "contentful" for Largest Contentful Paint (LCP).
 *
 * @param width - Image width in pixels.
 * @param height - Image height in pixels.
 * @returns Minimum estimated size in KB.
 *
 * @example
 * ```typescript
 * const minSize = calculateMinLQIPSize(1440, 810);
 * // Returns: ~8.02 KB
 * ```
 */
export function calculateMinLQIPSize(width: number, height: number): number {
  // 0.05 BPP (bits per pixel)
  const bitsPerPixel = 0.05
  const totalPixels = width * height
  const bitsRequired = totalPixels * bitsPerPixel
  const bytesRequired = bitsRequired / 8
  const kilobytesRequired = bytesRequired / 1000

  return Math.ceil(kilobytesRequired * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate recommended dimensions for a blur placeholder.
 *
 * Placeholders should be very small (e.g., 20px wide) to minimize payload size,
 * relying on CSS blurring to smooth out the pixels.
 *
 * @param width - Original image width.
 * @param height - Original image height.
 * @param targetWidth - Desired width for the placeholder. @default 20
 * @returns Object containing `width` and `height` maintaining aspect ratio.
 *
 * @example
 * ```typescript
 * const dims = calculateLQIPDimensions(800, 600);
 * // => { width: 20, height: 15 }
 * ```
 */
export function calculateLQIPDimensions(
  width: number,
  height: number,
  targetWidth = 20
): { width: number; height: number } {
  const aspectRatio = height / width
  const lqipWidth = targetWidth
  const lqipHeight = Math.round(lqipWidth * aspectRatio)

  return { width: lqipWidth, height: lqipHeight }
}

/**
 * Generate CSS styles for a blur placeholder.
 *
 * Creates the necessary CSS to display a base64 background image with a blur filter,
 * scaled slightly to hide blurred edges.
 *
 * @param blurDataURL - Base64 encoded placeholder image.
 * @param width - Display width in pixels.
 * @param height - Display height in pixels.
 * @returns Record of CSS properties.
 *
 * @example
 * ```typescript
 * const style = generatePlaceholderStyles('data:image...', 800, 600);
 * ```
 */
export function generatePlaceholderStyles(
  blurDataURL: string,
  width: number,
  height: number
): Record<string, string> {
  return {
    'background-image': `url(${blurDataURL})`,
    'background-size': 'cover',
    'background-position': 'center',
    filter: 'blur(20px)',
    transform: 'scale(1.1)', // Slight scale to hide blur edges
    width: `${width}px`,
    height: `${height}px`,
  }
}

/**
 * Convert a hex color string to an RGB object.
 *
 * @param hex - Hex color string (e.g., "#ff0000" or "ff0000").
 * @returns Object with r, g, b values.
 */
export function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

/**
 * Generate a solid color placeholder image as an SVG data URL.
 *
 * Useful for extremely lightweight placeholders that just match the dominant color.
 *
 * @param color - CSS color string (hex, rgb, etc.).
 * @param width - Image width.
 * @param height - Image height.
 * @returns Base64 encoded SVG data URL.
 *
 * @example
 * ```typescript
 * const dataUrl = generateColorPlaceholder('#3b82f6', 100, 100);
 * ```
 */
export function generateColorPlaceholder(color: string, width: number, height: number): string {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
  </svg>`

  const base64 = btoa(svg)
  return `data:image/svg+xml;base64,${base64}`
}
