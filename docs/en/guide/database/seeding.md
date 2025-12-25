# Seeding & Factories

Atlas includes the ability to seed your database with test data using seed classes and model factories.

## Writing Seeders

Seeders are stored in the `database/seeders` directory. A seeder class contains a `run` method where you can insert data into the database.

```typescript
import { Seeder } from '@gravito/atlas';
import User from '../src/models/User';

export default class DatabaseSeeder extends Seeder {
  async run() {
    await User.query().insert({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password'
    });
  }
}
```

## Model Factories

When testing your application or seeding your database, you may need to insert a few records into your database. Instead of manually specifying the value of each column, you can use factories to define a set of default attributes for each of your models.

### Defining Factories

Factories are typically stored in `database/factories`. Use the `define` method to define your factory.

```typescript
import { Factory } from '@gravito/atlas';
import User from '../src/models/User';

export default Factory.define(User, (faker) => {
  return {
    name: faker.name.fullName(),
    email: faker.internet.email(),
    password: 'password', // hashed in production
  };
});
```

### Using Factories to Seed

Once you have defined your factories, you may use them in your seeders or tests:

```typescript
// Create 10 users using the factory
await User.factory().count(10).create();
```

## Advanced Seeding

### Calling Additional Seeders

Within the `run` method of a seeder, you may use the `call` method to execute additional seed classes. This allows you to break up your database seeding into multiple files:

```typescript
export default class DatabaseSeeder extends Seeder {
  async run() {
    await this.call([
      UserSeeder,
      PostSeeder,
      CommentSeeder,
    ]);
  }
}
```

## Advanced Factories

### Factory States

States allow you to define discrete variations of your model factories. For example, your `User` model might have a `suspended` state that modifies one of its default attribute values:

```typescript
// Applying a state override
await User.factory().count(5).state({ active: false }).create();
```

### Factory Sequences

Sometimes you may wish to alternate a model attribute's value for each generated model. You may use the `sequence` method to define a transformation for a specific attribute:

```typescript
const users = await User.factory()
  .count(10)
  .sequence('role', (index) => index % 2 === 0 ? 'admin' : 'user')
  .create();
```

### Factory Relationships

Atlas allows you to define relationships within your factories, ensuring that related models are created automatically:

```typescript
// Create a post with 3 associated comments
await Post.factory()
  .has(Comment.factory().count(3))
  .create();
```

## Running Seeders

To seed your database, execute the `db:seed` Orbit command:

```bash
bun orbit db:seed
```

You may also specify a specific seeder class to run:

```bash
bun orbit db:seed --class=UserSeeder
```

## Production Warning

By default, the seeder will warn you if you attempt to run it in the `production` environment, as it may overwrite real data:

```bash
bun orbit db:seed --force
```
