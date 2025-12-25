# Requests

Gravito's `GravitoRequest` object provides an engine-agnostic way to interact with the current HTTP request being handled by your application.

## Accessing the Request

### Retrieving Input Values

You may access user input using a few simple methods. These methods may be used regardless of the HTTP verb:

#### Retrieving JSON Data
```typescript
const body = await c.req.json();
```

#### Retrieving Query Strings
```typescript
const name = c.req.query('name'); // Single value
const allQueries = c.req.queries(); // All query parameters
```

#### Retrieving Route Parameters
```typescript
const id = c.req.param('id');
```

#### Retrieving Form Data (Multipart/Urlencoded)
```typescript
const formData = await c.req.formData();
const body = await c.req.parseBody();
```

### Inspecting the Request Path & Method

```typescript
// Get the path (without query string)
const path = c.req.path; // e.g. /users/1

// Get the full URL
const url = c.req.url;

// Get the HTTP method
const method = c.req.method; // GET, POST, etc.
```

## Request Headers

You may retrieve headers from the request using the `header` method:

```typescript
const type = c.req.header('Content-Type');

// Get all headers
const allHeaders = c.req.header();
```

## File Uploads

When handling file uploads, you may use `parseBody` or `formData`:

```typescript
const body = await c.req.parseBody();
const image = body['photo']; // This is a File object
```

## Retrieving Validated Data

If you are using Form Requests for validation, you can retrieve the clean data using the `valid()` method:

```typescript
const data = c.req.valid('json');
```
