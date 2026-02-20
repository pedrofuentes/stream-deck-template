# Stream Deck Plugin Template

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A shared knowledge hub and project template for building Stream Deck plugins with AI agents. Captures proven patterns, hard-won learnings, and best practices from multiple production plugins.

## What's Inside

| File | Purpose |
|---|---|
| [LEARNINGS.md](LEARNINGS.md) | **The single source of truth** — consolidated learnings from all plugins (SVG rendering, manifest gotchas, PI patterns, testing, architecture, and more) |
| [TEMPLATE_INSTRUCTIONS.md](TEMPLATE_INSTRUCTIONS.md) | Step-by-step scaffolding guide for AI agents to create a new plugin |
| [TEMPLATE_README.md](TEMPLATE_README.md) | Detailed overview of the template, placeholder tokens, and file structure |
| [COLLABORATION.md](COLLABORATION.md) | Cross-workspace agent collaboration protocol |
| [scaffold/](scaffold/) | Ready-to-use template files with `__PLACEHOLDER__` tokens |
| [contributions/](contributions/) | Per-plugin contribution files with discovery summaries |

## Quick Start

1. Copy this repo (or use it as a GitHub template)
2. Open it in VS Code with an AI agent (GitHub Copilot, Cursor, etc.)
3. Tell the agent:
   > *"Use TEMPLATE_INSTRUCTIONS.md to scaffold a new Stream Deck plugin called [your plugin name] with UUID [com.yourname.plugin-name]"*
4. The agent will replace all placeholders, set up the project structure, and apply all known best practices

## Built From This Template

| Plugin | Description |
|---|---|
| [stream-deck-github-utilities](https://github.com/pedrofuentes/stream-deck-github-utilities) | GitHub repo stats & workflow status |
| [stream-deck-cloudflare-utilities](https://github.com/pedrofuentes/stream-deck-cloudflare-utilities) | Cloudflare service monitoring |
| [stream-deck-ical](https://github.com/pedrofuentes/stream-deck-ical) | Calendar event display |

## Key Learnings Covered

- **SVG rendering** — the only encoding that works on hardware, nested SVG workarounds, OLED color palette
- **Manifest gotchas** — icon formats, title placement, version format, validation
- **Property Inspector** — token race conditions, popup communication, dropdown hydration
- **Action patterns** — singleton state management, polling, timer cleanup, error handling
- **Architecture** — global settings pub/sub, service layer isolation, resource managers
- **Testing** — SDK mocking, SVG assertions, fake timers, singleton store resets
- **Build & release** — Rollup config, debug mode, packaging, validation

## License

MIT — [Pedro Pablo Fuentes Schuster](mailto:git@pedrofuent.es)
