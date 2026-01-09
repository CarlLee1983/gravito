import { createHmac, timingSafeEqual } from 'node:crypto'
import { Octokit } from '@octokit/rest'
import type { IGitHubAdapter } from '../../Domain/Interfaces'

export class OctokitGitHubAdapter implements IGitHubAdapter {
  private octokit: Octokit

  constructor(token?: string) {
    this.octokit = new Octokit({ auth: token })
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    if (!signature) {
      return false
    }

    const hmac = createHmac('sha256', secret)
    const digest = Buffer.from(`sha256=${hmac.update(payload).digest('hex')}`, 'utf8')
    const checksum = Buffer.from(signature, 'utf8')

    return digest.length === checksum.length && timingSafeEqual(digest, checksum)
  }

  async postComment(
    repoOwner: string,
    repoName: string,
    prNumber: number,
    comment: string
  ): Promise<void> {
    try {
      await this.octokit.issues.createComment({
        owner: repoOwner,
        repo: repoName,
        issue_number: prNumber,
        body: comment,
      })
      console.log(`[GitHub] 已在 PR #${prNumber} 留下部署資訊`)
    } catch (error: any) {
      console.error(`[GitHub] 留言失敗: ${error.message}`)
    }
  }
}
