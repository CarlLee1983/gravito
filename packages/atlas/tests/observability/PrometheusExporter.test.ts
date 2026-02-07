/**
 * @gravito/atlas - Prometheus Exporter Tests
 */

import { describe, expect, it } from 'bun:test'
import {
  createPrometheusMetricsServer,
  setupPrometheusExporter,
} from '../../src/observability/PrometheusExporter'

describe('PrometheusExporter', () => {
  describe('setupPrometheusExporter', () => {
    it('should setup with default config', () => {
      expect(() => {
        setupPrometheusExporter()
      }).not.toThrow()
    })

    it('should setup with custom port', () => {
      expect(() => {
        setupPrometheusExporter({ port: 9999 })
      }).not.toThrow()
    })

    it('should setup with custom endpoint', () => {
      expect(() => {
        setupPrometheusExporter({ endpoint: '/prometheus/metrics' })
      }).not.toThrow()
    })

    it('should setup with all config options', () => {
      expect(() => {
        setupPrometheusExporter({
          port: 9999,
          endpoint: '/custom-metrics',
          includeProcessMetrics: false,
          includeNodeMetrics: false,
        })
      }).not.toThrow()
    })

    it('should handle zero port', () => {
      expect(() => {
        setupPrometheusExporter({ port: 0 })
      }).not.toThrow()
    })

    it('should handle large port number', () => {
      expect(() => {
        setupPrometheusExporter({ port: 65535 })
      }).not.toThrow()
    })

    it('should handle root path endpoint', () => {
      expect(() => {
        setupPrometheusExporter({ endpoint: '/' })
      }).not.toThrow()
    })

    it('should handle complex endpoint path', () => {
      expect(() => {
        setupPrometheusExporter({ endpoint: '/api/v1/metrics/prometheus' })
      }).not.toThrow()
    })

    it('should respect process metrics setting', () => {
      expect(() => {
        setupPrometheusExporter({ includeProcessMetrics: true })
      }).not.toThrow()

      expect(() => {
        setupPrometheusExporter({ includeProcessMetrics: false })
      }).not.toThrow()
    })

    it('should respect node metrics setting', () => {
      expect(() => {
        setupPrometheusExporter({ includeNodeMetrics: true })
      }).not.toThrow()

      expect(() => {
        setupPrometheusExporter({ includeNodeMetrics: false })
      }).not.toThrow()
    })
  })

  describe('createPrometheusMetricsServer', () => {
    it('should create server with default config', () => {
      const server = createPrometheusMetricsServer()
      expect(server).not.toBeNull()
    })

    it('should create server with custom port', () => {
      const server = createPrometheusMetricsServer({ port: 9999 })
      expect(server).not.toBeNull()
      expect(server.port).toBe(9999)
    })

    it('should create server with custom endpoint', () => {
      const server = createPrometheusMetricsServer({ endpoint: '/metrics' })
      expect(server).not.toBeNull()
      expect(server.endpoint).toBe('/metrics')
    })

    it('should have start method', () => {
      const server = createPrometheusMetricsServer()
      expect(typeof server.start).toBe('function')
    })

    it('should have stop method', () => {
      const server = createPrometheusMetricsServer()
      expect(typeof server.stop).toBe('function')
    })

    it('should allow starting server', () => {
      const server = createPrometheusMetricsServer()
      expect(() => {
        server.start()
      }).not.toThrow()
    })

    it('should allow stopping server', () => {
      const server = createPrometheusMetricsServer()
      expect(() => {
        server.stop()
      }).not.toThrow()
    })

    it('should allow starting and stopping', () => {
      const server = createPrometheusMetricsServer()
      expect(() => {
        server.start()
        server.stop()
      }).not.toThrow()
    })

    it('should handle multiple start/stop cycles', () => {
      const server = createPrometheusMetricsServer()
      expect(() => {
        server.start()
        server.stop()
        server.start()
        server.stop()
      }).not.toThrow()
    })

    it('should handle edge case port values', () => {
      expect(createPrometheusMetricsServer({ port: 1 })).not.toBeNull()
      expect(createPrometheusMetricsServer({ port: 65535 })).not.toBeNull()
      expect(createPrometheusMetricsServer({ port: 9464 })).not.toBeNull()
    })

    it('should handle edge case endpoints', () => {
      expect(createPrometheusMetricsServer({ endpoint: '/' })).not.toBeNull()
      expect(
        createPrometheusMetricsServer({ endpoint: '/very/long/nested/path/to/metrics' })
      ).not.toBeNull()
    })
  })

  describe('error handling', () => {
    it('should gracefully handle setup errors', () => {
      expect(() => {
        setupPrometheusExporter({ port: -1 })
      }).not.toThrow()
    })

    it('should gracefully handle server creation errors', () => {
      expect(() => {
        const server = createPrometheusMetricsServer({ port: -1 })
        if (server) {
          server.start()
        }
      }).not.toThrow()
    })
  })

  describe('configuration', () => {
    it('should use default port 9464', () => {
      const server = createPrometheusMetricsServer({})
      expect(server.port).toBe(9464)
    })

    it('should use default endpoint /metrics', () => {
      const server = createPrometheusMetricsServer({})
      expect(server.endpoint).toBe('/metrics')
    })

    it('should preserve custom port and endpoint', () => {
      const server = createPrometheusMetricsServer({
        port: 8888,
        endpoint: '/api/metrics',
      })
      expect(server.port).toBe(8888)
      expect(server.endpoint).toBe('/api/metrics')
    })

    it('should handle partial config', () => {
      const server1 = createPrometheusMetricsServer({ port: 8888 })
      expect(server1.port).toBe(8888)
      expect(server1.endpoint).toBe('/metrics')

      const server2 = createPrometheusMetricsServer({ endpoint: '/custom' })
      expect(server2.port).toBe(9464)
      expect(server2.endpoint).toBe('/custom')
    })
  })
})
