import { DB, OrbitAtlas } from '@gravito/atlas'
import { loadTranslations, OrbitCosmos } from '@gravito/cosmos'
import { OrbitIon } from '@gravito/ion'
import { OrbitMonolith } from '@gravito/monolith'
import { OrbitPrism } from '@gravito/prism'
import { OrbitPulsar } from '@gravito/pulsar'
import { CallbackUserProvider, OrbitSentinel } from '@gravito/sentinel'
import { OrbitStasis } from '@gravito/stasis'
import { User } from '../src/models'
import { sql } from '../src/utils/db'

export const orbits = [
  // Internationalization
  new OrbitCosmos({
    defaultLocale: 'zh-TW',
    supportedLocales: ['zh-TW', 'en', 'ja'],
    translations: await loadTranslations('resources/lang'),
  }),

  // Database ORM
  new OrbitAtlas(),

  // Template engine
  new OrbitMonolith(),

  // Cache support (Required by Pulsar if driver is 'cache')
  new OrbitStasis(),

  // Asset management and Vite directives (Required by OrbitIon for initial load)
  new OrbitPrism(),

  // Session management
  new OrbitPulsar({
    driver: 'memory',
    cookie: {
      name: 'ecommerce_session',
    },
    csrf: {
      headerName: 'X-XSRF-TOKEN',
    },
    absoluteTimeoutSeconds: 60 * 60 * 24 * 7, // 7 days (replacing maxAge)
  }),

  // Authentication
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
          new CallbackUserProvider<User>(
            // retrieveById
            async (id) => {
              const result = await DB.raw<any>(sql('SELECT * FROM users WHERE id = ?'), [id])
              const row = result.rows[0]
              if (!row) return null
              return User.hydrate(row)
            },
            // validateCredentials
            async (user, credentials) => {
              if (!credentials.password || !user.password) return false
              return Bun.password.verify(credentials.password as string, user.password)
            },
            // retrieveByToken (optional)
            undefined,
            // retrieveByCredentials
            async (credentials) => {
              const result = await DB.raw<any>(sql('SELECT * FROM users WHERE email = ?'), [
                credentials.email,
              ])
              const row = result.rows[0]
              if (!row) return null
              return User.hydrate(row)
            }
          ),
      },
    },
  }),

  // Inertia.js integration
  new OrbitIon({
    version: '1.0.0',
    rootView: 'index',
  }),
]
