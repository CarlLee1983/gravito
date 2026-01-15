import type { PlanetCore } from '@gravito/core'

export class Controller {
  [key: string]: any // Index signature for ControllerClass compatibility

  constructor(protected core: PlanetCore) {}
}
