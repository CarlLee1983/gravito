import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { DB, Schema, Model, column, HasMany, BelongsTo, UniqueConstraintError } from "../src/index";

// 1. Define Test Models
class User extends Model {
  static table = 'users'
  static tableName = 'users'
  @column({ isPrimary: true }) declare id: number
  @column() declare name: string
  @column() declare email: string
  @column() declare age: number
  @column() declare settings: any
  @HasMany(() => Post) declare posts: Post[]
}

class Post extends Model {
  static table = 'posts'
  static tableName = 'posts'
  @column({ isPrimary: true }) declare id: number
  @column() declare title: string
  @column() declare user_id: number
  @BelongsTo(() => User) declare user: User
}

describe("Atlas Exhaustive Integration Test", () => {
  beforeAll(async () => {
    DB.configure({
      default: 'sqlite',
      connections: {
        sqlite: { driver: 'sqlite', database: ':memory:' }
      }
    });

    await Schema.create('users', (t) => {
      t.id();
      t.string('name');
      t.string('email').unique();
      t.integer('age').nullable();
      t.json('settings').nullable();
      t.timestamps();
    });

    await Schema.create('posts', (t) => {
      t.id();
      t.string('title');
      t.integer('user_id').unsigned();
      t.timestamps();
    });
  });

  afterAll(async () => {
    await DB.disconnectAll();
  });

  test("1. Basic CRUD & Model Logic", async () => {
    // Create via manual save to verify instance logic
    const user = User.create();
    user.name = "Carl";
    user.email = "carl@gravito.dev";
    user.age = 30;
    user.settings = { theme: 'dark' };
    await user.save();
    
    expect(user.id).toBeDefined();
    const id = user.id;

    // Read
    const found = await User.find(id);
    expect(found?.name).toBe("Carl");
    
    // Update
    found!.name = "Carl Updated";
    await found!.save();
    
    const fresh = await User.find(id);
    expect(fresh?.name).toBe("Carl Updated");
  });

  test("2. Query Builder Advanced Methods", async () => {
    // Use createAndSave which is safer
    await User.createAndSave({ name: "Alice", email: "alice@test.com", age: 25 });
    await User.createAndSave({ name: "Bob", email: "bob@test.com", age: 40 });

    // Pluck
    const emails = await User.query().orderBy('id').pluck('email');
    expect(emails).toContain("alice@test.com");
    expect(emails).toContain("bob@test.com");

    // Value
    const age = await User.query().where('name', 'Alice').value('age');
    expect(age).toBe(25);

    // Aggregates
    const count = await User.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("5. Relationships & Eager Loading", async () => {
    const user = await User.query().first();
    const userId = user!.id;

    await Post.createAndSave({ title: "Hello World", user_id: userId });
    await Post.createAndSave({ title: "Second Post", user_id: userId });

    // Eager Load
    const userWithPosts = await User.with('posts').find(userId);
    expect(userWithPosts?.posts).toBeDefined();
    expect(userWithPosts?.posts.length).toBe(2);

    // whereHas
    const usersWithPosts = await User.query().whereHas('posts').get();
    expect(usersWithPosts.some(u => u.id === userId)).toBe(true);
  });

  test("6. Error Handling", async () => {
    try {
      // Must use a persistence method to trigger the database constraint
      await User.createAndSave({ name: "Clone", email: "carl@gravito.dev" }); // Duplicate Email
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(UniqueConstraintError);
    }
  });

  test("7. ReadOnly Mode", async () => {
      const users = await User.query().readonly().get();
      expect(users.length).toBeGreaterThan(0);
      expect(users[0]).not.toBeInstanceOf(User); // Should be plain object
      expect((users[0] as any).save).toBeUndefined();
  });
});
