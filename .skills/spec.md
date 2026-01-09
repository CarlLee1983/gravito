# Gravito Skill Specification (v1.0)

A "Gravito Skill" is a modular, self-contained package designed to extend the capabilities of AI Agents (like Antigravity or Claude) within the Gravito codebase. It functions as a specialized "onboarding guide" and toolset.

## 1. Directory Structure

Each skill must reside in its own subdirectory within the `.skills/` folder:

```
.skills/[skill-name]/
├── SKILL.md            # Required: Skill logic and instructions
├── scripts/            # Optional: Executable Bun/TypeScript scripts
├── references/         # Optional: Documentation for the agent to read
└── assets/              # Optional: Templates, icons, boilerplate
```

## 2. SKILL.md Requirements

### YAML Frontmatter
Every `SKILL.md` must start with a YAML block containing:
- `name`: A unique identifier for the skill (e.g., `adr-scaffold`).
- `description`: A clear, concise explanation of what the skill does and when the agent should trigger it.

### Markdown Body
The body contains the "System Instructions" for the agent once the skill is loaded. It should follow the **Progressive Disclosure** principle:
- High-level goals.
- Step-by-step workflow.
- Tool usage instructions (if scripts are included).

## 3. Bundled Resources

- **Scripts (`scripts/`)**: TypeScript files intended to be run with `bun`. They should encapsulate deterministic or repetitive tasks.
- **References (`references/`)**: Additional context (API docs, schemas) that the agent should only read if the core `SKILL.md` instructions require it.
- **Assets (`assets/`)**: Files that aren't read by the agent into context but are used as output (e.g., `cp assets/template.ts src/new-action.ts`).

## 4. Usage Rules

1. **Self-Contained**: A skill should contain everything needed to perform its task.
2. **Minimal Clutter**: Avoid `README.md` or `INSTALL.md` inside a skill. The `SKILL.md` is the only manual needed.
3. **Trigger-Based**: Agents should only "load" a skill when the user request aligns with the skill's frontmatter description.
