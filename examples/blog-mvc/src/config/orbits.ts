import { OrbitAtlas } from '@gravito/atlas'
import { OrbitIon } from '@gravito/ion'
import { OrbitPrism } from '@gravito/prism'
import { OrbitPulsar } from '@gravito/pulsar'
import { OrbitSentinel } from '@gravito/sentinel'
import { OrbitSignal } from '@gravito/signal'
import { OrbitCache } from '@gravito/stasis'
import { authConfig } from './auth'
import { mailConfig } from './mail'

export const orbits = [
  new OrbitCache(),
  new OrbitAtlas(),
  new OrbitPrism({
    cache: {
      enabled: process.env.NODE_ENV === 'production',
      maxSize: 500,
    },
  }),
  new OrbitIon(),
  new OrbitPulsar({
    driver: 'memory',
    csrf: {
      enabled: false,
    },
  }),
  new OrbitSentinel(authConfig),
  new OrbitSignal(mailConfig),
]
