# Agent Instructions — Stream Deck Template

> This file provides context and rules for AI coding agents working in the **stream-deck-template** workspace.

## What This Project Is

This is **NOT** a Stream Deck plugin. This is a **shared knowledge hub and project template** for all Stream Deck plugins. It lives at:

- **Repo**: https://github.com/pedrofuentes/stream-deck-template

Its purpose is:
1. **Capture learnings** from all Stream Deck plugin projects in one place
2. **Provide scaffold files** so new plugins start with correct patterns from day one
3. **Enable cross-workspace collaboration** between agents working on different plugins

## File Map

| File | Purpose |
|---|---|
| `LEARNINGS.md` | **The single source of truth** — consolidated learnings from ALL plugins, organized by category. This is the most important file. |
| `COLLABORATION.md` | Protocol for how agents in different workspaces share knowledge. Contains exact prompts the user can copy-paste. |
| `TEMPLATE_INSTRUCTIONS.md` | Step-by-step guide an agent follows to scaffold a new plugin from this template. |
| `TEMPLATE_README.md` | Overview of the template, placeholder token reference table. |
| `contributions/` | Per-plugin contribution files. Each plugin writes its discoveries here before they get merged into `LEARNINGS.md`. |
| `ADOPTION-INSTRUCTIONS.md` | Exact instructions to add to **existing** plugins (not scaffolded from template) so their agents collaborate back automatically. Contains drop-in `.copilot-instructions.md` and `AGENTS.md` sections. |
| `scaffold/` | Ready-to-use template files (package.json, tsconfig, rollup, vitest, manifest, example action, test, etc.) with `__PLACEHOLDER__` tokens. |
| `scaffold/AGENTS.md` | Agent instructions template — rules, patterns, common mistakes for new plugins. |
| `scaffold/.github/TESTING-PROTOCOL.md` | Testing protocol template — test structure, mocking, coverage, pre-release process. |
| `scaffold/.github/UI-DESIGN-GUIDE.md` | UI/UX design guide template — accent bar, SVG specs, colors, typography, marquee, PI. |

## Your Responsibilities as an Agent in This Workspace

### 0. Check GitHub for New Learnings (ALWAYS)

Before doing any work in this workspace, **always check the GitHub repo for new commits** that may contain learnings contributed by agents in other workspaces:

```
git fetch origin
git log --oneline origin/main..HEAD   # see if remote is ahead
git log --oneline HEAD..origin/main   # see what's new on remote
```

If the remote has new commits, pull them before proceeding:
```
git pull --rebase origin main
```

Other plugin agents push contributions directly to this repo. If you don't check, you'll miss new learnings and risk merge conflicts. **This is your first step every time.**

### 1. Merging Contributions

When the user asks you to merge contributions, follow this process:
1. Read all files in `contributions/` 
2. Read `LEARNINGS.md` to understand what's already captured
3. Add only **new, unique** learnings to the appropriate section in `LEARNINGS.md`
4. Remove duplicates
5. Keep the `contributions/` files but mark them as merged (status line + summary of topics)
6. Commit with: `docs: merge <plugin-name> learnings into LEARNINGS.md`

### 2. Maintaining LEARNINGS.md

This file is organized into numbered sections:
1. SVG Rendering on Stream Deck Hardware
2. Manifest.json Gotchas
3. Property Inspector (PI) Patterns
4. Action Implementation Patterns
5. Architecture Patterns
6. Testing Patterns
7. Build & Release Pipeline
8. File Header Convention
9. Git & Repository Standards
10. Common Mistakes to Avoid

When adding new content:
- Place it in the correct section
- Include a `*(Source: <plugin-name>)*` annotation
- Add code examples where helpful
- If it's a common mistake, also add a row to the table in section 10

### 3. Scaffolding New Plugins

When asked to create a new plugin from the template:
1. Read `TEMPLATE_INSTRUCTIONS.md` for the step-by-step process
2. Read `LEARNINGS.md` for all known pitfalls and patterns
3. Copy `scaffold/` files to the new project directory
4. Replace all `__PLACEHOLDER__` tokens (see `TEMPLATE_README.md` for the full list)
5. Create a new `contributions/<plugin-slug>.md` file for the new plugin
6. Set up `AGENTS.md` in the new project root with the contributing-back instructions

### 4. Keeping the Scaffold Up to Date

If a new pattern is discovered that should be in every plugin from the start:
- Update the relevant `scaffold/` file
- Update `TEMPLATE_INSTRUCTIONS.md` if the scaffolding steps changed
- Update `scaffold/AGENTS.md` if agent rules changed
- Update `scaffold/.github/TESTING-PROTOCOL.md` if testing patterns changed
- Update `scaffold/.github/UI-DESIGN-GUIDE.md` if UI/UX patterns changed

## The Plugin Ecosystem

| Plugin | Repo |
|---|---|
| GitHub Utilities | https://github.com/pedrofuentes/stream-deck-github-utilities |
| Cloudflare Utilities | https://github.com/pedrofuentes/stream-deck-cloudflare-utilities |
| iCal | https://github.com/pedrofuentes/stream-deck-ical |

All plugins share:
- **SDK**: Elgato Stream Deck SDK v2 (`@elgato/streamdeck`)
- **Language**: TypeScript (ES2022), Rollup bundler
- **Tests**: Vitest with 80% coverage thresholds
- **Author**: Pedro Fuentes (`git@pedrofuent.es`)

## Git Conventions for This Repo

- **Commits**: Conventional Commits format
  - `docs(<plugin>): merge learnings from <plugin>` — for merging contributions
  - `docs: update LEARNINGS.md with <topic>` — for direct edits
  - `chore(scaffold): update <file> with <change>` — for scaffold updates
  - `feat(scaffold): add <new-file>` — for new scaffold files
- **Branch**: Work on `main` unless told otherwise
- **Author**: Pedro Fuentes (`git@pedrofuent.es`)

## Important Notes

- This project has **no dependencies to install** and **no build step**. It's pure documentation and template files.
- The `scaffold/` directory will show lint errors because placeholder tokens like `__PLUGIN_ID__` are not valid TypeScript — this is expected. Do not try to fix these.
- Use relative paths within the repo (e.g., `contributions/<plugin>.md`, `LEARNINGS.md`). All collaboration flows through the GitHub repo.
