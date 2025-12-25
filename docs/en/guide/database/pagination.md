# Database Pagination

In other frameworks, paginating can be very painful. Atlas makes it easy. The query builder's `paginate` method automatically handles setting the proper limit and offset based on the current page.

## Basic Usage

### Paginating Query Builder Results

To paginate results, you may use the `paginate` method. It will automatically detect the current page or you can pass it specifically.

```typescript
const users = await User.where('votes', '>', 100).paginate(15);
```

The integer passed to `paginate` is the number of items you would like displayed "per page".

### Paginating Model Results

You can also paginate ORM models:

```typescript
const posts = await Post.query().paginate(10);
```

## The Paginate Result Object

The `paginate` method returns a `PaginateResult<T>` object, which contains your data and metadata about the pagination state:

```json
{
  "data": [...],
  "pagination": {
    "total": 50,
    "perPage": 15,
    "page": 1,
    "totalPages": 4,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Accessing the Data

```typescript
const result = await User.paginate(15);

console.log(result.data); // The array of Users
console.log(result.pagination.total); // 50
```

## Simple Pagination

If you only need to display "Next" and "Previous" links in your UI and don't need to know the total number of pages, you can use manual `skip` and `take`:

```typescript
const users = await User.skip(30).take(15).get();
```

## Integration with Frontend

When using `@gravito/client` or Inertia, the pagination object is passed directly to your React/Vue components, making it trivial to render a pagination navigation component.
