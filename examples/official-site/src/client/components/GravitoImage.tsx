import type React from 'react'

// Extend generic img attributes to include fetchpriority
declare module 'react' {
  interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
    fetchpriority?: 'high' | 'low' | 'auto'
  }
}

/**
 * ImageService - Core logic for generating optimized image properties.
 * Refactored to return props object instead of HTML string for better React integration.
 */
export interface ImageOptions {
  src: string
  width?: number
  height?: number
  alt: string
  loading?: 'lazy' | 'eager'
  sizes?: string
  srcset?: boolean | number[]
  className?: string
  style?: React.CSSProperties
  decoding?: 'async' | 'auto' | 'sync'
  fetchpriority?: 'high' | 'low' | 'auto'
}

class ImageService {
  public generateImageProps(options: ImageOptions): React.ImgHTMLAttributes<HTMLImageElement> {
    const {
      src,
      width,
      height,
      alt,
      loading = 'lazy',
      sizes,
      srcset: srcsetOption,
      className,
      style,
      decoding = 'async',
      fetchpriority,
    } = options

    const normalizedSrc = this.normalizePath(src)

    let srcSet: string | undefined
    let sizesAttr: string | undefined

    if (srcsetOption !== false && width !== undefined) {
      const widths = Array.isArray(srcsetOption)
        ? srcsetOption
        : this.generateDefaultSrcsetWidths(width)
      const generatedSrcset = this.generateSrcset(normalizedSrc, widths)
      if (generatedSrcset) {
        srcSet = generatedSrcset
      }
    }

    if (sizes) {
      sizesAttr = sizes
    } else if (srcsetOption !== false && width !== undefined) {
      sizesAttr = `(max-width: ${width}px) 100vw, ${width}px`
    }

    return {
      src: normalizedSrc,
      alt,
      width,
      height,
      loading,
      decoding,
      fetchpriority, // Use lowercase for DOM attribute
      srcSet,
      sizes: sizesAttr,
      className,
      style,
    }
  }

  public generateSrcset(src: string, widths: number[]): string {
    if (widths.length <= 1) {
      return ''
    }
    return widths
      .map((width) => {
        const srcWithWidth = this.addWidthToPath(src, width)
        return `${srcWithWidth} ${width}w`
      })
      .join(', ')
  }

  private generateDefaultSrcsetWidths(baseWidth: number): number[] {
    const widths = new Set<number>()
    widths.add(baseWidth)
    const width15x = Math.round(baseWidth * 1.5)
    if (width15x <= baseWidth * 2) {
      widths.add(width15x)
    }
    widths.add(baseWidth * 2)
    if (baseWidth >= 800) {
      widths.add(400)
      widths.add(800)
    } else if (baseWidth >= 400) {
      widths.add(400)
    }
    return Array.from(widths).sort((a, b) => a - b)
  }

  private addWidthToPath(src: string, width: number): string {
    if (src.startsWith('http')) {
      return src
    }
    const lastDotIndex = src.lastIndexOf('.')
    if (lastDotIndex === -1) {
      return `${src}-${width}w`
    }

    const basePath = src.substring(0, lastDotIndex)
    const extension = src.substring(lastDotIndex)

    // v1.0 Standard: Always prefer .webp for srcset if original is image
    const targetExtension = ['.jpg', '.jpeg', '.png'].includes(extension.toLowerCase())
      ? '.webp'
      : extension

    return `${basePath}-${width}w${targetExtension}`
  }

  public normalizePath(src: string): string {
    if (src.startsWith('http') || src.startsWith('//')) {
      return src
    }
    let path = src
    if (!path.startsWith('/')) {
      path = `/${path}`
    }

    // v1.0 Standard: If we have a .jpg/png, let's see if we can use the .webp version
    // This is a simple fallback logic for the main src
    return path
  }
}

/**
 * Props for the Gravito Image component
 */
export interface ImageProps {
  src: string
  width?: number
  height?: number
  alt: string
  loading?: 'lazy' | 'eager'
  sizes?: string
  srcset?: boolean | number[]
  className?: string
  style?: React.CSSProperties
  decoding?: 'async' | 'auto' | 'sync'
  fetchpriority?: 'high' | 'low' | 'auto'
}

/**
 * Universal Image Component
 * Renders a standard React <img /> tag with optimized attributes.
 */
export const GravitoImage = (props: ImageProps) => {
  const imageService = new ImageService()

  const options: ImageOptions = {
    src: props.src,
    alt: props.alt,
    width: props.width,
    height: props.height,
    loading: props.loading,
    sizes: props.sizes,
    srcset: props.srcset,
    className: props.className,
    style: props.style,
    decoding: props.decoding,
    fetchpriority: props.fetchpriority,
  }

  const imgProps = imageService.generateImageProps(options)

  return <img {...imgProps} alt={props.alt} />
}
