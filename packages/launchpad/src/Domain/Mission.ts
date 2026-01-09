import { ValueObject } from '@gravito/enterprise'

interface MissionProps {
  id: string // PR ID
  repoUrl: string // Git Repo URL
  branch: string // Branch Name
  commitSha: string // Commit Hash
}

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
