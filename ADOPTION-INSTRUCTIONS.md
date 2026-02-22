# Adopting Existing Plugins into the Template Collaboration

> This document provides the exact instructions to add to **existing** Stream Deck plugin repos (ones NOT originally scaffolded from this template) so their AI agents collaborate back automatically.

## Background

The `scaffold/AGENTS.md` already includes a "Contributing Learnings Back" section for new plugins created from this template. But some plugins predate the template and contributed to its creation. They need the same collaboration wiring.

**Plugins that need adoption:**
- `stream-deck-cloudflare-utilities` — contributed accent bar, color palette, polling, marquee, key-image renderer, validate:consistency
- `stream-deck-github-utilities` — contributed SVG encoding discovery, FilterableSelect, short/long press, PI verification gate
- `stream-deck-ical` — contributed SingletonAction state management, resource manager, boolean defaults, debug mode

---

## What to Add to Each Plugin

Each plugin needs **two things**:

### 1. Update `.copilot-instructions.md` (repo root)

Replace the current `.copilot-instructions.md` with the content below, filling in the plugin-specific values.

### 2. Add a "Template Collaboration" section to `AGENTS.md`

Append the collaboration section (below) to the plugin's existing `AGENTS.md`.

---

## `.copilot-instructions.md` — Drop-In Replacement

Copy this into each plugin's `.copilot-instructions.md`, replacing the `<PLACEHOLDERS>`:

```markdown
# Copilot Instructions — <PLUGIN_NAME>

## Template Collaboration

This plugin participates in the **stream-deck-template** knowledge-sharing ecosystem:
https://github.com/pedrofuentes/stream-deck-template

The template repo collects learnings from all Stream Deck plugins. This plugin's
contribution tracking file lives at `contributions/<PLUGIN_SLUG>.md` in that repo.

### Before Starting Major Work

Read the template's `LEARNINGS.md` for the latest consolidated knowledge from all plugins.
It contains hard-won solutions for SVG rendering, manifest quirks, PI patterns, polling,
testing, and more — discovered across multiple plugin projects.

Fetch it directly:
```
https://raw.githubusercontent.com/pedrofuentes/stream-deck-template/main/LEARNINGS.md
```

Also check the companion guides for testing and UI:
```
https://raw.githubusercontent.com/pedrofuentes/stream-deck-template/main/scaffold/.github/TESTING-PROTOCOL.md
https://raw.githubusercontent.com/pedrofuentes/stream-deck-template/main/scaffold/.github/UI-DESIGN-GUIDE.md
```

### After Significant Work — Contribute Back

After completing significant work (new features, bug fixes, workarounds, testing discoveries),
**proactively offer to write new learnings back to the template repo**.

See `AGENTS.md` for the full contribution protocol.

### Pre-Release Gate — MANDATORY

**Never tag, push, or create a release without the user testing on their physical Stream Deck
first.** The Stream Deck CLI (`validate`, `restart`) only checks manifest schema and plugin
loading — it cannot verify runtime behavior, UI rendering, or key display. Always ask the
user to test on device and wait for explicit confirmation before releasing.

## Project Rules

Refer to `AGENTS.md` for the full set of project rules, architecture, testing requirements,
and conventions.
```

---

## AGENTS.md — Collaboration Section to Append

Add this section to the **end** of each plugin's existing `AGENTS.md` (before any final closing), replacing `<PLACEHOLDERS>`:

```markdown
## Template Collaboration Protocol

This plugin is part of the **stream-deck-template** knowledge-sharing ecosystem.
All Stream Deck plugins share the same SDK, hardware constraints, and pitfalls.
Learnings discovered here benefit every other plugin.

- **Template repo**: https://github.com/pedrofuentes/stream-deck-template
- **This plugin's contributions**: `contributions/<PLUGIN_SLUG>.md` in the template repo
- **Consolidated knowledge**: `LEARNINGS.md` in the template repo

### Reading Knowledge From the Template

Before starting major work on a new feature, refactor, or release, fetch and read
the latest `LEARNINGS.md` from the template:

```
https://raw.githubusercontent.com/pedrofuentes/stream-deck-template/main/LEARNINGS.md
```

This contains detailed, code-level patterns for:
- SVG rendering compatibility and OLED-tested color palettes
- Property Inspector patterns (popup windows, dropdown hydration, FilterableSelect, settings race conditions)
- Architecture patterns (global settings pub/sub, service layer isolation, PollingCoordinator, resource managers)
- Adaptive polling, rate limit handling, key-press cycling, short/long press detection
- Marquee animations, compact number formatting, accent bar layout, viewport-aware dropdowns
- Testing patterns (singleton store resets, fixture organization, SVG assertion helpers)
- Build pipeline, validate:consistency script, release checklist, PI verification gate
- Common mistakes table with 23+ entries

### Contributing Knowledge Back

After completing significant work, **proactively offer** to contribute new learnings
to the template. This is expected — not optional.

**How:**
1. Fetch the template's contribution file for this plugin:
   `https://raw.githubusercontent.com/pedrofuentes/stream-deck-template/main/contributions/<PLUGIN_SLUG>.md`
2. Read it to understand what has already been contributed
3. Write new findings using the format below
4. Push to the template repo (clone it, or ask the user to switch workspaces)
5. Commit with: `docs(<PLUGIN_SLUG>): add learnings about <topic>`

**Contribution format:**
```markdown
## [Category] — [Short Title]

**Discovered in**: <PLUGIN_SLUG>
**Date**: <date>
**Severity**: critical | important | nice-to-know

**Problem**: What went wrong or what was unclear
**Solution**: What fixed it
**Code example** (if applicable)
**Prevention**: How to avoid this in the future
```

**When to offer a contribution:**
- After solving a non-obvious bug or hardware quirk
- After implementing a reusable pattern (polling, caching, UI component)
- After discovering a manifest or SDK constraint
- After a release (summarize what was learned)
- After refactoring something that other plugins also have
- When the session is wrapping up and the user asks "anything else?"

**When NOT to contribute:**
- Plugin-specific business logic (API response parsing unique to this plugin)
- Trivial fixes that don't generalize
- Things already covered in `LEARNINGS.md`

### Checking for Updates From Other Plugins

Other plugins may have discovered patterns that help this one. Before a release
or when troubleshooting, check if `LEARNINGS.md` has new entries by fetching and
scanning the sections relevant to the current task.

### Template Companion Guides

The template also maintains merged guides that this plugin may benefit from:

| Guide | URL |
|-------|-----|
| Testing Protocol | `https://raw.githubusercontent.com/pedrofuentes/stream-deck-template/main/scaffold/.github/TESTING-PROTOCOL.md` |
| UI/UX Design Guide | `https://raw.githubusercontent.com/pedrofuentes/stream-deck-template/main/scaffold/.github/UI-DESIGN-GUIDE.md` |

Read these before writing tests or making UI changes — they contain hardware-tested
patterns and failure logs from multiple plugins.
```

---

## Plugin-Specific Values

Use these values when filling in the `<PLACEHOLDERS>`:

### Cloudflare Utilities
| Placeholder | Value |
|---|---|
| `<PLUGIN_NAME>` | `Stream Deck Cloudflare Utilities` |
| `<PLUGIN_SLUG>` | `cloudflare-utilities` |

### GitHub Utilities
| Placeholder | Value |
|---|---|
| `<PLUGIN_NAME>` | `Stream Deck GitHub Utilities` |
| `<PLUGIN_SLUG>` | `github-utilities` |

### iCal
| Placeholder | Value |
|---|---|
| `<PLUGIN_NAME>` | `Stream Deck iCal` |
| `<PLUGIN_SLUG>` | `ical` |

---

## Verification

After adding the instructions to a plugin, verify the agent picks them up by asking:
> "What do you know about the stream-deck-template collaboration? Show me the contribution protocol."

The agent should be able to describe the read/write protocol and know where to push contributions.
