import type { ProfileConfig, ProfileType } from './ProfileResolver'

/**
 * Represents the structure of a `gravito.lock.json` file.
 *
 * @public
 * @since 3.0.0
 */
export interface LockFile {
  /** Information about the selected project profile. */
  profile: {
    name: ProfileType
    version: string
  }
  /** List of enabled features and orbits. */
  features: string[]
  /** Selected default drivers for various services. */
  drivers: {
    database: string
    cache: string
    queue: string
    storage: string
    session: string
  }
  /** Metadata about the template used for generation. */
  manifest: {
    template: string
    version: string
  }
  /** ISO timestamp when the project was scaffolded. */
  createdAt: string
}

/**
 * LockGenerator creates the `gravito.lock.json` file during scaffolding.
 *
 * This file records the architectural choices and feature set of the project,
 * allowing the CLI to perform consistent upgrades and feature injections later.
 *
 * @public
 * @since 3.0.0
 */
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
