---
"@gravito/launchpad": patch
"@gravito/stream": patch
---

fix: replace insecure Math.random() with crypto.randomUUID() for ID and temporary path generation (CWE-330)
