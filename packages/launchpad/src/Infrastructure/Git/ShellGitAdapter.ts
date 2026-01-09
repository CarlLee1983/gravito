import { mkdir } from 'node:fs/promises'
import { getRuntimeAdapter } from '@gravito/core'
import type { IGitAdapter } from '../../Domain/Interfaces'

export class ShellGitAdapter implements IGitAdapter {
  private baseDir = '/tmp/gravito-launchpad-git'

  async clone(repoUrl: string, branch: string): Promise<string> {
    const dirName = `${Date.now()}-${Math.random().toString(36).slice(2)}`
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
      throw new Error('Git Clone Failed')
    }

    return targetDir
  }
}
