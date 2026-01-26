/**
 * Image service type definitions
 *
 * @public
 * @since 3.1.0
 */

/**
 * CDN transform options
 */
export interface TransformOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'avif' | 'webp' | 'auto' | 'original'
  fit?: 'cover' | 'contain' | 'fill'
}

/**
 * CDN loader interface
 */
export interface CDNLoaderOptions {
  name: string
  transform(src: string, options: TransformOptions): string
  canHandle?(src: string): boolean
}

/**
 * Placeholder options
 */
export interface PlaceholderOptions {
  type: 'blur' | 'color' | 'none'
  blurDataURL?: string
  dominantColor?: string
}

/**
 * Art direction configuration for responsive images
 */
export interface ArtDirectionConfig {
  /** Media query */
  media: string
  /** Image source */
  src: string
  /** Width */
  width?: number
  /** Height */
  height?: number
  /** Formats for this breakpoint */
  formats?: ('avif' | 'webp' | 'original')[]
}
