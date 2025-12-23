# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0-alpha](https://github.com/gravito-framework/gravito/compare/v0.3.0-alpha...v0.4.0-alpha) (2025-12-23)


### Features

* [ core,orbit-notifications,orbit-broadcasting ] 實作 Events / Notifications / Broadcasting 生態系統 ([ef01819](https://github.com/gravito-framework/gravito/commit/ef0181946e215019df9b9870e991b6ef83f79366))
* [cli] 新增靜態網站快速啟動模板與標準化文檔 ([a7a4ae4](https://github.com/gravito-framework/gravito/commit/a7a4ae407ac11d0f1729e4480b2c92ad26e9d39f))
* [client] 增強 client 模組支援 AppRoutes 型別並統一模板使用方式 ([3f34258](https://github.com/gravito-framework/gravito/commit/3f3425833c3f7ea7f21ead8cc1cbacc10af27f06))
* [core] 實作 Gravito Client & Type Export 機制 ([5504cb9](https://github.com/gravito-framework/gravito/commit/5504cb91c23ed1943e4874b091e7a1e2ae9ce087))
* [core] 新增安全雜湊功能與路由改進 ([7626812](https://github.com/gravito-framework/gravito/commit/76268127a432429a49bb2bd32402a77838fea126))
* [orbit-auth, orbit-session] enhance authentication and session management ([1fef643](https://github.com/gravito-framework/gravito/commit/1fef643d3a832de5f758410e7d233dace6c17f9a))
* [orbit-database] enhance database functionality with decorators and model improvements ([3e03acc](https://github.com/gravito-framework/gravito/commit/3e03acc3632a5dc20e0408cd8e56d70ef9eeb42c))
* [orbit-db] implement polymorphic relations, query builder and complete Laravel Eloquent features ([4b1ced1](https://github.com/gravito-framework/gravito/commit/4b1ced18c9ee196f7b4a4f8b29c149eb8d5f3ea3))
* [orbit-db] 新增 Paginator 分頁器並修正型別定義 ([ad98de2](https://github.com/gravito-framework/gravito/commit/ad98de2ee83d76888116f9d31ef28d137632efb4))
* [orbit-queue] 建立輕量高效的隊列系統並實作多種 broker 驅動 ([4408608](https://github.com/gravito-framework/gravito/commit/4408608ebdf9a65377516b9ed290461470164ec8))
* [orbit-sitemap] implement enterprise-grade sitemap generation system ([c49fcbb](https://github.com/gravito-framework/gravito/commit/c49fcbbcf54dead7d962eed2aa3142189220a715))
* [orbit-view] 建立標準化 Image 元件 ([f76a2df](https://github.com/gravito-framework/gravito/commit/f76a2df01358f534afbbd884c73392f30f079a9b))
* add @gravito/flux workflow engine ([ad5a8a5](https://github.com/gravito-framework/gravito/commit/ad5a8a5c3bd44b8d9ce932a646cee22f4d97bd4e))
* add @gravito/orbit-request and enhance middleware/router ([f95abd2](https://github.com/gravito-framework/gravito/commit/f95abd2d860235b8af279434ca88f2f4c77c71ca))
* add @gravito/ripple, @gravito/ripple-client, @gravito/echo ([8cbb1e6](https://github.com/gravito-framework/gravito/commit/8cbb1e62f6b92fc42aedc8a6a8aa5bb22d846d60))
* add `test:ci` script to run tests in CI environments ([972177e](https://github.com/gravito-framework/gravito/commit/972177e828a96cb11694e0dc53baddfb6d7ec962))
* add CLI README, introduce Inertia+React template, and update CLI version. ([a2e606f](https://github.com/gravito-framework/gravito/commit/a2e606f561e1f8fc09f0db2b31ef2cade11be6e1))
* Add common utility functions, their tests, and export them from the core module. ([67efae5](https://github.com/gravito-framework/gravito/commit/67efae5053a22ac2325139778deddceb13cb9e87))
* Add Content Security Policy meta tag to app.html ([f7bcec8](https://github.com/gravito-framework/gravito/commit/f7bcec827a7a2c8c3b55bae4f6713c8f2df78362))
* add documentation and navigation for Template Engine (Orbit View) ([1c93eb7](https://github.com/gravito-framework/gravito/commit/1c93eb7f1ace985f94f52d8cf164d3d5e540d975))
* add forge package and comprehensive code documentation ([2ac886d](https://github.com/gravito-framework/gravito/commit/2ac886d0bd100e35d15f7c0f26735682654cee8b))
* add Inertia-Vue to documentation sidebar ([f72368d](https://github.com/gravito-framework/gravito/commit/f72368dfdf5104c876216ff96a86e198e565b7d4))
* add orbit() and use() methods to PlanetCore ([4d9b488](https://github.com/gravito-framework/gravito/commit/4d9b48891da7fdc864efe3999fe0b81dc7724aa0))
* Add toggleable table of contents to docs page with responsive display and layout refinements. ([dce53c7](https://github.com/gravito-framework/gravito/commit/dce53c7888ddb25f763a556b46cd703c0beac561))
* Allow Router middleware to accept arrays and add Gravito's design principles to core concepts documentation. ([513aac5](https://github.com/gravito-framework/gravito/commit/513aac51b852038b4420d6056ea2538edf560771))
* **auth:** add hashing and password/email primitives ([02f4b5b](https://github.com/gravito-framework/gravito/commit/02f4b5b2e5900f7e6318aa5780a899f11bb61082))
* **auth:** implement comprehensive authentication and authorization Orbit ([49ac8b0](https://github.com/gravito-framework/gravito/commit/49ac8b03a50874fb09eaddc4ae7e0947e00a5955))
* **cache:** add rate limiter and tagged cache ([d5a73a2](https://github.com/gravito-framework/gravito/commit/d5a73a2cdbc4fb6a8ce7e2fd5cf28ce9a92f6ddd))
* **cli:** add database migration commands and abstraction ([c5023c9](https://github.com/gravito-framework/gravito/commit/c5023c9ed84522af6f5e1983a1d5c7d1623a30d2))
* **cli:** add ORM schema commands and update model stub ([0b4de98](https://github.com/gravito-framework/gravito/commit/0b4de98a3f3df9e5e03b9b78eadf69e15998decf))
* **client:** add @gravito/client package for type-safe API consumption ([a40276e](https://github.com/gravito-framework/gravito/commit/a40276ec4fe9f9b9f124a0304ced39f0ede23df6))
* **cli:** route cache and db deploy commands ([523b019](https://github.com/gravito-framework/gravito/commit/523b0199f18c02614dc7daca2b91bc21c1b013f2))
* commit bundled ion distribution for cli, cosmos, monolith, and site ([e881b62](https://github.com/gravito-framework/gravito/commit/e881b62857ec9ef757f83507389a6d789c589b57))
* **core:** add adapter pattern to PlanetCore ([3b7025b](https://github.com/gravito-framework/gravito/commit/3b7025bd0254e9ba5d11b343775d22b367231f7d))
* **core:** add HTTP abstraction layer for adapter pattern ([a4c30f4](https://github.com/gravito-framework/gravito/commit/a4c30f4acc4808b103d80e68d1c03d188c875d7c))
* **core:** add parseBody to GravitoRequest and implement in Hono/Bun adapters ([8260887](https://github.com/gravito-framework/gravito/commit/8260887bd3afe00d85cfaf4f2680951fb3771c97))
* **core:** add process-level global error handlers ([19d1484](https://github.com/gravito-framework/gravito/commit/19d1484ed06500a76bdfce49215fddb5647e3309))
* **core:** finalize BunNativeAdapter implementation and fix tests ([f6564fe](https://github.com/gravito-framework/gravito/commit/f6564fe0fee2f49403ee1ec91909f1d4f77dade9))
* **core:** implement IoC Container and Service Providers ([0109e42](https://github.com/gravito-framework/gravito/commit/0109e42197bb640845e1633aac617bf5ad30d1b3))
* **core:** implement Laravel-like domain exception handling and HTML validation flow ([65fd6d6](https://github.com/gravito-framework/gravito/commit/65fd6d68d795f57015bbecd8c6c8e950de112119))
* **core:** routing and security primitives ([85d7f8c](https://github.com/gravito-framework/gravito/commit/85d7f8c0b343beef128ccbdc1dc34df68e4112ac))
* **db:** add soft delete query modes ([089ec6f](https://github.com/gravito-framework/gravito/commit/089ec6fc2d5627bf598819addb36bbdc8b05cf82))
* Enhance 404.html generation with SPA routing support and add build output verification step ([543b61a](https://github.com/gravito-framework/gravito/commit/543b61afd1c55979b6c373b861290d182b191be4))
* enhance mobile navigation UI, add S3/GCP sitemap storage, and enable GA tracking ([5aea5f2](https://github.com/gravito-framework/gravito/commit/5aea5f2c2bf20701a14b5b0e079c07698e33871c))
* **examples:** add official-site with i18n support ([08a46f4](https://github.com/gravito-framework/gravito/commit/08a46f4e8fd52e31827679da461ff0badc94a288))
* **examples:** implement docs engine with markdown support ([66d2ca0](https://github.com/gravito-framework/gravito/commit/66d2ca019cd37636edd2162c8d9cc49a8e374eba))
* Extract and remove leading H1 from documentation content to prevent title duplication and update badge display markup. ([359e87f](https://github.com/gravito-framework/gravito/commit/359e87f7ea84213158ce7fab94dbab415bf356af))
* **flux:** add BunSQLiteStorage adapter ([5ba3b05](https://github.com/gravito-framework/gravito/commit/5ba3b05611352ed8b59bb6fee806be4dbb0ab1ad))
* **flux:** add Node.js compatibility with dual builds ([bbc182a](https://github.com/gravito-framework/gravito/commit/bbc182a5a678a38d0dca3639bc6a63d6ec8c72b5))
* **flux:** add OrbitFlux for PlanetCore integration ([630c170](https://github.com/gravito-framework/gravito/commit/630c17038e43bede20a88593ea506af076b10439))
* **freeze:** add @gravito/freeze SSG core module ([d1a250f](https://github.com/gravito-framework/gravito/commit/d1a250f7409e45369c6b0c6ff324928e3f9de9b6))
* **freeze:** add React and Vue adapter packages ([4cc6af7](https://github.com/gravito-framework/gravito/commit/4cc6af77cbba5855b4c6c4f0c32654f5e0ada701))
* implement high-fidelity WebGL Hero, refine TW translations, and fix GitHub URLs ([f084a02](https://github.com/gravito-framework/gravito/commit/f084a02d0e85457f749a17ee4786e9ad897e0852))
* import Notification type and make MySQL `compileDropIndex` public ([7a594d9](https://github.com/gravito-framework/gravito/commit/7a594d9100493f0a3d9dda3db2005585b925f82d))
* Improve build process with enhanced logging and verification for static site generation ([760d658](https://github.com/gravito-framework/gravito/commit/760d65850e686c656cc2c2943c9c810b83f57fbe))
* Introduce `Arr`, `Str`, and `response` helpers, extract data path utilities, and add app context binding. ([e2cce71](https://github.com/gravito-framework/gravito/commit/e2cce71400c7903c90681264789ba4e18b57d14b))
* introduce `orbit-session` for session management and CSRF, and add session guards to `orbit-auth` ([8009cb0](https://github.com/gravito-framework/gravito/commit/8009cb0e55a0e1b2d144a5cdd05eb6040f2f40b1))
* introduce Inertia React template and update plugin development guide ([eaf6877](https://github.com/gravito-framework/gravito/commit/eaf6877734765430406c98f119137c4779f12630))
* **official-site:** enhance visual design and documentation styling ([15ed663](https://github.com/gravito-framework/gravito/commit/15ed66334a0ac4ff325f2d050d1fc03d607266f2))
* **orbit-cache:** laravel-like cache manager, stores, tags, locks ([6153d16](https://github.com/gravito-framework/gravito/commit/6153d164373797f383ce5b84ec6074da9627b62c))
* **orbit-database:** add P2 queryable relations to Model ([2b928f7](https://github.com/gravito-framework/gravito/commit/2b928f7d56fa8ca0b05cac0cb159c9b2dc8f2295))
* **orbit-database:** add schema self-healing ([ddb9a03](https://github.com/gravito-framework/gravito/commit/ddb9a0373aeffec5b0649a9b2db1235cca3ee17f))
* **orbit-database:** add streaming relations and lazy hydration ([c6001ef](https://github.com/gravito-framework/gravito/commit/c6001ef9be412b0faf8ffd31fb2080674e5223af))
* **orbit-database:** implement ORM P0+P1 - SchemaRegistry, ProxyModel, Relationships ([44f709b](https://github.com/gravito-framework/gravito/commit/44f709b7af193bde3bb8983dd3acb44c05afa3e3))
* **orbit-database:** implement Phase 1 & 2 - DB layer and Migration System ([ad6221d](https://github.com/gravito-framework/gravito/commit/ad6221d23c33d1679a3e81a2d28393f66b8708b9))
* **orbit-inertia:** migrate to GravitoContext abstraction ([b27e5ca](https://github.com/gravito-framework/gravito/commit/b27e5ca7985c738c3adc0abc8d6ebf96932cdb37))
* **orbit-mail:** implement mail system phase 1-4 (core, transports, renderers, dev-ui) ([5f64503](https://github.com/gravito-framework/gravito/commit/5f64503ba76dc81c450e3f6706841e8814d917ba))
* **orbit-mail:** implement queue support, SES transport, and i18n ([d2a1049](https://github.com/gravito-framework/gravito/commit/d2a1049562b4cf283464c90c04e4713fd7d5111a))
* **orbit-request:** implement Phases 3-5 ([d43bd98](https://github.com/gravito-framework/gravito/commit/d43bd989b87f0a1eb9069298cf604075a58e1a03))
* **orbit-sitemap:** implement Phase 1-3 features ([e98c1ef](https://github.com/gravito-framework/gravito/commit/e98c1efaba85106bb26c530a1d1f91945abfabc6))
* **orbit-sitemap:** implement phases 4-6 (sharding, caching, distributed) ([78fb01d](https://github.com/gravito-framework/gravito/commit/78fb01dc47cbe3bdfaefa1f235aa9676d18e649d))
* **orbit-sitemap:** init package with basic sitemap generation ([ded02e1](https://github.com/gravito-framework/gravito/commit/ded02e1c99e3ced12919c2e08be2ec069a1a976f))
* **orbits:** add GravitoVariables module augmentation to all orbits ([40552cd](https://github.com/gravito-framework/gravito/commit/40552cdb5fdbdef9ae60426457049afbe9b4ba49))
* **prism:** Upgrade to V2 engine with Layouts, Stacks, and Components ([896ecee](https://github.com/gravito-framework/gravito/commit/896eceeb1b92363b0c5e4a712a92ea1a76063bc6))
* release prep v1.0 - SSG, SEO, I18n & Core Fixes ([e5acb8f](https://github.com/gravito-framework/gravito/commit/e5acb8fa2b49033a6953aa2bf21ff1ac5a117159))
* **router:** Phase 2 FormRequest integration ([903e1f3](https://github.com/gravito-framework/gravito/commit/903e1f378c4c850398e0c9d0f9e771fc80d12e71))
* **scheduler:** implement orbit-scheduler and cli integration ([6eaf160](https://github.com/gravito-framework/gravito/commit/6eaf1602fa78632c9e8717931677e4bf32da27dd))
* **seo:** enhance core with tests, incremental strategy, and sitemap indexing ([1bb12dd](https://github.com/gravito-framework/gravito/commit/1bb12dd2c95fde1447ab11a9c537632e6a789e99))
* **seo:** Implement SmartMap Engine, Adapters, CLI, and Meta/Robots support ([bc267da](https://github.com/gravito-framework/gravito/commit/bc267da85b33b4adb08ae9d51d915a0a955fb8d9))
* **static-link:** add Vue StaticLink component and update docs ([373069c](https://github.com/gravito-framework/gravito/commit/373069cc7cc9c419e08db9066eff67e4e670c82c))
* 增強 CLI 功能 ([5456133](https://github.com/gravito-framework/gravito/commit/545613399cc2de45143b61fa4f2d13474e95d7d5))
* 新增 create-gravito-app 套件 ([da2315b](https://github.com/gravito-framework/gravito/commit/da2315b62d6821ecefdc5d8a84b420740efeeee9))
* 新增測試專案和 CLI 功能增強 ([c67b22b](https://github.com/gravito-framework/gravito/commit/c67b22b05f5ecd7ac6d0e1d06d5171040913129c))


### Bug Fixes

* [create-gravito-app] fix package.json bin field format ([0d2483f](https://github.com/gravito-framework/gravito/commit/0d2483f9ffc243dc8ebc3b9a8f7c7f862c379233))
* [deploy] 修復 GitHub Pages 部署問題 ([1112825](https://github.com/gravito-framework/gravito/commit/1112825f990dc27d6845a9fa5d7afaa185e954ef))
* add gravito-core/compat path mapping in pulsar tsconfig ([f1942da](https://github.com/gravito-framework/gravito/commit/f1942da45f342bb9c837343bf3e14f1229fe4eb0))
* add NODE_ENV=production to SSG build and include /about page ([0a79131](https://github.com/gravito-framework/gravito/commit/0a79131d7d5a3c1cb60677cd0602514d06d08b6b))
* add ripple-client tests and fix forge build format ([7e9fe8a](https://github.com/gravito-framework/gravito/commit/7e9fe8a6c2d83fe246672a7000de75f7bdd75c66))
* **ci:** fix check, typecheck errors and enhance pre-commit hook ([735fac4](https://github.com/gravito-framework/gravito/commit/735fac484013fab01da56d8253970390ed0a0812))
* **cli:** make:seeder scaffolding ([722cfd1](https://github.com/gravito-framework/gravito/commit/722cfd1aa8a49e74a5b440e02e2f9e8e38b096e9))
* **cli:** update make:model test expectation to match Atlas ORM class stub ([3b31e35](https://github.com/gravito-framework/gravito/commit/3b31e3555a0c04c81858727938076b673334edd9))
* Correct `data-page` attribute value syntax in SEO engine documentation examples. ([99a9eb7](https://github.com/gravito-framework/gravito/commit/99a9eb7e6e558dca62a37b0eba259f6541fc7663))
* escape HTML attributes in link renderer to prevent JSON parsing errors ([d71e394](https://github.com/gravito-framework/gravito/commit/d71e394d107cb840be5fe7fa42f6c4da9e1f8734))
* escape HTML tags in static site development guide tables ([f413b43](https://github.com/gravito-framework/gravito/commit/f413b43c8229eee948140479da9e27fcbe61cb43))
* **official-site:** resolve SSG navigation and locale issues ([244079c](https://github.com/gravito-framework/gravito/commit/244079c4dddb9204d3d9fb73358959461493c184))
* **orbit-cache:** validate store configuration ([d7f9af4](https://github.com/gravito-framework/gravito/commit/d7f9af4024789caf0e0e729ff9d3088f2030c8a6))
* **orbit-db:** respect model overrides ([b049aba](https://github.com/gravito-framework/gravito/commit/b049aba0dbd23f92cf5d2d5684a187106c09d990))
* **orbit-db:** respect subclass statics via polymorphic this ([bc877e6](https://github.com/gravito-framework/gravito/commit/bc877e6685ccc3c4bcf6d51200d4ec6aee63db1f))
* **orbit-db:** use 'this' instead of 'Model' in static methods to respect subclass overrides ([f2beb40](https://github.com/gravito-framework/gravito/commit/f2beb40999c4b39d90c65756eb8eca091ca107b1))
* **orbit-db:** use polymorphic this (disable noThisInStatic autofix) ([22ee308](https://github.com/gravito-framework/gravito/commit/22ee30892a72817dcb384556916c98c3b5b2389c))
* **orbit-mail:** avoid empty fields and simplify types ([eedd1ca](https://github.com/gravito-framework/gravito/commit/eedd1ca62d7ddb74ee8e79da2be393ff2109b58d))
* **orbit-scheduler:** resolve LockManager import issues via barrel file ([0af4eac](https://github.com/gravito-framework/gravito/commit/0af4eacb46acbfc111680fd9aae1e5e6b757b673))
* remove backslash escaping in InertiaService HTML attribute escape ([889944d](https://github.com/gravito-framework/gravito/commit/889944d76261ad9c543a99288fa9beedbb28c7a2))
* remove constructor return values and fix unreachable code ([3cbf29a](https://github.com/gravito-framework/gravito/commit/3cbf29a0e2bd49b12cf7eca3894858f6b4876104))
* remove double quote escaping in InertiaService HTML attribute escape ([7b38f46](https://github.com/gravito-framework/gravito/commit/7b38f4660c37f0b1c588757675484b83e96ce5bf))
* resolve monorepo type-checking issues and middleware return types ([285f4be](https://github.com/gravito-framework/gravito/commit/285f4be1760c74809d493e5e3e548b3d009c0ce0))
* resolve remaining biome check errors (noExplicitAny, noCommentText, etc.) ([2809032](https://github.com/gravito-framework/gravito/commit/2809032f7d5d892be49fe7ee1eecbdd8a7cb156b))
* resolve TypeScript errors in OrbitSitemap and forge packages ([6285fe3](https://github.com/gravito-framework/gravito/commit/6285fe309bce97236cc7c9a3933c2a32c321e84d))
* restore double quote escaping in InertiaService for HTML attributes ([5117a92](https://github.com/gravito-framework/gravito/commit/5117a92b84cee5eaadc999644a42e2a361ac88ff))
* return undefined from all middleware functions ([76c8624](https://github.com/gravito-framework/gravito/commit/76c862451c2688ba5ba10cbe11424f9ced53cb0c))
* return undefined from middleware in OrbitSignal ([53e9d25](https://github.com/gravito-framework/gravito/commit/53e9d2584c300e9048336b31c820f4fc9ed36b44))
* return undefined from remaining middleware functions ([8244ec3](https://github.com/gravito-framework/gravito/commit/8244ec38d396a2b63bad588978e2832d05f01228))
* **signal:** remove missing 'hono' module augmentation to fix build ([989365c](https://github.com/gravito-framework/gravito/commit/989365c8b9f04cba516e9ddba0097f5da3d45e30))
* **signal:** resolve dts build error and fix DevServer type errors ([45926d4](https://github.com/gravito-framework/gravito/commit/45926d44be6c133e19cfced30ee34341b247e87d))
* **signal:** update @gravito/prism dependency to ^0.1.0 ([0544ec8](https://github.com/gravito-framework/gravito/commit/0544ec88532b42a80ccb43b1f6a78ad9abf372d8))
* **site:** resolve docs 404, improve routing, and add frontmatter ([59bba57](https://github.com/gravito-framework/gravito/commit/59bba571e57e4ddef55cc7039a81fbbfdb0306bc))
* **site:** resolve type errors in SSG build script ([bcda0ac](https://github.com/gravito-framework/gravito/commit/bcda0ac968830cc3bbf0c7161b8b7c178c415f8c))
* **site:** use StaticLink for SSG compatibility in Hero section ([2243701](https://github.com/gravito-framework/gravito/commit/22437018d18fde1ef35f62ef242eb909b945e8a9))
* SSG build fixes - production mode, all routes, relative URLs ([7e67ce3](https://github.com/gravito-framework/gravito/commit/7e67ce35853bff1f659eb1b1fc54ae779d59f6d1))
* **ssg:** add features page to static build routes ([91f307a](https://github.com/gravito-framework/gravito/commit/91f307a6a5f18564a84216486e12d6973f42684f))
* **ssg:** use random path for 404 generation ([845b71e](https://github.com/gravito-framework/gravito/commit/845b71e5b0c3e46d25bd41aaf1abe17bb4b5684d))
* **static-link:** resolve lint errors in StaticLink components ([33e297e](https://github.com/gravito-framework/gravito/commit/33e297eee5f4ae7acc3a26dffb89d7c8ad24b957))
* **templates:** register global error handlers ([f099069](https://github.com/gravito-framework/gravito/commit/f09906918f29f47ecab4e8e619d46dfefcc0379e))
* **tests:** resolve missing dependencies and test failures in orbit packages ([4cb309d](https://github.com/gravito-framework/gravito/commit/4cb309daddac64edcb313b0be0b4e40e06eec17f))
* update biome check to only report errors in CI ([63f9dfb](https://github.com/gravito-framework/gravito/commit/63f9dfb90d0b50ac55ede53ec36cb165a3b22d99))
* use smart escaping for JSON quotes in HTML attributes ([a91dd22](https://github.com/gravito-framework/gravito/commit/a91dd22787c0cc7ac91ad0da81542bcb3b78e6ba))


### Performance Improvements

* **orbit-cache:** async hook dispatch with debug modes ([bd604da](https://github.com/gravito-framework/gravito/commit/bd604daf47c3cd790b7e9cc9f401e3a2426ad0ba))

## [0.3.0-alpha.1] - 2024-12-16

### Added

- **IoC Container Architecture**
  - `PlanetCore.boot(config)` - Bootstrap application with configuration
  - `defineConfig()` - Type-safe configuration helper
  - `GravitoOrbit` interface for plugin modules

- **Orbit System (Plugin Architecture)**
  - `@gravito/orbit-db` - Database injection
  - `@gravito/stasis` - Memory cache with TTL
  - `@gravito/nebula` - Local file storage
  - `@gravito/orbit-auth` - JWT authentication

- **Hook System**
  - `hooks.addAction()` - Register side-effect callbacks
  - `hooks.addFilter()` - Register data transformation callbacks
  - `hooks.doAction()` - Trigger actions
  - `hooks.applyFilters()` - Apply filter chain

- **CLI Tool**
  - `gravito create [name]` - Scaffold new Gravito project

- **Basic Template**
  - Complete demo with static website
  - Visitor counter using OrbitCache
  - API endpoints with hook integration

### Fixed

- OrbitCache config resolution when no config provided
- Hono Context type safety with custom Variables

### Technical

- Strict TypeScript mode enabled
- Biome linter integration
- 100% test coverage on core module

## [0.1.0] - 2024-12-01

### Added

- Initial release with basic PlanetCore
- Hono integration
- ConfigManager
- HookManager
- ConsoleLogger

[0.3.0-alpha.1]: https://github.com/gravito-framework/gravito/compare/v0.1.0...v0.3.0-alpha.1
[0.1.0]: https://github.com/gravito-framework/gravito/releases/tag/v0.1.0
