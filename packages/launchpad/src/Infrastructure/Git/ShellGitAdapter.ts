import { mkdir } from 'node:fs/promises'
import { getRuntimeAdapter } from '@gravito/core'
import { LaunchpadError } from '../../errors/LaunchpadError'
import { LaunchpadErrorCodes } from '../../errors/codes'
import type { IGitAdapter } from '../../Domain/Interfaces'

/**
 * ShellGitAdapter implements the `IGitAdapter` interface using the Git CLI.
 *
 * It provides methods for cloning repositories to a temporary directory
 * for deployment into Rocket containers.
 *
 * @public
 * @since 3.0.0
 */
export class ShellGitAdapter implements IGitAdapter {
  private baseDir = '/tmp/gravito-launchpad-git'

  async clone(repoUrl: string, branch: string): Promise<string> {
    const dirName = `${Date.now()}-${crypto.randomUUID()}`
    const targetDir = `${this.baseDir}/${dirName}`

    await mkdir(this.baseDir, { recursive: true })

    const runtime = getRuntimeAdapter()
    const proc = runtime.spawn([
      'git',
      'clone',
      '--depth',
      '1',
      '--branch',
      branch,
      repoUrl,
      targetDir,
    ])

    const exitCode = await proc.exited
    if (exitCode !== 0) {
      throw new LaunchpadError(500, LaunchpadErrorCodes.GIT_CLONE_FAILED, {
        message: 'Git Clone Failed',
      })
    }

    return targetDir
  }
}
