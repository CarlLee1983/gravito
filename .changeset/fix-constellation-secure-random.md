---
"@gravito/constellation": patch
---

fix: replace insecure Math.random() with crypto.randomUUID() for shadow ID generation (CWE-330) in ShadowProcessor, S3SitemapStorage, and GCPSitemapStorage.