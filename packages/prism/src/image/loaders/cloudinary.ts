import type { ImageCDNLoader, TransformOptions } from '../ImageCDNLoader'

export interface CloudinaryConfig {
  cloudName: string
  baseUrl?: string
}

export function createCloudinaryLoader(config: CloudinaryConfig): ImageCDNLoader {
  const baseUrl = config.baseUrl ?? `https://res.cloudinary.com/${config.cloudName}/image/fetch`

  return {
    name: 'cloudinary',

    transform(src: string, options: TransformOptions): string {
      const params: string[] = []

      if (options.format) {
        params.push(`f_${options.format}`)
      }

      if (options.width) {
        params.push(`w_${options.width}`)
      }
      if (options.height) {
        params.push(`h_${options.height}`)
      }

      if (options.quality) {
        params.push(`q_${options.quality}`)
      }

      if (options.fit) {
        const fitMap = { cover: 'fill', contain: 'fit', fill: 'fill' }
        params.push(`c_${fitMap[options.fit]}`)
      }

      return `${baseUrl}/${params.join(',')}/${src}`
    },

    canHandle(src: string): boolean {
      return !src.startsWith('data:') && !src.includes('res.cloudinary.com')
    },
  }
}
