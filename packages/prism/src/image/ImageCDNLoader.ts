export interface TransformOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'avif' | 'webp' | 'auto' | 'original'
  fit?: 'cover' | 'contain' | 'fill'
}

export interface ImageCDNLoader {
  name: string
  transform(src: string, options: TransformOptions): string
  canHandle?(src: string): boolean
}

export const defaultLoader: ImageCDNLoader = {
  name: 'default',
  transform(src) {
    return src
  },
}
