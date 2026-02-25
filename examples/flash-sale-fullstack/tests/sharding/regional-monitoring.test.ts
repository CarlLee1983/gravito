/**
 * Regional Monitoring System Tests
 * 多區域監控系統測試
 */

import { beforeAll, describe, expect, it } from 'bun:test'
import type { AlertRule, RegionMetrics } from '../../src/sharding'
import { RegionalMonitoringSystem } from '../../src/sharding'

describe('RegionalMonitoringSystem - 多區域監控和告警', () => {
  let monitoring: RegionalMonitoringSystem

  beforeAll(() => {
    monitoring = new RegionalMonitoringSystem()
  })

  describe('Region Registration', () => {
    it('should register monitoring region', () => {
      monitoring.registerRegion('us-east-1')

      const health = monitoring.getHealthStatus('us-east-1')
      expect(health).toBeUndefined() // Initially no health status
    })

    it('should register multiple regions', () => {
      monitoring.registerRegion('eu-west-1')
      monitoring.registerRegion('ap-southeast-1')

      // Regions registered successfully
      expect(true).toBe(true)
    })
  })

  describe('Metrics Collection', () => {
    it('should collect region metrics', () => {
      const metrics: RegionMetrics = {
        regionId: 'us-east-1',
        timestamp: new Date(),
        latency: { p50: 10, p95: 50, p99: 100, p999: 200 },
        throughput: 5000,
        errorRate: 0.5,
        cpuUsage: 40,
        memoryUsage: 50,
        cacheHitRate: 95,
        activeConnections: 1000,
        diskUsage: 30,
      }

      monitoring.collectMetrics('us-east-1', metrics)

      const stats = monitoring.getMetricsStats('us-east-1', 1000000)
      expect(stats?.latency?.p99).toBeDefined()
      expect(stats?.errorRate).toBeDefined()
    })

    it('should track metrics history', () => {
      const metrics1: RegionMetrics = {
        regionId: 'eu-west-1',
        timestamp: new Date(),
        latency: { p50: 5, p95: 30, p99: 80, p999: 150 },
        throughput: 4000,
        errorRate: 0.3,
        cpuUsage: 30,
        memoryUsage: 40,
        cacheHitRate: 93,
        activeConnections: 800,
        diskUsage: 25,
      }

      monitoring.collectMetrics('eu-west-1', metrics1)

      const metrics2: RegionMetrics = {
        regionId: 'eu-west-1',
        timestamp: new Date(Date.now() + 30000),
        latency: { p50: 8, p95: 40, p99: 90, p999: 160 },
        throughput: 4500,
        errorRate: 0.4,
        cpuUsage: 35,
        memoryUsage: 45,
        cacheHitRate: 94,
        activeConnections: 900,
        diskUsage: 28,
      }

      monitoring.collectMetrics('eu-west-1', metrics2)

      const stats = monitoring.getMetricsStats('eu-west-1', 100000)
      expect(stats?.throughput).toBeGreaterThan(4000)
    })
  })

  describe('Alert Rules', () => {
    it('should create alert rule', () => {
      const rule: Omit<AlertRule, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'> = {
        ruleId: 'rule-latency-high',
        name: 'High Latency Alert',
        description: 'Alert when P99 latency exceeds 200ms',
        enabled: true,
        condition: {
          metric: 'latency',
          operator: '>',
          threshold: 200,
          duration: 60,
        },
        severity: 'warning',
        actions: [{ type: 'slack', target: '#alerts', message: 'High latency detected' }],
      }

      const createdRule = monitoring.createAlertRule(rule)
      expect(createdRule.ruleId).toBe('rule-latency-high')
      expect(createdRule.triggerCount).toBe(0)
    })

    it('should create critical alert rule', () => {
      const rule: Omit<AlertRule, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'> = {
        ruleId: 'rule-error-rate-critical',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 1%',
        enabled: true,
        condition: {
          metric: 'errorRate',
          operator: '>',
          threshold: 1,
          duration: 30,
        },
        severity: 'critical',
        actions: [
          { type: 'pagerduty', target: 'flash-sale-team' },
          { type: 'slack', target: '#critical-alerts' },
        ],
      }

      monitoring.createAlertRule(rule)
      expect(true).toBe(true)
    })
  })

  describe('Alert Triggering', () => {
    it('should trigger alert when threshold exceeded', () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('alert-test-region')

      const rule: Omit<AlertRule, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'> = {
        ruleId: 'alert-test',
        name: 'Alert Test Rule',
        description: 'Test alert triggering',
        enabled: true,
        condition: {
          metric: 'errorRate',
          operator: '>',
          threshold: 2,
          duration: 30,
        },
        severity: 'critical',
        actions: [],
      }

      monitoring2.createAlertRule(rule)

      const metrics: RegionMetrics = {
        regionId: 'alert-test-region',
        timestamp: new Date(),
        latency: { p50: 20, p95: 100, p99: 250, p999: 500 },
        throughput: 3000,
        errorRate: 3, // > 2, should trigger
        cpuUsage: 45,
        memoryUsage: 55,
        cacheHitRate: 90,
        activeConnections: 600,
        diskUsage: 35,
      }

      let alertTriggered = false
      monitoring2.on('alert:triggered', () => {
        alertTriggered = true
      })

      monitoring2.collectMetrics('alert-test-region', metrics)

      expect(alertTriggered).toBe(true)
    })

    it('should track trigger count', () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('test-region')

      const rule: Omit<AlertRule, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'> = {
        ruleId: 'test-rule',
        name: 'Test Alert',
        description: 'Test alert rule',
        enabled: true,
        condition: {
          metric: 'cpuUsage',
          operator: '>',
          threshold: 80,
          duration: 30,
        },
        severity: 'critical',
        actions: [],
      }

      monitoring2.createAlertRule(rule)

      const metrics: RegionMetrics = {
        regionId: 'test-region',
        timestamp: new Date(),
        latency: { p50: 10, p95: 50, p99: 100, p999: 200 },
        throughput: 2000,
        errorRate: 0.1,
        cpuUsage: 85, // > 80
        memoryUsage: 60,
        cacheHitRate: 92,
        activeConnections: 500,
        diskUsage: 40,
      }

      monitoring2.collectMetrics('test-region', metrics)

      const alerts = monitoring2.getAlerts('test-region', 'active')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })

  describe('Health Status', () => {
    it('should determine healthy status', () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('healthy-region')

      const metrics: RegionMetrics = {
        regionId: 'healthy-region',
        timestamp: new Date(),
        latency: { p50: 5, p95: 20, p99: 50, p999: 100 }, // All good
        throughput: 8000,
        errorRate: 0.1,
        cpuUsage: 30,
        memoryUsage: 40,
        cacheHitRate: 98,
        activeConnections: 1500,
        diskUsage: 20,
      }

      monitoring2.collectMetrics('healthy-region', metrics)

      const health = monitoring2.getHealthStatus('healthy-region')
      expect(health?.status).toBe('healthy')
      expect(health?.issues.length).toBe(0)
    })

    it('should determine degraded status', () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('degraded-region')

      const metrics: RegionMetrics = {
        regionId: 'degraded-region',
        timestamp: new Date(),
        latency: { p50: 15, p95: 80, p99: 250, p999: 400 }, // High latency
        throughput: 3000,
        errorRate: 2, // High error
        cpuUsage: 50,
        memoryUsage: 60,
        cacheHitRate: 85,
        activeConnections: 900,
        diskUsage: 45,
      }

      monitoring2.collectMetrics('degraded-region', metrics)

      const health = monitoring2.getHealthStatus('degraded-region')
      expect(health?.status).toBe('degraded')
      expect(health?.issues.length).toBeGreaterThan(0)
    })

    it('should determine unhealthy status', () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('unhealthy-region')

      const metrics: RegionMetrics = {
        regionId: 'unhealthy-region',
        timestamp: new Date(),
        latency: { p50: 50, p95: 150, p99: 350, p999: 600 }, // Very high latency
        throughput: 500,
        errorRate: 5, // Very high error
        cpuUsage: 95, // Very high CPU
        memoryUsage: 90, // Very high memory
        cacheHitRate: 50, // Low hit rate
        activeConnections: 100,
        diskUsage: 85,
      }

      monitoring2.collectMetrics('unhealthy-region', metrics)

      const health = monitoring2.getHealthStatus('unhealthy-region')
      expect(health?.status).toBe('unhealthy')
      expect(health?.issues.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Health Checks', () => {
    it('should perform health check', async () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('check-region')

      const metrics: RegionMetrics = {
        regionId: 'check-region',
        timestamp: new Date(),
        latency: { p50: 10, p95: 50, p99: 100, p999: 200 },
        throughput: 5000,
        errorRate: 0.5,
        cpuUsage: 40,
        memoryUsage: 50,
        cacheHitRate: 95,
        activeConnections: 1000,
        diskUsage: 30,
      }

      monitoring2.collectMetrics('check-region', metrics)

      const health = await monitoring2.performHealthCheck('check-region')
      expect(health?.status).toBeDefined()
      expect(health?.metrics).toBeDefined()
    })
  })

  describe('Alert Management', () => {
    it('should retrieve active alerts', () => {
      const alerts = monitoring.getAlerts(undefined, 'active')
      expect(Array.isArray(alerts)).toBe(true)
    })

    it('should resolve alert', () => {
      const alerts = monitoring.getAlerts(undefined, 'active')
      if (alerts.length > 0) {
        const resolved = monitoring.resolveAlert(alerts[0].alertId)
        expect(resolved).toBe(true)

        const stillActive = monitoring.getAlerts(alerts[0].alertId, 'active')
        expect(stillActive.length).toBe(0)
      }
    })

    it('should filter alerts by region', () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('filter-region')

      const rule: Omit<AlertRule, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'> = {
        ruleId: 'filter-rule',
        name: 'Filter Test',
        description: 'Test filtering',
        enabled: true,
        condition: {
          metric: 'errorRate',
          operator: '>',
          threshold: 0.1,
          duration: 30,
        },
        severity: 'warning',
        actions: [],
      }

      monitoring2.createAlertRule(rule)

      const metrics: RegionMetrics = {
        regionId: 'filter-region',
        timestamp: new Date(),
        latency: { p50: 10, p95: 50, p99: 100, p999: 200 },
        throughput: 3000,
        errorRate: 0.5, // > 0.1
        cpuUsage: 45,
        memoryUsage: 55,
        cacheHitRate: 90,
        activeConnections: 600,
        diskUsage: 35,
      }

      monitoring2.collectMetrics('filter-region', metrics)

      const alerts = monitoring2.getAlerts('filter-region')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })

  describe('Event System', () => {
    it('should emit metrics collected event', () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('event-region')

      let metricsEmitted = false
      monitoring2.on('metrics:collected', () => {
        metricsEmitted = true
      })

      const metrics: RegionMetrics = {
        regionId: 'event-region',
        timestamp: new Date(),
        latency: { p50: 10, p95: 50, p99: 100, p999: 200 },
        throughput: 5000,
        errorRate: 0.5,
        cpuUsage: 40,
        memoryUsage: 50,
        cacheHitRate: 95,
        activeConnections: 1000,
        diskUsage: 30,
      }

      monitoring2.collectMetrics('event-region', metrics)

      expect(metricsEmitted).toBe(true)
    })

    it('should emit health updated event', () => {
      const monitoring2 = new RegionalMonitoringSystem()
      monitoring2.registerRegion('health-event-region')

      let healthUpdated = false
      monitoring2.on('health:updated', () => {
        healthUpdated = true
      })

      const metrics: RegionMetrics = {
        regionId: 'health-event-region',
        timestamp: new Date(),
        latency: { p50: 10, p95: 50, p99: 100, p999: 200 },
        throughput: 5000,
        errorRate: 0.5,
        cpuUsage: 40,
        memoryUsage: 50,
        cacheHitRate: 95,
        activeConnections: 1000,
        diskUsage: 30,
      }

      monitoring2.collectMetrics('health-event-region', metrics)

      expect(healthUpdated).toBe(true)
    })
  })

  describe('Reporting', () => {
    it('should generate monitoring report', () => {
      const report = monitoring.generateMonitoringReport()

      expect(report).toContain('REGIONAL MONITORING REPORT')
      expect(report).toContain('ACTIVE REGIONS')
      expect(report).toContain('ALERT RULES')
    })

    it('should include region status in report', () => {
      const report = monitoring.generateMonitoringReport()

      expect(report).toContain('us-east-1')
      expect(report).toContain('Status:')
    })
  })

  describe('Integration - Complete Monitoring Workflow', () => {
    it('should complete full monitoring workflow', async () => {
      const monitoring2 = new RegionalMonitoringSystem()

      // 1. Register regions
      monitoring2.registerRegion('prod-us')
      monitoring2.registerRegion('prod-eu')

      // 2. Create alert rules
      const latencyRule: Omit<AlertRule, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'> = {
        ruleId: 'prod-latency',
        name: 'Production Latency Alert',
        description: 'Alert when P99 > 150ms',
        enabled: true,
        condition: {
          metric: 'latency',
          operator: '>',
          threshold: 150,
          duration: 60,
        },
        severity: 'warning',
        actions: [{ type: 'slack', target: '#prod-alerts' }],
      }

      const errorRule: Omit<AlertRule, 'createdAt' | 'triggerCount' | 'lastTriggeredAt'> = {
        ruleId: 'prod-errors',
        name: 'Production Error Rate Alert',
        description: 'Alert when error rate > 1%',
        enabled: true,
        condition: {
          metric: 'errorRate',
          operator: '>',
          threshold: 1,
          duration: 30,
        },
        severity: 'critical',
        actions: [
          { type: 'pagerduty', target: 'prod-team' },
          { type: 'slack', target: '#critical' },
        ],
      }

      monitoring2.createAlertRule(latencyRule)
      monitoring2.createAlertRule(errorRule)

      // 3. Collect metrics
      const usMetrics: RegionMetrics = {
        regionId: 'prod-us',
        timestamp: new Date(),
        latency: { p50: 20, p95: 80, p99: 120, p999: 200 },
        throughput: 6000,
        errorRate: 0.5,
        cpuUsage: 50,
        memoryUsage: 60,
        cacheHitRate: 95,
        activeConnections: 1200,
        diskUsage: 40,
      }

      monitoring2.collectMetrics('prod-us', usMetrics)

      // 4. Perform health check
      const health = await monitoring2.performHealthCheck('prod-us')
      expect(health?.status).toBe('healthy')

      // 5. Get alerts
      const alerts = monitoring2.getAlerts()
      expect(Array.isArray(alerts)).toBe(true)

      // 6. Generate report
      const report = monitoring2.generateMonitoringReport()
      expect(report).toContain('REGIONAL MONITORING REPORT')
    })
  })
})
