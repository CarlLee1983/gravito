import type { GravitoOrbit, PlanetCore } from '@gravito/core'
/**
 * Atlas Orbit - Database & ORM Integration
 * Integrates the Atlas ORM engine into the Gravito Core ecosystem.
 * @public
 */
export declare class OrbitAtlas implements GravitoOrbit {
  install(core: PlanetCore): Promise<void>
}
