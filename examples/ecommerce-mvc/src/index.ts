import { bodySizeLimit, PlanetCore, securityHeaders } from '@gravito/core'
import { OrbitMonolith, Route } from '@gravito/monolith'
import { OrbitPhoton } from '@gravito/photon'
import { ProductController } from './controllers/ProductController'
import { StoreProductRequest } from './requests/StoreProductRequest'

const core = new PlanetCore()

const defaultCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ')
const cspValue = process.env.APP_CSP
const csp = cspValue === 'false' ? false : (cspValue ?? defaultCsp)
const hstsMaxAge = Number.parseInt(process.env.APP_HSTS_MAX_AGE ?? '15552000', 10)
const bodyLimit = Number.parseInt(process.env.APP_BODY_LIMIT ?? '1048576', 10)
const requireLength = process.env.APP_BODY_REQUIRE_LENGTH === 'true'

core.adapter.use(
  '*',
  securityHeaders({
    contentSecurityPolicy: csp,
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: Number.isNaN(hstsMaxAge) ? 15552000 : hstsMaxAge, includeSubDomains: true }
        : false,
  })
)
if (!Number.isNaN(bodyLimit) && bodyLimit > 0) {
  core.adapter.use('*', bodySizeLimit(bodyLimit, { requireContentLength: requireLength }))
}

// 1. 註冊核心軌道
await core.orbit(new OrbitPhoton({ port: 3000 }))
await core.orbit(new OrbitMonolith())

// 2. 定義路由
const router = core.adapter

router.get('/', (c) => c.text('Welcome to Gravito E-Commerce! 🌌'))

// 手動註冊帶驗證的 Store 路由
router.post('/products', StoreProductRequest.middleware(), ProductController.call('store'))

// 註冊其餘資源路由
Route.resource(router, 'products', ProductController)

// 3. 升空
await core.liftoff()
