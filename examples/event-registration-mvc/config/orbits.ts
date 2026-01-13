import { DB, OrbitAtlas } from '@gravito/atlas'
import { OrbitCosmos } from '@gravito/cosmos'
import { OrbitIon } from '@gravito/ion'
import { OrbitMonolith } from '@gravito/monolith'
import { OrbitPrism } from '@gravito/prism'
import { OrbitPulsar } from '@gravito/pulsar'
import { CallbackUserProvider, OrbitSentinel } from '@gravito/sentinel'
import { OrbitSignal } from '@gravito/signal'
import type { User } from '../src/Models/User'
import { en, zhTW } from './locales'

export const orbits = [
  new OrbitAtlas(),
  new OrbitCosmos({
    defaultLocale: 'en',
    supportedLocales: ['en', 'zh-TW'],
    translations: {
      en,
      'zh-TW': zhTW,
    },
  }),

  new OrbitMonolith(),
  new OrbitPrism(), // Required for initial page rendering
  new OrbitPulsar({
    // Required for session guard
    driver: 'memory',
    csrf: {
      enabled: process.env.NODE_ENV !== 'test',
    },
  }),
  new OrbitSentinel({
    defaults: {
      guard: 'web',
    },
    guards: {
      web: {
        driver: 'session',
        provider: 'users',
      },
    },
    providers: {
      users: {
        driver: 'callback',
      },
    },
    bindings: {
      providers: {
        users: () =>
          new CallbackUserProvider(
            async (id) => {
              return await DB.table<User>('users').where('id', id).first()
            },
            async () => true, // validateCredentials - handled by controller for now
            undefined, // retrieveByToken
            async (credentials) => {
              return await DB.table<User>('users').where('email', credentials.email).first()
            }
          ),
      },
    },
  }),
  new OrbitSignal({
    devMode: true,
    from: {
      name: 'Event Registration',
      address: 'noreply@events.example.com',
    },
  }),
  new OrbitIon({
    rootView: 'index',
    version: '1.0.0',
  }),
]
