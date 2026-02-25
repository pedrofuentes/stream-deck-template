# Agent Collaboration Protocol

> **Template repo**: https://github.com/pedrofuentes/stream-deck-template

This document defines how AI agents working on **different Stream Deck plugin projects** can share learnings, patterns, and discoveries through the shared template repository.

## The Problem

Each Stream Deck plugin is developed in its own workspace. An AI agent working on `stream-deck-ical` cannot directly see files in `stream-deck-github-utilities` or `stream-deck-cloudflare-utilities`. Yet all three projects share the same SDK, the same hardware constraints, and the same pitfalls.

## The Solution: Shared Template Repo as Knowledge Hub

The **`stream-deck-template`** repo at https://github.com/pedrofuentes/stream-deck-template serves as the central knowledge hub. Each plugin's agent can:

1. **Clone or read** the template repo to benefit from others' discoveries
2. **Contribute** its own discoveries via pull requests or direct commits
3. All collaboration flows through the GitHub repo — no local path dependencies

## Directory Structure

```
stream-deck-template/
├── LEARNINGS.md               ← Consolidated learnings from ALL plugins
├── contributions/             ← Per-plugin contribution files
│   ├── github-utilities.md    ← Discoveries from GitHub Utilities plugin
│   ├── cloudflare-utilities.md ← Discoveries from Cloudflare plugin
│   └── ical.md                ← Discoveries from iCal plugin
└── ...
```

## How to Contribute (Instructions for Agents)

### When You Discover Something New

If you're an AI agent working on a Stream Deck plugin and you discover a pitfall, workaround, or best practice that other plugins would benefit from:

1. Clone or open the template repo
2. Write your findings to `contributions/<plugin-name>.md`
3. Commit and push (or open a PR) to https://github.com/pedrofuentes/stream-deck-template

**Format**:
```markdown
## [Category] — [Short Title]

**Discovered in**: <plugin-name>
**Date**: <date>
**Severity**: critical | important | nice-to-know

**Problem**: What went wrong or what was unclear
**Solution**: What fixed it
**Code example** (if applicable):
\```typescript
// working code
\```

**Prevention**: How to avoid this in the future
```

### When Starting a New Plugin

1. Read `LEARNINGS.md` first — it has all consolidated knowledge
2. Read `TEMPLATE_INSTRUCTIONS.md` — it has the scaffolding guide
3. Use the scaffold files as starting points
4. As you build, write discoveries to your contributions file

### Check for New Learnings (ALWAYS — DO THIS FIRST)

Before starting **any** significant work, **always check the template repo on GitHub for new learnings** from other plugins. Agents in other workspaces contribute discoveries continuously — the repo may have new commits since you last checked.

Fetch the latest `LEARNINGS.md` directly:
```
https://raw.githubusercontent.com/pedrofuentes/stream-deck-template/main/LEARNINGS.md
```

Or check the contributions folder for recent findings:
```
https://github.com/pedrofuentes/stream-deck-template/tree/main/contributions
```

**This is not optional.** Skipping this step risks repeating solved problems, using patterns that have been superseded, or missing critical pitfalls discovered by other plugins.

### Ongoing Contribution (IMPORTANT)

Every plugin built from this template should **periodically contribute learnings back** to the template repo. As an agent, you should:

1. **Proactively offer** to contribute new learnings after completing significant work (new actions, bug fixes, workarounds, testing discoveries).
2. **Write** new findings to `contributions/<plugin-name>.md` in the template repo using the format above.
3. **Commit and push** (or open a PR) with a conventional commit like `docs(<plugin-name>): add learnings about <topic>`.
4. **Check for updates**: Before starting major work, pull and read `LEARNINGS.md` for any new knowledge from other plugins.

Good moments to offer a contribution:
- After solving a non-obvious bug or hardware quirk
- After implementing a reusable pattern (polling, caching, UI)
- After discovering a manifest or SDK constraint
- After a release (summarize what was learned)
- When the user asks "anything else?" or the session is wrapping up

---

## Collaboration Areas

Agents contribute and consume knowledge in **three areas**, each with its own shared guide:

| Area | Scaffold File | What It Covers |
|------|--------------|----------------|
| **Learnings** | `LEARNINGS.md` | SDK quirks, manifest pitfalls, architecture patterns, build/release — all consolidated from every plugin |
| **Testing** | `.github/TESTING-PROTOCOL.md` | Test structure, mocking strategies, coverage requirements, pre-release protocol, common pitfalls |
| **UI / UX Design** | `.github/UI-DESIGN-GUIDE.md` | Accent bar pattern, SVG rendering specs, color palette, typography, marquee system, PI components |

When an agent finds an issue or a new pattern in **any** of these areas, it should:

1. **Check the template repo first** — the latest merged guide may already cover it
2. **Contribute back** if it's genuinely new (using the contribution format above)
3. Specify the **area** in the contribution header so it gets merged into the right guide

### Keeping Guides in Sync

The template repo maintains the **canonical merged version** of each guide. Individual plugin repos get their copy when scaffolded. If a plugin discovers improvements:

1. Contribute the finding to `contributions/<plugin-name>.md` with the area tag
2. The template maintainer (or an agent in the template workspace) merges it into the canonical guide
3. Other plugins can pull the updated guide from the template repo

---

## Adopting Existing Plugins

Plugins that were **not** scaffolded from this template but participate in the knowledge-sharing ecosystem need explicit collaboration wiring. This applies to the three founding plugins (cloudflare-utilities, github-utilities, ical) that helped create this template.

### What "Adopted" Means

An adopted plugin behaves identically to a scaffolded one for collaboration purposes:
- Its agent reads `LEARNINGS.md` before major work
- Its agent proactively offers to contribute discoveries back
- Its contributions are tracked in `contributions/<plugin-slug>.md`
- Its agent checks the template's companion guides (Testing Protocol, UI Design Guide)

The only difference: adopted plugins have their own existing `AGENTS.md` structure, so the collaboration instructions are **appended** rather than baked in from the start.

### How to Adopt a Plugin

See **[ADOPTION-INSTRUCTIONS.md](ADOPTION-INSTRUCTIONS.md)** for the exact text to add to each plugin's `.copilot-instructions.md` and `AGENTS.md`.

### Adoption Status

| Plugin | Status | Instructions Added? |
|---|---|---|
| cloudflare-utilities | Founding contributor | Needs adoption instructions |
| github-utilities | Founding contributor | Needs adoption instructions |
| ical | Founding contributor | Needs adoption instructions |

After adding the instructions, update this table to mark the plugin as adopted.

---

## Quick Reference: Plugin Ecosystem

| Plugin | Repo | Origin | Key Patterns |
|---|---|---|---|
| GitHub Utilities | [GitHub](https://github.com/pedrofuentes/stream-deck-github-utilities) | Founding contributor | FilterableSelect, short/long press, PI verification gate |
| Cloudflare Utilities | [GitHub](https://github.com/pedrofuentes/stream-deck-cloudflare-utilities) | Founding contributor | Accent bar, color palette, PollingCoordinator, validate:consistency |
| iCal | [GitHub](https://github.com/pedrofuentes/stream-deck-ical) | Founding contributor | SingletonAction state, resource manager, debug mode |
| **Template** | [GitHub](https://github.com/pedrofuentes/stream-deck-template) | — | Shared learnings, scaffold, collaboration protocol |
