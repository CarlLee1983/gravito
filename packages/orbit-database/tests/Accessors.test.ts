import { describe, expect, test } from 'bun:test'
import { Model } from '../src/orm/model/Model'

describe('Accessors & Mutators', () => {
  class User extends Model {
    static override table = 'users'
    declare id: number
    declare first_name: string
    declare last_name: string
    declare full_name: string // Virtual
    declare password: string

    // Accessor for existing attribute
    getFirstNameAttribute(value: string) {
      return value.toUpperCase()
    }

    // Accessor for virtual attribute
    getFullNameAttribute() {
      return `${this.first_name} ${this.last_name}`
    }

    // Mutator
    setPasswordAttribute(value: string) {
      this._attributes.password = `hashed:${value}`
    }
  }

  test('it uses accessor for existing attribute', () => {
    const user = User.hydrate<User>({ id: 1, first_name: 'carl', last_name: 'lee' })

    // Should use accessor
    expect(user.first_name).toBe('CARL')

    // Raw attribute access
    expect(user.getAttributes().first_name).toBe('carl')
  })

  test('it uses accessor for virtual attribute (snake_case)', () => {
    const user = User.hydrate<User>({ id: 1, first_name: 'carl', last_name: 'lee' })

    expect(user.full_name).toBe('CARL lee')
  })

  test('it uses accessor for virtual attribute (camelCase)', () => {
    const user = User.hydrate<User>({ id: 1, first_name: 'carl', last_name: 'lee' })

    // @ts-expect-error
    expect(user.fullName).toBe('CARL lee')
  })

  test('it uses mutator on set', () => {
    const user = User.create<User>({})
    user.password = 'secret'

    // Should be hashed in attributes
    expect(user.getAttributes().password).toBe('hashed:secret')

    // Getting it back (if no accessor) returns the attribute
    expect(user.password).toBe('hashed:secret')
  })
})
