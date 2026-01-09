import type { ProfileConfig, ProfileType } from './ProfileResolver'

export interface LockFile {
  profile: {
    name: ProfileType
    version: string
  }
  features: string[]
  drivers: {
    database: string
    cache: string
    queue: string
    storage: string
    session: string
  }
  manifest: {
    template: string
    version: string
  }
  createdAt: string
}

export class LockGenerator {
  generate(
    profileName: ProfileType,
    config: ProfileConfig,
    templateName = 'basic',
    templateVersion = '1.0.0'
  ): string {
    const lock: LockFile = {
      profile: {
        name: profileName,
        version: '1.0.0', // This could be dynamic based on profile system version
      },
      features: config.features,
      drivers: config.drivers,
      manifest: {
        template: templateName,
        version: templateVersion,
      },
      createdAt: new Date().toISOString(),
    }

    return JSON.stringify(lock, null, 2)
  }
}
