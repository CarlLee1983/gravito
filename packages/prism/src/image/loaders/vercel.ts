import type { ImageCDNLoader, TransformOptions } from '../ImageCDNLoader'

export const vercelLoader: ImageCDNLoader = {
  name: 'vercel',

  transform(src: string, options: TransformOptions): string {
    const params = new URLSearchParams()

    params.set('url', src)
    if (options.width) {
      params.set('w', String(options.width))
    }
    if (options.quality) {
      params.set('q', String(options.quality))
    }

    return `/_next/image?${params.toString()}`
  },

  canHandle(src: string): boolean {
    return !src.startsWith('/_next/image') && !src.startsWith('data:')
  },
}
