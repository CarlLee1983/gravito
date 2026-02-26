# Knowledge Management Guide

`@gravito/monolith` allows you to treat your markdown files as a structured data source, enabling Git-based content management.

## 1. Defining Collections

Organize your content into logical folders. Each folder becomes a "Collection".

```
content/
├── docs/          # Collection: 'docs'
│   ├── install.md
│   └── api.md
└── blog/          # Collection: 'blog'
    └── hello.md
```

## 2. Frontmatter as Metadata

Use YAML frontmatter to add type-safe metadata to your content.

```markdown
---
title: My Title
tags: [news, update]
featured: true
---
```

## 3. Querying the Knowledge Core

Use the fluent API to retrieve and filter content.

```typescript
const content = c.get('content');

// Fetch a single post
const post = await content.collection('blog')
  .slug('hello-world')
  .fetch();

// List all items in a collection
const posts = await content.collection('blog').all();
```

## 4. SSG Integration

Combine Monolith with `@gravito/prism` to build extremely fast static sites.

```typescript
// During SSG phase
const posts = await content.collection('blog').all();
for (const post of posts) {
  ssg.addPage(`/blog/${post.slug}`, 'blog-template', { post });
}
```

## 5. Performance: Memory Caching

Monolith caches the parsed markdown and metadata in memory. In a **Galaxy Architecture**, you can enable `Plasma` backing to share this cache across instances.
