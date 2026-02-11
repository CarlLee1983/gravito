/**
 * Cross-Region Deployment Tests
 * 跨區域應用部署測試
 */

import { beforeAll, describe, expect, it } from 'bun:test'
import type { DeploymentVersion } from '../../src/sharding'
import { CrossRegionDeploymentManager } from '../../src/sharding'

describe('CrossRegionDeploymentManager - 跨區域應用部署', () => {
  let manager: CrossRegionDeploymentManager

  beforeAll(() => {
    manager = new CrossRegionDeploymentManager()
  })

  describe('Version Management', () => {
    it('should register new deployment version', () => {
      const version: DeploymentVersion = {
        versionId: 'v1.0.0',
        applicationId: 'flash-sale-api',
        semver: '1.0.0',
        deployedAt: new Date(),
        deployedBy: 'ci-system',
        checksum: 'abc123def456',
        features: ['multi-region', 'failover', 'health-check'],
        rollbackable: true,
        status: 'active',
      }

      manager.registerVersion(version)

      const versions = manager.getAllVersions()
      expect(versions.length).toBe(1)
      expect(versions[0].semver).toBe('1.0.0')
    })

    it('should register multiple versions', () => {
      const version2: DeploymentVersion = {
        versionId: 'v1.1.0',
        applicationId: 'flash-sale-api',
        semver: '1.1.0',
        deployedAt: new Date(),
        deployedBy: 'ci-system',
        checksum: 'xyz789',
        features: ['enhanced-routing', 'geo-aware'],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version2)

      const versions = manager.getAllVersions()
      expect(versions.length).toBe(2)
    })

    it('should track version status', () => {
      const versions = manager.getAllVersions()
      const activeVersions = versions.filter((v) => v.status === 'active')
      expect(activeVersions.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Deployment Planning', () => {
    it('should create deployment plan', () => {
      const plan = manager.createDeploymentPlan(
        'v1.0.0',
        ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
        'rolling'
      )

      expect(plan.planId).toBeDefined()
      expect(plan.versionId).toBe('v1.0.0')
      expect(plan.targetRegions.length).toBe(3)
      expect(plan.deploymentStrategy).toBe('rolling')
    })

    it('should calculate correct deployment order', () => {
      const plan = manager.createDeploymentPlan(
        'v1.1.0',
        ['eu-west-1', 'us-east-1', 'ap-southeast-1'],
        'canary'
      )

      // Should prioritize us-east-1 (primary) first
      expect(plan.deploymentOrder[0]).toBe('us-east-1')
      expect(plan.deploymentOrder).toContain('eu-west-1')
      expect(plan.deploymentOrder).toContain('ap-southeast-1')
    })

    it('should retrieve all deployment plans', () => {
      const plans = manager.getAllDeploymentPlans()
      expect(plans.length).toBeGreaterThanOrEqual(2)
    })

    it('should throw error for non-existent version', () => {
      let error: Error | null = null
      try {
        manager.createDeploymentPlan('non-existent', ['us-east-1'], 'rolling')
      } catch (e) {
        error = e as Error
      }
      expect(error).toBeDefined()
      expect(error?.message).toContain('版本不存在')
    })
  })

  describe('Deployment Execution', () => {
    it('should execute deployment plan', async () => {
      const version: DeploymentVersion = {
        versionId: 'v2.0.0',
        applicationId: 'flash-sale-api',
        semver: '2.0.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum',
        features: [],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const plan = manager.createDeploymentPlan('v2.0.0', ['us-east-1', 'eu-west-1'], 'rolling')

      const result = await manager.executeDeploymentPlan(plan.planId)
      expect(result).toBe(true)
    })

    it('should track deployment progress', async () => {
      const version: DeploymentVersion = {
        versionId: 'v2.1.0',
        applicationId: 'flash-sale-api',
        semver: '2.1.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum2',
        features: ['new-feature'],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const plan = manager.createDeploymentPlan('v2.1.0', ['us-east-1'], 'blue-green')

      let deploymentStarted = false
      let deploymentCompleted = false

      manager.on('deployment:started', () => {
        deploymentStarted = true
      })

      manager.on('deployment:completed', () => {
        deploymentCompleted = true
      })

      await manager.executeDeploymentPlan(plan.planId)

      expect(deploymentStarted).toBe(true)
      expect(deploymentCompleted).toBe(true)
    })

    it('should handle deployment to multiple regions sequentially', async () => {
      const version: DeploymentVersion = {
        versionId: 'v2.2.0',
        applicationId: 'flash-sale-api',
        semver: '2.2.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum3',
        features: [],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']
      const plan = manager.createDeploymentPlan('v2.2.0', regions, 'rolling')

      let regionDeployments = 0
      manager.on('deployment:region-completed', () => {
        regionDeployments++
      })

      const result = await manager.executeDeploymentPlan(plan.planId)
      expect(result).toBe(true)
      expect(regionDeployments).toBe(regions.length)
    })
  })

  describe('Health Verification', () => {
    it('should perform health checks after deployment', async () => {
      const version: DeploymentVersion = {
        versionId: 'v3.0.0',
        applicationId: 'flash-sale-api',
        semver: '3.0.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum4',
        features: [],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const plan = manager.createDeploymentPlan('v3.0.0', ['us-east-1'], 'rolling')

      let healthChecked = false
      manager.on('deployment:region-completed', (data) => {
        const status = manager.getDeploymentStatus(plan.planId, data.regionId)
        if (status?.healthCheck.checkedAt) {
          healthChecked = true
        }
      })

      await manager.executeDeploymentPlan(plan.planId)
      expect(healthChecked).toBe(true)
    })

    it('should track error rate and latency metrics', async () => {
      const version: DeploymentVersion = {
        versionId: 'v3.1.0',
        applicationId: 'flash-sale-api',
        semver: '3.1.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum5',
        features: [],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const plan = manager.createDeploymentPlan('v3.1.0', ['us-east-1'], 'rolling')

      await manager.executeDeploymentPlan(plan.planId)

      const status = manager.getDeploymentStatus(plan.planId, 'us-east-1')
      expect(status?.healthCheck.errorRate).toBeDefined()
      expect(status?.healthCheck.avgLatency).toBeDefined()
      expect(status?.healthCheck.avgLatency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Rollback Management', () => {
    it('should rollback deployment', async () => {
      const version: DeploymentVersion = {
        versionId: 'v4.0.0',
        applicationId: 'flash-sale-api',
        semver: '4.0.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum6',
        features: [],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const plan = manager.createDeploymentPlan('v4.0.0', ['us-east-1', 'eu-west-1'], 'rolling')

      await manager.executeDeploymentPlan(plan.planId)

      let rollbackStarted = false
      let rollbackCompleted = false

      manager.on('rollback:started', () => {
        rollbackStarted = true
      })

      manager.on('rollback:completed', () => {
        rollbackCompleted = true
      })

      const result = await manager.rollbackDeployment(plan.planId)
      expect(result).toBe(true)
      expect(rollbackStarted).toBe(true)
      expect(rollbackCompleted).toBe(true)
    })

    it('should mark regions as rolled back', async () => {
      const version: DeploymentVersion = {
        versionId: 'v4.1.0',
        applicationId: 'flash-sale-api',
        semver: '4.1.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum7',
        features: [],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const plan = manager.createDeploymentPlan('v4.1.0', ['us-east-1'], 'rolling')

      await manager.executeDeploymentPlan(plan.planId)
      await manager.rollbackDeployment(plan.planId)

      const status = manager.getDeploymentStatus(plan.planId, 'us-east-1')
      expect(status?.status).toBe('rolled-back')
    })
  })

  describe('Dependency Management', () => {
    it('should set deployment dependencies', () => {
      manager.setDeploymentDependency('eu-west-1', {
        regionId: 'eu-west-1',
        dependsOn: ['us-east-1'],
        priority: 2,
      })

      // Dependency should be set without error
      expect(true).toBe(true)
    })

    it('should support multiple dependencies', () => {
      manager.setDeploymentDependency('ap-southeast-1', {
        regionId: 'ap-southeast-1',
        dependsOn: ['us-east-1', 'eu-west-1'],
        priority: 3,
      })

      expect(true).toBe(true)
    })
  })

  describe('Synchronization', () => {
    it('should track sync state after deployment', async () => {
      const version: DeploymentVersion = {
        versionId: 'v5.0.0',
        applicationId: 'flash-sale-api',
        semver: '5.0.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum8',
        features: [],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const plan = manager.createDeploymentPlan('v5.0.0', ['us-east-1'], 'rolling')

      let syncCompleted = false
      manager.on('sync:completed', (state) => {
        expect(state.isSynced).toBe(true)
        syncCompleted = true
      })

      await manager.executeDeploymentPlan(plan.planId)
      expect(syncCompleted).toBe(true)
    })

    it('should maintain sync state for multiple regions', async () => {
      const version: DeploymentVersion = {
        versionId: 'v5.1.0',
        applicationId: 'flash-sale-api',
        semver: '5.1.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum9',
        features: [],
        rollbackable: true,
        status: 'pending',
      }

      manager.registerVersion(version)
      const regions = ['us-east-1', 'eu-west-1']
      const plan = manager.createDeploymentPlan('v5.1.0', regions, 'rolling')

      await manager.executeDeploymentPlan(plan.planId)

      for (const regionId of regions) {
        const syncState = manager.getSyncState(regionId)
        expect(syncState?.isSynced).toBe(true)
      }
    })
  })

  describe('Reporting', () => {
    it('should generate deployment report', () => {
      const report = manager.generateDeploymentReport()

      expect(report).toContain('CROSS-REGION DEPLOYMENT REPORT')
      expect(report).toContain('VERSIONS')
      expect(report).toContain('DEPLOYMENT PLANS')
      expect(report).toContain('DEPLOYMENT STATUS')
    })

    it('should include version details in report', () => {
      const report = manager.generateDeploymentReport()

      expect(report).toContain('v1.0.0')
      expect(report).toContain('flash-sale-api')
      expect(report).toContain('Status:')
    })

    it('should include deployment plan details in report', () => {
      const report = manager.generateDeploymentReport()

      expect(report).toContain('rolling')
      expect(report).toContain('canary')
      expect(report).toContain('blue-green')
    })
  })

  describe('Event System', () => {
    it('should emit version registration event', () => {
      const manager2 = new CrossRegionDeploymentManager()
      let versionRegistered = false

      manager2.on('version:registered', () => {
        versionRegistered = true
      })

      const version: DeploymentVersion = {
        versionId: 'v6.0.0',
        applicationId: 'flash-sale-api',
        semver: '6.0.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum10',
        features: [],
        rollbackable: true,
        status: 'active',
      }

      manager2.registerVersion(version)
      expect(versionRegistered).toBe(true)
    })

    it('should emit plan creation event', () => {
      const manager2 = new CrossRegionDeploymentManager()
      let planCreated = false

      manager2.on('plan:created', () => {
        planCreated = true
      })

      const version: DeploymentVersion = {
        versionId: 'v6.1.0',
        applicationId: 'flash-sale-api',
        semver: '6.1.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum11',
        features: [],
        rollbackable: true,
        status: 'active',
      }

      manager2.registerVersion(version)
      manager2.createDeploymentPlan('v6.1.0', ['us-east-1'], 'rolling')

      expect(planCreated).toBe(true)
    })

    it('should emit deployment lifecycle events', async () => {
      const manager2 = new CrossRegionDeploymentManager()
      const events: string[] = []

      manager2.on('deployment:started', () => events.push('started'))
      manager2.on('deployment:region-start', () => events.push('region-start'))
      manager2.on('deployment:region-completed', () => events.push('region-completed'))
      manager2.on('deployment:completed', () => events.push('completed'))

      const version: DeploymentVersion = {
        versionId: 'v6.2.0',
        applicationId: 'flash-sale-api',
        semver: '6.2.0',
        deployedAt: new Date(),
        deployedBy: 'test',
        checksum: 'test-checksum12',
        features: [],
        rollbackable: true,
        status: 'active',
      }

      manager2.registerVersion(version)
      const plan = manager2.createDeploymentPlan('v6.2.0', ['us-east-1'], 'rolling')
      await manager2.executeDeploymentPlan(plan.planId)

      expect(events).toContain('started')
      expect(events).toContain('region-start')
      expect(events).toContain('region-completed')
      expect(events).toContain('completed')
    })
  })

  describe('Integration - Complete Deployment Workflow', () => {
    it('should complete full deployment workflow', async () => {
      const manager2 = new CrossRegionDeploymentManager()

      // 1. Register version
      const version: DeploymentVersion = {
        versionId: 'v7.0.0',
        applicationId: 'flash-sale-api',
        semver: '7.0.0',
        deployedAt: new Date(),
        deployedBy: 'ci-system',
        checksum: 'full-workflow-checksum',
        features: ['region-deployment', 'auto-rollback'],
        rollbackable: true,
        status: 'pending',
      }

      manager2.registerVersion(version)
      expect(manager2.getAllVersions().length).toBe(1)

      // 2. Create deployment plan
      const plan = manager2.createDeploymentPlan(
        'v7.0.0',
        ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
        'rolling'
      )
      expect(plan.targetRegions.length).toBe(3)

      // 3. Set dependencies
      manager2.setDeploymentDependency('eu-west-1', {
        regionId: 'eu-west-1',
        dependsOn: ['us-east-1'],
        priority: 2,
      })

      // 4. Execute deployment
      const deploymentResult = await manager2.executeDeploymentPlan(plan.planId)
      expect(deploymentResult).toBe(true)

      // 5. Verify all regions deployed
      const regions = plan.targetRegions
      for (const regionId of regions) {
        const status = manager2.getDeploymentStatus(plan.planId, regionId)
        expect(status?.status).toBe('completed')
        expect(status?.progress).toBe(100)
      }

      // 6. Generate report
      const report = manager2.generateDeploymentReport()
      expect(report).toContain('v7.0.0')
      expect(report).toContain('completed')
    })
  })
})
