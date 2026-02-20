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

## Quick Reference: Plugin Ecosystem

| Plugin | Repo | Key Patterns |
|---|---|---|
| GitHub Utilities | [GitHub](https://github.com/pedrofuentes/stream-deck-github-utilities) | SVG icons, API polling, status colors |
| Cloudflare Utilities | [GitHub](https://github.com/pedrofuentes/stream-deck-cloudflare-utilities) | `encodeURIComponent` SVG encoding (original discovery) |
| iCal | [GitHub](https://github.com/pedrofuentes/stream-deck-ical) | Named calendars, recurring events, rrule, luxon |
| **Template** | [GitHub](https://github.com/pedrofuentes/stream-deck-template) | Shared learnings, scaffold, collaboration protocol |
