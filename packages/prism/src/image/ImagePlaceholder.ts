/**
 * ImagePlaceholder - LQIP (Low Quality Image Placeholder) utilities
 *
 * Provides utilities for:
 * - Calculating minimum LQIP size for LCP compliance
 * - Generating blur placeholders
 * - Extracting dominant colors
 */

export interface LQIPOptions {
  /** Image width */
  width: number
  /** Image height */
  height: number
  /** Target quality (optional, default: auto-calculated) */
  quality?: number
}

/**
 * Calculate minimum LQIP size for Chrome LCP requirements
 *
 * Chrome requires minimum 0.05 BPP (bits per pixel) for an image
 * to be considered "contentful" enough to count as LCP.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Minimum size in KB
 *
 * @example
 * ```typescript
 * const minSize = calculateMinLQIPSize(1440, 810)
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
 * Generate recommended LQIP dimensions
 *
 * For blur placeholders, we can use smaller dimensions
 * (typically 10-20px wide) since they'll be blurred anyway.
 *
 * @param width - Original width
 * @param height - Original height
 * @param targetWidth - Target LQIP width (default: 20px)
 * @returns Scaled dimensions
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
 * Generate placeholder styles for blur effect
 *
 * @param blurDataURL - Base64 encoded blur image
 * @param width - Image width
 * @param height - Image height
 * @returns CSS styles object
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
 * Convert hex color to RGB
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
 * Generate solid color placeholder
 *
 * @param color - Hex color (e.g., '#ff0000')
 * @param width - Image width
 * @param height - Image height
 * @returns SVG data URL
 */
export function generateColorPlaceholder(color: string, width: number, height: number): string {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
  </svg>`

  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}
