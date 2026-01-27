import { PlanetCore } from '@gravito/core'

const core = new PlanetCore()

await core.bootstrap()

export default core.liftoff()