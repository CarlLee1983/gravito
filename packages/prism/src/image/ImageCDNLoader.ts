/**
 * Options for image transformation.
 *
 * Defines the parameters that can be passed to an image loader to modify the requested image.
 */
export interface TransformOptions {
  /** Target width in pixels. */
  width?: number
  /** Target height in pixels. */
  height?: number
  /** Output quality (1-100). */
  quality?: number
  /** Output format. 'auto' allows the CDN to choose the best format. */
  format?: 'avif' | 'webp' | 'auto' | 'original'
  /** Resize strategy. */
  fit?: 'cover' | 'contain' | 'fill'
}

/**
 * Interface for Image CDN loaders.
 *
 * A loader is responsible for transforming a local path into a full CDN URL
 * with optimization parameters.
 *
 * @example
 * ```typescript
 * const myLoader: ImageCDNLoader = {
 *   name: 'custom',
 *   transform(src, options) {
 *     return `https://cdn.example.com/${src}?w=${options.width}`;
 *   }
 * };
 * ```
 */
export interface ImageCDNLoader {
  /** Unique name of the loader implementation. */
  name: string
  /**
   * Transform an image source into a CDN URL.
   *
   * @param src - Original image source path.
   * @param options - Transformation options.
   * @returns The fully qualified CDN URL.
   */
  transform(src: string, options: TransformOptions): string
  /**
   * Check if this loader can handle the specific source URL.
   * Optional.
   */
  canHandle?(src: string): boolean
}

/**
 * Default pass-through loader.
 *
 * Returns the source URL unchanged. Used when no specific CDN is configured.
 */
export const defaultLoader: ImageCDNLoader = {
  name: 'default',
  transform(src) {
    return src
  },
}
