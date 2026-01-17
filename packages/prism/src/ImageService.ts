/**
 * ImageService - core image rendering service.
 *
 * Generates optimized `<img>` tags aligned with Core Web Vitals:
 * - Generates responsive `srcset`
 * - Normalizes image paths
 * - Ensures accessibility and performance defaults
 */

/**
 * Options for generating an optimized image.
 *
 * Configures the image rendering process, allowing for fine-grained control over
 * accessibility, performance, and responsive behavior.
 *
 * @example
 * ```typescript
 * const options: ImageOptions = {
 *   src: '/images/hero.jpg',
 *   alt: 'Hero Image',
 *   width: 1200,
 *   height: 600,
 *   loading: 'eager',
 *   fetchpriority: 'high'
 * };
 * ```
 *
 * @public
 * @since 3.0.0
 */
export interface ImageOptions {
  /** Source URL or path of the image. Absolute URLs are supported. */
  src: string
  /** Fixed width in pixels. Highly recommended to prevent Cumulative Layout Shift (CLS). */
  width?: number
  /** Fixed height in pixels. Highly recommended to prevent Cumulative Layout Shift (CLS). */
  height?: number
  /** Alternative text for accessibility. REQUIRED for accessibility compliance. */
  alt: string
  /** Loading strategy. Use 'eager' for LCP images and 'lazy' for others. @default 'lazy' */
  loading?: 'lazy' | 'eager'
  /** Responsive sizes attribute string. e.g., "(max-width: 600px) 480px, 800px" */
  sizes?: string
  /** Custom widths for srcset or boolean to toggle default auto-generation. */
  srcset?: boolean | number[]
  /** CSS class names to apply to the img tag. */
  class?: string
  /** Inline CSS styles to apply to the img tag. */
  style?: string
  /** Decoding strategy. @default 'async' */
  decoding?: 'async' | 'auto' | 'sync'
  /** Fetch priority hint for LCP optimization. */
  fetchpriority?: 'high' | 'low' | 'auto'
}

/**
 * ImageService handles the generation of optimized HTML `<img>` tags.
 *
 * It strictly follows Web Vitals best practices, including:
 * - Automatic `srcset` generation for responsive images.
 * - Aspect-ratio preservation using `width` and `height`.
 * - Accessibility enforcement via mandatory `alt` text.
 * - Performance optimizations like `loading="lazy"` and `decoding="async"`.
 *
 * @example
 * ```typescript
 * const service = new ImageService();
 * const html = service.generateImageTag({
 *   src: '/assets/logo.png',
 *   alt: 'Company Logo',
 *   width: 200,
 *   height: 50
 * });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export class ImageService {
  /**
   * Generate optimized image attributes as a key-value object.
   *
   * This is useful for framework integrations (like React or Vue) where you need
   * an object of props rather than a raw HTML string.
   *
   * @param options - Configuration options for the image.
   * @returns An object containing the HTML attributes for the `<img>` tag.
   * @throws {Error} If the mandatory `alt` attribute is missing or empty.
   */
  public generateImageAttributes(options: ImageOptions): Record<string, string> {
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

    const attributes: Record<string, string> = {}

    // Normalize image path
    const normalizedSrc = this.normalizePath(src)
    attributes.src = normalizedSrc
    attributes.alt = alt

    // Width/height (prevents CLS)
    if (width !== undefined) {
      attributes.width = String(width)
    }
    if (height !== undefined) {
      attributes.height = String(height)
    }

    // Lazy loading
    attributes.loading = loading

    // Decoding hint
    attributes.decoding = decoding

    // Priority hint (LCP optimization)
    if (fetchpriority) {
      attributes.fetchpriority = fetchpriority
    }

    // Generate srcset (if enabled)
    if (srcsetOption !== false && width !== undefined) {
      const widths = Array.isArray(srcsetOption)
        ? srcsetOption
        : this.generateDefaultSrcsetWidths(width)
      const srcsetValue = this.generateSrcset(normalizedSrc, widths)
      if (srcsetValue) {
        attributes.srcset = srcsetValue
      }
    }

    // `sizes` attribute (responsive images)
    if (sizes) {
      attributes.sizes = sizes
    } else if (srcsetOption !== false && width !== undefined) {
      // Default `sizes` when width is provided and srcset is enabled
      attributes.sizes = `(max-width: ${width}px) 100vw, ${width}px`
    }

    // Optional attributes
    if (className) {
      attributes.class = className
    }
    if (style) {
      attributes.style = style
    }

    return attributes
  }

  /**
   * Generate a full `<img>` tag HTML string.
   *
   * @param options - Configuration options for the image.
   * @returns A string containing the full HTML `<img>` tag.
   *
   * @example
   * ```typescript
   * const html = service.generateImageTag({
   *   src: 'photo.jpg',
   *   alt: 'A beautiful photo',
   *   width: 800
   * });
   * ```
   */
  public generateImageTag(options: ImageOptions): string {
    const attrs = this.generateImageAttributes(options)

    // Convert attributes object to string
    const attrString = Object.entries(attrs)
      .map(([key, value]) => `${key}="${this.escapeHtml(value)}"`)
      .join(' ')

    return `<img ${attrString} />`
  }

  /**
   * Generate a `srcset` string for responsive images.
   *
   * This method generates multiple image paths with width descriptors based on
   * the provided width list.
   *
   * @param src - Original image path or URL.
   * @param widths - An array of widths (in pixels) to generate descriptors for.
   * @returns A `srcset` string, e.g. `"image-400w.jpg 400w, image-800w.jpg 800w"`, or an empty string if widths list is invalid.
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
   * Normalize an image path for consistent rendering.
   *
   * This ensures relative paths start with a leading slash and leaves absolute
   * URLs (http/https) untouched.
   *
   * @param src - The raw image path or URL.
   * @returns The normalized path or URL.
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
