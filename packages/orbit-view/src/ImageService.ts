/**
 * ImageService - core image rendering service.
 *
 * Generates optimized `<img>` tags aligned with Core Web Vitals:
 * - Generates responsive `srcset`
 * - Normalizes image paths
 * - Ensures accessibility and performance defaults
 */

export interface ImageOptions {
  src: string
  width?: number
  height?: number
  alt: string
  loading?: 'lazy' | 'eager'
  sizes?: string
  srcset?: boolean | number[]
  class?: string
  style?: string
  decoding?: 'async' | 'auto' | 'sync'
  fetchpriority?: 'high' | 'low' | 'auto'
}

export class ImageService {
  /**
   * Generate a full `<img>` tag HTML string.
   */
  public generateImageTag(options: ImageOptions): string {
    const {
      src,
      width,
      height,
      alt,
      loading = 'lazy',
      sizes,
      srcset: srcsetOption,
      class: className,
      style,
      decoding = 'async',
      fetchpriority,
    } = options

    // Validate required properties
    if (!alt || alt.trim() === '') {
      throw new Error('Image alt attribute is required for accessibility')
    }

    // Normalize image path
    const normalizedSrc = this.normalizePath(src)

    // Build attribute list
    const attributes: string[] = []

    // Required attributes
    attributes.push(`src="${this.escapeHtml(normalizedSrc)}"`)
    attributes.push(`alt="${this.escapeHtml(alt)}"`)

    // Width/height (prevents CLS)
    if (width !== undefined) {
      attributes.push(`width="${width}"`)
    }
    if (height !== undefined) {
      attributes.push(`height="${height}"`)
    }

    // Lazy loading
    attributes.push(`loading="${loading}"`)

    // Decoding hint
    attributes.push(`decoding="${decoding}"`)

    // Priority hint (LCP optimization)
    if (fetchpriority) {
      attributes.push(`fetchpriority="${fetchpriority}"`)
    }

    // Generate srcset (if enabled)
    if (srcsetOption !== false && width !== undefined) {
      const widths = Array.isArray(srcsetOption)
        ? srcsetOption
        : this.generateDefaultSrcsetWidths(width)
      const srcsetValue = this.generateSrcset(normalizedSrc, widths)
      if (srcsetValue) {
        attributes.push(`srcset="${srcsetValue}"`)
      }
    }

    // `sizes` attribute (responsive images)
    if (sizes) {
      attributes.push(`sizes="${this.escapeHtml(sizes)}"`)
    } else if (srcsetOption !== false && width !== undefined) {
      // Default `sizes` when width is provided and srcset is enabled
      attributes.push(`sizes="(max-width: ${width}px) 100vw, ${width}px"`)
    }

    // Optional attributes
    if (className) {
      attributes.push(`class="${this.escapeHtml(className)}"`)
    }
    if (style) {
      attributes.push(`style="${this.escapeHtml(style)}"`)
    }

    return `<img ${attributes.join(' ')} />`
  }

  /**
   * Generate a `srcset` string.
   *
   * @param src - Original image path
   * @param widths - Width list (e.g. [400, 800, 1200])
   * @returns A `srcset` string, e.g. `"image-400w.jpg 400w, image-800w.jpg 800w"`
   */
  public generateSrcset(src: string, widths: number[]): string {
    if (widths.length === 0) {
      return ''
    }

    // If there's only one width, no need for srcset
    if (widths.length === 1) {
      return ''
    }

    // Generate items
    const srcsetItems = widths.map((width) => {
      const srcWithWidth = this.addWidthToPath(src, width)
      return `${srcWithWidth} ${width}w`
    })

    return srcsetItems.join(', ')
  }

  /**
   * Generate default srcset widths based on a base width (1x, 1.5x, 2x).
   */
  private generateDefaultSrcsetWidths(baseWidth: number): number[] {
    const widths = new Set<number>()

    // Add base width
    widths.add(baseWidth)

    // Add 1.5x (when reasonable)
    const width15x = Math.round(baseWidth * 1.5)
    if (width15x <= baseWidth * 2) {
      widths.add(width15x)
    }

    // Add 2x
    widths.add(baseWidth * 2)

    // Add smaller widths (responsive)
    if (baseWidth >= 800) {
      widths.add(400)
      widths.add(800)
    } else if (baseWidth >= 400) {
      widths.add(400)
    }

    // Sort and return
    return Array.from(widths).sort((a, b) => a - b)
  }

  /**
   * Add a width marker to the image path.
   * Example: `/static/hero.jpg` -> `/static/hero-800w.jpg`
   *
   * Note: This is a simplified implementation. Real-world setups may require
   * more robust path handling and/or an image transformer service.
   */
  private addWidthToPath(src: string, width: number): string {
    // If it's an absolute URL, return as-is (do not rewrite external URLs)
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return src
    }

    // Split path and extension
    const lastDotIndex = src.lastIndexOf('.')
    if (lastDotIndex === -1) {
      // No extension: append width directly
      return `${src}-${width}w`
    }

    const pathWithoutExt = src.substring(0, lastDotIndex)
    const extension = src.substring(lastDotIndex)

    return `${pathWithoutExt}-${width}w${extension}`
  }

  /**
   * Normalize an image path:
   * - Ensures it starts with `/` for relative paths
   * - Leaves absolute URLs untouched
   */
  public normalizePath(src: string): string {
    // Absolute URL: return as-is
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
      return src
    }

    // Ensure a leading slash
    if (!src.startsWith('/')) {
      return `/${src}`
    }

    return src
  }

  /**
   * Escape HTML.
   */
  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
