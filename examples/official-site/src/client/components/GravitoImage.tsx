import { Image as PrismImage, type ImageProps as PrismImageProps } from '@gravito/prism'

/**
 * GravitoImage - Official Site optimized image component.
 * Now a thin wrapper around @gravito/prism's optimized Image component.
 *
 * It provides:
 * - Automated WebVitals optimizations (CLS, LCP, FCP)
 * - Modern format negotiation (AVIF, WebP)
 * - Zero client-side JavaScript runtime
 */
export const GravitoImage = (props: PrismImageProps) => {
  return <PrismImage {...props} />
}

export type { ImageProps } from '@gravito/prism'
