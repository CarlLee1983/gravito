import type { ScaffoldOptions } from './types'

export type ProfileType = 'core' | 'scale' | 'enterprise'

export interface ProfileConfig {
  drivers: {
    database: string
    cache: string
    queue: string
    storage: string
    session: string
  }
  features: string[]
}

export class ProfileResolver {
  private static readonly DEFAULTS: Record<ProfileType, ProfileConfig> = {
    core: {
      drivers: {
        database: 'sqlite',
        cache: 'memory',
        queue: 'sync',
        storage: 'local',
        session: 'file',
      },
      features: [],
    },
    scale: {
      drivers: {
        database: 'postgresql',
        cache: 'redis',
        queue: 'redis',
        storage: 's3',
        session: 'redis',
      },
      features: ['stream', 'nebula'],
    },
    enterprise: {
      drivers: {
        database: 'postgresql',
        cache: 'redis',
        queue: 'redis',
        storage: 's3',
        session: 'redis',
      },
      features: ['stream', 'nebula', 'monitor', 'sentinel', 'fortify'],
    },
  }

  resolve(profile: ProfileType = 'core', withFeatures: string[] = []): ProfileConfig {
    const base = ProfileResolver.DEFAULTS[profile] || ProfileResolver.DEFAULTS.core

    // Deep copy to avoid mutating defaults
    const config: ProfileConfig = {
      drivers: { ...base.drivers },
      features: [...base.features],
    }

    // Apply feature add-ons
    // This is where we handle the "--with redis" logic
    for (const feature of withFeatures) {
      this.applyFeature(config, feature)
    }

    return config
  }

  private applyFeature(config: ProfileConfig, feature: string) {
    switch (feature) {
      case 'redis':
        config.drivers.cache = 'redis'
        config.drivers.queue = 'redis'
        config.drivers.session = 'redis'
        break
      case 'postgres':
      case 'postgresql':
        config.drivers.database = 'postgresql'
        break
      case 'mysql':
        config.drivers.database = 'mysql'
        break
      case 's3':
        config.drivers.storage = 's3'
        break
      case 'r2':
        config.drivers.storage = 'r2'
        break
      case 'queue':
        // If driver isn't already redis, default to redis for queue feature
        if (config.drivers.queue === 'sync') {
          config.drivers.queue = 'redis'
        }
        break
      default:
        // Generic feature flag
        if (!config.features.includes(feature)) {
          config.features.push(feature)
        }
    }
  }

  /**
   * Validator for profile names
   */
  isValidProfile(profile: string): profile is ProfileType {
    return profile in ProfileResolver.DEFAULTS
  }

  /**
   * Validator for feature names
   */
  isValidFeature(feature: string): boolean {
    const validFeatures = [
      'redis',
      'postgres',
      'postgresql',
      'mysql',
      's3',
      'r2',
      'queue',
      'stream',
      'nebula',
      'monitor',
      'sentinel',
      'fortify',
    ]
    return validFeatures.includes(feature)
  }
}
