import type { DomainEvent } from '@gravito/enterprise'
import { AggregateRoot } from '@gravito/enterprise'

export interface RoleProps {
  name: string
  displayName: string
  description?: string
  isSystem: boolean
  permissionIds: string[]
  createdAt: Date
  updatedAt?: Date
}

export class Role extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: RoleProps
  ) {
    super(id)
  }

  static create(
    id: string,
    name: string,
    displayName: string,
    options: {
      description?: string
      isSystem?: boolean
      permissionIds?: string[]
    } = {}
  ): Role {
    return new Role(id, {
      name,
      displayName,
      description: options.description,
      isSystem: options.isSystem ?? false,
      permissionIds: options.permissionIds ?? [],
      createdAt: new Date(),
    })
  }

  static reconstitute(id: string, props: RoleProps): Role {
    return new Role(id, props)
  }

  // Getters
  get name(): string {
    return this.props.name
  }

  get displayName(): string {
    return this.props.displayName
  }

  get description(): string | undefined {
    return this.props.description
  }

  get isSystem(): boolean {
    return this.props.isSystem
  }

  get permissionIds(): string[] {
    return [...this.props.permissionIds]
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get updatedAt(): Date | undefined {
    return this.props.updatedAt
  }

  // Business methods
  grantPermission(permissionId: string): void {
    if (!this.props.permissionIds.includes(permissionId)) {
      this.props.permissionIds.push(permissionId)
      this.props.updatedAt = new Date()
    }
  }

  revokePermission(permissionId: string): void {
    const index = this.props.permissionIds.indexOf(permissionId)
    if (index >= 0) {
      this.props.permissionIds.splice(index, 1)
      this.props.updatedAt = new Date()
    }
  }

  syncPermissions(permissionIds: string[]): void {
    this.props.permissionIds = [...permissionIds]
    this.props.updatedAt = new Date()
  }

  hasPermission(permissionId: string): boolean {
    return this.props.permissionIds.includes(permissionId)
  }

  hasAllPermissions(permissionIds: string[]): boolean {
    return permissionIds.every((id) => this.props.permissionIds.includes(id))
  }

  update(displayName: string, description?: string): void {
    this.props.displayName = displayName
    if (description !== undefined) {
      this.props.description = description
    }
    this.props.updatedAt = new Date()
  }
}
