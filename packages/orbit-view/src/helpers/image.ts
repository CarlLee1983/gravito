import { type ImageOptions, ImageService } from '../ImageService'
import type { HelperFunction } from '../TemplateEngine'

/**
 * Image helper function.
 *
 * Usage in templates:
 * {{image src="/static/hero.jpg" width=800 height=600 alt="Hero image" loading="lazy"}}
 */
export function createImageHelper(): HelperFunction {
  const imageService = new ImageService()

  return (args: Record<string, string | number | boolean>): string => {
    // Validate required parameters
    if (!args.src || typeof args.src !== 'string') {
      throw new Error('Image helper requires "src" parameter')
    }
    if (!args.alt || typeof args.alt !== 'string') {
      throw new Error('Image helper requires "alt" parameter for accessibility')
    }

    // Build ImageOptions
    const options: ImageOptions = {
      src: String(args.src),
      alt: String(args.alt),
    }

    // Optional parameters
    if (args.width !== undefined) {
      options.width = typeof args.width === 'number' ? args.width : Number(args.width)
    }
    if (args.height !== undefined) {
      options.height = typeof args.height === 'number' ? args.height : Number(args.height)
    }
    if (args.loading !== undefined) {
      const loading = String(args.loading)
      if (loading === 'lazy' || loading === 'eager') {
        options.loading = loading
      }
    }
    if (args.sizes !== undefined) {
      options.sizes = String(args.sizes)
    }
    if (args.srcset !== undefined) {
      if (typeof args.srcset === 'boolean') {
        options.srcset = args.srcset
      } else if (typeof args.srcset === 'string') {
        // Try parsing into a number array (e.g. "400,800,1200")
        const widths = args.srcset
          .split(',')
          .map((w) => Number(w.trim()))
          .filter((w) => !Number.isNaN(w))
        if (widths.length > 0) {
          options.srcset = widths
        }
      }
    }
    if (args.class !== undefined) {
      options.class = String(args.class)
    }
    if (args.style !== undefined) {
      options.style = String(args.style)
    }
    if (args.decoding !== undefined) {
      const decoding = String(args.decoding)
      if (decoding === 'async' || decoding === 'auto' || decoding === 'sync') {
        options.decoding = decoding
      }
    }
    if (args.fetchpriority !== undefined) {
      const priority = String(args.fetchpriority)
      if (priority === 'high' || priority === 'low' || priority === 'auto') {
        options.fetchpriority = priority
      }
    }

    // Generate <img> tag
    return imageService.generateImageTag(options)
  }
}
