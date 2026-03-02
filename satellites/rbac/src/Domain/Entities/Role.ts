import { AggregateRoot } from '@gravito/enterprise'

export interface RoleCreateInput {
  name: string
  displayName: string
  description?: string
  isSystem?: boolean
  permissionIds?: string[]
}

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

  static create(id: string, input: RoleCreateInput): Role {
    return new Role(id, {
      name: input.name,
      displayName: input.displayName,
      description: input.description,
      isSystem: input.isSystem ?? false,
      permissionIds: input.permissionIds ?? [],
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

  get propsObject(): RoleProps {
    return {
      name: this.props.name,
      displayName: this.props.displayName,
      description: this.props.description,
      isSystem: this.props.isSystem,
      permissionIds: [...this.props.permissionIds],
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    }
  }

  // Setters
  setDisplayName(displayName: string): this {
    this.props.displayName = displayName
    this.props.updatedAt = new Date()
    return this
  }

  setDescription(description: string | undefined): this {
    this.props.description = description
    this.props.updatedAt = new Date()
    return this
  }

  setPermissionIds(permissionIds: string[]): this {
    this.props.permissionIds = [...permissionIds]
    this.props.updatedAt = new Date()
    return this
  }
}
