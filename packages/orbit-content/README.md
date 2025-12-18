# @gravito/orbit-content

> File-based Content Management System (CMS) for Gravito.

Turn your markdown files into a powerful API. Perfect for blogs, documentation, and static sites.

## 📦 Installation

```bash
bun add @gravito/orbit-content
```

## 🚀 Quick Start

1.  **Register the Orbit**:
    ```typescript
    import { PlanetCore } from 'gravito-core';
    import { OrbitContent } from '@gravito/orbit-content';

    const core = new PlanetCore();

    core.boot({
      orbits: [OrbitContent],
      config: {
        content: {
          root: './content', // Root directory for your markdown files
        }
      }
    });
    ```

2.  **Create Content**:
    Create `./content/blog/hello-world.md`:
    ```markdown
    ---
    title: Hello World
    date: 2024-01-01
    ---
    
    # Welcome to Gravito
    This is my first post.
    ```

3.  **Fetch Content**:
    ```typescript
    app.get('/blog/:slug', async (c) => {
      const content = c.get('content');
      const post = await content.collection('blog').slug(c.req.param('slug')).fetch();
      
      return c.json(post);
    });
    ```

## ✨ Features

-   **Markdown Support**: Full Markdown parsing via `marked`.
-   **Frontmatter**: Parses YAML frontmatter using `gray-matter`.
-   **Collections**: Organize content into collections (folders).
-   **Query API**: Fluent API to fetch by slug, list all, etc. `collection('posts').slug('...').fetch()`.

## 📚 API

### `content.collection(name: string)`

Select a content collection (subdirectory).

### `.slug(slug: string)`

Target a specific file by name (without extension).

### `.fetch()`

Retrieves the parsed content object: `{ meta, content, html }`.

## License

MIT
