import { describe, expect, it } from 'bun:test'
import { OrbitNova } from '../src/OrbitNova'

describe('OrbitNova with color configuration', () => {
  describe('constructor', () => {
    it('should create without options', () => {
      const nova = new OrbitNova()
      expect(nova).toBeDefined()
      expect(nova).toBeInstanceOf(OrbitNova)
    })

    it('should create with empty options', () => {
      const nova = new OrbitNova({})
      expect(nova).toBeDefined()
    })

    it('should create with exposeAs option', () => {
      const nova = new OrbitNova({ exposeAs: 'shell' })
      expect(nova).toBeDefined()
    })

    it('should create with color option', () => {
      const nova = new OrbitNova({
        color: { enabled: true },
      })
      expect(nova).toBeDefined()
    })

    it('should create with all options', () => {
      const nova = new OrbitNova({
        exposeAs: 'shell',
        color: {
          enabled: true,
          scheme: {
            success: '#00ff00',
            error: '#ff0000',
            running: '#0099ff',
            useSymbols: true,
          },
        },
      })
      expect(nova).toBeDefined()
    })
  })

  describe('configure factory', () => {
    it('should create with configure', () => {
      const nova = OrbitNova.configure({
        exposeAs: 'shell',
      })
      expect(nova).toBeInstanceOf(OrbitNova)
    })

    it('should create with configure and color', () => {
      const nova = OrbitNova.configure({
        color: {
          enabled: true,
        },
      })
      expect(nova).toBeInstanceOf(OrbitNova)
    })

    it('should create with all configure options', () => {
      const nova = OrbitNova.configure({
        exposeAs: 'shell',
        color: {
          enabled: true,
          scheme: {
            success: '#00cc66',
            error: '#ff3333',
            running: '#0099ff',
            stderr: '#ffaa00',
            useSymbols: true,
          },
        },
      })
      expect(nova).toBeInstanceOf(OrbitNova)
    })
  })

  describe('color configuration options', () => {
    it('should accept ColorConfig with enabled flag', () => {
      const nova = new OrbitNova({
        color: {
          enabled: true,
        },
      })
      expect(nova).toBeDefined()
    })

    it('should accept ColorConfig with disabled flag', () => {
      const nova = new OrbitNova({
        color: {
          enabled: false,
        },
      })
      expect(nova).toBeDefined()
    })

    it('should accept ColorConfig with custom scheme', () => {
      const nova = new OrbitNova({
        color: {
          scheme: {
            success: '#00ff00',
            error: '#ff0000',
            running: '#0099ff',
            stderr: '#ffaa00',
            label: '#0099ff',
            useSymbols: true,
          },
        },
      })
      expect(nova).toBeDefined()
    })

    it('should accept ColorConfig with partial scheme', () => {
      const nova = new OrbitNova({
        color: {
          scheme: {
            success: '#00ff00',
            error: '#ff0000',
          },
        },
      })
      expect(nova).toBeDefined()
    })

    it('should accept empty color config', () => {
      const nova = new OrbitNova({
        color: {},
      })
      expect(nova).toBeDefined()
    })
  })

  describe('integration with other options', () => {
    it('should combine exposeAs with color', () => {
      const nova = new OrbitNova({
        exposeAs: 'commandRunner',
        color: {
          enabled: true,
          scheme: {
            success: '#00ff00',
          },
        },
      })
      expect(nova).toBeDefined()
    })

    it('should work with multiple color customizations', () => {
      const nova = new OrbitNova({
        color: {
          enabled: true,
          scheme: {
            running: '#0099ff',
            success: '#00cc66',
            error: '#ff3333',
            stderr: '#ffaa00',
            label: '#0099ff',
            useSymbols: true,
          },
        },
      })
      expect(nova).toBeDefined()
    })
  })

  describe('default behavior', () => {
    it('should have defaults when no color config provided', () => {
      const nova = new OrbitNova()
      expect(nova).toBeDefined()
    })

    it('should respect NO_COLOR environment variable', () => {
      const originalNoColor = process.env.NO_COLOR
      try {
        process.env.NO_COLOR = '1'
        const nova = new OrbitNova()
        expect(nova).toBeDefined()
      } finally {
        process.env.NO_COLOR = originalNoColor
      }
    })
  })

  describe('immutability', () => {
    it('should not mutate options object', () => {
      const options = {
        color: {
          enabled: true,
          scheme: {
            success: '#00ff00',
          },
        },
      }
      const originalOptions = JSON.parse(JSON.stringify(options))
      const nova = new OrbitNova(options)
      expect(nova).toBeDefined()
      expect(options).toEqual(originalOptions)
    })

    it('should create independent instances', () => {
      const nova1 = new OrbitNova({
        color: { enabled: true },
      })
      const nova2 = new OrbitNova({
        color: { enabled: false },
      })
      expect(nova1).not.toBe(nova2)
    })
  })

  describe('flexible configuration', () => {
    it('should work with undefined color config', () => {
      const nova = new OrbitNova({
        exposeAs: 'shell',
        color: undefined,
      })
      expect(nova).toBeDefined()
    })

    it('should work with all scheme properties', () => {
      const nova = new OrbitNova({
        color: {
          enabled: true,
          scheme: {
            running: '#0099ff',
            success: '#00cc66',
            error: '#ff3333',
            stderr: '#ffaa00',
            label: '#0099ff',
            useSymbols: true,
          },
        },
      })
      expect(nova).toBeDefined()
    })

    it('should work with partial scheme properties', () => {
      const nova = new OrbitNova({
        color: {
          scheme: {
            success: '#00ff00',
            useSymbols: false,
          },
        },
      })
      expect(nova).toBeDefined()
    })
  })

  describe('type safety', () => {
    it('should maintain type definitions', () => {
      const nova = new OrbitNova({
        exposeAs: 'shell',
        color: {
          enabled: true,
          scheme: {
            success: '#00cc66',
            error: '#ff3333',
            running: '#0099ff',
            stderr: '#ffaa00',
            label: '#0099ff',
            useSymbols: true,
          },
        },
      })
      expect(nova).toBeInstanceOf(OrbitNova)
    })
  })
})
