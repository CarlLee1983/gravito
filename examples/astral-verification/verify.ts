import { sleep } from 'bun'

console.log('🔍 Starting Astral Verification Suite...')

// 1. Start the server in the background
const serverProc = Bun.spawn(['bun', 'src/index.ts'], {
  cwd: import.meta.dir,
  stdout: 'pipe',
  stderr: 'pipe',
})

// Wait for server to boot
console.log('⏳ Waiting for server to boot...')
await sleep(2000)

let hasError = false

try {
  // 1.5 Debug Check: Is server running?
  console.log('👉 Checking /users...')
  try {
    const usersRes = await fetch('http://localhost:3000/users')
    console.log(`   Server status: ${usersRes.status}`)
    if (!usersRes.ok) {
      console.warn('   /users returned non-200')
    }
  } catch (e) {
    console.error('   Failed to connect to server at all:', e)
  }

  // 2. Verify OpenAPI JSON Spec
  console.log('👉 Fetching /openapi.json...')
  const specRes = await fetch('http://localhost:3000/openapi.json')

  if (!specRes.ok) {
    throw new Error(`Failed to fetch spec: ${specRes.status}`)
  }

  const spec = await specRes.json()
  console.log('✅ Spec fetched successfully')

  // 3. Validation Checks
  const checks = [
    { name: 'OpenAPI Version', condition: spec.openapi === '3.1.0' },
    { name: 'Info Title', condition: spec.info.title === 'Astral v1.0 Verification API' },
    { name: 'Path: /users', condition: !!spec.paths['/users'] },
    { name: 'Path: /auth/login', condition: !!spec.paths['/auth/login'] },
    { name: 'Security Schemes', condition: !!spec.components.securitySchemes.BearerAuth },
    { name: 'Schemas Generated', condition: Object.keys(spec.components.schemas).length > 0 },
  ]

  for (const check of checks) {
    if (check.condition) {
      console.log(`  ✅ [PASS] ${check.name}`)
    } else {
      console.error(`  ❌ [FAIL] ${check.name}`)
      hasError = true
    }
  }

  // 4. Verify Swagger UI
  console.log('👉 Checking Swagger UI...')
  const uiRes = await fetch('http://localhost:3000/docs')
  if (uiRes.ok && (await uiRes.text()).includes('swagger-ui')) {
    console.log('  ✅ [PASS] Swagger UI loaded')
  } else {
    console.error('  ❌ [FAIL] Swagger UI not loading correctly')
    hasError = true
  }
} catch (error) {
  console.error('❌ specific verification failed:', error)
  hasError = true
} finally {
  // 5. Cleanup
  console.log('🧹 Shutting down server...')
  serverProc.kill()
}

if (hasError) {
  console.error('🚨 Verification FAILED')
  process.exit(1)
} else {
  console.log('🎉 Verification PASSED! Astral is v1.0 ready.')
  process.exit(0)
}
