import { type Container, type GravitoOrbit, PlanetCore, ServiceProvider } from '@gravito/core'
import { OrbitRipple } from '@gravito/ripple'
import { OrbitCache } from '@gravito/stasis'
import { MissionControl } from './Application/MissionControl'
import { PayloadInjector } from './Application/PayloadInjector'
import { PoolManager } from './Application/PoolManager'
import { RefurbishUnit } from './Application/RefurbishUnit'
import { Mission } from './Domain/Mission'
import { DockerAdapter } from './Infrastructure/Docker/DockerAdapter'
import { ShellGitAdapter } from './Infrastructure/Git/ShellGitAdapter'
import { OctokitGitHubAdapter } from './Infrastructure/GitHub/OctokitGitHubAdapter'
import { CachedRocketRepository } from './Infrastructure/Persistence/CachedRocketRepository'
import { BunProxyAdapter } from './Infrastructure/Router/BunProxyAdapter'

export * from './Application/MissionControl'
export * from './Application/PayloadInjector'
export * from './Application/PoolManager'
export * from './Application/RefurbishUnit'
export * from './Domain/Mission'
export * from './Domain/Rocket'
export * from './Domain/RocketStatus'

/**
 * Launchpad 內部的 Service Provider
 */
class LaunchpadServiceProvider extends ServiceProvider {
  register(container: Container): void {
    if (!container.has('cache')) {
      const cacheFromServices = this.core?.services?.get('cache')
      if (cacheFromServices) {
        container.instance('cache', cacheFromServices)
      }
    }

    container.singleton('launchpad.docker', () => new DockerAdapter())
    container.singleton('launchpad.git', () => new ShellGitAdapter())
    container.singleton('launchpad.router', () => new BunProxyAdapter())
    container.singleton(
      'launchpad.github',
      () => new OctokitGitHubAdapter(process.env.GITHUB_TOKEN)
    )

    container.singleton('launchpad.repo', () => {
      const cache = container.make<any>('cache')
      return new CachedRocketRepository(cache)
    })

    container.singleton('launchpad.refurbish', () => {
      return new RefurbishUnit(container.make('launchpad.docker'))
    })

    container.singleton('launchpad.pool', () => {
      return new PoolManager(
        container.make('launchpad.docker'),
        container.make('launchpad.repo'),
        container.make('launchpad.refurbish'),
        container.make('launchpad.router')
      )
    })

    container.singleton('launchpad.injector', () => {
      return new PayloadInjector(
        container.make('launchpad.docker'),
        container.make('launchpad.git')
      )
    })

    container.singleton('launchpad.ctrl', () => {
      return new MissionControl(
        container.make('launchpad.pool'),
        container.make('launchpad.injector'),
        container.make('launchpad.docker'),
        container.make('launchpad.router')
      )
    })
  }

  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }
    const logger = core.logger
    const router = core.container.make<BunProxyAdapter>('launchpad.router')
    const docker = core.container.make<DockerAdapter>('launchpad.docker')

    // 啟動路由代理
    router.start(8080)

    // [New] 啟動時自動清理殘留容器，維持系統純淨
    logger.info('[Launchpad] 正在掃描並清理殘留資源...')
    docker
      .removeContainerByLabel('gravito-origin=launchpad')
      .then(() => {
        logger.info('[Launchpad] 資源清理完畢，系統就緒。')
      })
      .catch((err) => {
        logger.warn('[Launchpad] 自動清理失敗 (可能是環境無容器):', err.message)
      })
  }
}

/**
 * Gravito Launchpad Orbit
 */
export class LaunchpadOrbit implements GravitoOrbit {
  constructor(private ripple: OrbitRipple) {}

  async install(core: PlanetCore): Promise<void> {
    core.register(new LaunchpadServiceProvider())

    core.router.post('/launch', async (c) => {
      const rawBody = await c.req.text()
      const signature = c.req.header('x-hub-signature-256') || ''
      const secret = process.env.GITHUB_WEBHOOK_SECRET

      const github = core.container.make<OctokitGitHubAdapter>('launchpad.github')

      if (secret && !github.verifySignature(rawBody, signature, secret)) {
        core.logger.error('[GitHub] Webhook signature verification failed')
        return c.json({ error: 'Invalid signature' }, 401)
      }

      const body = JSON.parse(rawBody)
      const event = c.req.header('x-github-event')

      if (event === 'pull_request') {
        const action = body.action
        const pr = body.pull_request
        const missionId = `pr-${pr.number}`

        if (['opened', 'synchronize', 'reopened'].includes(action)) {
          const mission = Mission.create({
            id: missionId,
            repoUrl: pr.base.repo.clone_url,
            branch: pr.head.ref,
            commitSha: pr.head.sha,
          })

          const ctrl = core.container.make<MissionControl>('launchpad.ctrl')
          const rocketId = await ctrl.launch(mission, (type, data) => {
            // 修正：使用正確的 broadcast 方法
            this.ripple.getServer().broadcast('telemetry', 'telemetry.data', { type, data })
          })

          if (action === 'opened' || action === 'reopened') {
            const previewUrl = `http://${missionId}.dev.local:8080`
            const dashboardUrl = `http://${c.req.header('host')?.split(':')[0]}:5173`

            const comment =
              `🚀 **Gravito Launchpad: Deployment Ready!**\n\n` +
              `- **Preview URL**: [${previewUrl}](${previewUrl})\n` +
              `- **Mission Dashboard**: [${dashboardUrl}](${dashboardUrl})\n\n` +
              `*Rocket ID: ${rocketId} | Commit: ${pr.head.sha.slice(0, 7)}*`

            await github.postComment(
              pr.base.repo.owner.login,
              pr.base.repo.name,
              pr.number,
              comment
            )
          }

          return c.json({ success: true, missionId, rocketId })
        }

        if (action === 'closed') {
          const pool = core.container.make<PoolManager>('launchpad.pool')
          await pool.recycle(missionId)
          return c.json({ success: true, action: 'recycled' })
        }
      }

      return c.json({ success: true, message: 'Event ignored' })
    })

    core.router.post('/recycle', async (c) => {
      const body = (await c.req.json()) as any
      if (!body.missionId) {
        return c.json({ error: 'missionId required' }, 400)
      }

      const pool = core.container.make<PoolManager>('launchpad.pool')
      await pool.recycle(body.missionId)
      return c.json({ success: true })
    })
  }
}

/**
 * 一鍵啟動 Launchpad 應用程式
 */
export async function bootstrapLaunchpad() {
  const ripple = new OrbitRipple({ path: '/ws' })

  const core = await PlanetCore.boot({
    config: {
      APP_NAME: 'Gravito Launchpad',
      PORT: 4000,
      CACHE_DRIVER: 'file',
    },
    orbits: [
      new OrbitCache(),
      ripple,
      new LaunchpadOrbit(ripple), // 傳入實例
    ],
  })

  await core.bootstrap()

  const liftoffConfig = core.liftoff()

  return {
    port: liftoffConfig.port,
    websocket: ripple.getHandler(),
    fetch: (req: Request, server: any) => {
      if (ripple.getServer().upgrade(req, server)) {
        return
      }
      return liftoffConfig.fetch(req, server)
    },
  }
}
