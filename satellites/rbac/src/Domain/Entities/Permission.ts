import { AggregateRoot } from '@gravito/enterprise'
import type { PermissionKey } from '../ValueObjects/PermissionKey'

export interface PermissionProps {
  key: PermissionKey
  groupName: string
  action: string
  field?: string
  label: string
  description?: string
  isSystem: boolean
  createdAt: Date
}

export class Permission extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: PermissionProps
  ) {
    super(id)
  }

  static create(
    id: string,
    key: PermissionKey,
    label: string,
    options: {
      description?: string
      isSystem?: boolean
    } = {}
  ): Permission {
    return new Permission(id, {
      key,
      groupName: key.group,
      action: key.action,
      field: key.field,
      label,
      description: options.description,
      isSystem: options.isSystem ?? false,
      createdAt: new Date(),
    })
  }

  static reconstitute(id: string, props: PermissionProps): Permission {
    return new Permission(id, props)
  }

  // Getters
  get key(): PermissionKey {
    return this.props.key
  }

  get groupName(): string {
    return this.props.groupName
  }

  get action(): string {
    return this.props.action
  }

  get field(): string | undefined {
    return this.props.field
  }

  get label(): string {
    return this.props.label
  }

  get description(): string | undefined {
    return this.props.description
  }

  get isSystem(): boolean {
    return this.props.isSystem
  }

  get createdAt(): Date {
    return this.props.createdAt
  }
}
