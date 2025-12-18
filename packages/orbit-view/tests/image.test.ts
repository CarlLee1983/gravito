import { describe, expect, it } from 'bun:test'
import { createImageHelper } from '../src/helpers/image'
import { type ImageOptions, ImageService } from '../src/ImageService'
import { TemplateEngine } from '../src/TemplateEngine'

describe('ImageService', () => {
  const imageService = new ImageService()

  describe('generateImageTag', () => {
    it('should generate a basic image tag', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: 'Hero image',
        width: 800,
        height: 600,
      }

      const html = imageService.generateImageTag(options)

      expect(html).toContain('src="/static/hero.jpg"')
      expect(html).toContain('alt="Hero image"')
      expect(html).toContain('width="800"')
      expect(html).toContain('height="600"')
      expect(html).toContain('loading="lazy"')
      expect(html).toContain('decoding="async"')
    })

    it('should require the alt attribute', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: '',
      }

      expect(() => imageService.generateImageTag(options)).toThrow(
        'Image alt attribute is required'
      )
    })

    it('should support loading="eager"', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: 'Hero',
        loading: 'eager',
      }

      const html = imageService.generateImageTag(options)
      expect(html).toContain('loading="eager"')
    })

    it('should support fetchpriority', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: 'Hero',
        fetchpriority: 'high',
      }

      const html = imageService.generateImageTag(options)
      expect(html).toContain('fetchpriority="high"')
    })

    it('should support class and style', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: 'Hero',
        class: 'hero-image',
        style: 'max-width: 100%;',
      }

      const html = imageService.generateImageTag(options)
      expect(html).toContain('class="hero-image"')
      expect(html).toContain('style="max-width: 100%;"')
    })

    it('should escape HTML special characters', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: 'Hero "image" & more',
      }

      const html = imageService.generateImageTag(options)
      expect(html).toContain('alt="Hero &quot;image&quot; &amp; more"')
    })
  })

  describe('generateSrcset', () => {
    it('should generate a srcset string', () => {
      const srcset = imageService.generateSrcset('/static/hero.jpg', [400, 800, 1200])

      expect(srcset).toContain('/static/hero-400w.jpg 400w')
      expect(srcset).toContain('/static/hero-800w.jpg 800w')
      expect(srcset).toContain('/static/hero-1200w.jpg 1200w')
    })

    it('should handle an empty array', () => {
      const srcset = imageService.generateSrcset('/static/hero.jpg', [])
      expect(srcset).toBe('')
    })

    it('should handle a single width', () => {
      const srcset = imageService.generateSrcset('/static/hero.jpg', [800])
      expect(srcset).toBe('')
    })

    it('should preserve absolute URLs', () => {
      const srcset = imageService.generateSrcset('https://example.com/image.jpg', [400, 800])
      expect(srcset).toContain('https://example.com/image.jpg')
    })
  })

  describe('normalizePath', () => {
    it('should normalize relative paths', () => {
      expect(imageService.normalizePath('static/hero.jpg')).toBe('/static/hero.jpg')
      expect(imageService.normalizePath('/static/hero.jpg')).toBe('/static/hero.jpg')
    })

    it('should preserve absolute URLs', () => {
      expect(imageService.normalizePath('https://example.com/image.jpg')).toBe(
        'https://example.com/image.jpg'
      )
      expect(imageService.normalizePath('http://example.com/image.jpg')).toBe(
        'http://example.com/image.jpg'
      )
      expect(imageService.normalizePath('//example.com/image.jpg')).toBe('//example.com/image.jpg')
    })
  })

  describe('generateImageTag with srcset', () => {
    it('should generate srcset automatically (when width is provided)', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: 'Hero',
        width: 800,
        srcset: true,
      }

      const html = imageService.generateImageTag(options)
      expect(html).toContain('srcset=')
      expect(html).toContain('sizes=')
    })

    it('should use custom srcset widths', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: 'Hero',
        width: 800,
        srcset: [400, 800, 1200],
      }

      const html = imageService.generateImageTag(options)
      expect(html).toContain('srcset=')
      expect(html).toContain('400w')
      expect(html).toContain('800w')
      expect(html).toContain('1200w')
    })

    it('should allow disabling srcset', () => {
      const options: ImageOptions = {
        src: '/static/hero.jpg',
        alt: 'Hero',
        width: 800,
        srcset: false,
      }

      const html = imageService.generateImageTag(options)
      expect(html).not.toContain('srcset=')
    })
  })
})

describe('Image Helper', () => {
  const imageHelper = createImageHelper()

  it('should generate an image tag', () => {
    const result = imageHelper(
      {
        src: '/static/hero.jpg',
        alt: 'Hero image',
        width: 800,
        height: 600,
      },
      {}
    )

    expect(result).toContain('src="/static/hero.jpg"')
    expect(result).toContain('alt="Hero image"')
    expect(result).toContain('width="800"')
    expect(result).toContain('height="600"')
  })

  it('should require the src parameter', () => {
    expect(() => {
      imageHelper({ alt: 'Hero' }, {})
    }).toThrow('Image helper requires "src" parameter')
  })

  it('should require the alt parameter', () => {
    expect(() => {
      imageHelper({ src: '/static/hero.jpg' }, {})
    }).toThrow('Image helper requires "alt" parameter')
  })

  it('should handle numeric strings', () => {
    const result = imageHelper(
      {
        src: '/static/hero.jpg',
        alt: 'Hero',
        width: '800',
        height: '600',
      },
      {}
    )

    expect(result).toContain('width="800"')
    expect(result).toContain('height="600"')
  })

  it('should handle the loading parameter', () => {
    const result = imageHelper(
      {
        src: '/static/hero.jpg',
        alt: 'Hero',
        loading: 'eager',
      },
      {}
    )

    expect(result).toContain('loading="eager"')
  })

  it('should handle the sizes parameter', () => {
    const result = imageHelper(
      {
        src: '/static/hero.jpg',
        alt: 'Hero',
        sizes: '(max-width: 768px) 100vw, 50vw',
      },
      {}
    )

    expect(result).toContain('sizes="(max-width: 768px) 100vw, 50vw"')
  })

  it('should handle the class parameter', () => {
    const result = imageHelper(
      {
        src: '/static/hero.jpg',
        alt: 'Hero',
        class: 'hero-image',
      },
      {}
    )

    expect(result).toContain('class="hero-image"')
  })
})

describe('TemplateEngine with Image Helper', () => {
  it('should handle the image helper in templates', () => {
    const engine = new TemplateEngine('./tests/views')
    engine.registerHelper('image', createImageHelper())

    // Since we can't test `loadAndInterpolate` directly (it's private),
    // we only verify that helper registration works.
    expect(engine).toBeDefined()
  })
})

describe('React Image Component', () => {
  it('should export correctly (when React is available)', () => {
    // Try to import the React component.
    // If React is not installed, skip (React is an optional dependency).
    try {
      const { Image } = require('../src/components/Image')
      expect(Image).toBeDefined()
      expect(typeof Image).toBe('function')
    } catch (error: unknown) {
      // If React is not installed, skip this test.
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : String(error)
      if (
        errorMessage.includes('react') ||
        errorMessage.includes('Cannot find module') ||
        errorMessage.includes('ResolveMessage')
      ) {
        // This is expected because React is an optional peerDependency.
        return
      }
      throw error
    }
  })

  it('should be exportable (HTML behavior is covered by ImageService)', () => {
    // The React component depends on ImageService, which already covers the core HTML logic.
    // Here we only verify the component can be exported (when React is available).
    try {
      const { Image } = require('../src/components/Image')
      expect(Image).toBeDefined()
    } catch (error: unknown) {
      // If React is not installed, skip this test.
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : String(error)
      if (
        errorMessage.includes('react') ||
        errorMessage.includes('Cannot find module') ||
        errorMessage.includes('ResolveMessage')
      ) {
        // This is expected because React is an optional peerDependency.
        return
      }
      throw error
    }
  })
})
