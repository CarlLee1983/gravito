/**
 * ImageService - Core service for generating optimized image markup.
 *
 * This service is the heart of Gravito's image optimization strategy, responsible for
 * generating high-performance `<img>` and `<picture>` tags that comply with
 * Core Web Vitals best practices.
 *
 * Key features:
 * - **Responsive Images**: Automatically generates `srcset` and `sizes` attributes.
 * - **Format Negotiation**: Supports AVIF and WebP with modern fallback strategies.
 * - **CLS Prevention**: Enforces width/height attributes to reserve layout space.
 * - **Lazy Loading**: Applies optimal loading strategies based on image priority.
 * - **Art Direction**: Supports `<picture>` media queries for different device layouts.
 *
 * @public
 * @since 3.0.0
 */

import type { ImageCDNLoader } from './ImageCDNLoader'

/**
 * Configuration for art-directed images using the `<picture>` element.
 *
 * Allows specifying different image sources or crops for different viewport sizes.
 */
export interface ArtDirectionConfig {
  /** CSS media query (e.g., `(min-width: 768px)`). */
  media: string
  /** Source URL for this breakpoint. */
  src: string
  /** Intrinsic width of the image at this breakpoint. */
  width?: number
  /** Intrinsic height of the image at this breakpoint. */
  height?: number
  /** Specific file formats to generate for this breakpoint (overrides defaults). */
  formats?: ('avif' | 'webp' | 'original')[]
}

/**
 * Options for generating an optimized image.
 *
 * Provides granular control over the rendering of image tags, including performance
 * hints, accessibility attributes, and responsive behaviors.
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
  /** Source URL or path of the image. Absolute URLs and relative paths are supported. */
  src: string
  /** Fixed width in pixels. Required to prevent Cumulative Layout Shift (CLS). */
  width?: number
  /** Fixed height in pixels. Required to prevent Cumulative Layout Shift (CLS). */
  height?: number
  /** Alternative text for accessibility. MUST describe the image content. */
  alt: string
  /** Browser loading strategy. Use 'eager' for LCP images (above the fold) and 'lazy' for others. @default 'lazy' */
  loading?: 'lazy' | 'eager'
  /** Responsive `sizes` attribute. Defines the slot width. e.g., "(max-width: 600px) 480px, 800px". */
  sizes?: string
  /** Custom widths for `srcset` generation. Set to `false` to disable auto-generation. */
  srcset?: boolean | number[]
  /** CSS class names to apply to the img tag. */
  class?: string
  /** Inline CSS styles to apply to the img tag. */
  style?: string
  /** Image decoding hint. Use 'async' to prevent main thread blocking. @default 'async' */
  decoding?: 'async' | 'auto' | 'sync'
  /** Fetch priority hint. Use 'high' for LCP images to boost priority. */
  fetchpriority?: 'high' | 'low' | 'auto'
  /** Enable automatic format negotiation (AVIF/WebP) via `<picture>` tag. @default false */
  formatNegotiation?: boolean
  /** Target formats for format negotiation. @default ['avif', 'webp'] */
  formats?: ('avif' | 'webp' | 'original')[]
  /** Force usage of `<picture>` element instead of simple `<img>`. @default false */
  usePicture?: boolean
  /** Array of art direction configurations for responsive design. */
  artDirection?: ArtDirectionConfig[]
  /** Placeholder strategy for loading state. @default 'none' */
  placeholder?: 'none' | 'blur' | 'color'
  /** Base64 encoded low-quality image placeholder (LQIP). Required if placeholder is 'blur'. */
  blurDataURL?: string
  /** Dominant color hex string. Required if placeholder is 'color'. */
  dominantColor?: string
  /** Custom CDN loader to transform image URLs. */
  loader?: ImageCDNLoader
}

/**
 * ImageService handles the generation of optimized HTML `<img>` tags.
 *
 * It enforces web performance best practices by default, ensuring that images
 * are accessible, responsive, and efficient.
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
   * Generate a dictionary of HTML attributes for an image.
   *
   * Useful when integrating with component frameworks (React, Vue) where you need
   * props objects instead of raw HTML strings.
   *
   * @param options - Configuration options for the image.
   * @returns Key-value pairs of HTML attributes (e.g., `{ src: '...', alt: '...' }`).
   * @throws {Error} If `alt` text is missing or empty (accessibility violation).
   *
   * @example
   * ```typescript
   * const props = service.generateImageAttributes({
   *   src: 'photo.jpg',
   *   alt: 'Photo',
   *   width: 100
   * });
   * // => { src: 'photo.jpg', alt: 'Photo', width: '100', ... }
   * ```
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
   * Generate a complete HTML `<img>` tag string.
   *
   * Constructs a self-closing `<img>` tag with all necessary attributes for
   * performance and accessibility. This is the primary method for generating
   * standard image markup.
   *
   * @param options - Configuration options for the image.
   * @returns A fully formed HTML string, e.g., `<img src="..." alt="..." width="..." height="..." loading="lazy" />`.
   *
   * @throws {Error} If the `alt` attribute is missing or empty.
   *
   * @example
   * ```typescript
   * const html = service.generateImageTag({
   *   src: 'photo.jpg',
   *   alt: 'A beautiful sunset over the ocean',
   *   width: 800,
   *   height: 450
   * });
   * ```
   *
   * @public
   * @since 3.0.0
   */
  public generateImageTag(options: ImageOptions): string {
    const attrs = this.generateImageAttributes(options)

    const attrString = Object.entries(attrs)
      .map(([key, value]) => `${key}="${this.escapeHtml(value)}"`)
      .join(' ')

    return `<img ${attrString} />`
  }

  /**
   * Generate a `<picture>` element with format negotiation and/or art direction.
   *
   * Creates a `<picture>` tag wrapping multiple `<source>` elements and a fallback `<img>`.
   * Used for serving modern formats (AVIF/WebP) or different images for different screen sizes.
   *
   * @param options - Configuration options including `formatNegotiation` or `artDirection`.
   * @returns HTML string for the `<picture>` element.
   *
   * @example
   * ```typescript
   * const html = service.generatePictureElement({
   *   src: '/hero.jpg',
   *   alt: 'Hero',
   *   width: 1920,
   *   formatNegotiation: true
   * });
   * ```
   */
  public generatePictureElement(options: ImageOptions): string {
    if (!options.usePicture && !options.artDirection && !options.formatNegotiation) {
      return this.generateImageTag(options)
    }

    const sources: string[] = []

    if (options.artDirection) {
      for (const config of options.artDirection) {
        sources.push(this.generateArtDirectionSource(config, options))
      }
    }

    if (options.formatNegotiation !== false) {
      const formats = options.formats ?? ['avif', 'webp']
      for (const format of formats) {
        if (format !== 'original') {
          sources.push(this.generateFormatSource(options, format))
        }
      }
    }

    const fallbackImg = this.generateImageTag({
      ...options,
      usePicture: undefined,
      artDirection: undefined,
      formatNegotiation: undefined,
    })

    return `<picture>\n  ${sources.join('\n  ')}\n  ${fallbackImg}\n</picture>`
  }

  private generateArtDirectionSource(
    config: ArtDirectionConfig,
    baseOptions: ImageOptions
  ): string {
    const formats = config.formats ?? baseOptions.formats ?? ['webp']
    const srcsetItems: string[] = []

    for (const format of formats) {
      const transformedSrc = this.transformSrcForFormat(config.src, format)

      if (config.width) {
        const widths = this.generateDefaultSrcsetWidths(config.width)
        const srcset = widths
          .map((w) => `${this.addWidthToPath(transformedSrc, w)} ${w}w`)
          .join(', ')
        srcsetItems.push(srcset)
      } else {
        srcsetItems.push(transformedSrc)
      }
    }

    const type = this.getFormatMimeType(formats[0])
    const sizes =
      baseOptions.sizes ??
      (config.width ? `(max-width: ${config.width}px) 100vw, ${config.width}px` : undefined)

    const attrs: string[] = [
      `media="${config.media}"`,
      srcsetItems.length > 0 ? `srcset="${srcsetItems.join(', ')}"` : '',
      type ? `type="${type}"` : '',
      sizes ? `sizes="${sizes}"` : '',
    ].filter(Boolean)

    return `<source ${attrs.join(' ')} />`
  }

  private generateFormatSource(options: ImageOptions, format: 'avif' | 'webp'): string {
    const transformedSrc = this.transformSrcForFormat(options.src, format)
    const type = this.getFormatMimeType(format)

    let srcset = transformedSrc
    if (options.width && options.srcset !== false) {
      const widths = Array.isArray(options.srcset)
        ? options.srcset
        : this.generateDefaultSrcsetWidths(options.width)
      srcset = this.generateSrcset(transformedSrc, widths)
    }

    const attrs: string[] = [
      srcset ? `srcset="${srcset}"` : '',
      type ? `type="${type}"` : '',
      options.sizes ? `sizes="${options.sizes}"` : '',
    ].filter(Boolean)

    return `<source ${attrs.join(' ')} />`
  }

  private transformSrcForFormat(src: string, format: 'avif' | 'webp' | 'original'): string {
    if (format === 'original') {
      return src
    }

    const lastDotIndex = src.lastIndexOf('.')
    if (lastDotIndex === -1) {
      return `${src}.${format}`
    }

    const pathWithoutExt = src.substring(0, lastDotIndex)
    return `${pathWithoutExt}.${format}`
  }

  private getFormatMimeType(format: 'avif' | 'webp' | 'original' | string): string {
    const mimeTypes: Record<string, string> = {
      avif: 'image/avif',
      webp: 'image/webp',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    }
    return mimeTypes[format] || ''
  }

  /**
   * Generate a `srcset` string for responsive images.
   *
   * Creates a comma-separated list of image candidates with width descriptors.
   *
   * @param src - Base image URL.
   * @param widths - List of widths to generate candidates for.
   * @returns Formatted srcset string or empty string if no widths provided.
   *
   * @example
   * ```typescript
   * const srcset = service.generateSrcset('img.jpg', [400, 800]);
   * // => "img-400w.jpg 400w, img-800w.jpg 800w"
   * ```
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
   * Generate default srcset widths based on a base width.
   *
   * Generates standard breakpoints (1x, 2x) and responsive steps (400px, 800px)
   * appropriate for the base width.
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
   * Ensures paths are absolute relative to the root (start with `/`) unless
   * they are external URLs.
   *
   * @param src - Raw source path.
   * @returns Normalized path.
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
   * Escape HTML special characters.
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
