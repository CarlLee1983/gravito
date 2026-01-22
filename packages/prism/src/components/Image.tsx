import type React from 'react'
import type { ArtDirectionConfig, ImageOptions } from '../ImageService'
import { ImageService } from '../ImageService'
import type { ImageCDNLoader } from '../image/ImageCDNLoader'

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
  /** Enable format negotiation (AVIF/WebP) */
  formatNegotiation?: boolean
  /** Target formats for format negotiation */
  formats?: ('avif' | 'webp' | 'original')[]
  /** Use <picture> element */
  usePicture?: boolean
  /** Art direction configuration */
  artDirection?: ArtDirectionConfig[]
  /** Placeholder type */
  placeholder?: 'none' | 'blur' | 'color'
  /** Base64 encoded blur image (for LQIP) */
  blurDataURL?: string
  /** Dominant color (for color placeholder) */
  dominantColor?: string
  /** CDN Loader */
  loader?: ImageCDNLoader
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
  formatNegotiation,
  formats,
  usePicture,
  artDirection,
  placeholder,
  blurDataURL,
  dominantColor,
  loader,
  ...rest
}: ImageProps): React.JSX.Element {
  const imageService = new ImageService()

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
    formatNegotiation,
    formats,
    usePicture,
    artDirection,
    placeholder,
    blurDataURL,
    dominantColor,
    loader,
  }

  if (usePicture || formatNegotiation || artDirection) {
    const html = imageService.generatePictureElement(options)
    // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for rendering <picture> elements in React
    return <div dangerouslySetInnerHTML={{ __html: html }} {...rest} />
  }

  const imgAttrs = imageService.generateImageAttributes(options)

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

export default Image
