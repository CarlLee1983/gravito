import { ValueObject } from '@gravito/enterprise'

interface MissionProps {
  id: string // PR ID
  repoUrl: string // Git Repo URL
  branch: string // Branch Name
  commitSha: string // Commit Hash
}

/**
 * Mission represents a deployment task for a specific code version.
 *
 * It is a Value Object containing information about the source repository,
 * branch, and commit to be deployed.
 *
 * @public
 * @since 3.0.0
 */
export class Mission extends ValueObject<MissionProps> {
  get id() {
    return this.props.id
  }
  get repoUrl() {
    return this.props.repoUrl
  }
  get branch() {
    return this.props.branch
  }
  get commitSha() {
    return this.props.commitSha
  }

  static create(props: MissionProps): Mission {
    return new Mission(props)
  }
}
