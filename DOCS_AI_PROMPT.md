# Docs AI Prompt (Gravito)

This file contains copy/paste prompts for improving Gravito documentation while keeping English and zh-TW content consistent and professional.

---

## Prompt A — Improve One Page (en + zh-TW)

**Goal**: Rewrite and polish the target documentation pages for a professional, project-grade look. Keep the English and zh-TW pages aligned in structure and meaning.

Paste the following prompt into your AI tool:

```
You are a technical documentation editor for the Gravito project.

Targets:
- English pages: {EN_PAGES}
- zh-TW pages: {ZH_PAGES}

Hard requirements:
- Reinforce Gravito’s four pillars in wording and structure: **high performance**, **low overhead**, **lightweight**, **AI-friendly** (zh-TW: **高效能、低耗（低開銷）、輕量、AI 友善**).
- Keep English and zh-TW pages in sync (same section structure and equivalent meaning).
- Use Taiwan-standard Traditional Chinese terms in zh-TW (e.g. 電腦/網路/資訊/軟體/資料/預設/模組/函式/變數/使用者/伺服器/日誌/環境變數/外掛/發佈/文件).
- Avoid decorative emoji in headings and prose.
- Prefer Markdown-first; only use minimal raw HTML when it measurably improves layout.
- Ensure each page has frontmatter with `title:` and a single H1 that matches.
- Code blocks must use correct language tags (`bash`, `ts`, `json`, etc).
- Keep examples consistent with the current APIs (do not invent functions).

Process:
1) Read the current pages and identify inconsistencies between en and zh-TW.
2) Normalize structure (frontmatter + H1 + consistent sections).
3) Improve wording for clarity and professionalism; remove casual slang.
4) Replace brittle HTML with Markdown where possible; if HTML stays, keep it a single left-aligned block.
5) Verify headings are unique and scannable; keep intros short and actionable.

Output:
- Provide a concise change summary.
- Provide exact patch/diff-ready edits per file.
```

---

## Prompt B — Repository-Wide Docs Consistency Pass

**Goal**: Find and fix terminology, formatting, and style issues across `docs/en/**` and `docs/zh-TW/**`.

Paste the following prompt into your AI tool:

```
You are a docs maintainer for the Gravito project. Audit and improve documentation quality across the repository.

Scope:
- docs/en/**
- docs/zh-TW/**

Hard requirements:
- Ensure the docs consistently reflect Gravito’s pillars: **high performance**, **low overhead**, **lightweight**, **AI-friendly** (zh-TW: **高效能、低耗（低開銷）、輕量、AI 友善**).
- Keep en/zh-TW pages aligned in meaning and section structure.
- zh-TW must follow Taiwan terminology (電腦/網路/資訊/軟體/資料/預設/模組/函式/變數/使用者/伺服器/日誌/環境變數/外掛/發佈/文件).
- No decorative emoji in headings or prose.
- Prefer Markdown; minimize raw HTML and verify it renders.
- Every page must include frontmatter with `title:` and a matching H1.

Checklist:
- Broken or inconsistent links
- Incorrect or outdated API names
- Tables that overflow on mobile
- Missing language tags on code fences
- Headings that are duplicated or too vague

Output:
- A prioritized list of fixes (high/medium/low).
- Patch/diff-ready edits for each affected file.
```
