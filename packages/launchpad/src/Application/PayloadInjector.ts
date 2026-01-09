import type { IDockerAdapter, IGitAdapter } from '../Domain/Interfaces'
import type { Rocket } from '../Domain/Rocket'

export class PayloadInjector {
  constructor(
    private docker: IDockerAdapter,
    private git: IGitAdapter
  ) {}

  async deploy(rocket: Rocket): Promise<void> {
    if (!rocket.currentMission) {
      throw new Error(`Rocket ${rocket.id} 沒有指派任務，無法部署`)
    }

    const { repoUrl, branch } = rocket.currentMission
    const containerId = rocket.containerId

    console.log(`[PayloadInjector] 正在拉取代碼: ${repoUrl} (${branch})`)
    const codePath = await this.git.clone(repoUrl, branch)

    console.log(`[PayloadInjector] 正在注入載荷至容器: ${containerId}`)
    await this.docker.copyFiles(containerId, codePath, '/app')

    console.log(`[PayloadInjector] 正在安裝依賴...`)

    const registry = process.env.LAUNCHPAD_NPM_REGISTRY || process.env.NPM_CONFIG_REGISTRY || ''
    const baseInstallConfig = ['[install]', 'frozenLockfile = false']
    const bunfigContent = registry
      ? `${baseInstallConfig.join('\n')}\nregistry = "${registry}"\n`
      : `${baseInstallConfig.join('\n')}\n`
    await this.docker.executeCommand(containerId, [
      'sh',
      '-c',
      `echo "${bunfigContent}" > /app/bunfig.toml`,
    ])

    // 刪除舊的 lockfile
    await this.docker.executeCommand(containerId, ['rm', '-f', '/app/bun.lockb'])

    // 安裝 (跳過腳本以避免編譯原生模組失敗)
    let installRes = await this.docker.executeCommand(containerId, [
      'bun',
      'install',
      '--cwd',
      '/app',
      '--no-save',
      '--ignore-scripts',
    ])

    if (installRes.exitCode !== 0 && !registry) {
      const fallbackRegistry = 'https://registry.npmmirror.com'
      const fallbackBunfig = `${baseInstallConfig.join('\n')}\nregistry = "${fallbackRegistry}"\n`
      await this.docker.executeCommand(containerId, [
        'sh',
        '-c',
        `echo "${fallbackBunfig}" > /app/bunfig.toml`,
      ])
      installRes = await this.docker.executeCommand(containerId, [
        'bun',
        'install',
        '--cwd',
        '/app',
        '--no-save',
        '--ignore-scripts',
      ])
    }

    if (installRes.exitCode !== 0) {
      throw new Error(`安裝依賴失敗: ${installRes.stderr}`)
    }

    console.log(`[PayloadInjector] 點火！`)

    // 真正啟動應用程式
    this.docker.executeCommand(containerId, ['bun', 'run', '/app/examples/demo.ts']).catch((e) => {
      console.error(`[PayloadInjector] 運行異常:`, e)
    })

    rocket.ignite()
  }
}
