import { PlanetCore } from 'gravito-core'\n\nconst core = new PlanetCore()\n\nawait core.bootstrap()\n\nexport default core.liftoff()
