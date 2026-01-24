import { beforeEach, describe, expect, it } from 'bun:test'
import { LocalDriver } from '../src/drivers'
import { HealthChecker } from '../src/health/HealthChecker'
import { RippleServer } from '../src/RippleServer'

describe('HealthChecker', () => {
  let server: RippleServer
  let driver: LocalDriver
  let healthChecker: HealthChecker

  beforeEach(() => {
    server = new RippleServer({
      path: '/ws',
      pingInterval: 0,
    })
    driver = new LocalDriver()
    healthChecker = new HealthChecker(server, driver)
  })

  describe('check', () => {
    it('should return health check result with correct structure', async () => {
      const result = await healthChecker.check()

      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('uptime')
      expect(result).toHaveProperty('checks')
      expect(result).toHaveProperty('stats')

      expect(result.checks).toHaveProperty('websocket')
      expect(result.checks).toHaveProperty('driver')
    })

    it('should report healthy status for initialized server', async () => {
      const result = await healthChecker.check()

      expect(result.status).toBe('healthy')
      expect(result.checks.websocket.status).toBe('healthy')
      expect(result.checks.driver.status).toBe('healthy')
    })

    it('should include uptime', async () => {
      await Bun.sleep(10)
      const result = await healthChecker.check()

      expect(result.uptime).toBeGreaterThanOrEqual(10)
    })

    it('should include stats with zero connections initially', async () => {
      const result = await healthChecker.check()

      expect(result.stats.activeConnections).toBe(0)
      expect(result.stats.totalChannels).toBe(0)
      expect(result.stats.messagesPerSecond).toBeGreaterThanOrEqual(0)
    })

    it('should calculate messages per second', async () => {
      healthChecker.recordMessage()
      healthChecker.recordMessage()
      healthChecker.recordMessage()

      await Bun.sleep(100)

      const result = await healthChecker.check()
      expect(result.stats.messagesPerSecond).toBeGreaterThan(0)
    })

    it('should reset message count after check', async () => {
      healthChecker.recordMessage()
      healthChecker.recordMessage()

      await Bun.sleep(100)

      const result1 = await healthChecker.check()
      expect(result1.stats.messagesPerSecond).toBeGreaterThan(0)

      await Bun.sleep(100)

      const result2 = await healthChecker.check()
      expect(result2.stats.messagesPerSecond).toBe(0)
    })

    it('should include timestamp in ISO format', async () => {
      const result = await healthChecker.check()

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should include component health with lastCheck timestamps', async () => {
      const result = await healthChecker.check()

      expect(result.checks.websocket.lastCheck).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
      expect(result.checks.driver.lastCheck).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
    })
  })

  describe('recordMessage', () => {
    it('should increment message count', async () => {
      healthChecker.recordMessage()
      healthChecker.recordMessage()
      healthChecker.recordMessage()

      await Bun.sleep(100)

      const result = await healthChecker.check()
      expect(result.stats.messagesPerSecond).toBeGreaterThan(0)
    })
  })
})
