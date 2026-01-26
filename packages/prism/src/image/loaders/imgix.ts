import type { ImageCDNLoader, TransformOptions } from '../ImageCDNLoader'

export interface ImgixConfig {
  domain: string
}

export function createImgixLoader(config: ImgixConfig): ImageCDNLoader {
  return {
    name: 'imgix',

    transform(src: string, options: TransformOptions): string {
      const url = new URL(src, `https://${config.domain}`)

      if (options.width) {
        url.searchParams.set('w', String(options.width))
      }
      if (options.height) {
        url.searchParams.set('h', String(options.height))
      }
      if (options.quality) {
        url.searchParams.set('q', String(options.quality))
      }
      if (options.format && options.format !== 'auto') {
        url.searchParams.set('fm', options.format)
      } else {
        url.searchParams.set('auto', 'format')
      }
      if (options.fit) {
        url.searchParams.set('fit', options.fit)
      }

      return url.toString()
    },

    canHandle(src: string): boolean {
      return !src.startsWith('data:')
    },
  }
}
