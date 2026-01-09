import { getRuntimeAdapter } from '@gravito/core'
import { DockerAdapter } from './src/Infrastructure/Docker/DockerAdapter'
import { bootstrapLaunchpad } from './src/index'

async function run() {
  console.log('🤖 Starting Auto-Debug Sequence...')

  // 1. Cleanup
  const _docker = new DockerAdapter()
  const runtime = getRuntimeAdapter()
  try {
    const listProc = runtime.spawn([
      'docker',
      'ps',
      '-aq',
      '--filter',
      'label=gravito-origin=launchpad',
    ])
    const containers = await new Response(listProc.stdout ?? null).text()
    if (containers.trim()) {
      console.log('🧹 Cleaning up old containers...')
      await runtime.spawn(['docker', 'rm', '-f', ...containers.trim().split('\n')]).exited
    }
  } catch (_e) {}

  // 2. Start Server
  const config = await bootstrapLaunchpad()
  const server = runtime.serve(config)
  console.log(`🚀 Server started at http://localhost:${config.port}`)

  // 3. Launch Mission
  console.log('🔫 Firing Mission...')
  try {
    const res = await fetch(`http://localhost:${config.port}/launch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'pull_request', // 模擬 GitHub 事件
      },
      body: JSON.stringify({
        action: 'opened',
        pull_request: {
          number: 77,
          head: { ref: 'feat/launchpad-dashboard', sha: 'latest' },
          base: {
            repo: {
              owner: { login: 'gravito' },
              name: 'core',
              clone_url: 'https://github.com/gravito-framework/gravito.git',
            },
          },
        },
      }),
    })

    const data = await res.json()
    console.log('Response:', data)

    console.log('✅ Mission active. Monitoring for 30s...')
    await new Promise((r) => setTimeout(r, 30000))
  } catch (e) {
    console.error('❌ Error:', e)
  } finally {
    server.stop()
    process.exit(0)
  }
}

run()
