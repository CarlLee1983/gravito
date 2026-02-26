# Satellite View Integration Guide

In the **Galaxy Architecture**, Satellites should be responsible for their own presentation logic while adhering to global standards. `@gravito/prism` provides the tools to achieve this.

## 1. Defining Satellite Templates

Every Satellite that renders HTML should have a `views/` directory.

```
satellites/blog/
├── src/
└── views/
    ├── posts/
    │   ├── index.prism
    │   └── show.prism
    └── partials/
        └── post-card.prism
```

## 2. Registering Satellite Views

During the Satellite's `BOOT` phase, it should register its view directory with the global Prism instance.

```typescript
// satellites/blog/src/BlogSatellite.ts
export class BlogSatellite extends Satellite {
  async boot(core: PlanetCore) {
    const view = core.container.resolve('view');
    
    // Register the satellite's view namespace
    view.addNamespace('blog', path.join(__dirname, '../views'));
  }
}
```

## 3. Rendering with Namespaces

Once registered, you can render templates using the `@namespace::path` syntax.

```typescript
app.get('/blog', async (c) => {
  const view = c.get('view');
  const posts = await blogService.getLatest();
  
  return c.html(view.render('blog::posts/index', { posts }));
});
```

## 4. Shared Components (Orbits)

If you have UI components used across multiple satellites (e.g., a standard `Button` or `Alert`), define them in a shared **Orbit**.

```handlebars
{{-- Shared Orbit Template --}}
<x-blog::post-card :post="post" />
```

## 5. View Hooks (Customizing Presentation)

Satellites can hook into the rendering process to inject global data or modify output.

```typescript
core.hooks.addFilter('view:data', async (data, context) => {
  // Inject global SEO data to every template
  return {
    ...data,
    siteTitle: 'My Gravito Galaxy'
  };
});
```

## 6. CSS & Assets in Satellites

Satellites should ideally export their CSS as modules. Prism's build system can automatically collect these during the SSG phase.

- Use the `{{asset}}` helper to link to satellite-specific assets.
- Prism will handle versioning and CDN URL generation.
