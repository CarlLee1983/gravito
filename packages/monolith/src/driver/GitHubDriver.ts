import { Octokit } from '@octokit/rest'
import type { ContentDriver } from './ContentDriver'

export interface GitHubDriverOptions {
  owner: string
  repo: string
  ref?: string
  auth?: string
}

export class GitHubDriver implements ContentDriver {
  private octokit: Octokit
  private owner: string
  private repo: string
  private ref?: string

  constructor(options: GitHubDriverOptions) {
    this.octokit = new Octokit({ auth: options.auth })
    this.owner = options.owner
    this.repo = options.repo
    this.ref = options.ref
  }

  async read(path: string): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.ref,
      })

      if (Array.isArray(data) || !('content' in data)) {
        throw new Error(`Path is not a file: ${path}`)
      }

      return Buffer.from(data.content, 'base64').toString('utf-8')
    } catch (e: any) {
      if (e.status === 404) {
        throw new Error(`File not found: ${path}`)
      }
      throw e
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      // Use HEAD request if possible, or just lightweight get
      // getContents with defaults gets JSON metadata
      await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.ref,
      })
      return true
    } catch {
      return false
    }
  }

  async list(dir: string): Promise<string[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: dir,
        ref: this.ref,
      })

      if (!Array.isArray(data)) {
        return []
      }

      return data.map((item) => item.name)
    } catch {
      return []
    }
  }
}
