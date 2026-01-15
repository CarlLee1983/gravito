import type React from 'react'
import type { ImageOptions } from '../ImageService'
import { ImageService } from '../ImageService'

/**
 * Props for the `Image` component.
 */
export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  sizes?: string
  srcset?: boolean | number[]
  decoding?: 'async' | 'auto' | 'sync'
  fetchpriority?: 'high' | 'low' | 'auto'
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
  fetchpriority,
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
    fetchpriority,
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
      srcSet={generatedSrcset}
      fetchpriority={fetchpriority}
      style={style as React.CSSProperties}
      {...coreAttrs}
      {...rest}
    />
  )
}

// Default export
export default Image
