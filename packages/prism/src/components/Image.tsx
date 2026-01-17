import type React from 'react'
import type { ImageOptions } from '../ImageService'
import { ImageService } from '../ImageService'

/**
 * Props for the `Image` component.
 * @public
 */
export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Source URL or path of the image */
  src: string
  /** Alternative text for accessibility (Required) */
  alt: string
  /** Fixed width in pixels (prevents CLS) */
  width?: number
  /** Fixed height in pixels (prevents CLS) */
  height?: number
  /** Loading strategy (default: 'lazy') */
  loading?: 'lazy' | 'eager'
  /** Responsive sizes attribute string */
  sizes?: string
  /** Custom widths for srcset or boolean to toggle default auto-generation */
  srcset?: boolean | number[]
  /** Decoding strategy (default: 'async') */
  decoding?: 'async' | 'auto' | 'sync'
  /** Fetch priority hint for LCP optimization */
  fetchPriority?: 'high' | 'low' | 'auto'
}

/**
 * Image component (server-rendered only).
 *
 * No client-side dependencies: all logic runs on the server.
 * Uses `ImageService` to generate an optimized `<img>` tag.
 */
export function Image({
  src,
  alt,
  width,
  height,
  loading,
  sizes,
  srcset,
  className,
  style,
  decoding,
  fetchPriority,
  ...rest
}: ImageProps): React.JSX.Element {
  const imageService = new ImageService()

  // Convert React props to ImageOptions
  const options: ImageOptions = {
    src,
    alt,
    width,
    height,
    loading,
    sizes,
    srcset,
    class: className,
    style: typeof style === 'string' ? style : undefined,
    decoding,
    fetchpriority: fetchPriority,
  }

  // Generate optimized attributes using the core service
  const imgAttrs = imageService.generateImageAttributes(options)

  // Map optimized attributes back to React props
  const {
    class: _cls,
    srcset: generatedSrcset,
    fetchpriority: _fp,
    style: _style,
    ...coreAttrs
  } = imgAttrs

  return (
    <img
      className={className}
      alt={alt}
      srcSet={generatedSrcset}
      fetchPriority={fetchPriority}
      style={style as React.CSSProperties}
      {...coreAttrs}
      {...rest}
    />
  )
}

// Default export
export default Image
