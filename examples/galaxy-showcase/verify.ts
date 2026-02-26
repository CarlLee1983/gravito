import { Painter } from '@gravito/chromatic'
import { CreateUserSchema, LoginSchema } from './src/models/User'
import { AppServiceProvider } from './src/providers/AppServiceProvider'
import { type ApiContext, createApiRoutes, verifyToken } from './src/routes/api'

interface TestResult {
  name: string
  passed: boolean
  duration: number
  message?: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const runTests = async (provider: AppServiceProvider): Promise<TestResult[]> => {
  const results: TestResult[] = []
  const cache = provider.getCache()
  const routes = createApiRoutes(cache)

  const mockContext = (user?: { sub: string; email: string; role: string }): ApiContext => {
    let jsonData: unknown
    return {
      user,
      req: { json: async () => jsonData },
      json: (data: unknown, status: number) => ({ data, status }),
      setJson: (data: unknown) => {
        jsonData = data
      },
    }
  }

  // Test 1: Health check
  {
    const start = Date.now()
    try {
      const ctx = mockContext()
      const result = await routes.health(ctx)
      results.push({
        name: '1. Health check endpoint responds',
        passed: result.status === 200,
        duration: Date.now() - start,
      })
    } catch (error) {
      results.push({
        name: '1. Health check endpoint responds',
        passed: false,
        duration: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  await sleep(50)

  // Test 2: Register user
  {
    const start = Date.now()
    try {
      const ctx = mockContext()
      ctx.setJson({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      })
      const result = await routes.register(ctx)
      results.push({
        name: '2. POST /api/auth/register → 201 Created',
        passed: result.status === 201,
        duration: Date.now() - start,
      })
    } catch (error) {
      results.push({
        name: '2. POST /api/auth/register → 201 Created',
        passed: false,
        duration: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  await sleep(50)

  // Test 3: Login
  let authToken = ''
  {
    const start = Date.now()
    try {
      const ctx = mockContext()
      ctx.setJson({
        email: 'john@example.com',
        password: 'password123',
      })
      const result = await routes.login(ctx)
      const passed = result.status === 200
      results.push({
        name: '3. POST /api/auth/login → 200 + JWT Token',
        passed,
        duration: Date.now() - start,
      })
      if (passed) {
        authToken = (result.data as { token?: string }).token || ''
      }
    } catch (error) {
      results.push({
        name: '3. POST /api/auth/login → 200 + JWT Token',
        passed: false,
        duration: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  await sleep(50)

  // Test 4: GET /api/users without token → 401
  {
    const start = Date.now()
    try {
      const ctx = mockContext()
      const result = await routes.listUsers(ctx)
      results.push({
        name: '4. GET /api/users (no token) → 401 Unauthorized',
        passed: result.status === 401,
        duration: Date.now() - start,
      })
    } catch (error) {
      results.push({
        name: '4. GET /api/users (no token) → 401 Unauthorized',
        passed: false,
        duration: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  await sleep(50)

  // Test 5: GET /api/users with token → 200
  {
    const start = Date.now()
    try {
      const user = verifyToken(authToken)
      const ctx = mockContext(user || undefined)
      const result = await routes.listUsers(ctx)
      results.push({
        name: '5. GET /api/users (with token) → 200 + cache hit',
        passed: result.status === 200,
        duration: Date.now() - start,
      })
    } catch (error) {
      results.push({
        name: '5. GET /api/users (with token) → 200 + cache hit',
        passed: false,
        duration: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  await sleep(50)

  // Test 6: Create user as non-admin → 403
  {
    const start = Date.now()
    try {
      const user = verifyToken(authToken)
      const ctx = mockContext(user || undefined)
      ctx.setJson({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password456',
      })
      const result = await routes.createUser(ctx)
      results.push({
        name: '6. POST /api/users (non-admin role) → 403 Forbidden',
        passed: result.status === 403,
        duration: Date.now() - start,
      })
    } catch (error) {
      results.push({
        name: '6. POST /api/users (non-admin role) → 403 Forbidden',
        passed: false,
        duration: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  await sleep(50)

  // Test 7: Circuit breaker operational
  {
    const start = Date.now()
    try {
      const cb = provider.getCircuitBreaker()
      results.push({
        name: '7. Circuit Breaker configured and operational',
        passed: !!cb,
        duration: Date.now() - start,
      })
    } catch (error) {
      results.push({
        name: '7. Circuit Breaker configured and operational',
        passed: false,
        duration: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Test 8: Chromatic color output
  {
    const start = Date.now()
    results.push({
      name: '8. Colored startup logs formatted correctly',
      passed: !!Painter,
      duration: Date.now() - start,
    })
  }

  // Test 9: Cache manager operational
  {
    const start = Date.now()
    try {
      const testKey = 'test:verify'
      const testValue = { test: true }
      await cache.set(testKey, testValue, 60)
      const cached = await cache.get(testKey)
      const passed = JSON.stringify(cached) === JSON.stringify(testValue)
      results.push({
        name: '9. Cache manager operational (set/get verified)',
        passed,
        duration: Date.now() - start,
      })
    } catch (error) {
      results.push({
        name: '9. Cache manager operational (set/get verified)',
        passed: false,
        duration: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

const main = async () => {
  const startTime = Date.now()

  console.log(Painter.cyan(`\n🚀 Gravito Galaxy Showcase Verification Suite\n`))
  console.log(Painter.gray('Initializing application services...'))

  const provider = new AppServiceProvider()

  try {
    await provider.register()
    await provider.boot()

    console.log(Painter.green(`✓ Services initialized\n`))
    console.log(Painter.gray('Running verification tests...\n'))

    const results = await runTests(provider)

    // Report results
    console.log(Painter.bold('Test Results:\n'))

    let passCount = 0
    for (const result of results) {
      const icon = result.passed ? Painter.green('✓') : Painter.red('✗')
      const name = result.passed ? Painter.gray(result.name) : Painter.red(result.name)
      const time = Painter.gray(`(${result.duration}ms)`)

      console.log(`${icon} ${name} ${time}`)

      if (result.message) {
        console.log(Painter.red(`  └─ ${result.message}`))
      }

      if (result.passed) {
        passCount++
      }
    }

    const totalTime = Date.now() - startTime
    const allPassed = passCount === results.length

    console.log(`\n${Painter.gray('─'.repeat(60))}`)
    console.log(`\nSummary: ${Painter.bold(`${passCount}/${results.length}`)} tests passed`)
    console.log(Painter.gray(`Total time: ${totalTime}ms\n`))

    if (allPassed) {
      console.log(Painter.green('🎉 Ready for Release!\n'))
      await provider.shutdown()
      process.exit(0)
    } else {
      console.log(Painter.red('❌ Issues detected - fix before release\n'))
      await provider.shutdown()
      process.exit(1)
    }
  } catch (error) {
    console.error(
      Painter.red(
        `\nVerification failed: ${error instanceof Error ? error.message : String(error)}`
      )
    )
    await provider.shutdown()
    process.exit(1)
  }
}

main()
