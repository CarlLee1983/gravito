import { describe, expect, it } from 'bun:test'
import { ImageService } from '../src/ImageService'
import {
  calculateLQIPDimensions,
  calculateMinLQIPSize,
  generateColorPlaceholder,
  hexToRGB,
} from '../src/image/ImagePlaceholder'
import { createCloudinaryLoader } from '../src/image/loaders/cloudinary'
import { createImgixLoader } from '../src/image/loaders/imgix'
import { vercelLoader } from '../src/image/loaders/vercel'

describe('Advanced Image Features', () => {
  const service = new ImageService()

  describe('Picture Element', () => {
    it('should generate picture element with format negotiation', () => {
      const html = service.generatePictureElement({
        src: '/hero.jpg',
        alt: 'Hero',
        width: 1920,
        height: 1080,
        formatNegotiation: true,
      })

      expect(html).toContain('<picture>')
      expect(html).toContain('<source')
      expect(html).toContain('type="image/avif"')
      expect(html).toContain('type="image/webp"')
      expect(html).toContain('<img')
    })

    it('should support art direction', () => {
      const html = service.generatePictureElement({
        src: '/hero-mobile.jpg',
        alt: 'Hero',
        width: 768,
        artDirection: [
          {
            media: '(min-width: 1200px)',
            src: '/hero-desktop.jpg',
            width: 1920,
          },
          { media: '(min-width: 768px)', src: '/hero-tablet.jpg', width: 1024 },
        ],
      })

      expect(html).toContain('media="(min-width: 1200px)"')
      expect(html).toContain('media="(min-width: 768px)"')
      expect(html).toContain('hero-desktop')
      expect(html).toContain('hero-tablet')
    })

    it('should fallback to img tag when no picture features used', () => {
      const html = service.generatePictureElement({
        src: '/image.jpg',
        alt: 'Image',
        width: 800,
      })

      expect(html).not.toContain('<picture>')
      expect(html).toContain('<img')
    })

    it('should filter out original format from format negotiation', () => {
      const html = service.generatePictureElement({
        src: '/hero.jpg',
        alt: 'Hero',
        width: 1920,
        formatNegotiation: true,
        formats: ['avif', 'webp', 'original'],
      })

      expect(html).toContain('type="image/avif"')
      expect(html).toContain('type="image/webp"')
      const sourceCount = (html.match(/<source/g) || []).length
      expect(sourceCount).toBe(2)
    })
  })

  describe('CDN Loaders', () => {
    it('should transform with Cloudinary loader', () => {
      const loader = createCloudinaryLoader({ cloudName: 'demo' })
      const url = loader.transform('/image.jpg', {
        width: 800,
        format: 'auto',
        quality: 80,
      })

      expect(url).toContain('res.cloudinary.com/demo')
      expect(url).toContain('f_auto')
      expect(url).toContain('w_800')
      expect(url).toContain('q_80')
    })

    it('should transform with imgix loader', () => {
      const loader = createImgixLoader({ domain: 'example.imgix.net' })
      const url = loader.transform('/image.jpg', {
        width: 800,
        quality: 75,
      })

      expect(url).toContain('example.imgix.net')
      expect(url).toContain('w=800')
      expect(url).toContain('q=75')
      expect(url).toContain('auto=format')
    })

    it('should transform with Vercel loader', () => {
      const url = vercelLoader.transform('/image.jpg', {
        width: 640,
        quality: 75,
      })

      expect(url).toContain('/_next/image')
      expect(url).toContain('url=')
      expect(url).toContain('w=640')
      expect(url).toContain('q=75')
    })

    it('should handle canHandle checks', () => {
      const cloudinary = createCloudinaryLoader({ cloudName: 'demo' })

      expect(cloudinary.canHandle?.('/image.jpg')).toBe(true)
      expect(cloudinary.canHandle?.('data:image/png;base64,...')).toBe(false)
      expect(cloudinary.canHandle?.('https://res.cloudinary.com/demo/image.jpg')).toBe(false)
    })
  })

  describe('LQIP Utilities', () => {
    it('should calculate minimum LQIP size for LCP', () => {
      const minSize = calculateMinLQIPSize(1440, 810)
      expect(minSize).toBeCloseTo(7.29, 1)
    })

    it('should maintain aspect ratio for LQIP dimensions', () => {
      const { width, height } = calculateLQIPDimensions(1920, 1080, 20)

      expect(width).toBe(20)
      expect(height).toBe(11)
    })

    it('should convert hex to RGB', () => {
      const rgb = hexToRGB('#ff0033')

      expect(rgb.r).toBe(255)
      expect(rgb.g).toBe(0)
      expect(rgb.b).toBe(51)
    })

    it('should generate color placeholder SVG', () => {
      const svg = generateColorPlaceholder('#3b82f6', 800, 600)

      expect(svg).toContain('data:image/svg+xml;base64,')
      expect(atob(svg.split(',')[1])).toContain('fill="#3b82f6"')
      expect(atob(svg.split(',')[1])).toContain('width="800"')
      expect(atob(svg.split(',')[1])).toContain('height="600"')
    })
  })
})
